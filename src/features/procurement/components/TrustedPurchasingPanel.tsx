import { useEffect,useState } from "react";
import { useAuth } from "../../../AuthContext";
import { apiFetch } from "../../../utils/api";
import type { PurchaseRequestMutation } from "../../../services/PurchaseRequestCommitmentService";
import type { PurchaseOrderMutation } from "../../../services/PurchaseOrderCommitmentService";
type Demand=Pick<PurchaseRequestMutation,"project"|"site"|"item"|"unit"|"approval"|"demandRevision">;
type RequestRow=Demand & {id:string;line:string;revision:number;status:string};
type OrderRow=RequestRow & {request:string;requestRevision:number;reviewed_by:string|null};
type Pending={key:string;kind:"requests";input:PurchaseRequestMutation}|{key:string;kind:"orders";input:PurchaseOrderMutation};
interface Queue {enabled:boolean;demand:(Demand&{quantity:string})[];requests:RequestRow[];orders:OrderRow[];sources:{claim:string;slice:string;line:string;remaining:string}[]}
const endpoint="/api/v1/supply-planning",control="min-h-11 w-full rounded-xl border border-slate-300 bg-transparent p-3",button="min-h-11 rounded-xl border border-slate-300 p-3 disabled:opacity-40";
const lineage=(r:Demand):Demand=>({project:r.project,site:r.site,item:r.item,unit:r.unit,approval:r.approval,demandRevision:r.demandRevision});
export default function TrustedPurchasingPanel({projectId,projectName,sites=[],items=[],suppliers,onChange}:{projectId?:string;projectName?:string;sites?:{id:string;name:string}[];items?:{id:string;name:string}[];suppliers:{id:string;name:string}[];onChange:()=>Promise<void>}) {
  const {currentUser}=useAuth(),writer=["admin","super_admin"].includes(currentUser?.role??"");
  const storageKey=`purchasing.pending.${currentUser?.id}`;
  const [queue,setQueue]=useState<Queue>({enabled:false,demand:[],requests:[],orders:[],sources:[]});
  const [source,setSource]=useState(""),[quantity,setQuantity]=useState(""),[vendor,setVendor]=useState(""),[reason,setReason]=useState("");
  const [pending,setPending]=useState<Pending|null>(null),[busy,setBusy]=useState(false),[storageError,setStorageError]=useState(false);
  const [confirmed,setConfirmed]=useState(false),[reconciled,setReconciled]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  async function refresh(){setQueue(await apiFetch(`${endpoint}/trusted-purchasing`));}
  useEffect(()=>{
    setPending(null);setStorageError(false);setConfirmed(false);setReconciled(false);
    try{const saved=sessionStorage.getItem(storageKey);if(saved){const p=JSON.parse(saved) as Pending;if(!p.key||!p.input?.id||!["requests","orders"].includes(p.kind))throw Error();setPending(p);}}
    catch{setStorageError(true);setError("Saved purchasing request cannot be read; reconcile evidence before restoring browser storage.");}
    void refresh().catch(e=>setError(e.message));
  },[storageKey,projectId]);
  async function submit(p:Pending){
    setBusy(true);setError("");setMessage("");setReconciled(false);setConfirmed(false);
    try{
      sessionStorage.setItem(storageKey,JSON.stringify(p));setPending(p);
      const result=await apiFetch(`${endpoint}/operator/${p.kind}/${p.input.id}/${p.input.transition}`,{method:"POST",headers:{"Idempotency-Key":p.key},body:JSON.stringify(p.input)});
      sessionStorage.removeItem(storageKey);setPending(null);setConfirmed(false);
      setMessage(`${p.kind}: ${result.id} · ${result.status}. Saved revision ${result.revision??result.planning_revision}.`);
      await refresh();await onChange();
    }catch(e){setError(`${e instanceof Error?e.message:"Purchasing failed"}. Retry the saved request unchanged or reconcile its history.`);}
    finally{setBusy(false);}
  }
  const demand=queue.demand.filter(d=>!projectId||d.project===projectId),selected=demand.find(d=>`${d.approval}:${d.site}:${d.item}:${d.unit}`===source);
  const visible=(r:Demand)=>!projectId||r.project===projectId;
  const schoolName=(id:string)=>sites.find(s=>s.id===id)?.name.trim()||`School ${id}`;
  const materialName=(id:string)=>items.find(i=>i.id===id)?.name.trim()||id;
  return <section aria-label="Trusted purchasing" className="space-y-4 rounded-2xl border border-slate-300 p-4">
    <h3 className="text-lg font-semibold">Trusted purchase requests and orders</h3>
    <p>Use current approved school demand. PRs hold demand; POs allocate existing PR coverage. Receipt and QC follow below.</p>
    <button className={button} disabled={busy} onClick={()=>{setBusy(true);setConfirmed(false);setReconciled(false);void refresh().then(()=>setReconciled(true)).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Refresh purchasing evidence</button>
    {!queue.enabled&&<p role="status">Trusted purchasing is unavailable in this environment.</p>}
    {!writer&&<p>Only an active tenant administrator can change trusted purchasing.</p>}
    {error&&<p role="alert">{error}</p>}{message&&<p role="status" className="break-all">{message}</p>}
    {pending&&<div className="space-y-3 rounded-xl border border-amber-400 p-3">
      <p className="break-all">Saved {pending.kind}: {pending.input.id} · {pending.input.transition}</p>
      <button className={button} disabled={busy||!writer||!queue.enabled||storageError} onClick={()=>void submit(pending)}>Retry saved purchasing request</button>
      <label className="block"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I refreshed and reconciled this operation and its audit history.</label>
      <button className={button} disabled={busy||!reconciled||!confirmed} onClick={()=>{try{sessionStorage.removeItem(storageKey);setPending(null);setConfirmed(false);}catch{setError("Cannot clear saved request.");}}}>Clear reconciled purchasing request</button>
    </div>}
    <fieldset disabled={busy||!!pending||storageError||!queue.enabled||!writer} className="grid gap-3 sm:grid-cols-2">
      <legend>Approved purchasing source</legend>
      <label className="sm:col-span-2">Approved material demand <select className={control} value={source} onChange={e=>{setSource(e.target.value);setConfirmed(false);}}><option value="">Select approved demand</option>{demand.map(d=>{const key=`${d.approval}:${d.site}:${d.item}:${d.unit}`;return <option key={key} value={key}>{d.project===projectId&&projectName?.trim()||d.project} · {schoolName(d.site)} · {materialName(d.item)} · {d.quantity} {d.unit} · r{d.demandRevision}</option>;})}</select></label>
      <label>Purchasing quantity <input className={control} value={quantity} inputMode="decimal" onChange={e=>{setQuantity(e.target.value);setConfirmed(false);}}/></label>
      <label>Trusted order supplier <select className={control} value={vendor} onChange={e=>{setVendor(e.target.value);setConfirmed(false);}}><option value="">Select supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="sm:col-span-2">Purchasing reason <input className={control} maxLength={1000} value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false);}}/></label>
      <label className="sm:col-span-2"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I verified the selected source, quantity and operation.</label>
      <button className={button} disabled={!selected||!quantity||!reason.trim()||!confirmed} onClick={()=>selected&&void submit({kind:"requests",key:crypto.randomUUID(),input:{...lineage(selected),id:crypto.randomUUID(),line:crypto.randomUUID(),transition:"create",quantity,basis:"manual",reason}})}>Create trusted PR</button>
      <div className="sm:col-span-2 space-y-3">
        {queue.requests.filter(visible).map(r=><div key={r.id} className="break-all rounded-xl border p-3 space-y-2"><p>PR {r.id} · {r.status} · r{r.revision} · {schoolName(r.site)} · {materialName(r.item)}</p>
          {[...(r.status==="draft"?["review" as const]:[]),...(r.status==="reviewed"?["approve" as const]:[])].map(t=><button key={t} className={button} disabled={!reason.trim()||!confirmed} onClick={()=>void submit({kind:"requests",key:crypto.randomUUID(),input:{...lineage(r),id:r.id,revision:r.revision,transition:t,reason}})}>{t} trusted PR {r.id}</button>)}
          {r.status==="approved"&&queue.sources.filter(s=>s.line===r.line&&Number(s.remaining)>0).map(s=><button key={s.claim} className={button} disabled={!vendor||!quantity||!reason.trim()||!confirmed} onClick={()=>void submit({kind:"orders",key:crypto.randomUUID(),input:{...lineage(r),id:crypto.randomUUID(),request:r.id,requestRevision:r.revision,line:r.line,transition:"create",vendor,sources:[{claim:s.claim,slice:s.slice,quantity}],reason}})}>Create trusted PO · {s.remaining} {r.unit} available · {s.claim}</button>)}
        </div>)}
        {queue.orders.filter(visible).map(o=><div key={o.id} className="break-all rounded-xl border p-3"><p>PO {o.id} · {o.status} · r{o.revision}</p>{o.status==="draft"&&<button className={button} disabled={!reason.trim()||!confirmed} onClick={()=>void submit({kind:"orders",key:crypto.randomUUID(),input:{...lineage(o),id:o.id,request:o.request,requestRevision:o.requestRevision,line:o.line,revision:o.revision,transition:o.reviewed_by?"approve":"review",reason}})}>{o.reviewed_by?"Approve":"Review"} trusted PO {o.id}</button>}</div>)}
      </div>
    </fieldset>
  </section>;
}
