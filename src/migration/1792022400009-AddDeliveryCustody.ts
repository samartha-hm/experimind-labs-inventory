import type { MigrationInterface, QueryRunner } from "typeorm";

/** Package custody is distinct from the material consumption already posted by packing. */
export class AddDeliveryCustody1792022400009 implements MigrationInterface {
  name = "AddDeliveryCustody1792022400009";
  async up(r: QueryRunner): Promise<void> {
    await r.query(`CREATE TABLE delivery_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id),
      project_id uuid NOT NULL, site_id uuid NOT NULL, packing_order_id uuid NOT NULL,
      number text NOT NULL UNIQUE, revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
      status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','dispatched','in_transit','partially_delivered','delivered','failed','returned','cancelled')),
      manifest jsonb NOT NULL CHECK(jsonb_typeof(manifest)='array' AND jsonb_array_length(manifest)>0),
      transport jsonb NOT NULL, destination jsonb NOT NULL, execution jsonb NOT NULL DEFAULT '{"proofs":[],"issues":[]}',
      created_by uuid NOT NULL, updated_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(id,organization_id), FOREIGN KEY(site_id,project_id,organization_id) REFERENCES planning_sites(id,project_id,organization_id),
      FOREIGN KEY(packing_order_id,organization_id) REFERENCES packing_orders(id,organization_id))`);
    await r.query(`CREATE TABLE delivery_package_claims (
      organization_id uuid NOT NULL, package_id uuid NOT NULL, order_id uuid NOT NULL, packing_order_id uuid NOT NULL,
      PRIMARY KEY(organization_id,package_id), FOREIGN KEY(order_id,organization_id) REFERENCES delivery_orders(id,organization_id),
      FOREIGN KEY(packing_order_id,organization_id) REFERENCES packing_orders(id,organization_id))`);
    await r.query(`CREATE TABLE package_custody_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, order_id uuid NOT NULL,
      package_id uuid NOT NULL, revision integer NOT NULL CHECK(revision>0), actor_id uuid NOT NULL,
      state text NOT NULL CHECK(state IN ('planned','dispatched','in_transit','delivered','failed','returned','cancelled')),
      location text NOT NULL, notes text NOT NULL DEFAULT '', pick_ledger_ids jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,order_id,package_id,revision),
      FOREIGN KEY(order_id,organization_id) REFERENCES delivery_orders(id,organization_id))`);
    await r.query(`CREATE INDEX delivery_project_site ON delivery_orders(organization_id,project_id,site_id)`);
    await r.query(`CREATE INDEX package_custody_lookup ON package_custody_events(organization_id,package_id,created_at)`);
    await r.query(`CREATE FUNCTION guard_delivery_records() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE p jsonb;
      BEGIN
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Delivery history immutable'; END IF;
        IF TG_TABLE_NAME='delivery_orders' THEN
          IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.organization_id<>OLD.organization_id OR NEW.project_id<>OLD.project_id OR NEW.site_id<>OLD.site_id OR NEW.packing_order_id<>OLD.packing_order_id OR NEW.number<>OLD.number OR NEW.manifest IS DISTINCT FROM OLD.manifest OR NEW.destination IS DISTINCT FROM OLD.destination OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at OR NEW.revision<>OLD.revision+1 OR OLD.status='cancelled') THEN RAISE EXCEPTION 'Delivery identity and manifest immutable; revision required'; END IF;
          IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.created_by AND organization_id=NEW.organization_id AND is_active) OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.updated_by AND organization_id=NEW.organization_id AND is_active) THEN RAISE EXCEPTION 'Delivery actor ownership mismatch'; END IF;
          PERFORM 1 FROM packing_orders WHERE id=NEW.packing_order_id AND organization_id=NEW.organization_id AND project_id=NEW.project_id AND site_id=NEW.site_id AND status='ready' FOR UPDATE;
          IF NOT FOUND THEN RAISE EXCEPTION 'QC Ready packing allocation required'; END IF;
          FOR p IN SELECT * FROM jsonb_array_elements(NEW.manifest) LOOP
            IF NOT EXISTS(SELECT 1 FROM packing_orders o,jsonb_array_elements(o.snapshot->'packages') q WHERE o.id=NEW.packing_order_id AND o.organization_id=NEW.organization_id AND q=p) THEN RAISE EXCEPTION 'Manifest must retain exact physical package snapshot'; END IF;
          END LOOP;
        ELSE
          IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Package custody and claims immutable'; END IF;
          IF NOT EXISTS(SELECT 1 FROM delivery_orders o,jsonb_array_elements(o.manifest) manifest_package WHERE o.id=NEW.order_id AND o.organization_id=NEW.organization_id AND (manifest_package->>'id')::uuid=NEW.package_id) THEN RAISE EXCEPTION 'Owned manifest package required'; END IF;
          IF TG_TABLE_NAME='delivery_package_claims' THEN
            IF NOT EXISTS(SELECT 1 FROM delivery_orders WHERE id=NEW.order_id AND organization_id=NEW.organization_id AND packing_order_id=NEW.packing_order_id) THEN RAISE EXCEPTION 'Packing allocation mismatch'; END IF;
          END IF;
          IF TG_TABLE_NAME='package_custody_events' THEN
            IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_id AND organization_id=NEW.organization_id AND is_active) THEN RAISE EXCEPTION 'Owned custody actor required'; END IF;
            IF NEW.pick_ledger_ids IS DISTINCT FROM (SELECT COALESCE(jsonb_agg(ledger_id ORDER BY ledger_id),'[]'::jsonb) FROM packing_picks WHERE organization_id=NEW.organization_id AND order_id=(SELECT packing_order_id FROM delivery_orders WHERE id=NEW.order_id AND organization_id=NEW.organization_id)) THEN RAISE EXCEPTION 'Retain authoritative pick ledger references'; END IF;
          END IF;
        END IF;
        RETURN NEW;
      END $$`);
    for (const table of ["delivery_orders", "delivery_package_claims", "package_custody_events"]) {
      await r.query(`CREATE TRIGGER delivery_record_guard BEFORE INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION guard_delivery_records()`);
    }
    await r.query(`CREATE FUNCTION guard_dispatched_packing() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF EXISTS(SELECT 1 FROM delivery_package_claims WHERE packing_order_id=OLD.id AND organization_id=OLD.organization_id) THEN RAISE EXCEPTION 'Claimed delivery packages require a delivery correction workflow'; END IF;
      RETURN NEW; END $$`);
    await r.query(`CREATE TRIGGER dispatched_packing_guard BEFORE UPDATE ON packing_orders FOR EACH ROW EXECUTE FUNCTION guard_dispatched_packing()`);
  }
  async down(r: QueryRunner): Promise<void> {
    if ((await r.query("SELECT 1 FROM delivery_orders LIMIT 1")).length) throw new Error("Delivery history exists; refusing destructive rollback");
    await r.query("DROP TRIGGER dispatched_packing_guard ON packing_orders; DROP FUNCTION guard_dispatched_packing(); DROP TABLE package_custody_events,delivery_package_claims,delivery_orders; DROP FUNCTION guard_delivery_records()");
  }
}
