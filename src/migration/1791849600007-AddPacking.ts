import {MigrationInterface,QueryRunner} from "typeorm";
export class AddPacking1791849600007 implements MigrationInterface {
  name="AddPacking1791849600007";
  async up(r:QueryRunner):Promise<void>{
    await r.query(`CREATE TABLE packing_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),project_id uuid,site_id uuid,demand_revision int,
      number text NOT NULL UNIQUE,batch_code varchar(100) NOT NULL,snapshot jsonb NOT NULL,execution jsonb NOT NULL DEFAULT '{}',status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','packing','paused','ready','cancelled')),
      revision int NOT NULL DEFAULT 1 CHECK(revision>0),assigned_employee_id uuid,assigned_team varchar(200) NOT NULL DEFAULT '',created_by uuid NOT NULL,approved_by uuid,updated_by uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,organization_id),
      FOREIGN KEY(site_id,project_id,organization_id) REFERENCES planning_sites(id,project_id,organization_id),
      CHECK((project_id IS NULL AND site_id IS NULL AND demand_revision IS NULL) OR (project_id IS NOT NULL AND site_id IS NOT NULL AND demand_revision IS NOT NULL)),CHECK(status IN ('draft','cancelled') OR approved_by IS NOT NULL))`);
    // One retained allocation per school prevents regeneration under a changed project revision.
    await r.query(`CREATE UNIQUE INDEX packing_school_once ON packing_orders(organization_id,project_id,site_id) WHERE status<>'cancelled'`);
    await r.query(`CREATE TABLE packing_picks(id uuid PRIMARY KEY,organization_id uuid NOT NULL,order_id uuid NOT NULL,item_id uuid NOT NULL REFERENCES inventory_items(id),quantity numeric(12,4) NOT NULL CHECK(quantity>0),unit varchar(30) NOT NULL,
      location varchar(100) NOT NULL,ledger_id uuid NOT NULL UNIQUE,reservation_id uuid,source_movements jsonb NOT NULL,picked_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,organization_id),
      FOREIGN KEY(order_id,organization_id) REFERENCES packing_orders(id,organization_id),FOREIGN KEY(reservation_id,organization_id) REFERENCES project_stock_reservations(id,organization_id))`);
    await r.query(`ALTER TABLE stock_ledger ADD COLUMN packing_pick_id uuid,ADD CONSTRAINT packing_pick_owned FOREIGN KEY(packing_pick_id,organization_id) REFERENCES packing_picks(id,organization_id),
      DROP CONSTRAINT physical_ledger_fields,ADD CONSTRAINT physical_ledger_fields CHECK(verification_entry_id IS NULL OR
      (num_nonnulls(stocktake_id,goods_receipt_id,reservation_id,production_issue_id,production_qc_id,packing_pick_id)=1 AND verified_unit IS NOT NULL AND physical_location IS NOT NULL AND physical_sequence>0 AND running_balance>=0))`);
    await r.query(`CREATE UNIQUE INDEX packing_pick_once ON stock_ledger(packing_pick_id) WHERE packing_pick_id IS NOT NULL`);
    await r.query(`CREATE TABLE packing_guard_backup(definition text NOT NULL)`);
    const rows:{definition:string}[]=await r.query(`SELECT pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=current_schema() AND p.proname='guard_physical_ledger'`);
    if(rows.length!==1)throw new Error("Existing physical ledger guard required");await r.query(`INSERT INTO packing_guard_backup VALUES($1)`,[rows[0].definition]);
    const branch=`IF NEW.packing_pick_id IS NOT NULL THEN
      PERFORM 1 FROM inventory_items WHERE id=NEW.item_id AND organization_id=NEW.organization_id FOR UPDATE;
      IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM physical_stock_scopes WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND unit=NEW.verified_unit AND locations ? NEW.physical_location) THEN RAISE EXCEPTION 'Verified packing location required'; END IF;
      IF NOT EXISTS(SELECT 1 FROM packing_picks p JOIN packing_orders o ON o.id=p.order_id AND o.organization_id=p.organization_id WHERE p.id=NEW.packing_pick_id AND p.organization_id=NEW.organization_id AND p.item_id=NEW.item_id
        AND p.unit=NEW.verified_unit AND p.location=NEW.physical_location AND p.id=NEW.verification_entry_id AND p.ledger_id=NEW.id AND -p.quantity=NEW.qty_delta AND o.status='packing' AND o.approved_by IS NOT NULL AND NEW.transaction_type='KIT_CONSUMPTION') THEN RAISE EXCEPTION 'Approved packing pick provenance required'; END IF;
      IF NEW.running_balance IS DISTINCT FROM (SELECT COALESCE(SUM(qty_delta),0)+NEW.qty_delta FROM stock_ledger WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND physical_location=NEW.physical_location AND verification_entry_id IS NOT NULL)
        OR NEW.physical_sequence IS DISTINCT FROM (SELECT COALESCE(MAX(physical_sequence),0)+1 FROM stock_ledger WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND physical_location=NEW.physical_location AND verification_entry_id IS NOT NULL) THEN RAISE EXCEPTION 'Packing stock reconciliation mismatch'; END IF;RETURN NEW;
    END IF;
    IF NEW.production_issue_id IS NOT NULL`;
    const updated=rows[0].definition.replace('IF NEW.production_issue_id IS NOT NULL',branch);if(updated===rows[0].definition)throw new Error("Unknown ledger guard");await r.query(updated);
    await r.query(`CREATE FUNCTION guard_packing_records() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Packing history immutable'; END IF;
      IF TG_TABLE_NAME='packing_orders' THEN
        IF TG_OP='UPDATE' AND (NEW.organization_id<>OLD.organization_id OR NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.site_id IS DISTINCT FROM OLD.site_id OR NEW.demand_revision IS DISTINCT FROM OLD.demand_revision OR NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.number<>OLD.number OR NEW.batch_code<>OLD.batch_code OR NEW.created_by<>OLD.created_by OR NEW.approved_by IS DISTINCT FROM OLD.approved_by AND OLD.approved_by IS NOT NULL OR NEW.revision<>OLD.revision+1 OR OLD.status='cancelled') THEN RAISE EXCEPTION 'Packing snapshot/identity immutable; revision required'; END IF;
        IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.created_by AND organization_id=NEW.organization_id) OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.updated_by AND organization_id=NEW.organization_id) OR NEW.approved_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.approved_by AND organization_id=NEW.organization_id AND is_active AND role IN ('admin','super_admin','manager')) OR NEW.assigned_employee_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.assigned_employee_id AND organization_id=NEW.organization_id AND is_active) THEN RAISE EXCEPTION 'Packing actor ownership mismatch'; END IF;
      ELSE
        IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Pick provenance immutable'; END IF;
        IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.picked_by AND organization_id=NEW.organization_id AND is_active) OR NOT EXISTS(SELECT 1 FROM inventory_items WHERE id=NEW.item_id AND organization_id=NEW.organization_id AND unit=NEW.unit) OR NOT EXISTS(SELECT 1 FROM packing_orders WHERE id=NEW.order_id AND organization_id=NEW.organization_id AND status='packing') THEN RAISE EXCEPTION 'Packing pick ownership mismatch'; END IF;
      END IF;RETURN NEW; END $$`);
    for(const table of ['packing_orders','packing_picks'])await r.query(`CREATE TRIGGER packing_record_guard BEFORE INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION guard_packing_records()`);
    await r.query(`CREATE FUNCTION reconcile_packing_pick() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM stock_ledger WHERE id=NEW.ledger_id AND packing_pick_id=NEW.id AND organization_id=NEW.organization_id AND item_id=NEW.item_id AND verified_unit=NEW.unit AND qty_delta=-NEW.quantity AND physical_location=NEW.location) THEN RAISE EXCEPTION 'Packing pick requires matching physical ledger'; END IF;RETURN NULL;END $$`);
    await r.query(`CREATE CONSTRAINT TRIGGER packing_pick_reconciles AFTER INSERT ON packing_picks DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reconcile_packing_pick()`);
  }
  async down(r:QueryRunner):Promise<void>{
    if((await r.query(`SELECT 1 FROM packing_orders LIMIT 1`)).length)throw new Error("Packing history exists; refusing destructive rollback");
    const rows:{definition:string}[]=await r.query(`SELECT definition FROM packing_guard_backup`);await r.query(rows[0].definition);
    await r.query(`ALTER TABLE stock_ledger DROP CONSTRAINT physical_ledger_fields,DROP COLUMN packing_pick_id,ADD CONSTRAINT physical_ledger_fields CHECK(verification_entry_id IS NULL OR (num_nonnulls(stocktake_id,goods_receipt_id,reservation_id,production_issue_id,production_qc_id)=1 AND verified_unit IS NOT NULL AND physical_location IS NOT NULL AND physical_sequence>0 AND running_balance>=0))`);
    await r.query(`DROP TABLE packing_picks,packing_orders,packing_guard_backup; DROP FUNCTION guard_packing_records(); DROP FUNCTION reconcile_packing_pick()`);
  }
}
