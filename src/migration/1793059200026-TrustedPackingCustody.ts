import type { MigrationInterface, QueryRunner } from "typeorm";

/** Immutable receipts transfer custody; production and school ledgers are never rewritten. */
export class TrustedPackingCustody1793059200026 implements MigrationInterface {
  name = "TrustedPackingCustody1793059200026";
  async up(r: QueryRunner): Promise<void> {
    const [scope] = await r.query("SELECT current_database() db,current_schema() schema");
    if (scope.db !== "experimind_kitbuilder_test" || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))
      throw Error("Packing activation restricted to isolated synthetic requirement_test schema");
    await r.query(`CREATE TABLE trusted_packing_plans (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, project_id uuid NOT NULL, site_id uuid NOT NULL,
      approval_id uuid NOT NULL REFERENCES requirement_approvals(id), demand_revision integer NOT NULL,
      snapshot jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), operation_key varchar(100) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(id,organization_id),
      UNIQUE(organization_id,approval_id,site_id));
      CREATE TABLE trusted_packing_allocations (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, plan_id uuid NOT NULL, package_id uuid NOT NULL,
      output_id uuid NOT NULL, line_id uuid NOT NULL, quantity numeric(12,4) NOT NULL CHECK(quantity>0),
      actor_id uuid NOT NULL REFERENCES users(id), operation_key varchar(100) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      FOREIGN KEY(plan_id,organization_id) REFERENCES trusted_packing_plans(id,organization_id),
      FOREIGN KEY(output_id,organization_id) REFERENCES production_output_custody(id,organization_id));
      CREATE INDEX packing_output ON trusted_packing_allocations(output_id);
      CREATE INDEX packing_package ON trusted_packing_allocations(plan_id,package_id);
      CREATE TABLE trusted_packing_qc (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, plan_id uuid NOT NULL, package_id uuid NOT NULL,
      allocation_revision integer NOT NULL, decision text NOT NULL CHECK(decision IN ('accept','reject')),
      checks jsonb NOT NULL, notes text NOT NULL CHECK(length(trim(notes)) BETWEEN 1 AND 2000),
      actor_id uuid NOT NULL REFERENCES users(id), operation_key varchar(100) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(plan_id,package_id),
      FOREIGN KEY(plan_id,organization_id) REFERENCES trusted_packing_plans(id,organization_id));

      CREATE FUNCTION commitment_packing_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE p trusted_packing_plans; o production_output_custody; w production_work_orders;
        c commitment_work_orders; pack jsonb; material jsonb; amount numeric; total numeric;
        tree uuid[]; ancestors uuid[]; check_name text;
      BEGIN
        IF TG_TABLE_NAME='trusted_packing_plans' THEN
          PERFORM requirement_assert(NEW.organization_id,NEW.project_id,NEW.site_id,NEW.demand_revision,NEW.approval_id);
          IF jsonb_array_length(NEW.snapshot->'packages')=0 THEN RAISE EXCEPTION 'Nonempty frozen plan required' USING ERRCODE='23514'; END IF;
          RETURN NEW;
        END IF;
        SELECT * INTO STRICT p FROM trusted_packing_plans WHERE id=NEW.plan_id AND organization_id=NEW.organization_id;
        PERFORM requirement_assert(p.organization_id,p.project_id,p.site_id,p.demand_revision,p.approval_id);
        PERFORM pg_advisory_xact_lock(hashtextextended('packing:'||p.id::text,0));
        SELECT v INTO STRICT pack FROM jsonb_array_elements(p.snapshot->'packages') v WHERE v->>'id'=NEW.package_id::text;
        WITH RECURSIVE parents AS (
          SELECT pack v UNION ALL SELECT child.value FROM jsonb_array_elements(p.snapshot->'packages') child(value)
          JOIN parents x ON child.value->>'id'=x.v->>'parent_id')
          SELECT array_agg((v->>'id')::uuid) INTO ancestors FROM parents;
        IF EXISTS(SELECT 1 FROM trusted_packing_qc WHERE plan_id=p.id AND package_id=ANY(ancestors)) THEN
          RAISE EXCEPTION 'Final custody cannot be changed or inspected twice' USING ERRCODE='23514'; END IF;
        IF TG_TABLE_NAME='trusted_packing_allocations' THEN
          SELECT * INTO STRICT o FROM production_output_custody WHERE id=NEW.output_id AND organization_id=p.organization_id;
          SELECT * INTO STRICT w FROM production_work_orders WHERE id=o.order_id AND organization_id=p.organization_id FOR UPDATE;
          SELECT * INTO STRICT c FROM commitment_work_orders WHERE order_id=w.id;
          PERFORM commitment_work_order_check(w.id);
          IF w.project_id<>p.project_id OR w.site_id<>p.site_id OR w.demand_revision<>p.demand_revision OR c.approval_id<>p.approval_id THEN
            RAISE EXCEPTION 'Exact school and approved output lineage required' USING ERRCODE='23514'; END IF;
          SELECT v INTO STRICT material FROM jsonb_array_elements(pack->'materials') v WHERE v->>'line_id'=NEW.line_id::text;
          IF material->>'item_id' IS DISTINCT FROM c.demand_line->>'inventory_item_id'
            OR material->>'unit' IS DISTINCT FROM o.unit OR material->>'line_id' IS DISTINCT FROM c.demand_line->>'material_id'
            OR pack->>'selection_id' IS DISTINCT FROM c.demand_line->>'selection_id'
            OR pack->>'version_id' IS DISTINCT FROM c.demand_line->>'version_id' THEN
            RAISE EXCEPTION 'Exact frozen material assignment required' USING ERRCODE='23514'; END IF;
          SELECT coalesce(sum(quantity),0)+NEW.quantity INTO total FROM trusted_packing_allocations WHERE output_id=o.id;
          IF total>o.quantity THEN RAISE EXCEPTION 'Produced output exhausted' USING ERRCODE='23514'; END IF;
          SELECT coalesce(sum(quantity),0)+NEW.quantity INTO total FROM trusted_packing_allocations
            WHERE plan_id=p.id AND package_id=NEW.package_id AND line_id=NEW.line_id;
          IF total>(material->>'quantity')::numeric THEN RAISE EXCEPTION 'Package assignment exhausted' USING ERRCODE='23514'; END IF;
        ELSE
          WITH RECURSIVE children AS (
            SELECT pack v UNION ALL SELECT child.value FROM jsonb_array_elements(p.snapshot->'packages') child(value)
            JOIN children x ON child.value->>'parent_id'=x.v->>'id')
            SELECT array_agg((v->>'id')::uuid) INTO tree FROM children;
          IF NEW.allocation_revision<>(SELECT count(*) FROM trusted_packing_allocations WHERE plan_id=p.id)
            OR EXISTS(SELECT 1 FROM trusted_packing_qc WHERE plan_id=p.id AND package_id=ANY(tree) AND decision='reject') THEN
            RAISE EXCEPTION 'Stale or rejected custody' USING ERRCODE='23514'; END IF;
          IF jsonb_typeof(NEW.checks)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(NEW.checks))<>6 THEN
            RAISE EXCEPTION 'Six check evidence required' USING ERRCODE='23514'; END IF;
          FOREACH check_name IN ARRAY ARRAY['material','quantity','placement','packaging','stickers','instructions'] LOOP
            IF jsonb_typeof(NEW.checks->check_name->'pass') IS DISTINCT FROM 'boolean'
              OR jsonb_typeof(NEW.checks->check_name->'evidence') IS DISTINCT FROM 'string'
              OR length(trim(NEW.checks->check_name->>'evidence')) NOT BETWEEN 1 AND 2000
              OR (NEW.decision='accept' AND NEW.checks->check_name->'pass'<>'true'::jsonb) THEN
              RAISE EXCEPTION 'Complete QC evidence required' USING ERRCODE='23514'; END IF;
          END LOOP;
          IF NOT EXISTS(SELECT 1 FROM trusted_packing_allocations WHERE plan_id=p.id AND package_id=ANY(tree)) THEN
            RAISE EXCEPTION 'Physical custody required for inspection' USING ERRCODE='23514'; END IF;
          IF NEW.decision='accept' THEN
            FOR material IN SELECT m||jsonb_build_object('package',v->>'id') FROM jsonb_array_elements(p.snapshot->'packages') v,
              LATERAL jsonb_array_elements(v->'materials') m WHERE (v->>'id')::uuid=ANY(tree) LOOP
              SELECT coalesce(sum(quantity),0) INTO amount FROM trusted_packing_allocations WHERE plan_id=p.id
                AND package_id=(material->>'package')::uuid AND line_id=(material->>'line_id')::uuid;
              IF amount<>(material->>'quantity')::numeric THEN RAISE EXCEPTION 'Package custody incomplete' USING ERRCODE='23514'; END IF;
            END LOOP;
          END IF;
        END IF;
        RETURN NEW;
      END; $$;
      CREATE FUNCTION commitment_packing_witness() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE receipt jsonb; BEGIN
        receipt=to_jsonb(NEW)-'created_at';
        IF TG_TABLE_NAME='trusted_packing_allocations' THEN receipt=receipt||jsonb_build_object('quantity',NEW.quantity::text); END IF;
        IF NOT EXISTS(SELECT 1 FROM commitment_authorizations z JOIN audit_logs a ON a.organization_id=z.organization_id
          AND a.actor_id=z.actor_id AND a.entity_id=NEW.id AND a.action=TG_TABLE_NAME AND a.entity_type='trusted_packing' AND a."after"=z.result
          WHERE z.organization_id=NEW.organization_id AND z.actor_id=NEW.actor_id AND z.operation_key=NEW.operation_key
          AND z.result=receipt) THEN
          RAISE EXCEPTION 'Signed packing authority and audit required' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END; $$;`);
    for (const table of ["trusted_packing_plans", "trusted_packing_allocations", "trusted_packing_qc"])
      await r.query(`CREATE TRIGGER immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON ${table} FOR EACH STATEMENT EXECUTE FUNCTION commitment_immutable();
        CREATE TRIGGER packing_guard BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION commitment_packing_guard();
        CREATE CONSTRAINT TRIGGER packing_witness AFTER INSERT ON ${table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_packing_witness();
        REVOKE ALL ON ${table} FROM PUBLIC;`);
    await r.query(`CREATE OR REPLACE FUNCTION commitment_production_audit_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'Preserve custody audit evidence' USING ERRCODE='23514'; END IF;
      IF OLD.entity_type IN ('trusted_production','trusted_packing') OR (TG_OP='UPDATE' AND NEW.entity_type IN ('trusted_production','trusted_packing')) THEN
        RAISE EXCEPTION 'Immutable custody audit evidence' USING ERRCODE='23514'; END IF;
      IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $$;
      REVOKE ALL ON FUNCTION commitment_packing_guard(),commitment_packing_witness() FROM PUBLIC`);
  }
  async down(): Promise<void> { throw Error("Preserve packing evidence; restore an isolated backup"); }
}
