import type {MigrationInterface,QueryRunner} from "typeorm";
/** Deferred checks reconcile the complete transaction, including counter updates before immutable postings. */
export class HardenProductionReconciliation1791763200006 implements MigrationInterface {
  name="HardenProductionReconciliation1791763200006";
  async up(r:QueryRunner) {
    await r.query(`CREATE FUNCTION reconcile_production_records() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE w production_work_orders%ROWTYPE; v production_input_reservations%ROWTYPE; b production_batches%ROWTYPE;
        consumed numeric; planned numeric; accepted numeric; rejected numeric; rework numeric; produced numeric; useful numeric; line jsonb;
      BEGIN
        SELECT * INTO w FROM production_work_orders WHERE id=NEW.order_id AND organization_id=NEW.organization_id;
        IF TG_TABLE_NAME IN ('production_input_reservations','production_input_issues') THEN
          SELECT * INTO v FROM production_input_reservations WHERE id=(CASE WHEN TG_TABLE_NAME='production_input_reservations' THEN to_jsonb(NEW)->>'id' ELSE to_jsonb(NEW)->>'reservation_id' END)::uuid AND organization_id=NEW.organization_id;
          SELECT (l->>'planned_quantity')::numeric INTO planned FROM jsonb_array_elements(w.inputs) l WHERE l->>'id'=v.line_id::text;
          SELECT COALESCE(SUM(quantity),0) INTO consumed FROM production_input_issues WHERE reservation_id=v.id AND organization_id=v.organization_id;
          IF planned IS NULL OR consumed>planned OR consumed+v.quantity<>planned OR (v.status='consumed' AND v.quantity<>0) THEN RAISE EXCEPTION 'Production allocation does not reconcile'; END IF;
          IF EXISTS(SELECT 1 FROM production_input_issues i WHERE i.reservation_id=v.id AND NOT EXISTS(SELECT 1 FROM stock_ledger s WHERE s.id=i.ledger_id AND s.production_issue_id=i.id AND s.organization_id=i.organization_id)) THEN RAISE EXCEPTION 'Input issue requires exactly one ledger posting'; END IF;
        ELSE
          SELECT * INTO b FROM production_batches WHERE id=(CASE WHEN TG_TABLE_NAME='production_batches' THEN to_jsonb(NEW)->>'id' ELSE to_jsonb(NEW)->>'batch_id' END)::uuid AND organization_id=NEW.organization_id;
          SELECT COALESCE(SUM(quantity) FILTER(WHERE decision='accept'),0),COALESCE(SUM(quantity) FILTER(WHERE decision='reject'),0),COALESCE(SUM(CASE WHEN decision='rework' THEN quantity WHEN decision='resubmit' THEN -quantity ELSE 0 END),0)
            INTO accepted,rejected,rework FROM production_qc_decisions WHERE batch_id=b.id AND organization_id=b.organization_id;
          IF b.accepted<>accepted OR b.rejected<>rejected OR b.rework<>rework THEN RAISE EXCEPTION 'QC counters do not reconcile with immutable decisions'; END IF;
          IF EXISTS(SELECT 1 FROM production_qc_decisions q WHERE q.batch_id=b.id AND q.decision='accept' AND NOT EXISTS(SELECT 1 FROM stock_ledger s WHERE s.id=q.ledger_id AND s.production_qc_id=q.id AND s.organization_id=q.organization_id)) THEN RAISE EXCEPTION 'Accepted QC requires exactly one stock posting'; END IF;
          SELECT COALESCE(SUM(quantity),0) INTO produced FROM production_batches WHERE order_id=w.id AND organization_id=w.organization_id;
          FOR line IN SELECT * FROM jsonb_array_elements(w.inputs) LOOP
            SELECT COALESCE(SUM(quantity-scrap_quantity),0) INTO useful FROM production_input_issues WHERE order_id=w.id AND organization_id=w.organization_id AND item_id=(line->>'item_id')::uuid;
            IF useful < ceil(produced*(line->'source'->>'canonical_quantity')::numeric/(w.recipe_snapshot->>'yield_quantity')::numeric*10000)/10000 THEN RAISE EXCEPTION 'Output lacks issued manufacturing inputs'; END IF;
          END LOOP;
        END IF;
        RETURN NULL;
      END $$`);
    for(const t of ["production_input_reservations","production_input_issues","production_batches","production_qc_decisions"])
      await r.query(`CREATE CONSTRAINT TRIGGER production_reconciliation AFTER INSERT OR UPDATE ON ${t} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reconcile_production_records()`);
  }
  async down(r:QueryRunner) {
    if((await r.query("SELECT 1 FROM production_work_orders LIMIT 1")).length)throw new Error("Production history exists; refusing protection rollback");
    for(const t of ["production_input_reservations","production_input_issues","production_batches","production_qc_decisions"])await r.query(`DROP TRIGGER production_reconciliation ON ${t}`);
    await r.query("DROP FUNCTION reconcile_production_records()");
  }
}
