// A single statement gives inventory, movements and lots the same PostgreSQL snapshot.
export const reconciliationSql = `
WITH inventory AS (
  SELECT id AS item_id, sku, quantity FROM inventory_items WHERE organization_id = $1
), movements AS (
  SELECT item_id, item_sku, qty_delta, transaction_type, reference_type, reference_id
  FROM stock_ledger WHERE organization_id = $1
), ledger AS (
  SELECT item_id, MAX(item_sku) AS sku, SUM(qty_delta) AS quantity FROM movements GROUP BY item_id
), layers AS (
  SELECT item_id, SUM(CASE WHEN status = 'RELEASED' AND current_quantity > 0
                           THEN current_quantity ELSE 0 END) AS quantity
  FROM stock_lots WHERE organization_id = $1 GROUP BY item_id
), invalid_transfers AS (
  SELECT m.item_id, m.reference_id
  FROM movements m LEFT JOIN warehouse_transfers t
    ON t.organization_id = $1 AND t.transfer_number = m.reference_id
  WHERE m.transaction_type IN ('TRANSFER_OUT', 'TRANSFER_IN')
  GROUP BY m.item_id, m.reference_id, t.status
  HAVING t.status IS NULL OR t.status NOT IN ('in_transit', 'received')
    OR MAX(CASE WHEN COALESCE(m.reference_type, '') <> 'stock_transfer'
                  OR (m.transaction_type = 'TRANSFER_OUT' AND m.qty_delta >= 0)
                  OR (m.transaction_type = 'TRANSFER_IN' AND (m.qty_delta <= 0 OR t.status = 'in_transit'))
                THEN 1 ELSE 0 END) > 0
    OR (t.status = 'received' AND SUM(m.qty_delta) <> 0)
), transfer_errors AS (
  SELECT item_id, COUNT(*) AS errors FROM invalid_transfers GROUP BY item_id
), items AS (
  SELECT item_id FROM inventory UNION SELECT item_id FROM ledger UNION SELECT item_id FROM layers
)
SELECT items.item_id, COALESCE(i.sku, l.sku) AS sku, i.quantity AS on_hand,
       COALESCE(l.quantity, 0) AS ledger_quantity, COALESCE(f.quantity, 0) AS fifo_quantity,
       COALESCE(t.errors, 0) AS transfer_errors,
       CASE WHEN i.quantity IS NULL OR i.quantity <> COALESCE(l.quantity, 0)
              OR i.quantity <> COALESCE(f.quantity, 0) OR t.errors > 0 THEN 1 ELSE 0 END AS mismatch
FROM items LEFT JOIN inventory i USING (item_id) LEFT JOIN ledger l USING (item_id)
LEFT JOIN layers f USING (item_id) LEFT JOIN transfer_errors t USING (item_id)
ORDER BY sku, items.item_id`;

export interface LedgerBalance {
  item_id: string;
  sku: string | null;
  on_hand: number | null;
  ledger_quantity: string | number;
  fifo_quantity: string | number;
  transfer_errors: string | number;
  mismatch: number;
}

export function ledgerReport(balances: LedgerBalance[]) {
  const discrepancies = balances.filter(row => row.mismatch === 1);
  return { valid: discrepancies.length === 0, itemsChecked: balances.length, discrepancies };
}
