import { MigrationInterface, QueryRunner } from "typeorm";

/** Additive planning only. Rollback refuses to discard recorded planning/approvals. */
export class AddProjectPlanning1791417600002 implements MigrationInterface {
  name = "AddProjectPlanning1791417600002";
  async up(r: QueryRunner): Promise<void> {
    await r.query(`CREATE TABLE planning_projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id),
      content jsonb NOT NULL, revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
      created_by uuid NOT NULL, updated_by uuid NOT NULL, archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(id, organization_id))`);
    await r.query(`CREATE INDEX planning_projects_tenant ON planning_projects(organization_id, updated_at)`);
    await r.query(`CREATE TABLE planning_sites (
      id uuid PRIMARY KEY, project_id uuid NOT NULL, organization_id uuid NOT NULL,
      position integer NOT NULL CHECK(position >= 0), content jsonb NOT NULL,
      UNIQUE(id, project_id, organization_id),
      FOREIGN KEY(project_id, organization_id) REFERENCES planning_projects(id, organization_id) ON DELETE RESTRICT)`);
    await r.query(`CREATE TABLE kit_template_approvals (
      version_id uuid PRIMARY KEY, organization_id uuid NOT NULL, source_version_id uuid NOT NULL,
      source_revision integer NOT NULL CHECK(source_revision > 0), approved_by uuid NOT NULL,
      approved_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source_version_id, source_revision),
      UNIQUE(version_id, organization_id),
      FOREIGN KEY(version_id, organization_id) REFERENCES product_template_versions(id, organization_id) ON DELETE RESTRICT,
      FOREIGN KEY(source_version_id, organization_id) REFERENCES product_template_versions(id, organization_id) ON DELETE RESTRICT)`);
    await r.query(`CREATE TABLE planning_version_links (
      selection_id uuid PRIMARY KEY, site_id uuid NOT NULL, project_id uuid NOT NULL,
      organization_id uuid NOT NULL, version_id uuid NOT NULL,
      FOREIGN KEY(site_id, project_id, organization_id) REFERENCES planning_sites(id, project_id, organization_id) ON DELETE RESTRICT,
      FOREIGN KEY(version_id, organization_id) REFERENCES kit_template_approvals(version_id, organization_id) ON DELETE RESTRICT)`);
    await r.query(`CREATE TABLE planning_project_revisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL, organization_id uuid NOT NULL,
      revision integer NOT NULL CHECK(revision > 0), content jsonb NOT NULL, archived boolean NOT NULL,
      updated_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id, revision),
      FOREIGN KEY(project_id, organization_id) REFERENCES planning_projects(id, organization_id) ON DELETE RESTRICT)`);
    // Functions live in this migration's schema; no public/shared function replacement.
    await r.query(`CREATE FUNCTION planning_immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Immutable planning record'; END $$`);
    await r.query(`CREATE FUNCTION planning_protect_published() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF OLD.status = 'published' THEN RAISE EXCEPTION 'Published kit version is immutable'; END IF;
      IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$`);
    await r.query(`CREATE TRIGGER planning_published_immutable BEFORE UPDATE OR DELETE ON product_template_versions
      FOR EACH ROW EXECUTE FUNCTION planning_protect_published()`);
    await r.query(`CREATE FUNCTION planning_approval_status() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NOT EXISTS(SELECT 1 FROM product_template_versions WHERE id = NEW.version_id
        AND organization_id = NEW.organization_id AND status = 'published') THEN
        RAISE EXCEPTION 'Approval requires a published version'; END IF; RETURN NEW; END $$`);
    await r.query(`CREATE TRIGGER planning_approval_check BEFORE INSERT ON kit_template_approvals
      FOR EACH ROW EXECUTE FUNCTION planning_approval_status()`);
    for (const table of ["kit_template_approvals", "planning_project_revisions"])
      await r.query(`CREATE TRIGGER planning_record_immutable BEFORE UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION planning_immutable_record()`);
  }
  async down(r: QueryRunner): Promise<void> {
    await r.query(`DO $$ BEGIN IF EXISTS(SELECT 1 FROM planning_projects) OR EXISTS(SELECT 1 FROM kit_template_approvals)
      THEN RAISE EXCEPTION 'Rollback blocked: preserve planning data and approvals first'; END IF; END $$`);
    await r.query(`DROP TABLE planning_version_links, planning_sites, planning_project_revisions, planning_projects, kit_template_approvals`);
    await r.query(`DROP TRIGGER planning_published_immutable ON product_template_versions`);
    await r.query(`DROP FUNCTION planning_approval_status(), planning_protect_published(), planning_immutable_record()`);
  }
}
