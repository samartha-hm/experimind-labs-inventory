import type { MigrationInterface, QueryRunner } from "typeorm";

/** Explicit synthetic-only activation; never part of server startup migrations. */
export class AddPurchaseRequestCommitments1792627200019 implements MigrationInterface {
  name = "AddPurchaseRequestCommitments1792627200019";
  async up(r: QueryRunner): Promise<void> {
    const [scope] = await r.query("SELECT current_database() db,current_schema() schema");
    if (scope.db !== "experimind_kitbuilder_test" || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))
      throw new Error("PR activation restricted to isolated synthetic requirement_test schema");
    await r.query(`
      ALTER TABLE commitment_claims DROP CONSTRAINT commitment_claims_source_kind_check;
      ALTER TABLE commitment_claims ADD CHECK(source_kind IN ('project_reservation','purchase_request_line') OR source_kind ~ '^synthetic:[a-z_]+$');
      ALTER TABLE commitment_sources DROP CONSTRAINT commitment_sources_kind_check;
      ALTER TABLE commitment_sources ADD CHECK(kind IN ('project_reservation','purchase_request_line') OR kind ~ '^synthetic:[a-z_]+$');
      CREATE TABLE commitment_pr_lines (
        line_id uuid PRIMARY KEY, request_id uuid NOT NULL REFERENCES purchase_requests(id), organization_id uuid NOT NULL,
        account_id uuid NOT NULL, entitlement_id uuid NOT NULL, frozen_line jsonb NOT NULL,
        operation_key text NOT NULL CHECK(length(trim(operation_key)) BETWEEN 1 AND 100),
        created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        UNIQUE(request_id),
        FOREIGN KEY(entitlement_id,account_id,organization_id) REFERENCES commitment_entitlements(id,account_id,organization_id)
      );
      CREATE TRIGGER commitment_pr_immutable BEFORE UPDATE OR DELETE ON commitment_pr_lines
        FOR EACH ROW EXECUTE FUNCTION commitment_immutable();
      DROP TRIGGER a_d2_reservation_gate ON purchase_requests;
    `);
    // Preserve all existing approval/stock/receipt checks. Only mapped PR quantity edits
    // gain an exception; the new deferred witness checks their exact frozen scope.
    const [{ definition }] = await r.query("SELECT pg_get_functiondef('requirement_supply_guard()'::regprocedure) definition");
    const old = "IF NEW.lines IS DISTINCT FROM OLD.lines AND EXISTS";
    if (!definition.includes(old)) throw new Error("Unexpected requirement supply contract");
    await r.query(definition.replace(old, "IF NEW.lines IS DISTINCT FROM OLD.lines AND NOT EXISTS(SELECT 1 FROM commitment_pr_lines WHERE request_id=NEW.id AND organization_id=NEW.organization_id) AND EXISTS"));
    const [{ clean }] = await r.query("SELECT pg_get_functiondef('commitment_reservation_clean(uuid,uuid)'::regprocedure) clean");
    const predicate = "WHERE p.organization_id=org AND l->>'project_id'=project::text)";
    if (!clean.includes(predicate)) throw new Error("Unexpected reservation lineage contract");
    await r.query(clean.replace(predicate, "WHERE p.organization_id=org AND l->>'project_id'=project::text AND NOT EXISTS(SELECT 1 FROM commitment_pr_lines b WHERE b.request_id=p.id AND b.line_id=(l->>'id')::uuid AND b.organization_id=org))"));
    const [{ gate }] = await r.query("SELECT pg_get_functiondef('commitment_reservation_downstream_gate()'::regprocedure) gate");
    const condition = "WHERE b.organization_id=org AND a.project_id=project)";
    if (!gate.includes(condition)) throw new Error("Unexpected downstream gate contract");
    await r.query(gate.replace(condition, condition + " OR EXISTS(SELECT 1 FROM commitment_pr_lines b JOIN commitment_accounts a ON a.id=b.account_id WHERE b.organization_id=org AND a.project_id=project)")
      .replace("org=(doc->>'organization_id')::uuid;", `org=(doc->>'organization_id')::uuid;
        IF EXISTS(SELECT 1 FROM commitment_pr_lines b WHERE b.organization_id=org AND
          (b.request_id::text=doc->>'purchase_request_id' OR EXISTS(SELECT 1 FROM purchase_orders p
            WHERE p.id::text=doc->>'po_id' AND p.organization_id=org AND p.purchase_request_id=b.request_id)))
        THEN RAISE EXCEPTION 'PR downstream execution is not integrated' USING ERRCODE='23514'; END IF;`));
    await r.query(`CREATE TRIGGER a_d2_pr_receipt_gate BEFORE INSERT OR UPDATE ON purchase_goods_receipts
      FOR EACH ROW EXECUTE FUNCTION commitment_reservation_downstream_gate()`);
    await r.query(`
      CREATE FUNCTION commitment_pr_check(rid uuid) RETURNS void LANGUAGE plpgsql AS $$
      DECLARE r purchase_requests; b commitment_pr_lines; a commitment_accounts; e commitment_entitlements; l jsonb; h numeric; f numeric;
      BEGIN
        SELECT * INTO STRICT r FROM purchase_requests WHERE id=rid;
        IF jsonb_array_length(r.lines)<>1 OR r.status NOT IN ('draft','reviewed','approved','cancelled')
          THEN RAISE EXCEPTION 'Only single-line uncommitted PRs integrated' USING ERRCODE='23514'; END IF;
        l=r.lines->0;
        SELECT * INTO STRICT b FROM commitment_pr_lines WHERE request_id=rid AND line_id=(l->>'id')::uuid AND organization_id=r.organization_id;
        SELECT * INTO STRICT a FROM commitment_accounts WHERE id=b.account_id AND organization_id=b.organization_id;
        SELECT * INTO STRICT e FROM commitment_entitlements WHERE id=b.entitlement_id AND account_id=a.id;
        PERFORM requirement_assert(r.organization_id,a.project_id,a.site_id,e.revision,e.approval_id);
        PERFORM commitment_reservation_clean(r.organization_id,a.project_id);
        IF EXISTS(SELECT 1 FROM purchase_orders WHERE purchase_request_id=rid AND organization_id=r.organization_id)
          THEN RAISE EXCEPTION 'PR downstream lineage requires reconciliation' USING ERRCODE='23514'; END IF;
        IF (l-'quantity'-'canonical_quantity') IS DISTINCT FROM (b.frozen_line-'quantity'-'canonical_quantity')
          OR a.dimension<>'material' OR a.project_id::text IS DISTINCT FROM l->>'project_id'
          OR a.site_id::text IS DISTINCT FROM l->>'site_id' OR a.item_key IS DISTINCT FROM l->>'item_id'
          OR a.unit IS DISTINCT FROM l->>'unit' OR a.unit IS DISTINCT FROM l->>'canonical_unit'
          OR e.approval_id::text IS DISTINCT FROM l->>'requirement_approval_id' OR e.revision::text IS DISTINCT FROM l->>'demand_revision'
          OR l->>'quantity' IS DISTINCT FROM l->>'canonical_quantity'
          OR (l->>'quantity')::numeric<=0 OR (l->>'quantity')::numeric<>round((l->>'quantity')::numeric,4)
          OR NOT EXISTS(SELECT 1 FROM requirement_execution_bindings x WHERE x.kind='purchase_request_lines' AND x.record_id=b.line_id
            AND x.organization_id=r.organization_id AND x.project_id=a.project_id AND x.site_id=a.site_id AND x.approval_id=e.approval_id AND x.revision=e.revision)
          THEN RAISE EXCEPTION 'Exact frozen PR approval/material identity required' USING ERRCODE='23514'; END IF;
        IF EXISTS(SELECT 1 FROM commitment_sources s JOIN commitment_claims c ON c.id=s.claim_id
          WHERE s.kind='purchase_request_line' AND s.source_id=b.line_id::text
          AND (s.organization_id<>b.organization_id OR s.account_id<>a.id OR c.source_kind<>s.kind
            OR c.source_id<>s.source_id OR c.source_slice<>s.slice OR c.retired OR c.parent_id IS NOT NULL OR c.fulfilled<>0))
          THEN RAISE EXCEPTION 'PR transfer/split/consumption unsupported' USING ERRCODE='23514'; END IF;
        SELECT coalesce(sum(held),0),coalesce(sum(fulfilled),0) INTO h,f FROM commitment_claims
          WHERE source_kind='purchase_request_line' AND source_id=b.line_id::text AND organization_id=b.organization_id AND account_id=a.id;
        IF f<>0 OR h<>(CASE WHEN r.status='cancelled' THEN 0 ELSE (l->>'canonical_quantity')::numeric END)
          THEN RAISE EXCEPTION 'PR quantity and exclusive held coverage differ' USING ERRCODE='23514'; END IF;
      END $$;
      CREATE FUNCTION commitment_pr_witness() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE rid uuid;
      BEGIN
        IF TG_TABLE_NAME='commitment_claims' THEN
          IF NEW.source_kind<>'purchase_request_line' AND (TG_OP='INSERT' OR OLD.source_kind<>'purchase_request_line') THEN RETURN NULL; END IF;
          SELECT request_id INTO STRICT rid FROM commitment_pr_lines WHERE line_id=
            (CASE WHEN TG_OP='UPDATE' AND OLD.source_kind='purchase_request_line' THEN OLD.source_id ELSE NEW.source_id END)::uuid;
        ELSIF TG_TABLE_NAME='purchase_requests' THEN
          IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.lines) l WHERE l->>'project_id' IS NOT NULL)
            AND NOT EXISTS(SELECT 1 FROM commitment_pr_lines WHERE request_id=NEW.id) THEN RETURN NULL; END IF;
          rid=NEW.id;
        ELSE rid=NEW.request_id; END IF;
        PERFORM commitment_pr_check(rid); RETURN NULL;
      END $$;
      CREATE CONSTRAINT TRIGGER commitment_pr_witness AFTER INSERT OR UPDATE ON purchase_requests
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_pr_witness();
      CREATE CONSTRAINT TRIGGER commitment_pr_witness AFTER INSERT ON commitment_pr_lines
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_pr_witness();
      CREATE CONSTRAINT TRIGGER commitment_pr_witness AFTER INSERT OR UPDATE ON commitment_claims
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_pr_witness();
    `);
    for (const signature of ["commitment_pr_check(uuid)","commitment_pr_witness()","requirement_supply_guard()"])
      await r.query(`ALTER FUNCTION ${signature} SET search_path TO pg_catalog,"${scope.schema}",pg_temp; REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC`);
  }
  async down(): Promise<void> {
    throw new Error("PR commitment activation requires verified backup restore/replay; destructive downgrade forbidden");
  }
}
