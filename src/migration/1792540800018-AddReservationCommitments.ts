import type { MigrationInterface, QueryRunner } from "typeorm";

/** Explicit isolated development migration. Intentionally absent from startup migrations. */
export class AddReservationCommitments1792540800018 implements MigrationInterface {
  name = "AddReservationCommitments1792540800018";
  async up(r: QueryRunner): Promise<void> {
    const [scope] = await r.query("SELECT current_database() db,current_schema() schema");
    if (scope.db !== "experimind_kitbuilder_test" || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))
      throw new Error("D2 activation restricted to isolated synthetic requirement_test schema");
    await r.query(`
      ALTER TABLE commitment_claims DROP CONSTRAINT commitment_claims_source_kind_check;
      ALTER TABLE commitment_claims ADD CHECK(source_kind='project_reservation' OR source_kind ~ '^synthetic:[a-z_]+$');
      ALTER TABLE commitment_sources DROP CONSTRAINT commitment_sources_kind_check;
      ALTER TABLE commitment_sources ADD CHECK(kind='project_reservation' OR kind ~ '^synthetic:[a-z_]+$');
      CREATE TABLE commitment_reservations (
        reservation_id uuid PRIMARY KEY, organization_id uuid NOT NULL, account_id uuid NOT NULL, entitlement_id uuid NOT NULL,
        operation_key text NOT NULL CHECK(length(trim(operation_key)) BETWEEN 1 AND 100),
        created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        FOREIGN KEY(reservation_id,organization_id) REFERENCES project_stock_reservations(id,organization_id),
        FOREIGN KEY(entitlement_id,account_id,organization_id) REFERENCES commitment_entitlements(id,account_id,organization_id)
      );
      CREATE TRIGGER commitment_reservation_immutable BEFORE UPDATE OR DELETE ON commitment_reservations
        FOR EACH ROW EXECUTE FUNCTION commitment_immutable();
      CREATE FUNCTION commitment_reservation_clean(org uuid,project uuid) RETURNS void LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS(SELECT 1 FROM project_stock_reservations r WHERE r.organization_id=org AND r.project_id=project
          AND NOT EXISTS(SELECT 1 FROM commitment_reservations b WHERE b.reservation_id=r.id AND b.organization_id=org))
          OR EXISTS(SELECT 1 FROM production_work_orders WHERE organization_id=org AND project_id=project)
          OR EXISTS(SELECT 1 FROM packing_orders WHERE organization_id=org AND project_id=project)
          OR EXISTS(SELECT 1 FROM delivery_orders WHERE organization_id=org AND project_id=project)
          OR EXISTS(SELECT 1 FROM site_installations WHERE organization_id=org AND project_id=project)
          OR EXISTS(SELECT 1 FROM project_completions WHERE organization_id=org AND project_id=project)
          OR EXISTS(SELECT 1 FROM purchase_requests p,LATERAL jsonb_array_elements(p.lines) l
            WHERE p.organization_id=org AND l->>'project_id'=project::text)
          OR EXISTS(SELECT 1 FROM purchase_orders p,LATERAL jsonb_array_elements(coalesce(p.planning_lines,'[]')) l
            WHERE p.organization_id=org AND l->>'project_id'=project::text)
        THEN RAISE EXCEPTION 'Historical or mixed-stage lineage requires reconciliation' USING ERRCODE='23514'; END IF;
      END $$;
      CREATE FUNCTION commitment_reservation_witness() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE rid uuid; r project_stock_reservations; b commitment_reservations; a commitment_accounts;
        e commitment_entitlements; h numeric; f numeric;
      BEGIN
        IF TG_TABLE_NAME='commitment_claims' THEN
          IF NEW.source_kind<>'project_reservation' AND (TG_OP='INSERT' OR OLD.source_kind<>'project_reservation') THEN RETURN NULL; END IF;
          rid=CASE WHEN TG_OP='UPDATE' AND OLD.source_kind='project_reservation' THEN OLD.source_id::uuid ELSE NEW.source_id::uuid END;
        ELSIF TG_TABLE_NAME='project_stock_reservations' THEN rid=NEW.id;
        ELSE rid=NEW.reservation_id; END IF;
        SELECT * INTO STRICT r FROM project_stock_reservations WHERE id=rid;
        SELECT * INTO STRICT b FROM commitment_reservations WHERE reservation_id=rid AND organization_id=r.organization_id;
        SELECT * INTO STRICT a FROM commitment_accounts WHERE id=b.account_id AND organization_id=b.organization_id;
        SELECT * INTO STRICT e FROM commitment_entitlements WHERE id=b.entitlement_id AND account_id=a.id;
        PERFORM requirement_assert(r.organization_id,r.project_id,r.site_id,e.revision,e.approval_id);
        PERFORM commitment_reservation_clean(r.organization_id,r.project_id);
        IF a.dimension<>'material' OR a.project_id<>r.project_id OR a.site_id<>r.site_id OR a.item_key<>r.item_id::text OR a.unit<>r.unit
          OR r.fulfillment_ledger_id IS NOT NULL OR r.fulfillment_location IS NOT NULL OR r.status='fulfilled'
          OR NOT EXISTS(SELECT 1 FROM requirement_execution_bindings x WHERE x.kind='project_stock_reservations' AND x.record_id=r.id
            AND x.organization_id=r.organization_id AND x.project_id=r.project_id AND x.site_id=r.site_id AND x.approval_id=e.approval_id AND x.revision=e.revision)
        THEN RAISE EXCEPTION 'Exact reservation approval lineage required' USING ERRCODE='23514'; END IF;
        IF EXISTS(SELECT 1 FROM commitment_sources s JOIN commitment_claims c ON c.id=s.claim_id WHERE s.kind='project_reservation'
          AND s.source_id=rid::text AND (s.organization_id<>r.organization_id OR s.account_id<>a.id OR c.source_kind<>s.kind
            OR c.source_id<>s.source_id OR c.source_slice<>s.slice OR c.retired OR c.parent_id IS NOT NULL OR c.fulfilled<>0))
        THEN RAISE EXCEPTION 'Reservation claim transfer, split or consumption unsupported' USING ERRCODE='23514'; END IF;
        SELECT coalesce(sum(held),0),coalesce(sum(fulfilled),0) INTO h,f FROM commitment_claims
          WHERE source_kind='project_reservation' AND source_id=rid::text AND organization_id=r.organization_id AND account_id=a.id;
        IF f<>0 OR h<>(CASE WHEN r.status='active' THEN r.quantity ELSE 0 END)
        THEN RAISE EXCEPTION 'Reservation and exclusive held commitment differ' USING ERRCODE='23514'; END IF;
        RETURN NULL;
      END $$;
      CREATE CONSTRAINT TRIGGER commitment_reservation_witness AFTER INSERT OR UPDATE ON project_stock_reservations
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_reservation_witness();
      CREATE CONSTRAINT TRIGGER commitment_reservation_witness AFTER INSERT ON commitment_reservations
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_reservation_witness();
      CREATE CONSTRAINT TRIGGER commitment_reservation_witness AFTER INSERT OR UPDATE ON commitment_claims
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_reservation_witness();
      CREATE FUNCTION commitment_reservation_downstream_gate() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE project uuid; org uuid; doc jsonb=to_jsonb(NEW);
      BEGIN
        org=(doc->>'organization_id')::uuid;
        FOR project IN SELECT DISTINCT p FROM (
          SELECT (doc->>'project_id')::uuid p
          UNION ALL SELECT (l->>'project_id')::uuid FROM jsonb_array_elements(coalesce(doc->'lines',doc->'planning_lines','[]')) l
        ) projects WHERE p IS NOT NULL ORDER BY p LOOP
          PERFORM 1 FROM planning_projects WHERE id=project AND organization_id=org FOR UPDATE;
          IF EXISTS(SELECT 1 FROM commitment_reservations b JOIN commitment_accounts a ON a.id=b.account_id
            WHERE b.organization_id=org AND a.project_id=project)
          THEN RAISE EXCEPTION 'D2 reservation project: downstream execution is not integrated' USING ERRCODE='23514'; END IF;
        END LOOP;
        RETURN NEW;
      END $$;
    `);
    for (const table of ["production_work_orders","packing_orders","delivery_orders","site_installations","project_completions","purchase_requests","purchase_orders"])
      await r.query(`CREATE TRIGGER a_d2_reservation_gate BEFORE INSERT OR UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION commitment_reservation_downstream_gate()`);
    // Invoker-only functions, with no PUBLIC execution or attacker-controlled search path.
    for (const signature of ["commitment_reservation_clean(uuid,uuid)","commitment_reservation_witness()","commitment_reservation_downstream_gate()"])
      await r.query(`ALTER FUNCTION ${signature} SET search_path TO pg_catalog,"${scope.schema}",pg_temp;
        REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC`);
  }
  async down(r: QueryRunner): Promise<void> {
    await r.query("LOCK TABLE commitment_reservations,project_stock_reservations,commitment_claims IN ACCESS EXCLUSIVE MODE");
    if ((await r.query("SELECT 1 FROM commitment_reservations LIMIT 1")).length)
      throw new Error("Nonempty reservation commitment evidence: restore/replay; destructive rollback forbidden");
    for (const table of ["production_work_orders","packing_orders","delivery_orders","site_installations","project_completions","purchase_requests","purchase_orders"])
      await r.query(`DROP TRIGGER a_d2_reservation_gate ON ${table}`);
    for (const table of ["project_stock_reservations","commitment_claims","commitment_reservations"])
      await r.query(`DROP TRIGGER commitment_reservation_witness ON ${table}`);
    await r.query(`DROP FUNCTION commitment_reservation_downstream_gate(); DROP FUNCTION commitment_reservation_witness();
      DROP FUNCTION commitment_reservation_clean(uuid,uuid); DROP TABLE commitment_reservations;
      ALTER TABLE commitment_claims DROP CONSTRAINT commitment_claims_source_kind_check;
      ALTER TABLE commitment_claims ADD CHECK(source_kind ~ '^synthetic:[a-z_]+$');
      ALTER TABLE commitment_sources DROP CONSTRAINT commitment_sources_kind_check;
      ALTER TABLE commitment_sources ADD CHECK(kind ~ '^synthetic:[a-z_]+$')`);
  }
}
