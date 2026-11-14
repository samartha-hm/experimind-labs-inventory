import { afterEach, beforeEach, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { ledgerReport, reconciliationSql, type LedgerBalance } from "./reconcileLedger";

let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE inventory_items (organization_id, id, sku, quantity);
    CREATE TABLE stock_ledger (organization_id, item_id, item_sku, qty_delta, transaction_type, reference_type, reference_id);
    CREATE TABLE stock_lots (organization_id, item_id, status, current_quantity);
    CREATE TABLE warehouse_transfers (organization_id, transfer_number, status);
    INSERT INTO inventory_items VALUES ('a','1','WIRE',4), ('a','2','EMPTY',0), ('b','1','OTHER',999);
    INSERT INTO stock_ledger VALUES ('a','1','WIRE',4,'INITIAL_BALANCE',NULL,NULL), ('b','1','OTHER',999,'INITIAL_BALANCE',NULL,NULL);
    INSERT INTO stock_lots VALUES ('a','1','RELEASED',1), ('a','1','RELEASED',3), ('a','1','QUARANTINE',5), ('b','1','RELEASED',999);
  `);
});
afterEach(() => db.close());
function audit() {
  return ledgerReport(db.prepare(reconciliationSql).all({ $1: "a" }) as unknown as LedgerBalance[]);
}
it("reconciles multiple active layers and empty stock within one tenant", () => {
  expect(audit()).toEqual({ valid: true, itemsChecked: 2, discrepancies: [] });
});
it("reports missing FIFO layers, ledger drift and orphan movements separately", () => {
  db.exec("DELETE FROM stock_lots WHERE organization_id='a'; UPDATE inventory_items SET quantity=7 WHERE id='1'; INSERT INTO stock_ledger VALUES ('a','3','ORPHAN',2,'INITIAL_BALANCE',NULL,NULL)");
  expect(audit().discrepancies).toEqual([
    expect.objectContaining({ sku: "ORPHAN", on_hand: null, ledger_quantity: 2 }),
    expect.objectContaining({ sku: "WIRE", on_hand: 7, ledger_quantity: 4, fifo_quantity: 0 }),
  ]);
});
it("requires a balancing leg when a dispatched transfer closes", () => {
  db.exec(`INSERT INTO warehouse_transfers VALUES ('a','T','in_transit');
    INSERT INTO stock_ledger VALUES ('a','1','WIRE',-1,'TRANSFER_OUT','stock_transfer','T');
    UPDATE inventory_items SET quantity=3 WHERE id='1';
    UPDATE stock_lots SET current_quantity=0 WHERE current_quantity=1;`);
  expect(audit().valid).toBe(true);
  db.exec("UPDATE warehouse_transfers SET status='received'");
  expect(audit().discrepancies[0].transfer_errors).toBe(1);
  db.exec(`INSERT INTO stock_ledger VALUES ('a','1','WIRE',1,'TRANSFER_IN','stock_transfer','T');
    UPDATE inventory_items SET quantity=4 WHERE id='1';
    UPDATE stock_lots SET current_quantity=1 WHERE current_quantity=0;`);
  expect(audit().valid).toBe(true);
});
