import type { MigrationInterface, QueryRunner } from "typeorm";

/** Explicit synthetic activation only; application startup never runs this migration. */
export class AddReceiptCommitments1792800000021 implements MigrationInterface {
  name = "AddReceiptCommitments1792800000021";
  async up(r: QueryRunner): Promise<void> {
    const [scope] = await r.query("SELECT current_database() db,current_schema() schema");
    if (scope.db !== "experimind_kitbuilder_test" || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))
      throw new Error("Receipt activation restricted to isolated synthetic requirement_test schema");
    await r.query(`
      CREATE TABLE commitment_receipts (
        receipt_id uuid PRIMARY KEY REFERENCES purchase_goods_receipts(id),
        coverage_id uuid NOT NULL REFERENCES commitment_po_coverage(id),
        order_revision integer NOT NULL CHECK(order_revision>0), frozen_order jsonb NOT NULL,
        start_quantity numeric(20,6) NOT NULL, end_quantity numeric(20,6) NOT NULL,
        CHECK(start_quantity>=0 AND end_quantity>start_quantity AND start_quantity=round(start_quantity,4)
          AND end_quantity=round(end_quantity,4))
      );
      CREATE INDEX commitment_receipts_coverage ON commitment_receipts(coverage_id);
      CREATE TABLE commitment_receipt_decisions (
        receipt_id uuid NOT NULL REFERENCES commitment_receipts(receipt_id), revision integer NOT NULL CHECK(revision>0),
        organization_id uuid NOT NULL, actor_id uuid NOT NULL, operation_key text NOT NULL CHECK(length(trim(operation_key)) BETWEEN 1 AND 100),
        snapshot jsonb NOT NULL, PRIMARY KEY(receipt_id,revision),
        UNIQUE(organization_id,actor_id,operation_key)
      );
      CREATE TRIGGER commitment_receipt_immutable BEFORE UPDATE OR DELETE ON commitment_receipts
        FOR EACH ROW EXECUTE FUNCTION commitment_immutable();
      CREATE TRIGGER commitment_receipt_decision_immutable BEFORE UPDATE OR DELETE ON commitment_receipt_decisions
        FOR EACH ROW EXECUTE FUNCTION commitment_immutable();
    `);
    const [{gate}] = await r.query("SELECT pg_get_functiondef('commitment_reservation_downstream_gate()'::regprocedure) gate");
    const marker="org=(doc->>'organization_id')::uuid;";
    if (!gate.includes(marker)) throw new Error("Unexpected receipt gate contract");
    await r.query(gate.replace(marker,marker+`
      IF TG_TABLE_NAME='purchase_goods_receipts' AND EXISTS(SELECT 1 FROM commitment_po_lines
        WHERE order_id::text=doc->>'po_id' AND organization_id=org) THEN RETURN NEW; END IF;`));
    const [{po}] = await r.query("SELECT pg_get_functiondef('commitment_po_check(uuid)'::regprocedure) po");
    const old="OR EXISTS(SELECT 1 FROM purchase_goods_receipts WHERE po_id=oid)";
    if (!po.includes(old)) throw new Error("Unexpected PO receipt quarantine contract");
    await r.query(po.replace(old,`OR EXISTS(SELECT 1 FROM purchase_goods_receipts z
        LEFT JOIN commitment_receipts x ON x.receipt_id=z.id WHERE z.po_id=oid
        AND (x.receipt_id IS NULL OR x.frozen_order IS DISTINCT FROM to_jsonb(p)
          OR x.order_revision<>p.planning_revision))`));
    await r.query(`
      CREATE FUNCTION commitment_receipt_check(rid uuid) RETURNS void LANGUAGE plpgsql AS $$
      DECLARE g purchase_goods_receipts; b commitment_receipts; c commitment_po_coverage;
        p purchase_orders; l jsonb; d commitment_receipt_decisions; prev jsonb;
      BEGIN
        SELECT * INTO STRICT g FROM purchase_goods_receipts WHERE id=rid;
        SELECT * INTO STRICT b FROM commitment_receipts WHERE receipt_id=rid;
        SELECT * INTO STRICT c FROM commitment_po_coverage WHERE id=b.coverage_id FOR UPDATE;
        SELECT * INTO STRICT p FROM purchase_orders WHERE id=c.order_id;
        PERFORM commitment_po_check(p.id);
        l=p.planning_lines->0;
        IF g.po_id<>p.id OR g.organization_id<>p.organization_id OR p.status<>'approved'
          OR b.order_revision<>p.planning_revision OR b.frozen_order IS DISTINCT FROM to_jsonb(p)
          OR g.line_id::text IS DISTINCT FROM l->>'id' OR g.item_id::text IS DISTINCT FROM l->>'item_id'
          OR g.unit IS DISTINCT FROM l->>'canonical_unit' OR g.quantity<>b.end_quantity-b.start_quantity
          OR b.start_quantity<c.start_quantity OR b.end_quantity>c.end_quantity
          OR g.source IS DISTINCT FROM jsonb_build_object('quantity',g.quantity::text,'unit',g.unit,'po_line',l)
          OR NOT EXISTS(SELECT 1 FROM physical_stock_scopes s WHERE s.organization_id=g.organization_id
            AND s.item_id=g.item_id AND s.unit=g.unit AND s.locations ? g.location)
          OR EXISTS(SELECT 1 FROM commitment_receipts x WHERE x.coverage_id=c.id AND x.receipt_id<>rid
            AND x.start_quantity<b.end_quantity AND b.start_quantity<x.end_quantity)
          THEN RAISE EXCEPTION 'Exclusive frozen receipt source required' USING ERRCODE='23514'; END IF;
        IF (SELECT count(*) FROM commitment_receipt_decisions WHERE receipt_id=rid)<>g.revision
          THEN RAISE EXCEPTION 'Complete receipt decision history required' USING ERRCODE='23514'; END IF;
        FOR d IN SELECT * FROM commitment_receipt_decisions WHERE receipt_id=rid ORDER BY revision LOOP
          IF d.organization_id<>g.organization_id OR (d.snapshot->>'id')::uuid<>rid
            OR (d.snapshot->>'revision')::integer<>d.revision
            OR (d.revision=1 AND (d.snapshot->>'status'<>'pending' OR d.snapshot->>'inspected_by' IS NOT NULL
              OR d.snapshot->>'ledger_id' IS NOT NULL OR d.snapshot->>'received_by' IS DISTINCT FROM d.actor_id::text))
            OR (d.revision>1 AND (prev->>'status' NOT IN ('pending','quarantined')
              OR d.snapshot->>'status' NOT IN ('accepted','rejected','quarantined')
              OR d.snapshot->>'status'=prev->>'status'
              OR d.snapshot->>'inspected_by' IS DISTINCT FROM d.actor_id::text
              OR length(trim(coalesce(d.snapshot->>'reason','')))=0
              OR (d.snapshot-'status'-'revision'-'inspected_by'-'ledger_id'-'reason')
                IS DISTINCT FROM (prev-'status'-'revision'-'inspected_by'-'ledger_id'-'reason')))
            OR NOT EXISTS(SELECT 1 FROM supply_events e WHERE e.organization_id=d.organization_id
              AND e.kind='receipt' AND e.record_id=rid AND e.revision=d.revision
              AND e.actor_id=d.actor_id AND e.snapshot=d.snapshot)
            OR NOT EXISTS(SELECT 1 FROM commitment_authorizations a WHERE a.organization_id=d.organization_id
              AND a.actor_id=d.actor_id AND a.operation_key=d.operation_key AND a.result=d.snapshot)
            THEN RAISE EXCEPTION 'Atomic authorized QC decision and audit required' USING ERRCODE='23514'; END IF;
          prev=d.snapshot;
        END LOOP;
        IF prev IS DISTINCT FROM to_jsonb(g) THEN RAISE EXCEPTION 'Receipt decision snapshot mismatch'; END IF;
        IF g.status='accepted' THEN
          IF NOT EXISTS(SELECT 1 FROM stock_ledger s WHERE s.id=g.ledger_id AND s.goods_receipt_id=g.id
            AND s.organization_id=g.organization_id AND s.item_id=g.item_id AND s.verified_unit=g.unit
            AND s.physical_location=g.location AND s.qty_delta=g.quantity AND s.actor_id=g.inspected_by
            AND s.reference_type='accepted_goods_receipt' AND s.reference_id=g.id::text
            AND s.verification_entry_id=g.id AND s.transaction_type='PO_RECEIPT' AND s.reason_code='ACCEPTED_RECEIPT')
            THEN RAISE EXCEPTION 'Accepted receipt requires exact stock witness'; END IF;
        ELSIF g.ledger_id IS NOT NULL OR EXISTS(SELECT 1 FROM stock_ledger WHERE goods_receipt_id=rid) THEN
          RAISE EXCEPTION 'Unaccepted receipt cannot own stock';
        END IF;
      END $$;
      CREATE FUNCTION commitment_receipt_witness() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE rid uuid;
      BEGIN
        IF TG_TABLE_NAME='purchase_goods_receipts' THEN
          IF NOT EXISTS(SELECT 1 FROM commitment_po_lines WHERE order_id=NEW.po_id) THEN
            RAISE EXCEPTION 'Historical or unmapped receipt execution disabled'; END IF;
          rid=NEW.id;
        ELSIF TG_TABLE_NAME='stock_ledger' THEN
          rid=NEW.goods_receipt_id;
          IF NEW.transaction_type<>'PO_RECEIPT' AND rid IS NULL THEN RETURN NULL; END IF;
          IF NOT EXISTS(SELECT 1 FROM commitment_receipts WHERE receipt_id=rid) THEN
            RAISE EXCEPTION 'Supplier stock requires guarded receipt mapping'; END IF;
        ELSE rid=NEW.receipt_id; END IF;
        PERFORM commitment_receipt_check(rid); RETURN NULL;
      END $$;
      CREATE CONSTRAINT TRIGGER commitment_receipt_witness AFTER INSERT OR UPDATE ON purchase_goods_receipts
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_receipt_witness();
      CREATE CONSTRAINT TRIGGER commitment_receipt_witness AFTER INSERT ON commitment_receipts
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_receipt_witness();
      CREATE CONSTRAINT TRIGGER commitment_receipt_witness AFTER INSERT ON commitment_receipt_decisions
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_receipt_witness();
      CREATE CONSTRAINT TRIGGER commitment_receipt_witness AFTER INSERT ON stock_ledger
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_receipt_witness();
    `);
    for (const signature of ["commitment_receipt_check(uuid)","commitment_receipt_witness()"])
      await r.query(`ALTER FUNCTION ${signature} SET search_path TO pg_catalog,"${scope.schema}",pg_temp;
        REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC`);
  }
  async down(): Promise<void> {
    throw new Error("Receipt evidence rollback requires isolated backup restore and replay; retain schema on application rollback");
  }
}
