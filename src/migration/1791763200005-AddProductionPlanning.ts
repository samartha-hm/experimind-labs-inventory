import {MigrationInterface,QueryRunner} from "typeorm";
export class AddProductionPlanning1791763200005 implements MigrationInterface {
  name="AddProductionPlanning1791763200005";
  async up(r:QueryRunner):Promise<void> {
    await r.query(`CREATE TABLE production_guard_backup(name text PRIMARY KEY,definition text NOT NULL)`);
    for(const name of ["guard_physical_ledger","guard_reservation_capacity","guard_reserved_stock","guard_supply_documents"]){
      const rows:{definition:string}[]=await r.query(`SELECT pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=current_schema() AND p.proname=$1`,[name]);
      if(rows.length!==1)throw new Error("Verified supply guard required: "+name);
      await r.query(`INSERT INTO production_guard_backup VALUES($1,$2)`,[name,rows[0].definition]);
    }
    await r.query(`CREATE TABLE production_recipes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),family_id uuid NOT NULL,
      version int NOT NULL CHECK(version>0),revision int NOT NULL DEFAULT 1 CHECK(revision>0),name varchar(200) NOT NULL,status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved')),
      definition jsonb NOT NULL,created_by uuid NOT NULL,approved_by uuid,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,organization_id),UNIQUE(organization_id,family_id,version),CHECK(status<>'approved' OR approved_by IS NOT NULL))`);
    await r.query(`CREATE TABLE production_work_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),number varchar(60) NOT NULL UNIQUE,
      output_item_id uuid NOT NULL REFERENCES inventory_items(id),recipe_id uuid,recipe_snapshot jsonb,project_id uuid,site_id uuid,demand_revision int,
      planned_quantity numeric(12,4) NOT NULL CHECK(planned_quantity>0),unit varchar(30) NOT NULL,inputs jsonb NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','released','in_progress','completed','cancelled')),revision int NOT NULL DEFAULT 1 CHECK(revision>0),
      due_date date,priority varchar(20) NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),assigned_employee_id uuid,assigned_team varchar(200) NOT NULL DEFAULT '',
      instructions text NOT NULL DEFAULT '',reason text NOT NULL DEFAULT '',created_by uuid NOT NULL,released_by uuid,updated_by uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,organization_id),
      FOREIGN KEY(recipe_id,organization_id) REFERENCES production_recipes(id,organization_id),FOREIGN KEY(site_id,project_id,organization_id) REFERENCES planning_sites(id,project_id,organization_id),
      CHECK((project_id IS NULL AND site_id IS NULL AND demand_revision IS NULL) OR (project_id IS NOT NULL AND site_id IS NOT NULL AND demand_revision IS NOT NULL)),CHECK(status='draft' OR status='cancelled' OR released_by IS NOT NULL))`);
    await r.query(`CREATE TABLE production_input_reservations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL,order_id uuid NOT NULL,line_id uuid NOT NULL,
      item_id uuid NOT NULL REFERENCES inventory_items(id),quantity numeric(12,4) NOT NULL CHECK(quantity>=0),unit varchar(30) NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','consumed','released')),created_by uuid NOT NULL,
      UNIQUE(id,organization_id),UNIQUE(order_id,line_id),FOREIGN KEY(order_id,organization_id) REFERENCES production_work_orders(id,organization_id),CHECK(status<>'active' OR quantity>0))`);
    await r.query(`CREATE INDEX production_active_inputs ON production_input_reservations(organization_id,item_id) WHERE status='active'`);
    await r.query(`CREATE TABLE production_input_issues(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL,order_id uuid NOT NULL,reservation_id uuid NOT NULL,
      item_id uuid NOT NULL REFERENCES inventory_items(id),quantity numeric(12,4) NOT NULL CHECK(quantity>0),scrap_quantity numeric(12,4) NOT NULL DEFAULT 0 CHECK(scrap_quantity>=0 AND scrap_quantity<=quantity),
      unit varchar(30) NOT NULL,location varchar(100) NOT NULL,reason text NOT NULL,issued_by uuid NOT NULL,ledger_id uuid NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,organization_id),
      FOREIGN KEY(order_id,organization_id) REFERENCES production_work_orders(id,organization_id),FOREIGN KEY(reservation_id,organization_id) REFERENCES production_input_reservations(id,organization_id))`);
    await r.query(`CREATE TABLE production_batches(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL,order_id uuid NOT NULL,batch_code varchar(100) NOT NULL,
      quantity numeric(12,4) NOT NULL CHECK(quantity>0),accepted numeric(12,4) NOT NULL DEFAULT 0 CHECK(accepted>=0),rejected numeric(12,4) NOT NULL DEFAULT 0 CHECK(rejected>=0),rework numeric(12,4) NOT NULL DEFAULT 0 CHECK(rework>=0),
      location varchar(100) NOT NULL,notes text NOT NULL DEFAULT '',revision int NOT NULL DEFAULT 1,recorded_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(id,organization_id),UNIQUE(organization_id,order_id,batch_code),FOREIGN KEY(order_id,organization_id) REFERENCES production_work_orders(id,organization_id),CHECK(accepted+rejected+rework<=quantity))`);
    await r.query(`CREATE TABLE production_qc_decisions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL,order_id uuid NOT NULL,batch_id uuid NOT NULL,
      quantity numeric(12,4) NOT NULL CHECK(quantity>0),decision varchar(20) NOT NULL CHECK(decision IN ('accept','reject','rework','resubmit')),notes text NOT NULL,inspected_by uuid NOT NULL,ledger_id uuid UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(id,organization_id),FOREIGN KEY(order_id,organization_id) REFERENCES production_work_orders(id,organization_id),FOREIGN KEY(batch_id,organization_id) REFERENCES production_batches(id,organization_id),CHECK((decision='accept')=(ledger_id IS NOT NULL)))`);
    await r.query(`ALTER TABLE stock_ledger ADD COLUMN production_issue_id uuid,ADD COLUMN production_qc_id uuid,
      ADD CONSTRAINT production_issue_owned FOREIGN KEY(production_issue_id,organization_id) REFERENCES production_input_issues(id,organization_id),
      ADD CONSTRAINT production_qc_owned FOREIGN KEY(production_qc_id,organization_id) REFERENCES production_qc_decisions(id,organization_id),
      DROP CONSTRAINT physical_ledger_fields,ADD CONSTRAINT physical_ledger_fields CHECK(verification_entry_id IS NULL OR
      (num_nonnulls(stocktake_id,goods_receipt_id,reservation_id,production_issue_id,production_qc_id)=1 AND verified_unit IS NOT NULL AND physical_location IS NOT NULL AND physical_sequence>0 AND running_balance>=0))`);
    await r.query(`CREATE UNIQUE INDEX production_issue_once ON stock_ledger(production_issue_id) WHERE production_issue_id IS NOT NULL`);
    await r.query(`CREATE UNIQUE INDEX production_qc_once ON stock_ledger(production_qc_id) WHERE production_qc_id IS NOT NULL`);
    const originals:{name:string;definition:string}[]=await r.query(`SELECT * FROM production_guard_backup`);
    for(const old of originals){
      let updated=old.definition;
      if(old.name==='guard_physical_ledger')updated=updated.replace('IF NEW.goods_receipt_id IS NOT NULL',`IF NEW.production_issue_id IS NOT NULL OR NEW.production_qc_id IS NOT NULL THEN
        PERFORM 1 FROM inventory_items WHERE id=NEW.item_id AND organization_id=NEW.organization_id FOR UPDATE;
        IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM physical_stock_scopes WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND unit=NEW.verified_unit AND locations ? NEW.physical_location)
          THEN RAISE EXCEPTION 'Verified production location required'; END IF;
        IF NEW.production_issue_id IS NOT NULL THEN
          IF NOT EXISTS(SELECT 1 FROM production_input_issues i JOIN production_work_orders w ON w.id=i.order_id AND w.organization_id=i.organization_id
            WHERE i.id=NEW.production_issue_id AND i.organization_id=NEW.organization_id AND i.item_id=NEW.item_id AND i.unit=NEW.verified_unit AND i.location=NEW.physical_location
            AND i.id=NEW.verification_entry_id AND i.ledger_id=NEW.id AND -i.quantity=NEW.qty_delta AND w.status='in_progress' AND NEW.transaction_type='KIT_CONSUMPTION')
            THEN RAISE EXCEPTION 'Production issue provenance required'; END IF;
        ELSE
          IF NOT EXISTS(SELECT 1 FROM production_qc_decisions q JOIN production_batches b ON b.id=q.batch_id AND b.organization_id=q.organization_id
            JOIN production_work_orders w ON w.id=q.order_id AND w.organization_id=q.organization_id
            WHERE q.id=NEW.production_qc_id AND q.organization_id=NEW.organization_id AND q.decision='accept' AND q.ledger_id=NEW.id AND q.id=NEW.verification_entry_id
            AND b.order_id=w.id AND w.output_item_id=NEW.item_id AND w.unit=NEW.verified_unit AND b.location=NEW.physical_location AND q.quantity=NEW.qty_delta AND NEW.transaction_type='KIT_PRODUCTION')
            THEN RAISE EXCEPTION 'Accepted production provenance required'; END IF;
        END IF;
        IF NOT EXISTS(SELECT 1 FROM stock_ledger WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND physical_location=NEW.physical_location AND verification_entry_id IS NOT NULL)
          OR NEW.running_balance IS DISTINCT FROM (SELECT COALESCE(SUM(qty_delta),0)+NEW.qty_delta FROM stock_ledger WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND physical_location=NEW.physical_location AND verification_entry_id IS NOT NULL)
          OR NEW.physical_sequence IS DISTINCT FROM (SELECT COALESCE(MAX(physical_sequence),0)+1 FROM stock_ledger WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND physical_location=NEW.physical_location AND verification_entry_id IS NOT NULL)
          THEN RAISE EXCEPTION 'Production balance or sequence mismatch'; END IF;
        RETURN NEW;
      END IF;
      IF NEW.goods_receipt_id IS NOT NULL`);
      if(old.name==='guard_reservation_capacity')updated=updated.replace('IF reserved+NEW.quantity>balance THEN',`SELECT reserved+COALESCE(SUM(quantity),0) INTO reserved FROM production_input_reservations WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND status='active';
        IF reserved+NEW.quantity>balance THEN`);
      if(old.name==='guard_reserved_stock')updated=updated.replace("status='active') >","status='active') + (SELECT COALESCE(SUM(quantity),0) FROM production_input_reservations WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND status='active') >");
      if(old.name==='guard_supply_documents')updated=updated.replace("IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.targets)",`IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.targets) t JOIN production_input_reservations v ON v.item_id::text=t->>'item_id' WHERE v.organization_id=NEW.organization_id AND v.status='active' AND (t->>'complete_coverage')::boolean IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Active production inputs require complete count coverage'; END IF;
        IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.targets)`);
      if(updated===old.definition)throw new Error('Unrecognized guard: '+old.name);await r.query(updated);
    }
    await r.query(`CREATE FUNCTION guard_production_records() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE w production_work_orders%ROWTYPE; total numeric; available numeric; complete boolean; BEGIN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Production history cannot be deleted'; END IF;
      IF TG_TABLE_NAME IN ('production_input_issues','production_qc_decisions') AND TG_OP='UPDATE' THEN RAISE EXCEPTION 'Production movement provenance immutable'; END IF;
      IF TG_TABLE_NAME='production_recipes' THEN
        IF TG_OP='UPDATE' AND OLD.status='approved' THEN RAISE EXCEPTION 'Approved recipe immutable'; END IF;
        IF NOT EXISTS(SELECT 1 FROM inventory_items WHERE id=(NEW.definition->>'output_item_id')::uuid AND organization_id=NEW.organization_id) OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.definition->'inputs') v WHERE NOT EXISTS(SELECT 1 FROM inventory_items WHERE id=(v->>'item_id')::uuid AND organization_id=NEW.organization_id)) THEN RAISE EXCEPTION 'Recipe inventory ownership mismatch'; END IF;
      ELSIF TG_TABLE_NAME='production_work_orders' THEN
        IF NOT EXISTS(SELECT 1 FROM inventory_items WHERE id=NEW.output_item_id AND organization_id=NEW.organization_id AND unit=NEW.unit) THEN RAISE EXCEPTION 'Output ownership/unit mismatch'; END IF;
        IF TG_OP='UPDATE' AND (OLD.status IN ('completed','cancelled') OR NEW.organization_id<>OLD.organization_id OR NEW.output_item_id<>OLD.output_item_id OR NEW.recipe_id IS DISTINCT FROM OLD.recipe_id OR NEW.recipe_snapshot IS DISTINCT FROM OLD.recipe_snapshot OR NEW.inputs IS DISTINCT FROM OLD.inputs OR NEW.planned_quantity<>OLD.planned_quantity OR NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.site_id IS DISTINCT FROM OLD.site_id) THEN RAISE EXCEPTION 'Authorized work-order identity immutable'; END IF;
      ELSE
        SELECT * INTO w FROM production_work_orders WHERE id=NEW.order_id AND organization_id=NEW.organization_id FOR UPDATE;
        IF NOT FOUND OR w.status NOT IN ('released','in_progress') THEN RAISE EXCEPTION 'Active owned production order required'; END IF;
        IF TG_TABLE_NAME='production_input_reservations' THEN
          PERFORM 1 FROM inventory_items WHERE id=NEW.item_id AND organization_id=NEW.organization_id FOR UPDATE;
          IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(w.inputs) l WHERE l->>'id'=NEW.line_id::text AND l->>'item_id'=NEW.item_id::text AND l->>'unit'=NEW.unit AND (l->>'planned_quantity')::numeric>=NEW.quantity) THEN RAISE EXCEPTION 'Production reservation line mismatch'; END IF;
          IF TG_OP='UPDATE' AND (OLD.status<>'active' OR NEW.item_id<>OLD.item_id OR NEW.order_id<>OLD.order_id OR NEW.organization_id<>OLD.organization_id OR NEW.line_id<>OLD.line_id OR NEW.unit<>OLD.unit OR NEW.quantity>OLD.quantity) THEN RAISE EXCEPTION 'Production allocation identity immutable'; END IF;
          IF NEW.status='active' THEN
            SELECT (t->>'complete_coverage')::boolean INTO complete FROM physical_stocktakes s,jsonb_array_elements(s.targets) t WHERE s.organization_id=NEW.organization_id AND s.status='posted' AND t->>'item_id'=NEW.item_id::text ORDER BY s.updated_at DESC,s.id DESC LIMIT 1;
            IF complete IS DISTINCT FROM true OR NOT EXISTS(SELECT 1 FROM physical_stock_scopes sc WHERE sc.organization_id=NEW.organization_id AND sc.item_id=NEW.item_id AND sc.unit=NEW.unit AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(sc.locations) loc WHERE NOT EXISTS(SELECT 1 FROM stock_ledger WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND physical_location=loc AND verification_entry_id IS NOT NULL))) THEN RAISE EXCEPTION 'Unverified production input'; END IF;
            SELECT COALESCE(SUM(qty_delta),0) INTO available FROM stock_ledger WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND verification_entry_id IS NOT NULL;
            SELECT COALESCE(SUM(quantity),0) INTO total FROM project_stock_reservations WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND status='active';
            SELECT total+COALESCE(SUM(quantity),0) INTO total FROM production_input_reservations WHERE organization_id=NEW.organization_id AND item_id=NEW.item_id AND status='active' AND id<>NEW.id;
            IF total+NEW.quantity>available THEN RAISE EXCEPTION 'Insufficient free production input'; END IF;
          END IF;
        ELSIF TG_TABLE_NAME='production_batches' THEN
          IF w.status<>'in_progress' THEN RAISE EXCEPTION 'Start production before reporting output'; END IF;
          IF TG_OP='UPDATE' AND (NEW.order_id<>OLD.order_id OR NEW.organization_id<>OLD.organization_id OR NEW.batch_code<>OLD.batch_code OR NEW.quantity<>OLD.quantity OR NEW.location<>OLD.location OR NEW.accepted<OLD.accepted OR NEW.rejected<OLD.rejected) THEN RAISE EXCEPTION 'Reported batch identity immutable'; END IF;
          SELECT COALESCE(SUM(quantity),0) INTO total FROM production_batches WHERE organization_id=NEW.organization_id AND order_id=NEW.order_id AND id<>NEW.id;
          IF total+NEW.quantity>w.planned_quantity THEN RAISE EXCEPTION 'Output exceeds released work order'; END IF;
        ELSIF TG_TABLE_NAME='production_input_issues' THEN
          IF w.status<>'in_progress' OR NOT EXISTS(SELECT 1 FROM production_input_reservations v WHERE v.id=NEW.reservation_id AND v.organization_id=NEW.organization_id AND v.order_id=w.id AND v.item_id=NEW.item_id AND v.unit=NEW.unit) THEN RAISE EXCEPTION 'Input issue allocation mismatch'; END IF;
        ELSIF TG_TABLE_NAME='production_qc_decisions' THEN
          IF NOT EXISTS(SELECT 1 FROM production_batches b WHERE b.id=NEW.batch_id AND b.organization_id=NEW.organization_id AND b.order_id=w.id) THEN RAISE EXCEPTION 'QC batch ownership mismatch'; END IF;
        END IF;
      END IF; RETURN NEW; END $$`);
    for(const t of ['production_recipes','production_work_orders','production_input_reservations','production_input_issues','production_batches','production_qc_decisions'])await r.query(`CREATE TRIGGER production_record_guard BEFORE INSERT OR UPDATE OR DELETE ON ${t} FOR EACH ROW EXECUTE FUNCTION guard_production_records()`);
  }
  async down(r:QueryRunner):Promise<void> {
    for(const t of ['production_work_orders','production_recipes','production_input_issues','production_qc_decisions']){
      if((await r.query(`SELECT 1 FROM ${t} LIMIT 1`)).length)throw new Error('Production history exists; refusing destructive rollback');
    }
    const originals:{definition:string}[]=await r.query(`SELECT definition FROM production_guard_backup`);for(const v of originals)await r.query(v.definition);
    await r.query(`ALTER TABLE stock_ledger DROP CONSTRAINT physical_ledger_fields,DROP COLUMN production_issue_id,DROP COLUMN production_qc_id,
      ADD CONSTRAINT physical_ledger_fields CHECK(verification_entry_id IS NULL OR (num_nonnulls(stocktake_id,goods_receipt_id,reservation_id)=1 AND verified_unit IS NOT NULL AND physical_location IS NOT NULL AND physical_sequence>0 AND running_balance>=0))`);
    await r.query(`DROP TABLE production_qc_decisions,production_batches,production_input_issues,production_input_reservations,production_work_orders,production_recipes,production_guard_backup`);
    await r.query(`DROP FUNCTION guard_production_records()`);
  }
}
