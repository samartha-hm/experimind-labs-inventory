import { useState } from "react";
import { apiFetch } from "../../../utils/api";
import type { ledgerReport } from "../../../server/services/reconcileLedger";

export function LedgerAuditPanel() {
  const [report, setReport] = useState<ReturnType<typeof ledgerReport>>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function verify() {
    setLoading(true);
    setError("");
    setReport(undefined);
    try {
      setReport(await apiFetch("/api/v1/audit/reconcile-ledger"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ledger reconciliation unavailable.");
    } finally {
      setLoading(false);
    }
  }
  return <section className="space-y-4">
    <h2 className="text-xl font-semibold">Governance / Audit</h2>
    <button className="rounded bg-indigo-700 px-4 py-2 text-white" disabled={loading} onClick={verify}>
      {loading ? "Checking ledger..." : "Verify Ledger Integrity"}
    </button>
    {error && <p role="alert">{error}</p>}
    {report && <p role="status">{report.itemsChecked} items checked. {report.discrepancies.length} discrepancies.</p>}
    {!!report?.discrepancies.length && <table className="w-full text-left">
      <thead><tr>{["SKU", "On hand", "Ledger", "FIFO layers", "Unbalanced transfers"].map(label => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{report.discrepancies.map(row => <tr key={row.item_id}>
        <td>{row.sku ?? row.item_id}</td><td>{row.on_hand ?? "Missing item"}</td>
        <td>{row.ledger_quantity}</td><td>{row.fifo_quantity}</td><td>{row.transfer_errors}</td>
      </tr>)}</tbody>
    </table>}
  </section>;
}
