import { MigrationInterface, QueryRunner } from "typeorm";
export class AddPhysicalStocktake1791504000003 implements MigrationInterface {
  name = "AddPhysicalStocktake1791504000003";
  async up(r: QueryRunner): Promise<void> {
    await r.query(`CREATE TABLE physical_stocktakes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(200) NOT NULL, notes text NOT NULL DEFAULT '', status varchar(20) NOT NULL DEFAULT 'draft'
      CHECK(status IN ('draft','reviewed','approved','posted')), revision integer NOT NULL DEFAULT 1,
      targets jsonb NOT NULL, entries jsonb NOT NULL DEFAULT '[]', created_by uuid NOT NULL,
      reviewed_by uuid, approved_by uuid, posted_by uuid, review_reason text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,organization_id))`);
    await r.query(`CREATE TABLE physical_stock_scopes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), item_id uuid NOT NULL REFERENCES inventory_items(id),
      unit varchar(30) NOT NULL, locations jsonb NOT NULL, complete_coverage boolean NOT NULL,
      approved_by uuid NOT NULL, stocktake_id uuid NOT NULL,
      UNIQUE(organization_id,item_id), FOREIGN KEY(stocktake_id,organization_id) REFERENCES physical_stocktakes(id,organization_id))`);
    await r.query(`CREATE TABLE physical_stocktake_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, stocktake_id uuid NOT NULL,
      actor_id uuid NOT NULL, revision integer NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(stocktake_id,revision), FOREIGN KEY(stocktake_id,organization_id) REFERENCES physical_stocktakes(id,organization_id))`);
    await r.query(`ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS verified_unit varchar(30),
      ADD COLUMN IF NOT EXISTS verification_entry_id uuid, ADD COLUMN IF NOT EXISTS physical_location varchar(100),
      ADD COLUMN IF NOT EXISTS physical_sequence integer, ADD COLUMN IF NOT EXISTS stocktake_id uuid`);
    await r.query(`ALTER TABLE stock_ledger ADD CONSTRAINT physical_ledger_session_fk FOREIGN KEY(stocktake_id,organization_id) REFERENCES physical_stocktakes(id,organization_id),
      ADD CONSTRAINT physical_ledger_fields CHECK(verification_entry_id IS NULL OR
      (stocktake_id IS NOT NULL AND verified_unit IS NOT NULL AND physical_location IS NOT NULL AND physical_sequence > 0 AND running_balance >= 0))`);
    await r.query(`CREATE UNIQUE INDEX physical_ledger_entry_once ON stock_ledger(verification_entry_id) WHERE verification_entry_id IS NOT NULL`);
    await r.query(`CREATE UNIQUE INDEX physical_ledger_sequence ON stock_ledger(organization_id,item_id,physical_location,physical_sequence) WHERE verification_entry_id IS NOT NULL`);
    await r.query(`CREATE FUNCTION protect_physical_records() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF TG_TABLE_NAME = 'physical_stocktakes' THEN
        IF OLD.status = 'posted' THEN RAISE EXCEPTION 'Posted stocktake is immutable'; END IF;
      ELSE RAISE EXCEPTION 'Physical stock provenance is immutable'; END IF;
      RETURN NEW;
    END $$`);
    for (const table of ["physical_stocktakes", "physical_stock_scopes", "physical_stocktake_events"])
      await r.query(`CREATE TRIGGER ${table}_immutable BEFORE UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION protect_physical_records()`);
    await r.query(`CREATE FUNCTION guard_physical_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF TG_OP <> 'INSERT' THEN
        IF OLD.verification_entry_id IS NOT NULL OR (TG_OP = 'UPDATE' AND NEW.verification_entry_id IS NOT NULL)
        THEN RAISE EXCEPTION 'Verified ledger is immutable'; END IF;
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW;
      END IF;
      IF NEW.verification_entry_id IS NULL THEN
        IF EXISTS(SELECT 1 FROM physical_stock_scopes WHERE item_id=NEW.item_id)
        THEN RAISE EXCEPTION 'Legacy movements cannot change verified stock'; END IF;
      ELSE
        IF NOT EXISTS(SELECT 1 FROM physical_stocktakes s, jsonb_array_elements(s.entries) e
          WHERE s.id=NEW.stocktake_id AND s.organization_id=NEW.organization_id AND s.status='approved'
          AND e->>'id'=NEW.verification_entry_id::text AND e->>'item_id'=NEW.item_id::text
          AND e->>'location'=NEW.physical_location AND e->>'canonical_unit'=NEW.verified_unit
          AND (e->>'sequence')::integer + 1 = NEW.physical_sequence
          AND (e->>'canonical_quantity')::numeric = NEW.running_balance
          AND NEW.qty_delta = NEW.running_balance - COALESCE((e->>'baseline')::numeric,0))
        THEN RAISE EXCEPTION 'Approved count provenance required'; END IF;
        IF NOT EXISTS(SELECT 1 FROM inventory_items WHERE id=NEW.item_id AND organization_id=NEW.organization_id)
        THEN RAISE EXCEPTION 'Inventory ownership mismatch'; END IF;
      END IF; RETURN NEW;
    END $$`);
    await r.query(`CREATE TRIGGER physical_ledger_guard BEFORE INSERT OR UPDATE OR DELETE ON stock_ledger FOR EACH ROW EXECUTE FUNCTION guard_physical_ledger()`);
    await r.query(`CREATE FUNCTION guard_verified_legacy_values() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF EXISTS(SELECT 1 FROM physical_stock_scopes WHERE item_id=OLD.id) AND
        (TG_OP='DELETE' OR NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.unit IS DISTINCT FROM OLD.unit
         OR NEW.bin_location IS DISTINCT FROM OLD.bin_location OR NEW.warehouse_id IS DISTINCT FROM OLD.warehouse_id)
      THEN RAISE EXCEPTION 'Verified stock must use approved ledger movements; legacy values are preserved'; END IF;
      IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
    END $$`);
    await r.query(`CREATE TRIGGER verified_inventory_guard BEFORE UPDATE OR DELETE ON inventory_items FOR EACH ROW EXECUTE FUNCTION guard_verified_legacy_values()`);
    await r.query(`CREATE FUNCTION guard_verified_legacy_locations() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF EXISTS(SELECT 1 FROM physical_stock_scopes WHERE item_id=CASE WHEN TG_OP='DELETE' THEN OLD.item_id ELSE NEW.item_id END)
        OR (TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM physical_stock_scopes WHERE item_id=OLD.item_id))
      THEN RAISE EXCEPTION 'Legacy location balances cannot change verified stock'; END IF;
      IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
    END $$`);
    await r.query(`CREATE TRIGGER verified_location_guard BEFORE INSERT OR UPDATE OR DELETE ON stock_locations FOR EACH ROW EXECUTE FUNCTION guard_verified_legacy_locations()`);
  }
  async down(r: QueryRunner): Promise<void> {
    const rows: { count: string }[] = await r.query("SELECT count(*) FROM physical_stocktakes");
    if (rows[0].count !== "0") throw new Error("Rollback refuses to discard physical stocktake history; use a forward migration");
    await r.query("DROP TRIGGER verified_inventory_guard ON inventory_items; DROP TRIGGER physical_ledger_guard ON stock_ledger; DROP TRIGGER verified_location_guard ON stock_locations");
    await r.query("ALTER TABLE stock_ledger DROP CONSTRAINT physical_ledger_session_fk, DROP CONSTRAINT physical_ledger_fields");
    await r.query("DROP INDEX physical_ledger_entry_once; DROP INDEX physical_ledger_sequence");
    await r.query("ALTER TABLE stock_ledger DROP COLUMN verified_unit, DROP COLUMN verification_entry_id, DROP COLUMN physical_location, DROP COLUMN physical_sequence, DROP COLUMN stocktake_id");
    await r.query("DROP TABLE physical_stocktake_events, physical_stock_scopes, physical_stocktakes; DROP FUNCTION protect_physical_records(); DROP FUNCTION guard_physical_ledger(); DROP FUNCTION guard_verified_legacy_values(); DROP FUNCTION guard_verified_legacy_locations()");
  }
}
