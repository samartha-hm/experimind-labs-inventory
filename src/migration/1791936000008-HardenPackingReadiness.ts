import type { MigrationInterface, QueryRunner } from "typeorm";

/** Additive guard; retained orders, inventory and ledger rows are never rewritten. */
export class HardenPackingReadiness1791936000008 implements MigrationInterface {
  name = "HardenPackingReadiness1791936000008";
  async up(r: QueryRunner): Promise<void> {
    await r.query(`CREATE FUNCTION guard_packing_readiness() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE p jsonb; progress jsonb; checks jsonb; checker uuid;
    BEGIN
      IF NEW.status='ready' THEN
        IF NEW.approved_by IS NULL OR jsonb_array_length(NEW.snapshot->'packages')=0 THEN RAISE EXCEPTION 'Approved packages required'; END IF;
        IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.execution->'exceptions') e WHERE e->>'corrected_by' IS NULL) THEN RAISE EXCEPTION 'Correct all packing exceptions'; END IF;
        FOR p IN SELECT * FROM jsonb_array_elements(NEW.snapshot->'packages') LOOP
          progress:=NEW.execution->'progress'->(p->>'id'); checks:=progress->'checks';
          IF progress->>'assembled' IS DISTINCT FROM 'true' OR progress->>'qc' IS DISTINCT FROM 'accepted'
            OR progress->>'packed_by' IS NULL OR progress->>'checked_at' IS NULL
            OR checks IS NULL OR jsonb_typeof(checks)<>'object' THEN RAISE EXCEPTION 'Complete assembly and QC required'; END IF;
          IF EXISTS(SELECT 1 FROM unnest(ARRAY['material','quantity','placement','packaging','stickers','instructions']) k WHERE checks->k IS DISTINCT FROM 'true'::jsonb) THEN RAISE EXCEPTION 'All QC checks must pass'; END IF;
          checker:=(progress->>'checked_by')::uuid;
          IF NOT EXISTS(SELECT 1 FROM users WHERE id=checker AND organization_id=NEW.organization_id AND is_active AND role IN ('admin','super_admin','manager','inventory_staff')) THEN RAISE EXCEPTION 'Authorized tenant QC required'; END IF;
        END LOOP;
      END IF;
      RETURN NEW;
    END $$`);
    await r.query(`CREATE TRIGGER packing_readiness_guard BEFORE INSERT OR UPDATE ON packing_orders FOR EACH ROW EXECUTE FUNCTION guard_packing_readiness()`);
  }
  async down(r: QueryRunner): Promise<void> {
    if ((await r.query("SELECT 1 FROM packing_orders WHERE status='ready' LIMIT 1")).length) throw new Error("Ready packing history exists; retain readiness guard");
    await r.query("DROP TRIGGER packing_readiness_guard ON packing_orders");
    await r.query("DROP FUNCTION guard_packing_readiness()");
  }
}
