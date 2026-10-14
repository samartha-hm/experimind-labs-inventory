import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { apiFetch } from "../../utils/api";
import type { Stocktake, StocktakeTarget, CountEntry, PhysicalStockScope } from "../../entity/Stocktake";
interface Item { id:string; name:string; description:string; unit:string; legacy_quantity:string; stock_status:string; verified_on_hand:number|null; scope:PhysicalStockScope|null }
interface View { session:Stocktake; missing:{item_id:string;location:string}[]; counts:(CountEntry & { discrepancy:string|null; legacy_quantity:string })[] }
const input="min-h-11 rounded-xl border border-slate-300 bg-transparent p-3";
const button="min-h-11 rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-40";
export default function StocktakePanel() {
  const {currentUser}=useAuth();const role=currentUser?.role??"";
  const counter=["admin","super_admin","manager","inventory_staff","staff"].includes(role);
  const reviewer=["admin","super_admin","manager","inventory_staff"].includes(role);
  const approver=["admin","super_admin","manager"].includes(role);
  const [items,setItems]=useState<Item[]>([]);const [sessions,setSessions]=useState<Stocktake[]>([]);const [view,setView]=useState<View>();
  const [name,setName]=useState("");const [notes,setNotes]=useState("");const [targets,setTargets]=useState<StocktakeTarget[]>([]);
  const [counts,setCounts]=useState<Record<string,{quantity:string;unit:string}>>({});
  const [reason,setReason]=useState("");const [partial,setPartial]=useState(false);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const [history,setHistory]=useState<unknown[]>([]);const [ledger,setLedger]=useState<unknown[]>([]);
  async function load(id?:string) {
    const [i,s]=await Promise.all([apiFetch("/api/v1/stocktakes/inventory"),apiFetch("/api/v1/stocktakes")]);setItems(i);setSessions(s);
    if(id){const v:View=await apiFetch(`/api/v1/stocktakes/${id}`);setView(v);setName(v.session.name);setNotes(v.session.notes);setTargets(v.session.targets);
      setCounts(Object.fromEntries(v.session.entries.map(e=>[`${e.item_id}/${e.location}`,{quantity:e.quantity,unit:e.unit}])));
      setReason(v.session.review_reason);setPartial(false);setHistory([]);setLedger([]);
    }
  }
  async function run(work:()=>Promise<void>) {setBusy(true);setError("");try{await work();}catch(e){setError(e instanceof Error?e.message:"Unable to process stocktake");}finally{setBusy(false);}}
  useEffect(()=>{void run(()=>load());},[]);
  const session=view?.session;
  async function transition(action:string) {
    if(!session)return;
    if(action==="post"&&!window.confirm("Post these approved physical counts exactly once? Legacy inventory values will be preserved."))return;
    await run(async()=>{await apiFetch(`/api/v1/stocktakes/${session.id}/${action}`,{method:"POST",body:JSON.stringify({revision:session.revision,...(action==="review"?{reason,allow_partial:partial}:{})})});await load(session.id);});
  }
  return <section className="space-y-4 rounded-2xl border border-slate-300 p-4">
    <h2 className="text-xl font-semibold">Physical stocktake and verified balances</h2>
    <p className="text-sm text-slate-500">Legacy quantities, prices and locations are unverified. Verified stock comes from approved counts and accepted receipts in the ledger. Active reservations reduce available stock; pending inspection is unavailable.</p>
    {error&&<p role="alert" className="text-red-600">{error}</p>}
    <fieldset disabled={busy} className="space-y-4">
      <div className="flex flex-wrap gap-3"><label>Stocktake <select className={input} value={session?.id??""} onChange={e=>{const id=e.target.value;if(id)void run(()=>load(id));}}><option value="">Select session</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.name} · {s.status} · r{s.revision}</option>)}</select></label>
        {counter&&<button className={button} onClick={()=>{setView(undefined);setTargets([]);setName("");setNotes("");setCounts({});setHistory([]);setLedger([]);setReason("");setPartial(false);}}>New stocktake</button>}
        <button className={button} onClick={()=>void run(()=>load(session?.id))}>Reload</button>
      </div>
      {(!session||session.status==="draft")&&counter&&<div className="space-y-3">
        <label className="block">Session name <input className={`${input} w-full`} value={name} onChange={e=>setName(e.target.value)}/></label>
        <label className="block">Notes <textarea className={`${input} w-full`} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
        {targets.map((t,index)=>{const item=items.find(i=>i.id===t.item_id);return <div key={index} className="flex flex-wrap items-center gap-3">
          <label>Inventory item <select className={input} value={t.item_id} onChange={e=>{const found=items.find(i=>i.id===e.target.value);setTargets(targets.map((v,n)=>n===index?{item_id:e.target.value,locations:found?.scope?.locations??[""],complete_coverage:found?.scope?.complete_coverage??false}:v));}}><option value="">Select item</option>{items.map(i=><option key={i.id} value={i.id}>{i.name} · {i.unit}</option>)}</select></label>
          <label>Physical locations (comma separated) <input className={input} disabled={!!item?.scope} value={t.locations.join(",")} onChange={e=>setTargets(targets.map((v,n)=>n===index?{...v,locations:e.target.value.split(",").map(l=>l.trim())}:v))}/></label>
          <label><input type="checkbox" checked={t.complete_coverage} onChange={e=>setTargets(targets.map((v,n)=>n===index?{...v,complete_coverage:e.target.checked}:v))}/> All physical locations for this item are declared</label>
          <button className={button} onClick={()=>setTargets(targets.filter((_,n)=>n!==index))}>Remove target</button>
        </div>;})}
        <div className="flex gap-3"><button className={button} onClick={()=>setTargets([...targets,{item_id:"",locations:[""],complete_coverage:false}])}>Add item</button>
          <button className={button} onClick={()=>void run(async()=>{const saved:Stocktake=await apiFetch(`/api/v1/stocktakes${session?`/${session.id}`:""}`,{method:session?"PUT":"POST",body:JSON.stringify({name,notes,targets,...(session?{revision:session.revision}:{})})});await load(saved.id);})}>{session?"Save draft scope":"Create stocktake"}</button></div>
      </div>}
      {session&&<div className="space-y-3">
        <p>{session.name} · {session.status} · revision {session.revision}. Missing counts: {view.missing.length}.</p>
        {view.missing.length>0&&<p className="text-amber-700">Missing item/location counts remain Unverified. Partial approval requires explicit review.</p>}
        {session.targets.flatMap(t=>t.locations.map(location=>{const key=`${t.item_id}/${location}`;const item=items.find(i=>i.id===t.item_id);const entry=view.counts.find(e=>e.item_id===t.item_id&&e.location===location);const count=counts[key]??{quantity:"",unit:item?.unit??""};return <div key={key} className="rounded-xl border p-3">
          <p>{item?.name} · {location} · legacy quantity {item?.legacy_quantity} (unverified item total)</p>
          {session.status==="draft"&&counter?<div className="flex flex-wrap gap-3"><label>Counted quantity <input className={input} inputMode="decimal" value={count.quantity} onChange={e=>setCounts({...counts,[key]:{...count,quantity:e.target.value}})}/></label><label>Count unit <input className={input} value={count.unit} onChange={e=>setCounts({...counts,[key]:{...count,unit:e.target.value}})}/></label>
            <button className={button} onClick={()=>void run(async()=>{await apiFetch(`/api/v1/stocktakes/${session.id}/count`,{method:"PUT",body:JSON.stringify({revision:session.revision,item_id:t.item_id,location,...count})});await load(session.id);})}>{entry?"Replace saved count":"Save count"}</button>
            {entry&&<button className={button} onClick={()=>void run(async()=>{await apiFetch(`/api/v1/stocktakes/${session.id}/count`,{method:"PUT",body:JSON.stringify({revision:session.revision,item_id:t.item_id,location,...count,remove:true})});await load(session.id);})}>Remove count</button>}
          </div>:<p>Count {entry?.canonical_quantity??entry?.quantity??"Missing"} {entry?.canonical_unit??entry?.unit} · verified discrepancy {entry?.discrepancy??"Unverified baseline"}</p>}
          {entry&&<p className="break-all text-xs text-slate-500">Counted by {entry.counted_by} · reviewed by {entry.reviewed_by??"Pending"} · approved by {entry.approved_by??"Pending"}{entry.conversion_id?` · conversion ${entry.conversion_id}, factor ${entry.conversion_factor}`:""}</p>}
        </div>;}))}
        {session.status==="draft"&&reviewer&&<><label className="block">Review / reconciliation reason <input className={`${input} w-full`} value={reason} onChange={e=>setReason(e.target.value)}/></label><label><input type="checkbox" checked={partial} onChange={e=>setPartial(e.target.checked)}/> Explicitly review partial counts</label><button className={button} onClick={()=>void transition("review")}>Review counts</button></>}
        <div className="flex flex-wrap gap-3">{session.status==="reviewed"&&approver&&<button className={button} onClick={()=>void transition("approve")}>Approve counts</button>}{session.status==="approved"&&approver&&<button className={button} onClick={()=>void transition("post")}>Post approved counts</button>}{["reviewed","approved"].includes(session.status)&&reviewer&&<button className={button} onClick={()=>void transition("reopen")}>Reopen for recount</button>}
          <button className={button} onClick={()=>void run(async()=>{setHistory(await apiFetch(`/api/v1/stocktakes/${session.id}/history`));setLedger(await apiFetch("/api/v1/stocktakes/ledger"));})}>History and ledger</button></div>
      </div>}
    </fieldset>
    <details><summary className="min-h-11 cursor-pointer py-3">Verified balances and legacy reconciliation</summary><div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{["Item","Legacy quantity (unverified)","Verified on-hand","Unit","Coverage"].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{items.map(i=><tr key={i.id}><td className="p-3">{i.name}</td><td className="p-3">{i.legacy_quantity}</td><td className="p-3">{i.verified_on_hand??"Unverified"}</td><td className="p-3">{i.unit}</td><td className="p-3">{i.scope?.locations.join(", ")??"Not declared"}</td></tr>)}</tbody></table></div></details>
    {history.length>0&&<details><summary className="min-h-11 cursor-pointer py-3">Immutable count history</summary><pre className="overflow-auto text-xs">{JSON.stringify(history,null,2)}</pre></details>}
    {ledger.length>0&&<details><summary className="min-h-11 cursor-pointer py-3">Verified stock ledger</summary><pre className="overflow-auto text-xs">{JSON.stringify(ledger,null,2)}</pre></details>}
  </section>;
}
