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
  const [candidates, setCandidates] = useState<{id:string;label:string}[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [links, setLinks] = useState<{from:string;to:string}[]>([]);
  const [simulation, setSimulation] = useState<{conflicts:string[];authorizationRequired:string[];before:unknown;after:unknown;evidenceHash:string}>();
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

  async function simulate() {
    setBusy(true); setError(""); setSimulation(undefined);
    try {setSimulation(await apiFetch("/api/v1/stocktakes/reconciliation/simulate",{method:"POST",body:JSON.stringify({links})}));}
    catch (failure) {setError(failure instanceof Error?failure.message:"Unable to validate current lineage");}
    finally {setBusy(false);}
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
        {record.decisions?.[0]?.decision === "accepted_for_review" && <button className={control} disabled={busy || candidates.some(c=>c.id===record.decisions![0].id)} onClick={()=>{
          const decision=record.decisions![0]; setCandidates(old=>[...old,{id:decision.id,label:`${preview.source.replaceAll("_"," ")}: ${record.label} (review ${decision.revision})`}]);
        }}>Add reviewed source to simulation</button>}
      </li>)}</ul>
      <nav aria-label="Historical evidence pages" className="flex flex-wrap gap-3">
        <button className={control} disabled={busy || preview.offset === 0} onClick={() => void load(Math.max(0, preview.offset - 50))}>Previous page</button>
        <button className={control} disabled={busy || !preview.hasMore} onClick={() => void load(preview.offset + 50)}>Next page</button>
      </nav>
      <h3 className="font-semibold">Authorization still required</h3>
      <ul className="list-disc pl-5">{preview.authorizationRequired.map(item => <li key={item}>{item}</li>)}</ul>
    </>}
    <section aria-label="Historical lineage simulation" className="space-y-3 border-t pt-4">
      <h3 className="font-semibold">Validate proposed historical lineage</h3>
      <p>Add accepted review candidates from each source page. Validation requires matching evidence references, current source hashes and current reviews. References still require independent verification. No claims are reserved; activation is disabled.</p>
      <div className="flex flex-wrap gap-3">
        <label className="min-w-0">Link from<select className={`${control} block max-w-full`} value={from} onChange={e=>setFrom(e.target.value)}><option value="">Select source</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label className="min-w-0">Link to<select className={`${control} block max-w-full`} value={to} onChange={e=>setTo(e.target.value)}><option value="">Select target</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <button className={control} disabled={busy || !from || !to || links.length>=20} onClick={()=>{setLinks(old=>[...old,{from,to}]);setSimulation(undefined);}}>Add proposed link</button>
      </div>
      <ol className="space-y-2">{links.map((link,index)=><li key={index} className="break-words">{candidates.find(c=>c.id===link.from)?.label} → {candidates.find(c=>c.id===link.to)?.label} <button className={control} disabled={busy} aria-label={`Remove proposed link ${index+1}`} onClick={()=>{setLinks(old=>old.filter((_,i)=>i!==index));setSimulation(undefined);}}>Remove</button></li>)}</ol>
      <button className={control} disabled={busy || !links.length} onClick={()=>void simulate()}>Validate lineage proposal</button>
      {simulation && <div role="status" className="space-y-2">
        <p>{simulation.conflicts.length?"Conflicts found":"Structural checks passed; authoritative linkage remains unverified"}. Stock, commitments, custody and fulfillment remain unchanged. Historical verified quantity remains unknown.</p>
        <ul>{simulation.conflicts.map(c=><li key={c} className="break-all">{c}</li>)}</ul>
        <details><summary className="min-h-11 py-3">Before and after accounting fingerprints</summary><pre className="overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({before:simulation.before,after:simulation.after,evidenceHash:simulation.evidenceHash},null,2)}</pre></details>
        <ul>{simulation.authorizationRequired.map(a=><li key={a}>{a}</li>)}</ul>
      </div>}
    </section>
  </section>;
}
