import { MigrationInterface, QueryRunner } from "typeorm";
export class AddReservationsAndProcurement1791676800004 implements MigrationInterface {
  name="AddReservationsAndProcurement1791676800004";
  async up(r:QueryRunner):Promise<void> {
    // Retain the exact installed M6 guard for an empty-data rollback, without editing its migration.
    await r.query(`CREATE TABLE supply_migration_guard_backup(definition text NOT NULL)`);
    const old:{definition:string}[]=await r.query(`SELECT pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=current_schema() AND p.proname='guard_physical_ledger'`);
    if(old.length!==1)throw new Error("Verified stocktake ledger guard required");
    await r.query(`INSERT INTO supply_migration_guard_backup VALUES($1)`,[old[0].definition]);
    await r.query(`CREATE TABLE project_stock_reservations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),
      project_id uuid NOT NULL,site_id uuid NOT NULL,item_id uuid NOT NULL REFERENCES inventory_items(id),
      quantity numeric(12,4) NOT NULL CHECK(quantity>0),unit varchar(30) NOT NULL,status varchar(20) NOT NULL DEFAULT 'active'
      CHECK(status IN ('active','released','cancelled','fulfilled')),revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
      created_by uuid NOT NULL,updated_by uuid NOT NULL,reason text NOT NULL DEFAULT '',fulfillment_ledger_id uuid UNIQUE,
      fulfillment_location varchar(100),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(id,organization_id),FOREIGN KEY(site_id,project_id,organization_id) REFERENCES planning_sites(id,project_id,organization_id))`);
    await r.query(`CREATE INDEX reservations_active ON project_stock_reservations(organization_id,item_id) WHERE status='active'`);
    await r.query(`CREATE TABLE purchase_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),pr_number varchar(60) NOT NULL UNIQUE,
      status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','reviewed','approved','ordered','cancelled')),
      revision integer NOT NULL DEFAULT 1 CHECK(revision>0),lines jsonb NOT NULL,notes text NOT NULL DEFAULT '',created_by uuid NOT NULL,
      reviewed_by uuid,approved_by uuid,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,organization_id))`);
    await r.query(`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS planning_revision integer,ADD COLUMN IF NOT EXISTS planning_lines jsonb,ADD COLUMN IF NOT EXISTS purchase_request_id uuid,
      ADD COLUMN IF NOT EXISTS reviewed_by uuid,ADD COLUMN IF NOT EXISTS approved_by uuid,ADD COLUMN IF NOT EXISTS created_by uuid,
      ADD CONSTRAINT supply_order_owned UNIQUE(id,organization_id),
      ADD CONSTRAINT supply_request_owned FOREIGN KEY(purchase_request_id,organization_id) REFERENCES purchase_requests(id,organization_id),
      ADD CONSTRAINT supply_request_once UNIQUE(purchase_request_id)`);
    await r.query(`CREATE TABLE purchase_goods_receipts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL,po_id uuid NOT NULL,line_id uuid NOT NULL,
      item_id uuid NOT NULL REFERENCES inventory_items(id),quantity numeric(12,4) NOT NULL CHECK(quantity>0),unit varchar(30) NOT NULL,
      location varchar(100) NOT NULL,status varchar(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','quarantined')),
      source jsonb NOT NULL,revision integer NOT NULL DEFAULT 1,received_by uuid NOT NULL,inspected_by uuid,ledger_id uuid UNIQUE,
      reason text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,organization_id),
      FOREIGN KEY(po_id,organization_id) REFERENCES purchase_orders(id,organization_id))`);
    await r.query(`CREATE TABLE supply_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),kind varchar(30) NOT NULL,record_id uuid NOT NULL,
      revision integer NOT NULL,actor_id uuid NOT NULL,snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(organization_id,kind,record_id,revision))`);
    await r.query(`CREATE TABLE supply_operations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),key varchar(100) NOT NULL,
      fingerprint varchar(64) NOT NULL,result jsonb NOT NULL,actor_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(organization_id,key))`);
    await r.query(`ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS goods_receipt_id uuid,ADD COLUMN IF NOT EXISTS reservation_id uuid,
      ADD CONSTRAINT supply_receipt_owned FOREIGN KEY(goods_receipt_id,organization_id) REFERENCES purchase_goods_receipts(id,organization_id),
      ADD CONSTRAINT supply_reservation_owned FOREIGN KEY(reservation_id,organization_id) REFERENCES project_stock_reservations(id,organization_id),
      DROP CONSTRAINT physical_ledger_fields,
      ADD CONSTRAINT physical_ledger_fields CHECK(verification_entry_id IS NULL OR
        (num_nonnulls(stocktake_id,goods_receipt_id,reservation_id)=1 AND verified_unit IS NOT NULL AND physical_location IS NOT NULL AND physical_sequence>0 AND running_balance>=0))`);
    await r.query(`CREATE UNIQUE INDEX receipt_post_once ON stock_ledger(goods_receipt_id) WHERE goods_receipt_id IS NOT NULL`);
    await r.query(`CREATE UNIQUE INDEX reservation_fulfill_once ON stock_ledger(reservation_id) WHERE reservation_id IS NOT NULL`);
    // Extend provenance validation; the stocktake branch remains byte-for-byte unchanged.
    const branch=`IF NEW.goods_receipt_id IS NOT NULL OR NEW.reservation_id IS NOT NULL THEN
      PERFORM 1 FROM inventory_items WHERE id=NEW.item_id AND organization_id=NEW.organization_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Inventory ownership mismatch'; END IF;
      IF NOT EXISTS(SELECT 1 FROM physical_stock_scopes WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id
        AND unit=NEW.verified_unit AND locations ? NEW.physical_location) THEN RAISE EXCEPTION 'Verified location required'; END IF;
      IF NEW.goods_receipt_id IS NOT NULL THEN
        IF NOT EXISTS(SELECT 1 FROM purchase_goods_receipts g JOIN purchase_orders p ON p.id=g.po_id AND p.organization_id=g.organization_id
          WHERE g.id=NEW.goods_receipt_id AND g.organization_id=NEW.organization_id AND g.status='accepted' AND g.inspected_by IS NOT NULL
          AND p.planning_revision IS NOT NULL AND p.approved_by IS NOT NULL AND p.status IN ('approved','received')
          AND g.ledger_id=NEW.id AND g.id=NEW.verification_entry_id AND g.item_id=NEW.item_id AND g.unit=NEW.verified_unit
          AND g.location=NEW.physical_location AND g.quantity=NEW.qty_delta AND NEW.transaction_type='PO_RECEIPT')
        THEN RAISE EXCEPTION 'Accepted receipt provenance required'; END IF;
      ELSE
        IF NOT EXISTS(SELECT 1 FROM project_stock_reservations v WHERE v.id=NEW.reservation_id AND v.organization_id=NEW.organization_id
          AND v.status='fulfilled' AND v.fulfillment_ledger_id=NEW.id AND v.id=NEW.verification_entry_id AND v.item_id=NEW.item_id
          AND v.unit=NEW.verified_unit AND v.fulfillment_location=NEW.physical_location AND -v.quantity=NEW.qty_delta
          AND NEW.transaction_type='SO_SHIPMENT') THEN RAISE EXCEPTION 'Reservation fulfillment provenance required'; END IF;
      END IF;
      IF NOT EXISTS(SELECT 1 FROM stock_ledger WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id
        AND physical_location=NEW.physical_location AND verification_entry_id IS NOT NULL)
        OR NEW.running_balance IS DISTINCT FROM (SELECT COALESCE(SUM(qty_delta),0)+NEW.qty_delta FROM stock_ledger WHERE organization_id=NEW.organization_id
          AND item_id=NEW.item_id AND physical_location=NEW.physical_location AND verification_entry_id IS NOT NULL)
        OR NEW.physical_sequence IS DISTINCT FROM (SELECT COALESCE(MAX(physical_sequence),0)+1 FROM stock_ledger WHERE organization_id=NEW.organization_id
          AND item_id=NEW.item_id AND physical_location=NEW.physical_location AND verification_entry_id IS NOT NULL)
      THEN RAISE EXCEPTION 'Ledger balance or sequence mismatch'; END IF;
      RETURN NEW;
    END IF;
    `;
    const definition=old[0].definition.replace("IF NEW.verification_entry_id IS NULL THEN",branch+"IF NEW.verification_entry_id IS NULL THEN");
    if(definition===old[0].definition)throw new Error("Unrecognized physical guard; refusing migration");await r.query(definition);
    await r.query(`CREATE FUNCTION guard_supply_records() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF TG_TABLE_NAME IN ('supply_events','supply_operations') THEN RAISE EXCEPTION 'Supply audit is immutable'; END IF;
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Supply history cannot be deleted'; END IF;
      IF TG_TABLE_NAME='purchase_goods_receipts' AND OLD.status IN ('accepted','rejected') THEN RAISE EXCEPTION 'Final receipt is immutable'; END IF;
      IF TG_TABLE_NAME='project_stock_reservations' AND OLD.status<>'active' THEN RAISE EXCEPTION 'Final reservation is immutable'; END IF;
      RETURN NEW; END $$`);
    for(const t of ["supply_events","supply_operations","project_stock_reservations","purchase_goods_receipts","purchase_requests"])
      await r.query(`CREATE TRIGGER supply_record_guard BEFORE UPDATE OR DELETE ON ${t} FOR EACH ROW EXECUTE FUNCTION guard_supply_records()`);
    await r.query(`CREATE FUNCTION guard_reservation_capacity() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE balance numeric; reserved numeric; complete boolean; BEGIN
      PERFORM 1 FROM inventory_items WHERE id=NEW.item_id AND organization_id=NEW.organization_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Reservation ownership mismatch'; END IF;
      IF TG_OP='UPDATE' AND (NEW.item_id<>OLD.item_id OR NEW.organization_id<>OLD.organization_id OR NEW.project_id<>OLD.project_id OR NEW.site_id<>OLD.site_id OR NEW.unit<>OLD.unit)
      THEN RAISE EXCEPTION 'Reservation identity immutable'; END IF;
      IF NEW.status='active' THEN
        SELECT (t->>'complete_coverage')::boolean INTO complete FROM physical_stocktakes s,jsonb_array_elements(s.targets) t
          WHERE s.organization_id=NEW.organization_id AND s.status='posted' AND t->>'item_id'=NEW.item_id::text ORDER BY s.updated_at DESC,s.id DESC LIMIT 1;
        IF complete IS DISTINCT FROM true OR NOT EXISTS(SELECT 1 FROM physical_stock_scopes sc WHERE sc.organization_id=NEW.organization_id AND sc.item_id=NEW.item_id
          AND sc.unit=NEW.unit AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(sc.locations) loc WHERE NOT EXISTS(SELECT 1 FROM stock_ledger l
            WHERE l.organization_id=NEW.organization_id AND l.item_id=NEW.item_id AND l.physical_location=loc AND l.verification_entry_id IS NOT NULL)))
          THEN RAISE EXCEPTION 'Unverified stock cannot be reserved'; END IF;
        SELECT COALESCE(SUM(qty_delta),0) INTO balance FROM stock_ledger WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND verification_entry_id IS NOT NULL;
        SELECT COALESCE(SUM(quantity),0) INTO reserved FROM project_stock_reservations WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND status='active' AND id<>NEW.id;
        IF reserved+NEW.quantity>balance THEN RAISE EXCEPTION 'Insufficient verified available stock'; END IF;
      END IF; RETURN NEW; END $$`);
    await r.query(`CREATE TRIGGER reservation_capacity BEFORE INSERT OR UPDATE ON project_stock_reservations FOR EACH ROW EXECUTE FUNCTION guard_reservation_capacity()`);
    await r.query(`CREATE FUNCTION guard_reserved_stock() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.verification_entry_id IS NOT NULL THEN
        PERFORM 1 FROM inventory_items WHERE id=NEW.item_id AND organization_id=NEW.organization_id FOR UPDATE;
        IF (SELECT COALESCE(SUM(quantity),0) FROM project_stock_reservations WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND status='active') >
          (SELECT COALESCE(SUM(qty_delta),0)+NEW.qty_delta FROM stock_ledger WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND verification_entry_id IS NOT NULL)
        THEN RAISE EXCEPTION 'Stock movement would invalidate active reservations'; END IF;
      END IF; RETURN NEW; END $$`);
    await r.query(`CREATE TRIGGER reserved_stock_floor BEFORE INSERT ON stock_ledger FOR EACH ROW EXECUTE FUNCTION guard_reserved_stock()`);
    await r.query(`CREATE FUNCTION guard_supply_documents() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE p purchase_orders%ROWTYPE; line jsonb; delivered numeric; BEGIN
      IF TG_TABLE_NAME='purchase_orders' THEN
        IF TG_OP='DELETE' AND OLD.planning_revision IS NOT NULL THEN RAISE EXCEPTION 'Managed order history immutable'; END IF;
        IF TG_OP='UPDATE' AND OLD.planning_revision IS NOT NULL AND
          (NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id OR
           NEW.purchase_request_id IS DISTINCT FROM OLD.purchase_request_id OR NEW.planning_lines IS DISTINCT FROM OLD.planning_lines OR NEW.po_number<>OLD.po_number)
        THEN RAISE EXCEPTION 'Managed order identity and authorized lines immutable'; END IF;
        IF NEW.planning_revision IS NOT NULL AND NOT EXISTS(SELECT 1 FROM vendors WHERE id=NEW.vendor_id AND organization_id=NEW.organization_id)
        THEN RAISE EXCEPTION 'Supplier ownership mismatch'; END IF;
      ELSIF TG_TABLE_NAME='purchase_requests' THEN
        IF TG_OP='UPDATE' AND (NEW.organization_id<>OLD.organization_id OR NEW.pr_number<>OLD.pr_number OR
          (OLD.status<>'draft' AND (NEW.lines IS DISTINCT FROM OLD.lines OR NEW.notes IS DISTINCT FROM OLD.notes)))
        THEN RAISE EXCEPTION 'Reviewed request lines immutable'; END IF;
      ELSIF TG_TABLE_NAME='purchase_goods_receipts' THEN
        SELECT * INTO p FROM purchase_orders WHERE id=NEW.po_id AND organization_id=NEW.organization_id FOR UPDATE;
        IF NOT FOUND OR p.planning_revision IS NULL OR p.status<>'approved' OR p.approved_by IS NULL THEN RAISE EXCEPTION 'Approved owned order required'; END IF;
        SELECT v INTO line FROM jsonb_array_elements(p.planning_lines) v WHERE v->>'id'=NEW.line_id::text;
        IF line IS NULL OR line->>'item_id'<>NEW.item_id::text OR line->>'canonical_unit'<>NEW.unit THEN RAISE EXCEPTION 'Receipt line mismatch'; END IF;
        IF TG_OP='INSERT' AND NEW.status<>'pending' THEN RAISE EXCEPTION 'Receipt starts pending'; END IF;
        IF TG_OP='UPDATE' AND (NEW.organization_id<>OLD.organization_id OR NEW.po_id<>OLD.po_id OR NEW.line_id<>OLD.line_id OR NEW.item_id<>OLD.item_id
          OR NEW.quantity<>OLD.quantity OR NEW.unit<>OLD.unit OR NEW.location<>OLD.location OR NEW.source IS DISTINCT FROM OLD.source)
        THEN RAISE EXCEPTION 'Receipt delivery identity immutable'; END IF;
        SELECT COALESCE(SUM(quantity),0) INTO delivered FROM purchase_goods_receipts WHERE organization_id=NEW.organization_id AND po_id=NEW.po_id AND line_id=NEW.line_id AND id<>NEW.id;
        IF delivered+NEW.quantity>(line->>'canonical_quantity')::numeric THEN RAISE EXCEPTION 'Receipt exceeds authorization'; END IF;
        IF NEW.status='accepted' AND (NEW.inspected_by IS NULL OR NEW.ledger_id IS NULL) THEN RAISE EXCEPTION 'Acceptance provenance required'; END IF;
      ELSIF TG_TABLE_NAME='physical_stocktakes' AND NEW.status='posted' THEN
        IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.targets) t JOIN project_stock_reservations v ON v.item_id::text=t->>'item_id'
          WHERE v.organization_id=NEW.organization_id AND v.status='active' AND (t->>'complete_coverage')::boolean IS DISTINCT FROM true)
        THEN RAISE EXCEPTION 'Active reservations require complete verification coverage'; END IF;
      END IF;
      IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$`);
    for(const t of ["purchase_orders","purchase_requests","purchase_goods_receipts","physical_stocktakes"])
      await r.query(`CREATE TRIGGER supply_document_guard BEFORE INSERT OR UPDATE OR DELETE ON ${t} FOR EACH ROW EXECUTE FUNCTION guard_supply_documents()`);
  }
  async down(r:QueryRunner):Promise<void> {
    const rows:{count:string}[]=await r.query(`SELECT (SELECT count(*) FROM supply_operations)+(SELECT count(*) FROM supply_events)+(SELECT count(*) FROM purchase_requests)+(SELECT count(*) FROM purchase_goods_receipts)+(SELECT count(*) FROM project_stock_reservations)+(SELECT count(*) FROM purchase_orders WHERE planning_revision IS NOT NULL) AS count`);
    if(rows[0].count!=="0")throw new Error("Rollback refuses to discard reservations or procurement history; use a forward migration");
    const old:{definition:string}[]=await r.query(`SELECT definition FROM supply_migration_guard_backup`);await r.query(old[0].definition);
    for(const t of ["purchase_orders","purchase_requests","purchase_goods_receipts","physical_stocktakes"])await r.query(`DROP TRIGGER supply_document_guard ON ${t}`);
    await r.query(`DROP FUNCTION guard_supply_documents()`);
    await r.query(`DROP TRIGGER reserved_stock_floor ON stock_ledger;DROP FUNCTION guard_reserved_stock()`);
    await r.query(`ALTER TABLE stock_ledger DROP CONSTRAINT supply_receipt_owned,DROP CONSTRAINT supply_reservation_owned,DROP CONSTRAINT physical_ledger_fields,
      ADD CONSTRAINT physical_ledger_fields CHECK(verification_entry_id IS NULL OR(stocktake_id IS NOT NULL AND verified_unit IS NOT NULL AND physical_location IS NOT NULL AND physical_sequence>0 AND running_balance>=0)),DROP COLUMN goods_receipt_id,DROP COLUMN reservation_id`);
    await r.query(`DROP TABLE purchase_goods_receipts`);
    await r.query(`ALTER TABLE purchase_orders DROP CONSTRAINT supply_request_owned,DROP CONSTRAINT supply_request_once,DROP CONSTRAINT supply_order_owned,
      DROP COLUMN planning_revision,DROP COLUMN planning_lines,DROP COLUMN purchase_request_id,DROP COLUMN reviewed_by,DROP COLUMN approved_by,DROP COLUMN created_by`);
    await r.query(`DROP TABLE supply_operations,supply_events,purchase_requests,project_stock_reservations,supply_migration_guard_backup;DROP FUNCTION guard_supply_records();DROP FUNCTION guard_reservation_capacity()`);
  }
}
