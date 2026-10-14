import type { MigrationInterface, QueryRunner } from "typeorm";
export class AddPrivateAttachments1792195200011 implements MigrationInterface {
  name = "AddPrivateAttachments1792195200011";
  async up(r: QueryRunner) {
    await r.query(`CREATE TABLE private_attachments (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), project_id uuid NOT NULL,
      site_id uuid, related_kind text NOT NULL CHECK(related_kind IN ('project','survey','installation','delivery')), related_id uuid,
      name text NOT NULL CHECK(length(name) BETWEEN 1 AND 160), mime text NOT NULL CHECK(mime IN ('image/png','image/jpeg','application/pdf','text/plain')),
      size integer NOT NULL CHECK(size BETWEEN 1 AND 10485760), digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
      created_by uuid NOT NULL REFERENCES users(id), idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 1 AND 128), input_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,organization_id), UNIQUE(organization_id,created_by,idempotency_key),
      FOREIGN KEY(project_id,organization_id) REFERENCES planning_projects(id,organization_id),
      FOREIGN KEY(site_id,project_id,organization_id) REFERENCES planning_sites(id,project_id,organization_id))`);
    await r.query(`CREATE TABLE private_attachment_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, attachment_id uuid NOT NULL,
      actor_id uuid NOT NULL REFERENCES users(id), action text NOT NULL CHECK(action IN ('upload','download')),
      created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(attachment_id,organization_id) REFERENCES private_attachments(id,organization_id))`);
    await r.query(`CREATE TRIGGER private_attachments_immutable BEFORE UPDATE OR DELETE ON private_attachments FOR EACH ROW EXECUTE FUNCTION planning_immutable_record()`);
    await r.query(`CREATE TRIGGER private_attachment_events_immutable BEFORE UPDATE OR DELETE ON private_attachment_events FOR EACH ROW EXECUTE FUNCTION planning_immutable_record()`);
  }
  async down(r: QueryRunner) {
    if ((await r.query("SELECT EXISTS(SELECT 1 FROM private_attachments) populated"))[0].populated) throw new Error("Refusing populated attachment rollback");
    await r.query("DROP TABLE private_attachment_events, private_attachments");
  }
}
