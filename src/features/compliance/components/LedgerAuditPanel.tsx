import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
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
  useEffect(() => { void verify(); }, []);
  const rows = report?.discrepancies ?? [];
  const mismatch = (onHand: number | null, quantity: number | string) => onHand === null || Number(onHand) !== Number(quantity);
  const ledgerDrift = rows.some(row => mismatch(row.on_hand, row.ledger_quantity) || Number(row.transfer_errors) > 0);
  const fifoDrift = rows.some(row => mismatch(row.on_hand, row.fifo_quantity));
  const metrics = [
    ["SKUs Audited", report?.itemsChecked],
    ["Discrepancies", report && rows.length],
    ["Double-Entry Status", report && (ledgerDrift ? "Drift detected" : "Verified")],
    ["FIFO Layer Sync", report && (fifoDrift ? "Action required" : "100% matched")],
  ];
  const badge = (value: string | number, flagged: boolean) => <span className={flagged ? "rounded bg-rose-950 px-2 py-1 font-semibold text-rose-200" : "text-slate-300"}>{value}{flagged && <span className="ml-2 text-xs">Mismatch</span>}</span>;
  return <section className="space-y-4 text-slate-100">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-800 bg-gradient-to-r from-indigo-950 to-slate-900 p-5">
      <div><h2 className="text-xs font-bold uppercase tracking-wide text-indigo-300"><ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden="true" />Governance / Audit</h2>
        <h3 className="mt-1 text-xl font-bold">Double-Entry Ledger Reconciliation Center</h3><p className="mt-2 max-w-xl text-sm text-slate-300">Compare on-hand stock with ledger movements and released FIFO lots, and check warehouse transfers for unbalanced entries.</p></div>
      <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50" disabled={loading} onClick={verify}>
        {loading ? "Checking ledger..." : "Verify Ledger Integrity"}
      </button>
    </header>
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(([label, value]) =>
      <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><dt className="text-xs text-slate-400">{label}</dt>
        <dd className="mt-1 text-lg font-bold tabular-nums">{value ?? "—"}</dd></div>)}</dl>
    {error && <p role="alert" className="rounded-lg bg-rose-950 p-4 text-rose-200">{error}</p>}
    {report && <p role="status" className={"rounded-lg border p-4 text-sm font-semibold " + (rows.length ? "border-rose-800 bg-rose-950 text-rose-200" : "border-emerald-800 bg-emerald-950 text-emerald-200")}>{report.itemsChecked} items checked. {rows.length} discrepancies.</p>}
    {!!rows.length && <div className="overflow-x-auto rounded-xl border border-slate-700"><table className="w-full bg-slate-950 text-left text-sm">
      <thead className="bg-slate-900 text-xs uppercase text-slate-300"><tr>{["SKU", "On hand", "Ledger", "FIFO layers", "Unbalanced transfers"].map(label => <th scope="col" className="px-4 py-3" key={label}>{label}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.item_id} className="border-t border-slate-800 tabular-nums hover:bg-slate-900">
        <th scope="row" className="px-4 py-3 font-mono">{row.sku ?? row.item_id}</th><td className="px-4 py-3">{row.on_hand ?? "Missing item"}</td>
        <td className="px-4 py-3">{badge(row.ledger_quantity, mismatch(row.on_hand, row.ledger_quantity))}</td>
        <td className="px-4 py-3">{badge(row.fifo_quantity, mismatch(row.on_hand, row.fifo_quantity))}</td>
        <td className="px-4 py-3">{badge(row.transfer_errors, Number(row.transfer_errors) > 0)}</td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
