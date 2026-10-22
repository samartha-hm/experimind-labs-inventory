import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../AuthContext";
import type { FinishedOutput } from "../../entity/FinishedOutput";

interface WorkOrder {
  id:string; number:string; project_id:string; site_id:string; planned_quantity:string; unit:string;
  recipe_id:string; approval_id:string; demand_revision:number; demand_line:Record<string,unknown>;
  materials:{id:string;item:string;name:string;unit:string;held:string;fulfilled:string}[];
  outputs:FinishedOutput[];
}
interface Pending {path:string;key:string;input:Record<string,string>}
const control="min-h-11 rounded-xl border border-slate-300 bg-transparent p-3";
const button=`${control} disabled:opacity-40`;
const endpoint="/api/v1/production-planning";

/** Kept separate from legacy controls, whose schema-wide execution gate remains closed. */
export default function TrustedProductionPanel({projectId}:{projectId?:string}) {
  const {currentUser}=useAuth();
  const storageKey=`production.pending.${currentUser?.id}`;
  const [orders,setOrders]=useState<WorkOrder[]>([]),[enabled,setEnabled]=useState(false);
  const [selected,setSelected]=useState(""),[material,setMaterial]=useState(""),[kind,setKind]=useState("issue");
  const [quantity,setQuantity]=useState(""),[location,setLocation]=useState(""),[reason,setReason]=useState("");
  const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [pending,setPending]=useState<Pending|null>(null);
  const writer=["admin","super_admin"].includes(currentUser?.role??"");
  async function refresh() {
    const data: {enabled:boolean;orders:WorkOrder[]}=await apiFetch(`${endpoint}/trusted-work-queue`);
    setEnabled(data.enabled);setOrders(data.orders.filter(o=>!projectId||o.project_id===projectId));
  }
  useEffect(()=>{
    let active=true;
    setOrders([]);setEnabled(false);setPending(null);setSelected("");
    try {const saved=sessionStorage.getItem(storageKey);if(saved)setPending(JSON.parse(saved) as Pending);} catch {setError("Pending request could not be read. Reconcile custody before another operation.");}
    void apiFetch(`${endpoint}/trusted-work-queue`).then((data:{enabled:boolean;orders:WorkOrder[]})=>{
      if(active){setEnabled(data.enabled);setOrders(data.orders.filter(o=>!projectId||o.project_id===projectId));}
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Production queue unavailable");});
    return()=>{active=false;};
  },[projectId,storageKey]);
  const order=orders.find(o=>o.id===selected),input=order?.materials.find(m=>m.id===material);
  async function submit(operation:Pending) {
    setBusy(true);setError("");setMessage("");
    try {
      // Persist before sending. A lost response must reuse the exact source and key.
      sessionStorage.setItem(storageKey,JSON.stringify(operation));setPending(operation);
      const result=await apiFetch(endpoint+operation.path,{method:"POST",headers:{"Idempotency-Key":operation.key},body:JSON.stringify(operation.input)});
      sessionStorage.removeItem(storageKey);setPending(null);setConfirmed(false);setQuantity("");
      setMessage(`Recorded ${result.quantity}. Evidence identity: ${result.id}.`);
      await refresh();
    } catch(e) {setError(`${e instanceof Error?e.message:"Connection failed"}. Retry the saved request unchanged, or refresh and reconcile its source identity.`);}
    finally {setBusy(false);}
  }
  function prepare() {
    if(!order||!confirmed)return;
    const operation:Pending={key:crypto.randomUUID(),path:`/operator/orders/${order.id}/${kind==="issue"?"material-issues":"finished-outputs"}`,
      input:{order:order.id,source:crypto.randomUUID(),quantity,unit:kind==="issue"?input!.unit:order.unit,location,
        ...(kind==="issue"?{material:input!.id,reason}:{})}};
    void submit(operation);
  }
  return <section aria-label="Authorized production" className="space-y-4 rounded-2xl border border-slate-300 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Authorized production</h3>
      <button className={button} disabled={busy} onClick={()=>{setError("");void refresh().catch(e=>setError(e instanceof Error?e.message:"Refresh failed"));}}>Refresh evidence</button></div>
    <p className="text-sm text-slate-500">Issue verified material or record output against an existing approved work order. Output stays pending QC; packing and dispatch are blocked.</p>
    {!enabled&&<p role="status">Trusted production is unavailable in this environment.</p>}
    {error&&<p role="alert" className="text-red-600">{error}</p>}{message&&<p role="status">{message}</p>}
    {pending&&<div className="space-y-2 rounded-xl border border-amber-400 p-3"><p>Saved request source: <code>{pending.input.source}</code>. Keep this identity until reconciled.</p>
      <button className={button} disabled={busy||!writer||!enabled} onClick={()=>void submit(pending)}>Retry saved request</button>
      <label className="block"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I checked the work-order evidence and reconciled this request.</label>
      <button className={button} disabled={busy||!confirmed} onClick={()=>{sessionStorage.removeItem(storageKey);setPending(null);setConfirmed(false);}}>Clear reconciled request</button></div>}
    <label className="block">Work order <select className={`${control} w-full`} value={selected} onChange={e=>{setSelected(e.target.value);setMaterial("");setConfirmed(false);}} disabled={busy||!!pending}>
      <option value="">Select an approved work order</option>{orders.map(o=><option key={o.id} value={o.id}>{o.number} · {o.planned_quantity} {o.unit}</option>)}</select></label>
    {enabled&&orders.length===0&&<p>No trusted work orders are available. Approved recipe publication and exclusive work-order claims must exist first.</p>}
    {order&&<>
      <dl className="grid gap-2 text-sm sm:grid-cols-2"><div><dt>Project / school</dt><dd className="break-all">{order.project_id} / {order.site_id}</dd></div><div><dt>Approval / revision</dt><dd className="break-all">{order.approval_id} / {order.demand_revision}</dd></div></dl>
      <ul className="space-y-2">{order.materials.map(m=><li key={m.id}>{m.name}: {m.held} {m.unit} entitlement remaining · {m.fulfilled} {m.unit} issued</li>)}</ul>
      {writer?<fieldset disabled={busy||!!pending||!enabled} className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-medium">Record an authorized operation</legend>
        <label>Operation <select className={`${control} w-full`} value={kind} onChange={e=>{setKind(e.target.value);setConfirmed(false);}}><option value="issue">Issue material</option><option value="output">Record finished output</option></select></label>
        {kind==="issue"&&<label>Material <select className={`${control} w-full`} value={material} onChange={e=>{setMaterial(e.target.value);setConfirmed(false);}}><option value="">Select material</option>{order.materials.map(m=><option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select></label>}
        <label>Quantity ({kind==="issue"?input?.unit??"select material":order.unit}) <input className={`${control} w-full`} inputMode="decimal" value={quantity} onChange={e=>{setQuantity(e.target.value);setConfirmed(false);}}/></label>
        <label>{kind==="issue"?"Verified stock location":"Output custody location"} <input className={`${control} w-full`} maxLength={100} value={location} onChange={e=>{setLocation(e.target.value);setConfirmed(false);}}/></label>
        {kind==="issue"&&<label className="sm:col-span-2">Reason <input className={`${control} w-full`} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label>}
        <label className="sm:col-span-2"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I confirm {quantity||"the quantity"} {kind==="issue"?input?.unit:order.unit} at {location||"the specified location"}{kind==="issue"?" will be removed from physical stock.":" was produced from the issued inputs and awaits QC."}</label>
        <button className={button} disabled={!confirmed||!quantity||!location.trim()||(kind==="issue"&&(!input||!reason.trim()))} onClick={prepare}>{kind==="issue"?"Confirm material issue":"Record pending-QC output"}</button>
      </fieldset>:<p>Only an active tenant administrator can record these operations.</p>}
      <h4 className="font-medium">Finished-output custody</h4>
      {order.outputs.length===0?<p>No output recorded.</p>:<ul className="space-y-3">{order.outputs.map(o=><li className="rounded-xl border border-slate-300 p-3" key={o.id}>
        <p>{o.quantity} {o.unit} · {o.status} · {o.location}</p><p className="break-all text-sm">Identity: {o.qr}</p>
        <details><summary className="cursor-pointer py-2">Input evidence and provenance</summary><pre className="overflow-auto text-xs">{JSON.stringify({source:o.source_id,actor:o.actor_id,recipe:order.recipe_id,input_basis:o.input_basis},null,2)}</pre></details>
      </li>)}</ul>}
    </>}
  </section>;
}
