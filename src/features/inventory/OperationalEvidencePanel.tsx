import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../AuthContext";
import type { Stocktake } from "../../entity/Stocktake";
import { evidenceGates, evidenceDecisions, type OperationalCommand, type OperationalRecord } from "./operationalEvidenceTypes";

const control="block min-h-11 w-full min-w-0 rounded-xl border p-2";
const button="min-h-11 rounded-xl border px-4 py-2 disabled:opacity-40";
export default function OperationalEvidencePanel({session}: {session?:Stocktake}) {
  const {currentUser}=useAuth();
  const collector=["admin","super_admin","manager","inventory_staff","staff"].includes(currentUser?.role??"");
  const reviewer=["admin","super_admin","manager"].includes(currentUser?.role??"");
  const [records,setRecords]=useState<OperationalRecord[]>([]),[history,setHistory]=useState<OperationalRecord[]>([]);
  const [selected,setSelected]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const [fields,setFields]=useState<Record<string,string>>({gate:"scanner",site:"WAREHOUSE",classification:"REAL_WORLD_CLAIM",decision:"REVIEWED"});
  const [unknown,setUnknown]=useState(true);
  const pending=useRef<{body:string;key:string}|undefined>(undefined),sending=useRef(false);
  const active=records.find(r=>r.stream_id===selected),s=active?.snapshot;
  const refs=()=>[{identifier:fields.reference,provenance:fields.provenance,sha256:fields.hash}];
  async function load(){setRecords(await apiFetch("/api/v1/stocktakes/operational-evidence"));}
  useEffect(()=>{void load().catch(()=>setError("Evidence unavailable. Sign in and reconnect."));},[]);
  async function send(action:OperationalCommand["action"],data:Record<string,unknown>,fresh=false){
    if(sending.current)return;
    sending.current=true;setBusy(true);setError("");setMessage("");
    try{
      if(!pending.current)pending.current={body:JSON.stringify({stream:fresh?crypto.randomUUID():selected,revision:fresh?0:active?.revision,action,data}),key:crypto.randomUUID()};
      const saved:OperationalRecord=await apiFetch("/api/v1/stocktakes/operational-evidence",{method:"POST",headers:{"Idempotency-Key":pending.current.key},body:pending.current.body});
      pending.current=undefined;setSelected(saved.stream_id);setHistory([]);await load();setMessage("Saved. Operational verification remains unavailable.");
    }catch(e){setError(`${e instanceof Error?e.message:"Save failed"}. Retry preserves the exact command and retry key.`);}
    finally{sending.current=false;setBusy(false);}
  }
  function field(key:string,label:string,options?:readonly string[]){return <label className="block" key={key}>{label}{options?<select className={control} value={fields[key]??""} onChange={e=>setFields(v=>({...v,[key]:e.target.value}))}>{options.map(v=><option key={v}>{v}</option>)}</select>:<input className={control} value={fields[key]??""} onChange={e=>setFields(v=>({...v,[key]:e.target.value}))}/>}</label>;}
  function exportRecords(){
    const url=URL.createObjectURL(new Blob([JSON.stringify({kind:"ATTRIBUTED EVIDENCE — NOT PHYSICAL ACCEPTANCE",records,history},null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="d6-attributed-evidence.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const scopes=session?.targets.flatMap(t=>t.locations.map(location=>({item:t.item_id,location})))??[];
  const reviewData=()=>({notes:fields.notes,references:refs()});
  return <section className="min-w-0 space-y-4 rounded-2xl border p-4" aria-label="Attributed operational evidence" aria-busy={busy}>
    <h2 className="text-xl font-semibold">Attributed evidence and independent counts</h2>
    <p>Claims retain actor, revision and provenance. REVIEWED does not confer VERIFIED or open a pilot gate. Counts never post stock. UNKNOWN quantities remain unknown.</p>
    {error&&<p role="alert" className="break-words">{error}</p>}{message&&<p role="status">{message}</p>}
    <div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={()=>void load().catch(()=>setError("Refresh failed"))}>Refresh evidence</button><button className={button} onClick={exportRecords}>Export attributed evidence</button></div>
    <label>Evidence record<select className={control} value={selected} onChange={e=>{setSelected(e.target.value);setHistory([]);}}><option value="">Select evidence record</option>{records.map(r=><option key={r.stream_id} value={r.stream_id}>{r.kind} · {String(r.snapshot.gate??r.snapshot.location)} · {String(r.snapshot.status)} · r{r.revision}</option>)}</select></label>
    {active&&<article className="space-y-2 break-words rounded-xl border p-3"><p>{String(s?.classification)} · {String(s?.status)} · r{active.revision}</p><p>Actor: {active.actor_id} · {active.captured_at}</p>
      {active.kind==="count"&&<><p>Item: {String(s?.item_id)} · {String(s?.location)} · {String(s?.unit)}</p><p>Agreed quantity: {s?.quantity===null?"UNKNOWN":String(s?.quantity)}</p>{(s?.observations as Record<string,unknown>[]).map(o=><p key={String(o.pass)}>Pass {String(o.pass)} · {String(o.actor)} · {o.quantity===null?"UNKNOWN":String(o.quantity)} {String(o.unit)}</p>)}</>}
      <button className={button} disabled={busy} onClick={()=>void apiFetch(`/api/v1/stocktakes/operational-evidence?stream=${active.stream_id}`).then(setHistory).catch(()=>setError("History unavailable"))}>Load immutable history</button>
      {history.map(r=><p key={r.revision}>r{r.revision} · {String(r.snapshot.status)} · {r.actor_id} · {r.captured_at}</p>)}
    </article>}
    {collector&&<fieldset disabled={busy||!!pending.current} className="min-w-0 space-y-4"><legend>Evidence or count observation</legend>
      <div className="grid min-w-0 gap-3 md:grid-cols-2">{field("classification","Evidence classification",["REAL_WORLD_CLAIM","SYNTHETIC TEST EVIDENCE"])}{field("observed","Observed at (ISO timestamp)")}{field("reference","Evidence reference")}{field("provenance","Evidence provenance")}{field("hash","Evidence SHA256")}{field("notes","Evidence notes")}</div>
      <details><summary className="min-h-11 cursor-pointer">Collect a new operational claim</summary><div className="grid gap-3 md:grid-cols-2">{field("gate","Operational gate",evidenceGates)}{field("site","Site UUID or WAREHOUSE")}{field("source","Source system")}{field("identity","Source record identity")}</div>
        <button className={button} onClick={()=>void send("submit",{gate:fields.gate,site:fields.site,source:fields.source,record_identity:fields.identity,classification:fields.classification,observed_at:fields.observed,...reviewData()},true)}>Save operational claim</button>
      </details>
      {reviewer&&session?.status==="draft"&&<details><summary className="min-h-11 cursor-pointer">Assign blind count scope</summary><label>Session item and location<select className={control} value={fields.scope??""} onChange={e=>setFields(v=>({...v,scope:e.target.value}))}><option value="">Select count scope</option>{scopes.map((v,i)=><option key={i} value={i}>{v.item} · {v.location}</option>)}</select></label>
        {field("first","First counter UUID")}{field("second","Independent counter UUID")}
        <button className={button} disabled={!fields.scope} onClick={()=>{const v=scopes[Number(fields.scope)];if(v)void send("assign",{stocktake_id:session.id,stocktake_revision:session.revision,item_id:v.item,location:v.location,first_counter:fields.first,recount_counter:fields.second,classification:fields.classification,notes:fields.notes},true);}}>Assign count scope</button>
      </details>}
      {active?.kind==="count"&&<div className="space-y-2"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={unknown} onChange={e=>setUnknown(e.target.checked)}/>Quantity UNKNOWN</label>{!unknown&&field("quantity","Observed quantity")}
        <button className={button} onClick={()=>void send("count",{quantity:unknown?null:fields.quantity,unit:s?.unit,observed_at:fields.observed,...reviewData()})}>Save assigned blind pass</button>
      </div>}
      {active&&reviewer&&<div className="space-y-2">{active.kind==="evidence"?<>{field("decision","Independent review decision",evidenceDecisions)}<button className={button} onClick={()=>void send("review",{decision:fields.decision,...reviewData()})}>Record independent review</button></>:<div className="flex flex-wrap gap-2"><button className={button} onClick={()=>void send("recount",reviewData())}>Request recount</button><button className={button} onClick={()=>void send("reviewCount",reviewData())}>Review agreeing count passes</button></div>}</div>}
    </fieldset>}
    {pending.current&&<div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={()=>void send("submit",{})}>Retry pending save</button><button className={button} disabled={busy} onClick={()=>{pending.current=undefined;setError("");void load().catch(()=>setError("Refresh failed"));}}>Discard pending command and refresh</button></div>}
  </section>;
}
