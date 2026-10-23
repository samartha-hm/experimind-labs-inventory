import { useRef, useState } from "react";
import { useAuth } from "../../AuthContext";
import { apiFetch } from "../../utils/api";
import { reconciliationSources, type ReconciliationPreview, type ReconciliationSource } from "./reconciliationTypes";
import HistoricalDecisionForm from "./HistoricalDecisionForm";

const control = "min-h-11 rounded-xl border border-slate-300 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50";

export default function HistoricalReconciliationPanel() {
  const { currentUser } = useAuth();
  const [source, setSource] = useState<ReconciliationSource>("inventory_items");
  const [preview, setPreview] = useState<ReconciliationPreview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const status = useRef<HTMLParagraphElement>(null);
  const [saved, setSaved] = useState(false);
  const visible = preview?.records.filter(record => `${record.label} ${record.id} ${record.decisions?.[0]?.decision.replaceAll("_", " ") ?? "unresolved"}`.toLowerCase().includes(filter.toLowerCase())) ?? [];
  if (!["admin", "super_admin"].includes(currentUser?.role ?? "")) return null;

  async function load(offset = 0, afterSave = false) {
    setSaved(afterSave);
    if (afterSave) status.current?.focus();
    setBusy(true); setError(""); setPreview(undefined);
    try {
      if (!navigator.onLine) throw new Error("Offline: reconnect before requesting current reconciliation evidence.");
      setPreview(await apiFetch(`/api/v1/stocktakes/reconciliation?source=${source}&offset=${offset}`));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to load evidence. Refresh and retry.");
    } finally { setBusy(false); }
  }

  function download() {
    if (!preview) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(preview, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url;
    link.download = `historical-${preview.source}-${preview.offset}-${preview.evidenceHash.slice(0, 12)}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section aria-labelledby="historical-review-title" aria-busy={busy} className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 sm:p-6 space-y-4">
    <h2 id="historical-review-title" className="text-xl font-semibold">Historical reconciliation review</h2>
    <p>Historical quantities remain unknown until verified; lifecycle status does not prove lineage. Posted stocktake balances are shown separately above.</p>
    <p className="rounded-xl bg-amber-50 p-3 text-amber-900">Review decisions change no stock, commitments, custody or fulfillment. Operational activation remains disabled.</p>
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-0">Historical source
        <select className={`${control} block max-w-full`} value={source} disabled={busy} onChange={event => { setSource(event.target.value as ReconciliationSource); setPreview(undefined); setError(""); }}>
          {reconciliationSources.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      <button className={control} disabled={busy} onClick={() => void load()}>Refresh evidence</button>
      <button className={control} disabled={busy || !preview} onClick={download}>Export this page</button>
      <label>Filter this page by name, ID or review status<input className={`${control} block w-full`} value={filter} onChange={e=>setFilter(e.target.value)}/></label>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <p ref={status} tabIndex={-1} role="status" aria-live="polite">{saved ? "Decision recorded. " : ""}{busy ? "Loading current evidence…" : preview ? `${visible.length} matching records of ${preview.records.length} on this page. Export covers this page only.` : "Select a source and refresh to inspect evidence."}</p>
    {preview && <>
      <p className="break-all text-sm">Page evidence SHA-256: {preview.evidenceHash}. Refresh and compare before review; this hash is not an approval or a complete graph fingerprint.</p>
      {!preview.records.length && <p>No records on this page. Other sources and unavailable schemas must still be checked.</p>}
      {preview.records.length > 0 && visible.length === 0 && <p>No records match this page filter.</p>}
      <ul className="space-y-3">{visible.map(record => <li key={record.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
        <h3 className="font-semibold break-words">{record.label}</h3>
        <p className="break-all text-sm">{record.id} · Lifecycle: {record.lifecycle ?? "unspecified"} · Reconciliation: {record.stock}</p>
        <p>Recorded quantity: {record.recordedQuantity ?? "unknown"} {record.unit ?? "(unit unknown)"}. Verified historical quantity: unknown. Before/after effects: unchanged.</p>
        <ul className="list-disc pl-5">{record.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul>
        <details><summary className="min-h-11 cursor-pointer py-3">Source provenance and evidence</summary>
          <p className="break-all text-sm">SHA-256: {record.evidenceHash}</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs" tabIndex={0} aria-label={`Source evidence for ${record.label}`}>{JSON.stringify(record.evidence, null, 2)}</pre>
        </details>
        <HistoricalDecisionForm record={record} source={preview.source} enabled={Boolean(preview.decisionsEnabled)} onSaved={()=>void load(preview.offset, true)}/>
      </li>)}</ul>
      <nav aria-label="Historical evidence pages" className="flex flex-wrap gap-3">
        <button className={control} disabled={busy || preview.offset === 0} onClick={() => void load(Math.max(0, preview.offset - 50))}>Previous page</button>
        <button className={control} disabled={busy || !preview.hasMore} onClick={() => void load(preview.offset + 50)}>Next page</button>
      </nav>
      <h3 className="font-semibold">Authorization still required</h3>
      <ul className="list-disc pl-5">{preview.authorizationRequired.map(item => <li key={item}>{item}</li>)}</ul>
    </>}
  </section>;
}
