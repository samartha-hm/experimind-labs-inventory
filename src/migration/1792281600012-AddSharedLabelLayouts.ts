import type {MigrationInterface,QueryRunner} from "typeorm";
export class AddSharedLabelLayouts1792281600012 implements MigrationInterface {
  name="AddSharedLabelLayouts1792281600012";
  async up(r:QueryRunner){
    await r.query(`CREATE TABLE organization_label_layouts (
      organization_id uuid NOT NULL REFERENCES organizations(id), revision integer NOT NULL CHECK(revision>0),
      template jsonb NOT NULL CHECK(template ?& ARRAY['width','height','fontSize','materials'] AND jsonb_typeof(template)='object' AND jsonb_typeof(template->'width')='number' AND jsonb_typeof(template->'height')='number' AND jsonb_typeof(template->'fontSize')='number' AND jsonb_typeof(template->'materials')='boolean' AND (template->>'width')::numeric BETWEEN 90 AND 210 AND (template->>'height')::numeric BETWEEN 80 AND 297 AND (template->>'fontSize')::numeric BETWEEN 7 AND 12),
      created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
      idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 1 AND 128), input_hash text NOT NULL,
      PRIMARY KEY(organization_id,revision), UNIQUE(organization_id,created_by,idempotency_key))`);
    await r.query(`CREATE TRIGGER organization_label_layouts_immutable BEFORE UPDATE OR DELETE ON organization_label_layouts FOR EACH ROW EXECUTE FUNCTION planning_immutable_record()`);
  }
  async down(r:QueryRunner){
    if((await r.query("SELECT EXISTS(SELECT 1 FROM organization_label_layouts) populated"))[0].populated)throw new Error("Refusing populated label layout rollback");
    await r.query("DROP TABLE organization_label_layouts");
  }
}
