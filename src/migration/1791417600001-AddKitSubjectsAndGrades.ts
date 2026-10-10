import { MigrationInterface, QueryRunner } from "typeorm";

/** Additive only: extends draft kit versions with an editable subject/grade structure
 *  and immutable per-revision snapshots. No inventory or operational tables are touched. */
export class AddKitSubjectsAndGrades1791417600001 implements MigrationInterface {
  name = "AddKitSubjectsAndGrades1791417600001";
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE product_template_versions ADD COLUMN subjects jsonb NOT NULL DEFAULT '[]'::jsonb`);
    // Composite identity required by the revision snapshot foreign key below.
    await runner.query(`ALTER TABLE product_template_versions ADD CONSTRAINT product_template_versions_id_org UNIQUE (id, organization_id)`);
    await runner.query(`CREATE TABLE product_template_revisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      version_id uuid NOT NULL, organization_id uuid NOT NULL,
      revision integer NOT NULL CHECK (revision > 0),
      name varchar(200) NOT NULL CHECK (length(trim(name)) > 0),
      description text NOT NULL DEFAULT '' CHECK (length(description) <= 5000),
      category varchar(100) NOT NULL DEFAULT '',
      status varchar(20) NOT NULL,
      subjects jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_by uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (version_id, revision),
      FOREIGN KEY (version_id, organization_id) REFERENCES product_template_versions(id, organization_id) ON DELETE RESTRICT
    )`);
    await runner.query(`CREATE INDEX product_template_revisions_version ON product_template_revisions(organization_id, version_id)`);
  }
  async down(runner: QueryRunner): Promise<void> {
    // Explicit rollback only; never invoked automatically by setup or startup.
    await runner.query(`DROP TABLE product_template_revisions`);
    await runner.query(`ALTER TABLE product_template_versions DROP CONSTRAINT product_template_versions_id_org`);
    await runner.query(`ALTER TABLE product_template_versions DROP COLUMN subjects`);
  }
}
