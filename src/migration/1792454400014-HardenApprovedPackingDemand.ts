import type { MigrationInterface, QueryRunner } from "typeorm";

export class HardenApprovedPackingDemand1792454400014 implements MigrationInterface {
  name = "HardenApprovedPackingDemand1792454400014";

  async up(r: QueryRunner): Promise<void> {
    await r.query(`CREATE FUNCTION requirement_packing_changes_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.project_id IS NOT NULL AND COALESCE(NEW.execution->'changes','[]'::jsonb) <> '[]'::jsonb THEN
          RAISE EXCEPTION 'Packing demand changes require a newly saved and approved requirement revision' USING ERRCODE='23514';
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER requirement_packing_changes BEFORE INSERT OR UPDATE ON packing_orders
        FOR EACH ROW EXECUTE FUNCTION requirement_packing_changes_guard()`);
  }

  async down(r: QueryRunner): Promise<void> {
    if ((await r.query("SELECT 1 FROM requirement_approvals LIMIT 1")).length)
      throw new Error("Approved requirements require forward recovery; packing guard cannot be removed");
    await r.query(`DROP TRIGGER requirement_packing_changes ON packing_orders;
      DROP FUNCTION requirement_packing_changes_guard()`);
  }
}
