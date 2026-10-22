import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Additive D4 authority. Never activate against a real warehouse schema. */
export class TrustedDispatchCustody1793145600027 implements MigrationInterface {
  name = 'TrustedDispatchCustody1793145600027';
  async up(r: QueryRunner): Promise<void> {
    const [scope] = await r.query('SELECT current_database() db,current_schema() schema');
    if (scope.db !== 'experimind_kitbuilder_test' || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))
      throw Error('Dispatch activation restricted to isolated synthetic requirement_test schema');
    // Upgrade existing D3 schemas as well as freshly migrated fixtures.
    const [{definition}]=await r.query("SELECT pg_get_functiondef('commitment_packing_guard()'::regprocedure) definition");
    const corrected=definition.replaceAll("SELECT pack v UNION ALL SELECT v FROM jsonb_array_elements(p.snapshot->'packages') v", "SELECT pack v UNION ALL SELECT child.value FROM jsonb_array_elements(p.snapshot->'packages') child(value)")
      .replaceAll("JOIN parents x ON v->>'id'=x.v->>'parent_id'", "JOIN parents x ON child.value->>'id'=x.v->>'parent_id'")
      .replaceAll("JOIN children x ON v->>'parent_id'=x.v->>'id'", "JOIN children x ON child.value->>'parent_id'=x.v->>'id'");
    if(corrected!==definition)await r.query(corrected);
    await r.query(`CREATE TABLE trusted_dispatches (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, plan_id uuid NOT NULL,
      roots jsonb NOT NULL CHECK(jsonb_typeof(roots)='array' AND jsonb_array_length(roots)>0),
      transport jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id),
      operation_key varchar(100) NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      FOREIGN KEY(plan_id,organization_id) REFERENCES trusted_packing_plans(id,organization_id),
      UNIQUE(id,organization_id));
      CREATE TABLE trusted_dispatch_units (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, dispatch_id uuid NOT NULL, plan_id uuid NOT NULL,
      package_id uuid NOT NULL, root_id uuid NOT NULL,
      account_id uuid REFERENCES commitment_accounts(id), entitlement_id uuid REFERENCES commitment_entitlements(id),
      claim_id uuid UNIQUE REFERENCES commitment_claims(id),
      FOREIGN KEY(dispatch_id,organization_id) REFERENCES trusted_dispatches(id,organization_id),
      FOREIGN KEY(plan_id,organization_id) REFERENCES trusted_packing_plans(id,organization_id),
      UNIQUE(plan_id,package_id), CHECK((account_id IS NULL)=(claim_id IS NULL)),
      CHECK((entitlement_id IS NULL)=(claim_id IS NULL)));
      CREATE TABLE trusted_delivery_receipts (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, dispatch_id uuid NOT NULL,
      roots jsonb NOT NULL CHECK(jsonb_typeof(roots)='array' AND jsonb_array_length(roots)>0),
      recipient text NOT NULL CHECK(length(trim(recipient)) BETWEEN 1 AND 200),
      acknowledged_at timestamptz NOT NULL, acknowledgement text NOT NULL CHECK(length(trim(acknowledgement)) BETWEEN 1 AND 2000),
      source uuid NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), operation_key varchar(100) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(organization_id,source),
      FOREIGN KEY(dispatch_id,organization_id) REFERENCES trusted_dispatches(id,organization_id));
      CREATE INDEX trusted_dispatch_plan ON trusted_dispatches(plan_id);
      CREATE INDEX trusted_dispatch_units_shipment ON trusted_dispatch_units(dispatch_id);
      CREATE INDEX trusted_receipt_shipment ON trusted_delivery_receipts(dispatch_id);

      CREATE FUNCTION commitment_dispatch_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE p trusted_packing_plans; d trusted_dispatches; root text; pack jsonb; ancestor jsonb;
        n integer; expected integer; slots boolean; cl commitment_claims; a commitment_accounts;
      BEGIN
        IF TG_TABLE_NAME='trusted_delivery_receipts' THEN
          SELECT * INTO STRICT d FROM trusted_dispatches WHERE id=NEW.dispatch_id AND organization_id=NEW.organization_id;
          SELECT * INTO STRICT p FROM trusted_packing_plans WHERE id=d.plan_id AND organization_id=NEW.organization_id;
        ELSE
          SELECT * INTO STRICT p FROM trusted_packing_plans WHERE id=NEW.plan_id AND organization_id=NEW.organization_id;
        END IF;
        PERFORM requirement_assert(p.organization_id,p.project_id,p.site_id,p.demand_revision,p.approval_id);
        PERFORM pg_advisory_xact_lock(hashtextextended('dispatch:'||p.project_id::text,0));
        IF TG_TABLE_NAME='trusted_dispatches' THEN
          IF jsonb_array_length(NEW.roots)>500 OR NEW.transport - 'carrier' - 'vehicle' - 'planned_date' - 'notes'<>'{}'::jsonb
            OR jsonb_typeof(NEW.transport) IS DISTINCT FROM 'object'
            OR coalesce(length(trim(NEW.transport->>'carrier')),0) NOT BETWEEN 1 AND 200
            OR coalesce(length(trim(NEW.transport->>'vehicle')),0) NOT BETWEEN 1 AND 200
            OR jsonb_typeof(NEW.transport->'notes') IS DISTINCT FROM 'string'
            OR (NEW.transport->>'planned_date')::timestamptz IS NULL THEN
            RAISE EXCEPTION 'Explicit shipment transport required' USING ERRCODE='23514'; END IF;
          SELECT count(DISTINCT x) INTO n FROM jsonb_array_elements_text(NEW.roots) x;
          IF n<>jsonb_array_length(NEW.roots) THEN RAISE EXCEPTION 'Duplicate manifest root' USING ERRCODE='23514'; END IF;
          FOR root IN SELECT jsonb_array_elements_text(NEW.roots) LOOP
            SELECT x INTO STRICT pack FROM jsonb_array_elements(p.snapshot->'packages') x WHERE x->>'id'=root;
            IF pack->>'kind'<>'kit' THEN RAISE EXCEPTION 'Whole kit assembly required' USING ERRCODE='23514'; END IF;
            -- An accepted ancestor is final QC over this complete physical assembly.
            ancestor=pack;
            LOOP
              EXIT WHEN EXISTS(SELECT 1 FROM trusted_packing_qc q WHERE q.plan_id=p.id
                AND q.package_id=(ancestor->>'id')::uuid AND q.decision='accept');
              IF ancestor->>'parent_id' IS NULL THEN RAISE EXCEPTION 'Accepted final QC required' USING ERRCODE='23514'; END IF;
              SELECT x INTO STRICT ancestor FROM jsonb_array_elements(p.snapshot->'packages') x WHERE x->>'id'=ancestor->>'parent_id';
            END LOOP;
          END LOOP;
        ELSIF TG_TABLE_NAME='trusted_dispatch_units' THEN
          SELECT * INTO STRICT d FROM trusted_dispatches WHERE id=NEW.dispatch_id AND organization_id=NEW.organization_id;
          IF d.plan_id<>p.id OR NOT d.roots ? NEW.root_id::text THEN
            RAISE EXCEPTION 'Exact school manifest required' USING ERRCODE='23514'; END IF;
          SELECT x INTO STRICT pack FROM jsonb_array_elements(p.snapshot->'packages') x WHERE x->>'id'=NEW.package_id::text;
          ancestor=pack;
          WHILE ancestor->>'id'<>NEW.root_id::text LOOP
            IF ancestor->>'parent_id' IS NULL THEN RAISE EXCEPTION 'Package outside assembly' USING ERRCODE='23514'; END IF;
            SELECT x INTO STRICT ancestor FROM jsonb_array_elements(p.snapshot->'packages') x WHERE x->>'id'=ancestor->>'parent_id';
          END LOOP;
          slots=pack->>'kind'='grade' OR pack->>'kind' IN ('common_crate','universal_crate');
          IF slots<>(NEW.claim_id IS NOT NULL) THEN RAISE EXCEPTION 'Exact slot custody required' USING ERRCODE='23514'; END IF;
          IF slots THEN
            SELECT * INTO STRICT cl FROM commitment_claims WHERE id=NEW.claim_id AND organization_id=NEW.organization_id;
            SELECT * INTO STRICT a FROM commitment_accounts WHERE id=NEW.account_id AND organization_id=NEW.organization_id;
            IF cl.account_id<>a.id OR cl.quantity<>1 OR cl.source_kind<>'synthetic:school_dispatch'
              OR cl.source_id<>d.id::text OR cl.source_slice<>NEW.package_id::text OR a.dimension<>'slot'
              OR a.project_id<>p.project_id OR a.site_id<>p.site_id
              OR a.selector<>jsonb_build_object('selection',pack->>'selection_id',CASE WHEN pack->>'kind'='grade' THEN 'grade' ELSE 'crate' END,pack->>'definition_id')
              OR NOT EXISTS(SELECT 1 FROM commitment_entitlements e WHERE e.id=NEW.entitlement_id
                AND e.account_id=a.id AND e.approval_id=p.approval_id) THEN
              RAISE EXCEPTION 'Frozen deliverable claim lineage required' USING ERRCODE='23514'; END IF;
            -- Across revisions, a physical slot ordinal remains one school entitlement.
            IF EXISTS(SELECT 1 FROM trusted_dispatch_units u JOIN commitment_claims c ON c.id=u.claim_id
              JOIN trusted_packing_plans prior_plan ON prior_plan.id=u.plan_id,
              LATERAL jsonb_array_elements(prior_plan.snapshot->'packages') x
              WHERE u.account_id=a.id AND x->>'id'=u.package_id::text
                AND x->>'pack_number'=pack->>'pack_number') THEN
              RAISE EXCEPTION 'School entitlement already in custody' USING ERRCODE='23505'; END IF;
          END IF;
        ELSE
          IF NEW.acknowledged_at>clock_timestamp()+interval '5 minutes' OR NEW.acknowledged_at<d.created_at THEN
            RAISE EXCEPTION 'Receipt timestamp outside shipment custody' USING ERRCODE='23514'; END IF;
          SELECT count(DISTINCT x) INTO n FROM jsonb_array_elements_text(NEW.roots) x;
          IF n<>jsonb_array_length(NEW.roots) THEN RAISE EXCEPTION 'Duplicate receipt assembly' USING ERRCODE='23514'; END IF;
          FOR root IN SELECT jsonb_array_elements_text(NEW.roots) LOOP
            IF NOT d.roots ? root OR EXISTS(SELECT 1 FROM trusted_delivery_receipts q WHERE q.dispatch_id=d.id AND q.roots ? root) THEN
              RAISE EXCEPTION 'Receipt exceeds outstanding school manifest' USING ERRCODE='23514'; END IF;
          END LOOP;
        END IF;
        RETURN NEW;
      END; $$;

      CREATE FUNCTION commitment_dispatch_witness() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE d trusted_dispatches; p trusted_packing_plans; u trusted_dispatch_units; j jsonb; expected integer; actual integer;
      BEGIN
        IF TG_TABLE_NAME='trusted_dispatches' THEN d=NEW;
        ELSE SELECT * INTO STRICT d FROM trusted_dispatches WHERE id=NEW.dispatch_id; END IF;
        SELECT * INTO STRICT p FROM trusted_packing_plans WHERE id=d.plan_id;
        WITH RECURSIVE tree AS (
          SELECT child.value AS package FROM jsonb_array_elements(p.snapshot->'packages') child(value) WHERE d.roots ? (child.value->>'id')
          UNION ALL SELECT child.value FROM tree t,jsonb_array_elements(p.snapshot->'packages') child(value) WHERE child.value->>'parent_id'=t.package->>'id')
          SELECT count(*) INTO expected FROM tree;
        SELECT count(*) INTO actual FROM trusted_dispatch_units WHERE dispatch_id=d.id;
        IF expected<>actual THEN RAISE EXCEPTION 'Incomplete exclusive physical manifest' USING ERRCODE='23514'; END IF;
        FOR u IN SELECT * FROM trusted_dispatch_units WHERE dispatch_id=d.id AND claim_id IS NOT NULL LOOP
          IF NOT EXISTS(SELECT 1 FROM commitment_events e WHERE e.account_id=u.account_id AND e.entitlement_id=u.entitlement_id
            AND e.kind='open' AND e.payload=jsonb_build_object('claim',u.claim_id,'quantity','1','source',
              jsonb_build_object('kind','synthetic:school_dispatch','id',d.id,'slice',u.package_id)) AND e.actor_id=d.actor_id) THEN
            RAISE EXCEPTION 'Atomic deliverable hold required' USING ERRCODE='23514'; END IF;
          SELECT count(*) INTO actual FROM trusted_delivery_receipts q WHERE q.dispatch_id=d.id AND q.roots ? u.root_id::text;
          IF (SELECT fulfilled FROM commitment_claims WHERE id=u.claim_id)<>actual THEN
            RAISE EXCEPTION 'Receipt and school fulfillment differ' USING ERRCODE='23514'; END IF;
        END LOOP;
        IF TG_TABLE_NAME<>'trusted_dispatch_units' THEN
          j=to_jsonb(NEW)-'created_at';
          IF NOT EXISTS(SELECT 1 FROM commitment_authorizations z JOIN audit_logs a ON a.organization_id=z.organization_id
            AND a.actor_id=z.actor_id AND a.entity_id=NEW.id AND a.entity_type='trusted_delivery' AND a.action=TG_TABLE_NAME AND a."after"=z.result
            WHERE z.organization_id=NEW.organization_id AND z.actor_id=NEW.actor_id AND z.operation_key=NEW.operation_key AND z.result=j) THEN
            RAISE EXCEPTION 'Signed dispatch authority and audit required' USING ERRCODE='23514'; END IF;
        END IF;
        RETURN NEW;
      END; $$;`);
    for (const table of ['trusted_dispatches', 'trusted_dispatch_units', 'trusted_delivery_receipts'])
      await r.query(`CREATE TRIGGER immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON ${table} FOR EACH STATEMENT EXECUTE FUNCTION commitment_immutable();
        CREATE TRIGGER dispatch_guard BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION commitment_dispatch_guard();
        CREATE CONSTRAINT TRIGGER dispatch_witness AFTER INSERT ON ${table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_dispatch_witness();
        REVOKE ALL ON ${table} FROM PUBLIC;`);
    await r.query(`CREATE OR REPLACE FUNCTION commitment_production_audit_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'Preserve custody audit evidence' USING ERRCODE='23514'; END IF;
      IF OLD.entity_type IN ('trusted_production','trusted_packing','trusted_delivery') OR
        (TG_OP='UPDATE' AND NEW.entity_type IN ('trusted_production','trusted_packing','trusted_delivery')) THEN
        RAISE EXCEPTION 'Immutable custody audit evidence' USING ERRCODE='23514'; END IF;
      IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $$;
      CREATE FUNCTION commitment_dispatch_event_witness() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE u trusted_dispatch_units; cl commitment_claims; n integer;
      BEGIN
        IF NEW.kind='authorize' THEN RETURN NEW; END IF;
        SELECT * INTO cl FROM commitment_claims WHERE id=(NEW.payload->>'claim')::uuid;
        SELECT * INTO u FROM trusted_dispatch_units WHERE claim_id=cl.id;
        IF NOT FOUND AND cl.source_kind IS DISTINCT FROM 'synthetic:school_dispatch' THEN RETURN NEW; END IF;
        IF u.id IS NULL OR cl.source_kind IS DISTINCT FROM 'synthetic:school_dispatch'
          OR cl.source_id IS DISTINCT FROM u.dispatch_id::text OR cl.source_slice IS DISTINCT FROM u.package_id::text THEN
          RAISE EXCEPTION 'Dispatch claim lineage is immutable' USING ERRCODE='23514'; END IF;
        IF NEW.kind NOT IN ('open','consume') OR NEW.account_id<>u.account_id OR NEW.entitlement_id<>u.entitlement_id
          OR NEW.payload->>'quantity'<>'1' THEN
          RAISE EXCEPTION 'Dispatch custody cannot be released, transferred or repartitioned' USING ERRCODE='23514'; END IF;
        SELECT count(*) INTO n FROM trusted_delivery_receipts r WHERE r.dispatch_id=u.dispatch_id AND r.roots ? u.root_id::text;
        IF cl.fulfilled<>n OR cl.held<>1-n OR cl.released<>0 THEN
          RAISE EXCEPTION 'Dispatch fulfillment requires matching school evidence' USING ERRCODE='23514'; END IF;
        IF NEW.kind='consume' AND NOT EXISTS(SELECT 1 FROM trusted_delivery_receipts r
          JOIN commitment_authorizations z ON z.organization_id=r.organization_id AND z.actor_id=r.actor_id
            AND z.operation_key=r.operation_key AND z.result=to_jsonb(r)-'created_at'
          WHERE r.dispatch_id=u.dispatch_id AND r.roots ? u.root_id::text AND r.actor_id=NEW.actor_id) THEN
          RAISE EXCEPTION 'Signed receiving authority required' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END; $$;
      CREATE CONSTRAINT TRIGGER dispatch_event_witness AFTER INSERT ON commitment_events
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_dispatch_event_witness();
      REVOKE ALL ON FUNCTION commitment_dispatch_guard(),commitment_dispatch_witness(),commitment_dispatch_event_witness() FROM PUBLIC;`);
  }
  async down(): Promise<void> { throw Error('Preserve dispatch evidence; restore an isolated backup'); }
}
