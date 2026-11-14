import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../AuthContext';
import { apiFetch } from '../../utils/api';
import type { MaterialReconciliation } from './materialReconciliation';

export default function MaterialReconciliationPanel() {
  const {currentUser} = useAuth();
  const identity = `${currentUser?.id}/${currentUser?.organization_id}`;
  const generation = useRef(0);
  const [project,setProject] = useState('');
  const [view,setView] = useState<MaterialReconciliation>();
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  useEffect(()=>{generation.current++;setView(undefined);setProject('');setError('');setBusy(false);return()=>{generation.current++;};},[identity]);
  async function load() {
    const request = ++generation.current;
    setBusy(true);setError('');setView(undefined);
    try {
      const data: MaterialReconciliation = await apiFetch(`/api/v1/stocktakes/material-reconciliation/${encodeURIComponent(project.trim())}`);
      if (request===generation.current) setView(data);
    } catch (e) {if(request===generation.current)setError(e instanceof Error?e.message:'Reconciliation unavailable');}
    finally {if(request===generation.current)setBusy(false);}
  }
  return <section aria-labelledby="material-reconciliation-heading" className="min-w-0 space-y-4 rounded-2xl border border-slate-300 p-4">
    <h2 id="material-reconciliation-heading" className="text-xl font-semibold">Project material reconciliation</h2>
    <p>DRAFT / NOT AUTHORIZED · D6 BLOCKED · Pilot NO-GO. Read-only evidence; no transfer, release, settlement or stock posting.</p>
    <p className="text-sm">A = approved, F = fulfilled, H = held, U = unallocated within each account and unit. PO coverage is a subset of PR H. Physical stock and exclusive reservations are separate evidence. School delivery F does not settle output H or supplier/payables obligations.</p>
    <form onSubmit={e=>{e.preventDefault();void load();}} className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1">Project UUID<input required value={project} onChange={e=>{generation.current++;setProject(e.target.value);setView(undefined);setBusy(false);setError('');}} className="min-h-11 w-full rounded-xl border border-slate-300 bg-transparent p-3" autoComplete="off"/></label>
      <button disabled={busy||!project.trim()} className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-40">{busy?'Loading evidence…':'Reconcile project'}</button>
    </form>
    <div aria-live="polite">{busy&&<p>Reading authoritative sources…</p>}</div>
    {error&&<p role="alert" className="text-red-600">{error}</p>}
    {view&&<>
      <p className="break-all text-sm">Project {String(view.project.id)} · revision {String(view.project.revision)} · snapshot SHA-256 {view.witnessHash}</p>
      <h3 className="font-semibold">Closure blockers</h3>
      {view.closureBlockers.length ? <ul className="list-inside list-disc break-words">{view.closureBlockers.map((b,i)=><li key={i}>{b}</li>)}</ul> : <p>No current operational blockers reported. This does not approve ownership policy or financial discharge.</p>}
      <h3 className="font-semibold">Diagnostic issues</h3>
      <ul className="space-y-2 break-words">{view.issues.map((issue,i)=><li key={i}><strong>{issue.kind}</strong> · {issue.source}/{issue.identity}: {issue.detail}</li>)}</ul>
      <h3 className="font-semibold">Source evidence by dimension</h3>
      <div tabIndex={0} role="region" aria-label="Separate commitment balances" className="max-w-full overflow-auto">
        <table className="w-full text-left text-sm"><caption>Account balances; each row has its own dimension, school and unit. No cross-row total.</caption>
          <thead><tr>{['Account / dimension','School / grade / subject','Unit','Approved A','Fulfilled F','Held H','Unallocated U','Claim H'].map(label=><th key={label} className="p-2">{label}</th>)}</tr></thead>
          <tbody>{view.lanes.find(l=>l.source==='accounts')?.rows.map((a,i)=><tr key={i}>{[
            `${a.id} / ${a.dimension} / ${a.obligation??'—'}`,`${a.site_id} / ${JSON.stringify(a.selector)}`,a.unit,a.approved,a.fulfilled,a.held,a.unallocated,a.claim_held
          ].map((value,j)=><td key={j} className="p-2">{value===null?'CACHE ABSENT':String(value??'—')}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="text-sm">Account rows show separate balances; physical rows are ledger movements, not a commitment total. Expand sources for exact quantities, units, school lineage, revisions and witness identities. Empty sources differ from unavailable or truncated sources. Financial obligations are not assessed by this view.</p>
      {view.lanes.map(lane=><details key={lane.source} className="min-w-0 rounded-xl border border-slate-300 p-3"><summary className="min-h-11 cursor-pointer break-words">{lane.source} · {lane.available?`${lane.rows.length} records`:'UNAVAILABLE'}{lane.truncated?' · INCOMPLETE (500 record limit)':''}</summary>
        <pre tabIndex={0} aria-label={`${lane.source} source evidence`} className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(lane.rows,null,2)}</pre>
      </details>)}
    </>}
  </section>;
}
