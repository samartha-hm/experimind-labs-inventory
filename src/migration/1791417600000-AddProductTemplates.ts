import { MigrationInterface, QueryRunner } from "typeorm";

/** Additive only: no existing inventory, kit or operational tables are altered. */
export class AddProductTemplates1791417600000 implements MigrationInterface {
  name = "AddProductTemplates1791417600000";
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE product_templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
      created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      archived_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (id, organization_id)
    )`);
    await runner.query(`CREATE INDEX product_templates_org_archive ON product_templates(organization_id, archived_at)`);
    await runner.query(`CREATE TABLE product_template_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid NOT NULL, organization_id uuid NOT NULL,
      version_number integer NOT NULL DEFAULT 1 CHECK (version_number > 0),
      status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','published','superseded','archived')),
      name varchar(200) NOT NULL CHECK (length(trim(name)) > 0),
      description text NOT NULL DEFAULT '' CHECK (length(description) <= 5000),
      category varchar(100) NOT NULL DEFAULT '',
      revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
      created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      updated_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (template_id, version_number),
      FOREIGN KEY (template_id, organization_id) REFERENCES product_templates(id, organization_id) ON DELETE RESTRICT
    )`);
    await runner.query(`CREATE INDEX product_template_versions_org ON product_template_versions(organization_id, template_id)`);
  }
  async down(runner: QueryRunner): Promise<void> {
    // Explicit rollback only; never invoked automatically by setup or startup.
    await runner.query(`DROP TABLE product_template_versions`);
    await runner.query(`DROP TABLE product_templates`);
  }
}
