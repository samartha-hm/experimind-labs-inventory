import { useState } from "react";
import { apiFetch } from "../../utils/api";
import { historicalDecisionStates, type HistoricalDecisionInput, type HistoricalDecisionState, type ReconciliationRecord, type ReconciliationSource } from "./reconciliationTypes";

const control="min-h-11 w-full rounded-xl border border-slate-300 p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50";
export default function HistoricalDecisionForm({record,source,enabled,onSaved}:{record:ReconciliationRecord;source:ReconciliationSource;enabled:boolean;onSaved:()=>void}) {
  const [decision,setDecision]=useState<HistoricalDecisionState>("requires_documentation");
  const [reason,setReason]=useState(""); const [identifier,setIdentifier]=useState(""); const [provenance,setProvenance]=useState(""); const [hash,setHash]=useState("");
  const [pending,setPending]=useState<{key:string;input:HistoricalDecisionInput}>();
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  const latest=record.decisions?.[0];
  async function save() {
    if(busy)return; setBusy(true); setMessage("");
    const request=pending??{key:crypto.randomUUID(),input:{source,record_id:record.id,revision:latest?.revision??0,evidence_hash:record.evidenceHash,decision,reason:reason.trim(),evidence_refs:[{identifier:identifier.trim(),provenance:provenance.trim(),sha256:hash.trim()}]}};
    setPending(request);
    try {
      if(!navigator.onLine)throw Error("Offline. Reconnect and retry this exact decision.");
      await apiFetch("/api/v1/stocktakes/reconciliation/decisions",{method:"POST",headers:{"Idempotency-Key":request.key},body:JSON.stringify(request.input)});
      setPending(undefined); onSaved();
    }catch(error){setMessage((error instanceof Error?error.message:"Uncertain response")+". Retry sends the same request. Refresh evidence to inspect current history before preparing another decision.");}
    finally{setBusy(false);}
  }
  return <div className="space-y-3">
    <p>Review status: <strong>{latest?.decision.replaceAll("_"," ")??"unresolved — no decision"}</strong>{latest&&latest.evidence_hash!==record.evidenceHash?" · Source changed since review; new review required.":""}</p>
    <details><summary className="min-h-11 cursor-pointer py-3">Decision history ({record.decisions?.length??0})</summary>
      <ol className="space-y-3">{record.decisions?.map(d=><li key={d.id} className="break-words border-l-2 pl-3 text-sm">
        <p>Revision {d.revision}: {d.decision.replaceAll("_"," ")} · {new Date(d.created_at).toLocaleString()}</p>
        <p className="break-all">Reviewer: {d.actor_id}. Supersedes: {d.previous_id??"none"}. Evidence: {d.evidence_hash}</p><p>{d.reason}</p>
        <ul>{d.evidence_refs.map((ref,i)=><li key={i} className="break-all">{ref.identifier} · {ref.provenance} · SHA-256 {ref.sha256}</li>)}</ul>
      </li>)}</ol>
    </details>
    <details><summary className="min-h-11 cursor-pointer py-3">Record a review decision</summary>
      <p className="my-3">This appends a review judgment. Historical quantities remain unverified; operational authorization is still required.</p>
      {!enabled&&<p role="status">Decision recording unavailable: trusted review authority must be enabled for this environment.</p>}
      <form className="space-y-3" onSubmit={e=>{e.preventDefault();void save();}}>
        <fieldset disabled={!enabled||busy||Boolean(pending)} className="space-y-3">
          <label className="block">Decision<select className={control} value={decision} onChange={e=>setDecision(e.target.value as HistoricalDecisionState)}>{historicalDecisionStates.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label>
          <label className="block">Explanation<textarea required maxLength={2000} className={control} value={reason} onChange={e=>setReason(e.target.value)}/></label>
          <label className="block">Supporting evidence identifier<input required maxLength={300} className={control} value={identifier} onChange={e=>setIdentifier(e.target.value)}/></label>
          <label className="block">Evidence provenance<textarea required maxLength={1000} className={control} value={provenance} onChange={e=>setProvenance(e.target.value)}/></label>
          <label className="block">Supporting evidence SHA-256<input required pattern="[a-f0-9]{64}" maxLength={64} className={control} value={hash} onChange={e=>setHash(e.target.value)}/></label>
        </fieldset>
        <button className={control} disabled={!enabled||busy} type="submit">{busy?"Recording…":pending?"Retry exact decision":latest?"Append superseding decision":"Record decision"}</button>
        {message&&<p role="alert" className="text-red-700">{message}</p>}
      </form>
    </details>
  </div>;
}
