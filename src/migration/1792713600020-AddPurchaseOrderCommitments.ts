import type { MigrationInterface, QueryRunner } from "typeorm";

/** Explicit, isolated synthetic activation. Never registered in server startup. */
export class AddPurchaseOrderCommitments1792713600020 implements MigrationInterface {
  name = "AddPurchaseOrderCommitments1792713600020";
  async up(r: QueryRunner): Promise<void> {
    const [scope] = await r.query("SELECT current_database() db,current_schema() schema");
    if (scope.db !== "experimind_kitbuilder_test" || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))
      throw new Error("PO activation restricted to isolated synthetic requirement_test schema");
    await r.query(`
      ALTER TABLE purchase_orders DROP CONSTRAINT supply_request_once;
      CREATE UNIQUE INDEX supply_unplanned_request_once ON purchase_orders(purchase_request_id) WHERE planning_lines IS NULL;
      CREATE TABLE commitment_po_lines (
        order_id uuid PRIMARY KEY REFERENCES purchase_orders(id), request_id uuid NOT NULL REFERENCES purchase_requests(id),
        line_id uuid NOT NULL REFERENCES commitment_pr_lines(line_id), organization_id uuid NOT NULL,
        account_id uuid NOT NULL, entitlement_id uuid NOT NULL, request_revision integer NOT NULL,
        frozen_request jsonb NOT NULL, frozen_order jsonb NOT NULL,
        operation_key text NOT NULL CHECK(length(trim(operation_key)) BETWEEN 1 AND 100),
        created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        FOREIGN KEY(entitlement_id,account_id,organization_id) REFERENCES commitment_entitlements(id,account_id,organization_id)
      );
      CREATE TABLE commitment_po_coverage (
        id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES commitment_po_lines(order_id),
        claim_id uuid NOT NULL REFERENCES commitment_claims(id), source_slice text NOT NULL,
        start_quantity numeric(20,6) NOT NULL, end_quantity numeric(20,6) NOT NULL,
        operation_key text NOT NULL CHECK(length(trim(operation_key)) BETWEEN 1 AND 100),
        created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        CHECK(start_quantity>=0 AND end_quantity>start_quantity AND start_quantity=round(start_quantity,4)
          AND end_quantity=round(end_quantity,4))
      );
      CREATE INDEX commitment_po_coverage_claim ON commitment_po_coverage(claim_id);
      CREATE TRIGGER commitment_po_line_immutable BEFORE UPDATE OR DELETE ON commitment_po_lines
        FOR EACH ROW EXECUTE FUNCTION commitment_immutable();
      CREATE TRIGGER commitment_po_coverage_immutable BEFORE UPDATE OR DELETE ON commitment_po_coverage
        FOR EACH ROW EXECUTE FUNCTION commitment_immutable();
    `);
    const [{clean}] = await r.query("SELECT pg_get_functiondef('commitment_reservation_clean(uuid,uuid)'::regprocedure) clean");
    const predicate="WHERE p.organization_id=org AND l->>'project_id'=project::text)";
    if (!clean.includes(predicate)) throw new Error("Unexpected historical PO quarantine contract");
    await r.query(clean.replace(predicate,`WHERE p.organization_id=org AND l->>'project_id'=project::text
      AND NOT EXISTS(SELECT 1 FROM commitment_po_lines b WHERE b.order_id=p.id AND b.organization_id=org
        AND b.line_id::text=l->>'id'))`));
    const [{gate}] = await r.query("SELECT pg_get_functiondef('commitment_reservation_downstream_gate()'::regprocedure) gate");
    const marker="org=(doc->>'organization_id')::uuid;";
    if (!gate.includes(marker)) throw new Error("Unexpected downstream gate contract");
    // Only a mapped PR's PO may reach the deferred exact-coverage witness. Receipts keep the old gate.
    await r.query(gate.replace(marker,marker+`
      IF TG_TABLE_NAME='purchase_orders' AND EXISTS(SELECT 1 FROM commitment_pr_lines
        WHERE request_id::text=doc->>'purchase_request_id' AND organization_id=org) THEN RETURN NEW; END IF;`));
    const [{supply}] = await r.query("SELECT pg_get_functiondef('guard_supply_documents()'::regprocedure) supply");
    const immutable="NEW.planning_lines IS DISTINCT FROM OLD.planning_lines";
    if (!supply.includes(immutable)) throw new Error("Unexpected legacy PO immutability contract");
    await r.query(supply.replace(immutable,`(NEW.planning_lines IS DISTINCT FROM OLD.planning_lines AND NOT EXISTS(
      SELECT 1 FROM commitment_po_lines x WHERE x.order_id=OLD.id AND x.organization_id=OLD.organization_id))`));
    const [{definition}] = await r.query("SELECT pg_get_functiondef('commitment_pr_check(uuid)'::regprocedure) definition");
    const old=`IF EXISTS(SELECT 1 FROM purchase_orders WHERE purchase_request_id=rid AND organization_id=r.organization_id)
          THEN RAISE EXCEPTION 'PR downstream lineage requires reconciliation' USING ERRCODE='23514'; END IF;`;
    if (!definition.includes(old)) throw new Error("Unexpected PR coverage contract");
    await r.query(definition.replace(old,`IF EXISTS(SELECT 1 FROM purchase_orders p WHERE p.purchase_request_id=rid AND
        (p.organization_id<>r.organization_id OR NOT EXISTS(SELECT 1 FROM commitment_po_lines x WHERE x.order_id=p.id)))
        THEN RAISE EXCEPTION 'Unmapped PO requires reconciliation' USING ERRCODE='23514'; END IF;
      IF EXISTS(SELECT 1 FROM commitment_po_lines x WHERE x.request_id=rid AND
        (x.frozen_request IS DISTINCT FROM to_jsonb(r) OR x.request_revision<>r.revision OR r.status<>'approved'))
        THEN RAISE EXCEPTION 'PO encumbered PR is frozen' USING ERRCODE='23514'; END IF;
      PERFORM commitment_po_check(x.order_id) FROM commitment_po_lines x WHERE x.request_id=rid;`));
    await r.query(`
      CREATE FUNCTION commitment_po_check(oid uuid) RETURNS void LANGUAGE plpgsql AS $$
      DECLARE p purchase_orders; b commitment_po_lines; r purchase_requests; a commitment_accounts;
        e commitment_entitlements; l jsonb; q numeric;
      BEGIN
        SELECT * INTO STRICT b FROM commitment_po_lines WHERE order_id=oid;
        SELECT * INTO STRICT a FROM commitment_accounts WHERE id=b.account_id AND organization_id=b.organization_id;
        SELECT * INTO STRICT e FROM commitment_entitlements WHERE id=b.entitlement_id AND account_id=a.id;
        PERFORM requirement_assert(b.organization_id,a.project_id,a.site_id,e.revision,e.approval_id);
        PERFORM 1 FROM commitment_balances WHERE account_id=a.id FOR UPDATE;
        SELECT * INTO STRICT r FROM purchase_requests WHERE id=b.request_id;
        SELECT * INTO STRICT p FROM purchase_orders WHERE id=oid;
        IF r.status<>'approved' OR r.revision<>b.request_revision OR b.frozen_request IS DISTINCT FROM to_jsonb(r)
          OR r.organization_id<>b.organization_id OR p.organization_id<>b.organization_id
          OR p.purchase_request_id IS DISTINCT FROM r.id OR jsonb_array_length(p.planning_lines)<>1
          OR p.planning_lines IS NULL OR p.status NOT IN ('draft','approved')
          OR p.planning_revision IS NULL OR p.planning_revision<1
          OR (to_jsonb(p)-'planning_lines'-'planning_revision'-'reviewed_by'-'approved_by'-'status'-'updated_at')
            IS DISTINCT FROM (b.frozen_order-'planning_lines'-'planning_revision'-'reviewed_by'-'approved_by'-'status'-'updated_at')
          OR (p.status='approved' AND (p.reviewed_by IS NULL OR p.approved_by IS NULL))
          OR NOT EXISTS(SELECT 1 FROM commitment_pr_lines x WHERE x.request_id=r.id AND x.line_id=b.line_id
            AND x.organization_id=b.organization_id AND x.account_id=a.id AND x.entitlement_id=e.id)
          OR EXISTS(SELECT 1 FROM purchase_goods_receipts WHERE po_id=oid)
          OR EXISTS(SELECT 1 FROM purchase_order_lines WHERE po_id=oid)
          THEN RAISE EXCEPTION 'Exact untouched approved PR to PO lineage required' USING ERRCODE='23514'; END IF;
        l=p.planning_lines->0;
        IF (l-'quantity'-'canonical_quantity') IS DISTINCT FROM ((r.lines->0)-'quantity'-'canonical_quantity')
          OR l->>'id' IS DISTINCT FROM b.line_id::text OR l->>'quantity' IS DISTINCT FROM l->>'canonical_quantity'
          THEN RAISE EXCEPTION 'Frozen PO line identity required' USING ERRCODE='23514'; END IF;
        PERFORM 1 FROM commitment_claims c JOIN commitment_po_coverage x ON x.claim_id=c.id
          WHERE x.order_id=oid ORDER BY c.id FOR UPDATE OF c;
        IF EXISTS(SELECT 1 FROM commitment_po_coverage x JOIN commitment_claims c ON c.id=x.claim_id WHERE x.order_id=oid
          AND (c.organization_id<>b.organization_id OR c.account_id<>a.id
            OR c.source_kind<>'purchase_request_line' OR c.source_id<>b.line_id::text OR c.source_slice<>x.source_slice
            OR c.retired OR c.parent_id IS NOT NULL OR c.fulfilled<>0 OR x.end_quantity>c.held
            OR NOT EXISTS(SELECT 1 FROM commitment_sources s WHERE s.claim_id=c.id AND s.organization_id=b.organization_id
              AND s.account_id=a.id AND s.kind=c.source_kind AND s.source_id=c.source_id AND s.slice=x.source_slice)))
          THEN RAISE EXCEPTION 'Exact live PR source slice required' USING ERRCODE='23514'; END IF;
        IF EXISTS(SELECT 1 FROM commitment_po_coverage x JOIN commitment_po_coverage y ON x.claim_id=y.claim_id AND x.id<>y.id
          WHERE x.order_id=oid AND x.start_quantity<y.end_quantity AND y.start_quantity<x.end_quantity)
          THEN RAISE EXCEPTION 'PO source coverage overlaps' USING ERRCODE='23514'; END IF;
        SELECT coalesce(sum(end_quantity-start_quantity),0) INTO q FROM commitment_po_coverage WHERE order_id=oid;
        IF q<=0 OR q IS DISTINCT FROM (l->>'canonical_quantity')::numeric
          THEN RAISE EXCEPTION 'PO quantity and exclusive coverage differ' USING ERRCODE='23514'; END IF;
      END $$;
      CREATE FUNCTION commitment_po_witness() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_TABLE_NAME='purchase_orders' THEN
          IF NEW.purchase_request_id IS NULL AND NEW.planning_lines IS NULL THEN RETURN NULL; END IF;
          PERFORM commitment_po_check(NEW.id);
        ELSE PERFORM commitment_po_check(NEW.order_id); END IF;
        RETURN NULL;
      END $$;
      CREATE CONSTRAINT TRIGGER commitment_po_witness AFTER INSERT OR UPDATE ON purchase_orders
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_po_witness();
      CREATE CONSTRAINT TRIGGER commitment_po_witness AFTER INSERT ON commitment_po_lines
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_po_witness();
      CREATE CONSTRAINT TRIGGER commitment_po_witness AFTER INSERT ON commitment_po_coverage
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_po_witness();
    `);
    for (const signature of ["commitment_po_check(uuid)","commitment_po_witness()"])
      await r.query(`ALTER FUNCTION ${signature} SET search_path TO pg_catalog,"${scope.schema}",pg_temp;
        REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC`);
  }
  async down(): Promise<void> { throw new Error("PO coverage rollback requires isolated backup restore and replay"); }
}
