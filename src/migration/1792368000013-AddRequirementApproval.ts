import type { MigrationInterface, QueryRunner } from "typeorm";

const roots = ["project_stock_reservations", "production_work_orders", "packing_orders", "delivery_orders", "site_installations", "project_completions"];
const children: Record<string, string> = {
  production_input_reservations: "production_work_orders", production_input_issues: "production_work_orders",
  production_batches: "production_work_orders", production_qc_decisions: "production_work_orders",
  packing_picks: "packing_orders", delivery_package_claims: "delivery_orders", package_custody_events: "delivery_orders",
};
export class AddRequirementApproval1792368000013 implements MigrationInterface {
  name = "AddRequirementApproval1792368000013";
  async up(r: QueryRunner): Promise<void> {
    await r.query(`ALTER TABLE planning_project_revisions ADD CONSTRAINT requirement_source_owned UNIQUE(project_id,organization_id,revision);
      CREATE TABLE requirement_approvals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, project_id uuid NOT NULL, revision int NOT NULL,
        snapshot jsonb NOT NULL, snapshot_hash varchar(64) NOT NULL CHECK(snapshot_hash ~ '^[0-9a-f]{64}$'),
        approved_by uuid NOT NULL, approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        UNIQUE(organization_id,project_id,revision), UNIQUE(id,organization_id),
        FOREIGN KEY(project_id,organization_id,revision) REFERENCES planning_project_revisions(project_id,organization_id,revision));
      CREATE TABLE requirement_approval_retries (
        organization_id uuid NOT NULL, actor_id uuid NOT NULL, key varchar(100) NOT NULL,
        project_id uuid NOT NULL, revision int NOT NULL, approval_id uuid NOT NULL,
        PRIMARY KEY(organization_id,actor_id,key),
        FOREIGN KEY(approval_id,organization_id) REFERENCES requirement_approvals(id,organization_id));
      CREATE TABLE requirement_execution_bindings (
        kind text NOT NULL, record_id uuid NOT NULL, organization_id uuid NOT NULL, project_id uuid NOT NULL,
        site_id uuid, revision int NOT NULL, approval_id uuid NOT NULL, bound_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY(kind,record_id,organization_id),
        FOREIGN KEY(approval_id,organization_id) REFERENCES requirement_approvals(id,organization_id));`);
    await r.query(`CREATE FUNCTION requirement_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE a requirement_approvals; p planning_projects;
      BEGIN
        IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Requirement evidence immutable'; END IF;
        IF TG_TABLE_NAME='requirement_approvals' THEN
          SELECT * INTO p FROM planning_projects WHERE id=NEW.project_id AND organization_id=NEW.organization_id FOR UPDATE;
          IF NOT FOUND OR p.archived_at IS NOT NULL OR p.revision<>NEW.revision OR
             EXISTS(SELECT 1 FROM project_completions WHERE project_id=p.id AND organization_id=p.organization_id AND status='closed') THEN
            RAISE EXCEPTION 'Current open requirement revision required' USING ERRCODE='23514'; END IF;
          IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.approved_by AND organization_id=NEW.organization_id AND is_active AND role IN ('admin','super_admin')) THEN
            RAISE EXCEPTION 'Active tenant requirement approver required' USING ERRCODE='23514'; END IF;
          IF NOT EXISTS(SELECT 1 FROM planning_project_revisions WHERE project_id=p.id AND organization_id=p.organization_id AND revision=p.revision AND NOT archived AND content=NEW.snapshot->'content') THEN
            RAISE EXCEPTION 'Exact saved requirement source required' USING ERRCODE='23514'; END IF;
        ELSE
          SELECT * INTO a FROM requirement_approvals WHERE id=NEW.approval_id AND organization_id=NEW.organization_id;
          IF NOT FOUND OR a.project_id<>NEW.project_id OR a.revision<>NEW.revision THEN
            RAISE EXCEPTION 'Requirement evidence identity mismatch' USING ERRCODE='23514'; END IF;
          IF TG_TABLE_NAME='requirement_approval_retries' THEN
            IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_id AND organization_id=NEW.organization_id AND is_active AND role IN ('admin','super_admin')) THEN
              RAISE EXCEPTION 'Active tenant retry actor required' USING ERRCODE='23514'; END IF;
          END IF;
          IF TG_TABLE_NAME='requirement_execution_bindings' THEN
            PERFORM requirement_assert(NEW.organization_id,NEW.project_id,NEW.site_id,NEW.revision,NEW.approval_id);
          END IF;
        END IF;
        RETURN NEW;
      END $$`);
    await r.query(`CREATE FUNCTION requirement_assert(org uuid,project uuid,site uuid,rev int,approval uuid,allow_closed boolean DEFAULT false) RETURNS void LANGUAGE plpgsql AS $$
      DECLARE p planning_projects; a requirement_approvals;
      BEGIN
        SELECT * INTO p FROM planning_projects WHERE id=project AND organization_id=org FOR UPDATE;
        IF NOT FOUND OR p.archived_at IS NOT NULL OR p.revision<>rev OR
          (NOT allow_closed AND EXISTS(SELECT 1 FROM project_completions WHERE project_id=project AND organization_id=org AND status='closed')) THEN
          RAISE EXCEPTION 'Requirement revision is superseded, archived or closed' USING ERRCODE='23514'; END IF;
        SELECT * INTO a FROM requirement_approvals WHERE id=approval AND organization_id=org AND project_id=project AND revision=rev;
        IF NOT FOUND OR (site IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(a.snapshot->'content'->'sites') s WHERE s->>'id'=site::text)) THEN
          RAISE EXCEPTION 'Exact approved school requirement required' USING ERRCODE='23514'; END IF;
      END $$`);
    await r.query(`CREATE FUNCTION requirement_check_binding(kind_name text,identity uuid,org uuid) RETURNS void LANGUAGE plpgsql AS $$
      DECLARE b requirement_execution_bindings; project uuid;
      BEGIN
        SELECT * INTO b FROM requirement_execution_bindings WHERE kind=kind_name AND record_id=identity AND organization_id=org;
        IF NOT FOUND THEN
          EXECUTE format('SELECT project_id FROM %I WHERE id=$1 AND organization_id=$2',kind_name) INTO project USING identity,org;
          IF project IS NOT NULL THEN RAISE EXCEPTION 'Historical execution requires explicit approval reconciliation' USING ERRCODE='23514'; END IF;
          RETURN;
        END IF;
        PERFORM requirement_assert(org,b.project_id,b.site_id,b.revision,b.approval_id);
      END $$`);
    await r.query(`CREATE FUNCTION requirement_lifecycle_sources(org uuid,project uuid,site uuid,approval uuid,installation boolean) RETURNS void LANGUAGE plpgsql AS $$
      DECLARE source record;
      BEGIN
        FOR source IN
          SELECT 'delivery_orders' kind,id FROM delivery_orders WHERE organization_id=org AND project_id=project AND (site IS NULL OR site_id=site)
          UNION ALL SELECT 'packing_orders',id FROM packing_orders WHERE NOT installation AND organization_id=org AND project_id=project
          UNION ALL SELECT 'site_installations',id FROM site_installations WHERE NOT installation AND organization_id=org AND project_id=project
          UNION ALL SELECT 'production_work_orders',id FROM production_work_orders WHERE NOT installation AND organization_id=org AND project_id=project
          UNION ALL SELECT 'project_stock_reservations',id FROM project_stock_reservations WHERE NOT installation AND organization_id=org AND project_id=project
          UNION ALL SELECT 'purchase_request_lines',(l->>'id')::uuid FROM purchase_requests p,jsonb_array_elements(p.lines) l
            WHERE NOT installation AND p.organization_id=org AND l->>'project_id'=project::text
        LOOP
          IF NOT EXISTS(SELECT 1 FROM requirement_execution_bindings WHERE kind=source.kind AND record_id=source.id AND organization_id=org AND approval_id=approval) THEN
            RAISE EXCEPTION 'Lifecycle source requires exact approval reconciliation' USING ERRCODE='23514';
          END IF;
        END LOOP;
      END $$`);
    await r.query(`CREATE FUNCTION requirement_root_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE b requirement_execution_bindings; a requirement_approvals; rev int; source requirement_execution_bindings;
      BEGIN
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Execution requirement history immutable'; END IF;
        IF TG_OP='UPDATE' THEN
          SELECT * INTO b FROM requirement_execution_bindings WHERE kind=TG_TABLE_NAME AND record_id=OLD.id AND organization_id=OLD.organization_id;
          IF OLD.project_id IS NULL AND NEW.project_id IS NULL THEN RETURN NEW; END IF;
          IF NOT FOUND OR NEW.id<>OLD.id OR NEW.organization_id<>OLD.organization_id OR NEW.project_id IS DISTINCT FROM OLD.project_id OR
            (to_jsonb(NEW)->>'site_id') IS DISTINCT FROM (to_jsonb(OLD)->>'site_id') OR
            (to_jsonb(NEW)->>'demand_revision') IS DISTINCT FROM (to_jsonb(OLD)->>'demand_revision') THEN
            RAISE EXCEPTION 'Missing or mismatched immutable requirement binding' USING ERRCODE='23514'; END IF;
          PERFORM requirement_assert(b.organization_id,b.project_id,b.site_id,b.revision,b.approval_id,TG_TABLE_NAME='project_completions' AND to_jsonb(NEW)->>'status'='active');
          IF TG_TABLE_NAME IN ('site_installations','project_completions') THEN
            PERFORM requirement_lifecycle_sources(b.organization_id,b.project_id,b.site_id,b.approval_id,TG_TABLE_NAME='site_installations');
          END IF;
          RETURN NEW;
        END IF;
        IF NEW.project_id IS NULL THEN RETURN NEW; END IF;
        IF TG_TABLE_NAME='project_completions' THEN
          SELECT * INTO b FROM requirement_execution_bindings WHERE kind=TG_TABLE_NAME AND organization_id=NEW.organization_id AND record_id IN
            (SELECT id FROM project_completions WHERE organization_id=NEW.organization_id AND project_id=NEW.project_id);
          IF FOUND THEN
            IF b.revision IS DISTINCT FROM (to_jsonb(NEW)->>'project_revision')::int THEN RAISE EXCEPTION 'Completion approval mismatch' USING ERRCODE='23514'; END IF;
            PERFORM requirement_assert(b.organization_id,b.project_id,b.site_id,b.revision,b.approval_id,to_jsonb(NEW)->>'status'='active');
            RETURN NEW;
          END IF;
        END IF;
        SELECT revision INTO rev FROM planning_projects WHERE id=NEW.project_id AND organization_id=NEW.organization_id FOR UPDATE;
        IF (to_jsonb(NEW)->>'demand_revision') IS NOT NULL AND (to_jsonb(NEW)->>'demand_revision')::int<>rev THEN
          RAISE EXCEPTION 'Execution demand revision mismatch' USING ERRCODE='23514'; END IF;
        IF TG_TABLE_NAME='project_completions' AND (to_jsonb(NEW)->>'project_revision')::int IS DISTINCT FROM rev THEN RAISE EXCEPTION 'Completion revision mismatch' USING ERRCODE='23514'; END IF;
        SELECT * INTO a FROM requirement_approvals WHERE organization_id=NEW.organization_id AND project_id=NEW.project_id AND revision=rev;
        IF NOT FOUND THEN RAISE EXCEPTION 'Approve saved project requirements before execution' USING ERRCODE='23514'; END IF;
        IF TG_TABLE_NAME IN ('site_installations','project_completions') THEN
          PERFORM requirement_lifecycle_sources(NEW.organization_id,NEW.project_id,(to_jsonb(NEW)->>'site_id')::uuid,a.id,TG_TABLE_NAME='site_installations');
        END IF;
        IF TG_TABLE_NAME='packing_orders' THEN
          IF (SELECT jsonb_agg(l ORDER BY l::text) FROM jsonb_array_elements(NEW.snapshot->'lines') l) IS DISTINCT FROM
             (SELECT jsonb_agg(l ORDER BY l::text) FROM jsonb_array_elements(a.snapshot->'lines') l WHERE l->>'site_id'=NEW.site_id::text) THEN
            RAISE EXCEPTION 'Packing demand differs from immutable approval; save and approve a new revision' USING ERRCODE='23514'; END IF;
        END IF;
        IF TG_TABLE_NAME='production_work_orders' THEN
          IF NEW.planned_quantity>(SELECT COALESCE(SUM((l->>'quantity')::numeric),0) FROM jsonb_array_elements(a.snapshot->'lines') l
            WHERE l->>'site_id'=NEW.site_id::text AND l->>'inventory_item_id'=NEW.output_item_id::text AND l->>'unit'=NEW.unit) THEN
            RAISE EXCEPTION 'Production exceeds approved school demand' USING ERRCODE='23514'; END IF;
        END IF;
        IF TG_TABLE_NAME='delivery_orders' THEN
          SELECT * INTO source FROM requirement_execution_bindings WHERE kind='packing_orders' AND record_id=NEW.packing_order_id AND organization_id=NEW.organization_id;
          IF NOT FOUND OR source.approval_id<>a.id OR source.project_id<>NEW.project_id OR source.site_id<>NEW.site_id THEN
            RAISE EXCEPTION 'Delivery must inherit exact approved packing requirement' USING ERRCODE='23514'; END IF;
        END IF;
        INSERT INTO requirement_execution_bindings(kind,record_id,organization_id,project_id,site_id,revision,approval_id)
          VALUES(TG_TABLE_NAME,NEW.id,NEW.organization_id,NEW.project_id,(to_jsonb(NEW)->>'site_id')::uuid,rev,a.id);
        RETURN NEW;
      END $$`);
    await r.query(`CREATE FUNCTION requirement_child_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM requirement_check_binding(TG_ARGV[0],NEW.order_id,NEW.organization_id);
        RETURN NEW;
      END $$`);
    await r.query(`CREATE FUNCTION requirement_supply_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE lines jsonb; line jsonb; stamped jsonb='[]'; b requirement_execution_bindings; a requirement_approvals; rev int;
      BEGIN
        IF TG_TABLE_NAME='purchase_requests' AND TG_OP='UPDATE' THEN
          IF NEW.lines IS DISTINCT FROM OLD.lines AND EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.lines) l WHERE l->>'project_id' IS NOT NULL) THEN
            RAISE EXCEPTION 'Approved procurement scope immutable; create a replacement request' USING ERRCODE='23514';
          END IF;
        END IF;
        IF TG_TABLE_NAME='purchase_goods_receipts' THEN
          SELECT planning_lines INTO lines FROM purchase_orders WHERE id=NEW.po_id AND organization_id=NEW.organization_id;
        ELSIF TG_TABLE_NAME='purchase_orders' THEN lines:=NEW.planning_lines;
        ELSE lines:=NEW.lines; END IF;
        FOR line IN SELECT value FROM jsonb_array_elements(COALESCE(lines,'[]')) LOOP
          IF line->>'project_id' IS NOT NULL THEN
            IF TG_TABLE_NAME='purchase_requests' AND TG_OP='INSERT' THEN
              SELECT revision INTO rev FROM planning_projects WHERE id=(line->>'project_id')::uuid AND organization_id=NEW.organization_id FOR UPDATE;
              IF line->>'demand_revision' IS NOT NULL AND (line->>'demand_revision')::int<>rev THEN
                RAISE EXCEPTION 'Purchase demand revision mismatch' USING ERRCODE='23514'; END IF;
              SELECT * INTO a FROM requirement_approvals WHERE organization_id=NEW.organization_id AND project_id=(line->>'project_id')::uuid AND revision=rev;
              IF NOT FOUND THEN RAISE EXCEPTION 'Approved purchase requirement required' USING ERRCODE='23514'; END IF;
              IF line->'demand_basis' IS NOT NULL AND
                EXISTS(SELECT 1 FROM jsonb_array_elements(line->'demand_basis') l WHERE NOT (a.snapshot->'lines' @> jsonb_build_array(l))) THEN
                RAISE EXCEPTION 'Purchase demand differs from immutable approval' USING ERRCODE='23514'; END IF;
              INSERT INTO requirement_execution_bindings(kind,record_id,organization_id,project_id,site_id,revision,approval_id)
                VALUES('purchase_request_lines',(line->>'id')::uuid,NEW.organization_id,(line->>'project_id')::uuid,(line->>'site_id')::uuid,rev,a.id);
              line:=line||jsonb_build_object('requirement_approval_id',a.id,'demand_revision',rev);
            ELSE
              SELECT * INTO b FROM requirement_execution_bindings WHERE kind='purchase_request_lines' AND record_id=(line->>'id')::uuid AND organization_id=NEW.organization_id;
              IF NOT FOUND OR b.project_id<>(line->>'project_id')::uuid OR b.site_id IS DISTINCT FROM (line->>'site_id')::uuid OR
                b.approval_id IS DISTINCT FROM (line->>'requirement_approval_id')::uuid OR b.revision IS DISTINCT FROM (line->>'demand_revision')::int THEN
                RAISE EXCEPTION 'Historical or mismatched procurement requirement' USING ERRCODE='23514'; END IF;
              PERFORM requirement_assert(b.organization_id,b.project_id,b.site_id,b.revision,b.approval_id);
            END IF;
          END IF;
          stamped:=stamped||jsonb_build_array(line);
        END LOOP;
        IF TG_TABLE_NAME='purchase_requests' THEN NEW.lines:=stamped; END IF;
        RETURN NEW;
      END $$`);
    // Child and ledger guards prevent stock/custody writes from preceding a later parent check.
    await r.query(`CREATE FUNCTION requirement_ledger_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE root_id uuid; line jsonb; b requirement_execution_bindings;
      BEGIN
        IF NEW.reservation_id IS NOT NULL THEN PERFORM requirement_check_binding('project_stock_reservations',NEW.reservation_id,NEW.organization_id); END IF;
        IF NEW.goods_receipt_id IS NOT NULL THEN
          SELECT po_id INTO root_id FROM purchase_goods_receipts WHERE id=NEW.goods_receipt_id AND organization_id=NEW.organization_id;
          PERFORM 1 FROM purchase_orders WHERE id=root_id AND organization_id=NEW.organization_id FOR UPDATE;
          FOR line IN SELECT l FROM purchase_orders p, jsonb_array_elements(p.planning_lines) l
            WHERE p.id=root_id AND p.organization_id=NEW.organization_id AND l->>'project_id' IS NOT NULL LOOP
            SELECT * INTO b FROM requirement_execution_bindings WHERE kind='purchase_request_lines' AND record_id=(line->>'id')::uuid AND organization_id=NEW.organization_id;
            IF NOT FOUND THEN RAISE EXCEPTION 'Historical receipt requires approval reconciliation' USING ERRCODE='23514'; END IF;
            PERFORM requirement_assert(b.organization_id,b.project_id,b.site_id,b.revision,b.approval_id);
          END LOOP;
        END IF;
        IF NEW.production_issue_id IS NOT NULL THEN
          SELECT order_id INTO root_id FROM production_input_issues WHERE id=NEW.production_issue_id AND organization_id=NEW.organization_id;
          PERFORM requirement_check_binding('production_work_orders',root_id,NEW.organization_id);
        END IF;
        IF NEW.production_qc_id IS NOT NULL THEN
          SELECT order_id INTO root_id FROM production_qc_decisions WHERE id=NEW.production_qc_id AND organization_id=NEW.organization_id;
          PERFORM requirement_check_binding('production_work_orders',root_id,NEW.organization_id);
        END IF;
        IF NEW.packing_pick_id IS NOT NULL THEN
          SELECT order_id INTO root_id FROM packing_picks WHERE id=NEW.packing_pick_id AND organization_id=NEW.organization_id;
          PERFORM requirement_check_binding('packing_orders',root_id,NEW.organization_id);
        END IF;
        RETURN NEW;
      END $$`);
    for (const table of ["requirement_approvals", "requirement_approval_retries", "requirement_execution_bindings"])
      await r.query(`CREATE TRIGGER requirement_evidence BEFORE INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION requirement_evidence_guard()`);
    for (const table of roots) await r.query(`CREATE TRIGGER requirement_execution BEFORE INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION requirement_root_guard()`);
    for (const [table, parent] of Object.entries(children)) await r.query(`CREATE TRIGGER requirement_execution BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION requirement_child_guard('${parent}')`);
    for (const table of ["purchase_requests", "purchase_orders", "purchase_goods_receipts"]) await r.query(`CREATE TRIGGER requirement_execution BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION requirement_supply_guard()`);
    await r.query(`CREATE TRIGGER requirement_execution BEFORE INSERT ON stock_ledger FOR EACH ROW EXECUTE FUNCTION requirement_ledger_guard()`);
  }
  async down(r: QueryRunner): Promise<void> {
    if ((await r.query("SELECT 1 FROM requirement_approvals LIMIT 1")).length) throw new Error("Approval evidence exists; use forward recovery, not destructive rollback");
    for (const table of [...roots, ...Object.keys(children), "purchase_requests", "purchase_orders", "purchase_goods_receipts", "stock_ledger"])
      await r.query(`DROP TRIGGER requirement_execution ON ${table}`);
    await r.query(`DROP TABLE requirement_approval_retries,requirement_execution_bindings,requirement_approvals;
      DROP FUNCTION requirement_evidence_guard(),requirement_root_guard(),requirement_child_guard(),requirement_supply_guard(),requirement_ledger_guard(),requirement_check_binding(text,uuid,uuid),requirement_lifecycle_sources(uuid,uuid,uuid,uuid,boolean),requirement_assert(uuid,uuid,uuid,int,uuid,boolean);
      ALTER TABLE planning_project_revisions DROP CONSTRAINT requirement_source_owned`);
  }
}
