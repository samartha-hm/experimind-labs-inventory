import type { MigrationInterface, QueryRunner } from "typeorm";
export class AddProjectCompletion1792108800010 implements MigrationInterface {
  name = "AddProjectCompletion1792108800010";
  async up(r: QueryRunner): Promise<void> {
    await r.query(`CREATE TABLE site_installations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, project_id uuid NOT NULL, site_id uuid NOT NULL,
      revision integer NOT NULL DEFAULT 1 CHECK(revision>0), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','blocked','installed','completed')),
      required boolean NOT NULL, employee_id uuid, checklist jsonb NOT NULL CHECK(jsonb_typeof(checklist)='array'),
      notes text NOT NULL DEFAULT '', survey text NOT NULL DEFAULT '', issues jsonb NOT NULL DEFAULT '[]', acceptance jsonb,
      created_by uuid NOT NULL, updated_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(organization_id,project_id,site_id), UNIQUE(id,organization_id),
      FOREIGN KEY(site_id,project_id,organization_id) REFERENCES planning_sites(id,project_id,organization_id))`);
    await r.query(`CREATE TABLE project_completions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, project_id uuid NOT NULL,
      revision integer NOT NULL DEFAULT 1 CHECK(revision>0), status text NOT NULL CHECK(status IN ('active','closed')),
      project_revision integer NOT NULL CHECK(project_revision>0), acceptance jsonb, exception jsonb, reason text NOT NULL,
      updated_by uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,project_id), UNIQUE(id,organization_id),
      FOREIGN KEY(project_id,organization_id) REFERENCES planning_projects(id,organization_id))`);
    await r.query(`CREATE FUNCTION guard_project_lifecycle() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE project uuid; org uuid; actor uuid;
      BEGIN
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Lifecycle history immutable'; END IF;
        project:=NEW.project_id; org:=NEW.organization_id; actor:=NEW.updated_by;
        PERFORM 1 FROM planning_projects WHERE id=project AND organization_id=org AND archived_at IS NULL FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Active owned project required'; END IF;
        IF NOT EXISTS(SELECT 1 FROM users WHERE id=actor AND organization_id=org AND is_active) THEN RAISE EXCEPTION 'Owned active lifecycle actor required'; END IF;
        IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.project_id<>OLD.project_id OR NEW.organization_id<>OLD.organization_id OR NEW.revision<>OLD.revision+1) THEN RAISE EXCEPTION 'Lifecycle identity immutable; revision required'; END IF;
        IF TG_TABLE_NAME='site_installations' THEN
          IF TG_OP='UPDATE' AND (NEW.site_id<>OLD.site_id OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at) THEN RAISE EXCEPTION 'Installation provenance immutable'; END IF;
          IF NEW.employee_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.employee_id AND organization_id=org AND is_active) THEN RAISE EXCEPTION 'Owned active installer required'; END IF;
          IF NEW.status='completed' AND (NEW.acceptance IS NULL OR jsonb_typeof(NEW.acceptance)<>'object') THEN RAISE EXCEPTION 'Installation acceptance required'; END IF;
          IF NEW.status='completed' AND NOT EXISTS(SELECT 1 FROM users WHERE id=actor AND organization_id=org AND role IN ('admin','super_admin','manager') AND is_active) THEN RAISE EXCEPTION 'Authorized installation acceptance required'; END IF;
          IF EXISTS(SELECT 1 FROM project_completions WHERE project_id=project AND organization_id=org AND status='closed') THEN RAISE EXCEPTION 'Reopen closed project before changes'; END IF;
        ELSE
          IF NOT EXISTS(SELECT 1 FROM users WHERE id=actor AND organization_id=org AND role IN ('admin','super_admin','manager') AND is_active) THEN RAISE EXCEPTION 'Authorized project acceptance required'; END IF;
          IF NEW.status='closed' AND (NEW.acceptance IS NULL OR jsonb_typeof(NEW.acceptance)<>'object') THEN RAISE EXCEPTION 'Customer acceptance required'; END IF;
        END IF;
        RETURN NEW;
      END $$`);
    for (const table of ["site_installations", "project_completions"]) await r.query(`CREATE TRIGGER lifecycle_guard BEFORE INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION guard_project_lifecycle()`);
    // A shared project lock serializes closure against every scoped operational mutation.
    await r.query(`CREATE FUNCTION guard_closed_project_operations() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE project uuid; org uuid;
      BEGIN
        org:=NEW.organization_id;
        IF TG_TABLE_NAME='planning_projects' THEN project:=NEW.id; ELSE project:=NEW.project_id; END IF;
        IF project IS NOT NULL THEN
          PERFORM 1 FROM planning_projects WHERE id=project AND organization_id=org FOR UPDATE;
          IF EXISTS(SELECT 1 FROM project_completions WHERE project_id=project AND organization_id=org AND status='closed') THEN RAISE EXCEPTION 'Reopen closed project before operational changes'; END IF;
        END IF;
        RETURN NEW;
      END $$`);
    for (const table of ["planning_projects", "planning_sites", "delivery_orders", "packing_orders", "project_stock_reservations", "production_work_orders"]) await r.query(`CREATE TRIGGER closed_project_guard BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION guard_closed_project_operations()`);
  }
  async down(r: QueryRunner): Promise<void> {
    if ((await r.query("SELECT 1 FROM site_installations UNION ALL SELECT 1 FROM project_completions LIMIT 1")).length) throw new Error("Lifecycle history exists; refusing destructive rollback");
    for (const table of ["planning_projects", "planning_sites", "delivery_orders", "packing_orders", "project_stock_reservations", "production_work_orders"]) await r.query(`DROP TRIGGER closed_project_guard ON ${table}`);
    await r.query("DROP FUNCTION guard_closed_project_operations(); DROP TABLE site_installations,project_completions; DROP FUNCTION guard_project_lifecycle()");
  }
}
