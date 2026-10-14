import { stockUnits,stockText } from "../../inventory/physicalQuantity";
import { useEffect,useState } from "react";
import { useAuth } from "../../../AuthContext";
import { apiFetch } from "../../../utils/api";
import type { ProjectStockReservation,PurchaseRequest,PurchaseGoodsReceipt,SupplyLine } from "../../../entity/SupplyPlanning";
import type { PurchaseOrder } from "../../../entity/PurchaseOrder";
import type { PlanningView } from "../../projects/planningTypes";
interface Item {id:string;name:string;unit:string;verified_on_hand:number|null;scope:{locations:string[]}|null}
interface Data {reservations:ProjectStockReservation[];requests:PurchaseRequest[];orders:PurchaseOrder[];receipts:PurchaseGoodsReceipt[];suppliers:{id:string;name:string}[]}
const input="min-h-11 rounded-xl border border-slate-300 bg-transparent p-3";
const button="min-h-11 rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-40";
export default function SupplyPlanningPanel({project,onChange}:{project?:PlanningView;onChange?:()=>void}) {
  const {currentUser}=useAuth(),role=currentUser?.role??"";
  const writer=["admin","super_admin","manager","staff","inventory_staff","project_staff","editor"].includes(role);
  const reviewer=["admin","super_admin","manager","inventory_staff"].includes(role),approver=["admin","super_admin","manager"].includes(role);
  const [data,setData]=useState<Data>({reservations:[],requests:[],orders:[],receipts:[],suppliers:[]});
  const [items,setItems]=useState<Item[]>([]),[site,setSite]=useState(""),[item,setItem]=useState("");
  const [quantity,setQuantity]=useState(""),[unit,setUnit]=useState(""),[notes,setNotes]=useState(""),[qc,setQc]=useState(true);
  const [supplier,setSupplier]=useState(""),[supplierName,setSupplierName]=useState("");
  const [draft,setDraft]=useState<PurchaseRequest>(),[lines,setLines]=useState<Omit<SupplyLine,"id"|"canonical_quantity"|"canonical_unit">[]>([]);
  const [orderId,setOrderId]=useState(""),[lineId,setLineId]=useState(""),[location,setLocation]=useState("");
  const [reason,setReason]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [history,setHistory]=useState<unknown[]>([]);
  async function load(){const [d,i]=await Promise.all([apiFetch(`/api/v1/supply-planning${project?`?project=${project.id}`:""}`),apiFetch("/api/v1/stocktakes/inventory")]);setData(d);setItems(i);}
  async function run(work:()=>Promise<void>,mutates=true){setBusy(true);setError("");setMessage("");try{await work();if(mutates){await load();setMessage("Saved. Recalculate project requirements to refresh availability.");onChange?.();}}catch(e){setError(e instanceof Error?e.message:"Unable to process supply operation");}finally{setBusy(false);}}
  useEffect(()=>{setSite(project?.sites[0]?.id??"");void run(load,false);},[project?.id]);
  // Retrying a failed transport with identical input reuses the key; changed inputs receive a new key.
  const [retryKeys]=useState(()=>new Map<string,string>());
  async function write(path:string,body:unknown,method="POST") {const fingerprint=JSON.stringify([path,method,body]);const key=retryKeys.get(fingerprint)??crypto.randomUUID();retryKeys.set(fingerprint,key);const result=await apiFetch("/api/v1/supply-planning"+path,{method,headers:{"Idempotency-Key":key},body:JSON.stringify(body)});retryKeys.delete(fingerprint);return result;}
  const selected=items.find(i=>i.id===item),order=data.orders.find(o=>o.id===orderId),receiptLine=order?.planning_lines?.find(l=>l.id===lineId);
  function rawLine(){return {item_id:item,quantity,unit,qc_required:qc,notes,...(project?{project_id:project.id,site_id:site}:{})};}
  const action=(kind:string,id:string,revision:number,verb:string)=>void run(async()=>{await write(`/${kind}/${id}/${verb}`,{revision,...(kind==="receipts"?{reason}:{})});});
  return <section className="space-y-4 rounded-2xl border border-slate-300 p-4">
    <h2 className="text-xl font-semibold">Reservations and purchasing</h2>
    <p className="text-sm text-slate-500">Reservations commit verified stock without changing on-hand. Approved orders are incoming; goods awaiting inspection are unavailable. Rejected deliveries consume the order allowance; replacement deliveries need a new approved order.</p>
    {error&&<p role="alert" className="text-red-600">{error}</p>}{message&&<p role="status">{message}</p>}
    <fieldset disabled={busy} className="space-y-4">
      <button className={button} onClick={()=>void run(load,false)}>Refresh supply</button>
      {writer&&<div className="flex flex-wrap gap-3">
        {project&&<label>School/site <select className={input} value={site} onChange={e=>setSite(e.target.value)}>{project.sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
        <label>Material <select className={input} value={item} onChange={e=>{setItem(e.target.value);setUnit(items.find(i=>i.id===e.target.value)?.unit??"");}}><option value="">Select material</option>{items.map(i=><option key={i.id} value={i.id}>{i.name} · {i.verified_on_hand===null?"Unverified":`${i.verified_on_hand} ${i.unit} on-hand`}</option>)}</select></label>
        <label>Quantity <input className={input} inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
        <label>Unit <input className={input} value={unit} onChange={e=>setUnit(e.target.value)}/></label>
        <label>Notes <input className={input} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
        <label className="p-3"><input type="checkbox" checked={qc} onChange={e=>setQc(e.target.checked)}/> Inspection required</label>
        {project&&<><button className={button} disabled={!item||!quantity||selected?.verified_on_hand===null} onClick={()=>void run(async()=>{await write("/reservations",{project_id:project.id,site_id:site,item_id:item,quantity,unit,notes});})}>Reserve stock</button>
          <button className={button} onClick={()=>void run(async()=>{await write("/requests/from-shortage",{project_id:project.id,site_id:site,revision:project.revision,qc_required:qc});})}>Draft request from site shortage</button></>}
        <button className={button} disabled={!item||!quantity} onClick={()=>setLines([...lines,rawLine()])}>Add request line</button>
      </div>}
      <h3 className="font-semibold">Project reservations</h3>
      {data.reservations.map(r=><div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3"><span>{items.find(i=>i.id===r.item_id)?.name??r.item_id} · {r.quantity} {r.unit} · {project?.sites.find(s=>s.id===r.site_id)?.name??r.site_id} · {r.status} · r{r.revision}</span>
        {writer&&r.status==="active"&&<><button className={button} onClick={()=>void run(async()=>{await write(`/reservations/${r.id}/adjust`,{revision:r.revision,quantity,reason:reason||"Adjusted allocation"});})}>Adjust to entered quantity</button>{["release","cancel"].map(verb=><button className={button} key={verb} onClick={()=>void run(async()=>{await write(`/reservations/${r.id}/${verb}`,{revision:r.revision,reason:reason||"Allocation released"});})}>{verb}</button>)}</>}
        <button className={button} onClick={()=>void run(async()=>{setHistory(await apiFetch(`/api/v1/supply-planning/reservation/${r.id}/history`));},false)}>History</button></div>)}
      {writer&&<><h3 className="font-semibold">{draft?`Edit ${draft.pr_number}`:"New purchase request"}</h3>
        {lines.map((l,i)=><div key={i} className="flex flex-wrap items-center gap-3"><span>{items.find(v=>v.id===l.item_id)?.name} · {l.quantity} {l.unit} · {l.qc_required?"QC":"Acceptance at receipt"}</span><button className={button} onClick={()=>setLines(lines.filter((_,n)=>n!==i))}>Remove line</button></div>)}
        <button className={button} disabled={!lines.length} onClick={()=>void run(async()=>{await write(draft?`/requests/${draft.id}`:"/requests",{lines,notes,...(draft?{revision:draft.revision}:{})},draft?"PUT":"POST");setLines([]);setDraft(undefined);})}>Save draft request</button>
        <button className={button} onClick={()=>{setDraft(undefined);setLines([]);}}>New request</button>
        <label>Supplier <select className={input} value={supplier} onChange={e=>setSupplier(e.target.value)}><option value="">Select supplier</option>{data.suppliers.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
        <label>New supplier name <input className={input} value={supplierName} onChange={e=>setSupplierName(e.target.value)}/></label><button className={button} disabled={!supplierName.trim()} onClick={()=>void run(async()=>{const s=await write("/suppliers",{name:supplierName});setSupplier(s.id);setSupplierName("");})}>Create supplier</button></>}
      <h3 className="font-semibold">Purchase requests</h3>
      {data.requests.map(r=><details className="rounded-xl border p-3" key={r.id}><summary>{r.pr_number} · {r.status} · r{r.revision}</summary>{r.lines.map(l=><p key={l.id}>{items.find(i=>i.id===l.item_id)?.name??l.item_id}: {l.quantity} {l.unit}{l.site_id?` · site ${l.site_id}`:" · general stock"}</p>)}
        {writer&&r.status==="draft"&&<button className={button} onClick={()=>{setDraft(r);setNotes(r.notes);setLines(r.lines.map(({id:_i,canonical_quantity:_q,canonical_unit:_u,conversion_id:_c,conversion_factor:_f,demand_revision:_r,demand_basis:_b,...line})=>line));}}>Edit draft</button>}
        {reviewer&&r.status==="draft"&&<button className={button} onClick={()=>action("requests",r.id,r.revision,"review")}>Review</button>}
        {approver&&r.status==="reviewed"&&<button className={button} onClick={()=>action("requests",r.id,r.revision,"approve")}>Approve</button>}
        {writer&&r.status==="approved"&&<button className={button} disabled={!supplier} onClick={()=>void run(async()=>{await write("/orders",{request_id:r.id,revision:r.revision,supplier_id:supplier});})}>Create order for selected supplier</button>}
        {writer&&["draft","reviewed","approved"].includes(r.status)&&<button className={button} onClick={()=>action("requests",r.id,r.revision,"cancel")}>Cancel</button>}
        <button className={button} onClick={()=>void run(async()=>{setHistory(await apiFetch(`/api/v1/supply-planning/request/${r.id}/history`));},false)}>History</button></details>)}
      <h3 className="font-semibold">Purchase orders</h3>
      {data.orders.map(o=><details className="rounded-xl border p-3" key={o.id}><summary>{o.po_number} · {data.suppliers.find(s=>s.id===o.vendor_id)?.name} · {o.status} · r{o.planning_revision}</summary>
        {o.planning_lines?.map(l=><p key={l.id}>{items.find(i=>i.id===l.item_id)?.name??l.item_id} · authorized {l.canonical_quantity} {l.canonical_unit} · delivered {stockText(data.receipts.filter(g=>g.po_id===o.id&&g.line_id===l.id).reduce((n,g)=>n+stockUnits(g.quantity),0n))} · remaining {stockText(stockUnits(l.canonical_quantity)-data.receipts.filter(g=>g.po_id===o.id&&g.line_id===l.id).reduce((n,g)=>n+stockUnits(g.quantity),0n))}</p>)}
        {reviewer&&o.status==="draft"&&!o.reviewed_by&&<button className={button} onClick={()=>action("orders",o.id,o.planning_revision!,"review")}>Review order</button>}
        {approver&&o.status==="draft"&&o.reviewed_by&&<button className={button} onClick={()=>action("orders",o.id,o.planning_revision!,"approve")}>Approve order</button>}
        {writer&&o.status==="approved"&&<button className={button} onClick={()=>{setOrderId(o.id);setLineId(o.planning_lines?.[0]?.id??"");setLocation("");}}>Receive delivery</button>}
        {writer&&["draft","approved"].includes(o.status)&&<button className={button} onClick={()=>action("orders",o.id,o.planning_revision!,"cancel")}>Cancel order</button>}
        <button className={button} onClick={()=>void run(async()=>{setHistory(await apiFetch(`/api/v1/supply-planning/order/${o.id}/history`));},false)}>History</button></details>)}
      {writer&&order&&<div className="flex flex-wrap gap-3"><label>Receipt line <select className={input} value={lineId} onChange={e=>setLineId(e.target.value)}>{order.planning_lines?.map(l=><option key={l.id} value={l.id}>{items.find(i=>i.id===l.item_id)?.name} · {l.canonical_quantity} {l.canonical_unit}</option>)}</select></label>
        <label>Physical location <select className={input} value={location} onChange={e=>setLocation(e.target.value)}><option value="">Select location</option>{items.find(i=>i.id===receiptLine?.item_id)?.scope?.locations.map(l=><option key={l}>{l}</option>)}</select></label>
        <span>Use the quantity and unit entered above.</span><button className={button} disabled={!quantity||!unit||!location} onClick={()=>void run(async()=>{await write(`/orders/${order.id}/receipts`,{revision:order.planning_revision,line_id:lineId,quantity,unit,location});})}>Record partial/full receipt</button></div>}
      <label>Inspection / allocation reason <input className={input} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <h3 className="font-semibold">Goods receipts</h3>
      {data.receipts.map(g=><div key={g.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3"><span>{data.orders.find(o=>o.id===g.po_id)?.po_number} · {items.find(i=>i.id===g.item_id)?.name} · {g.quantity} {g.unit} · {g.location} · {g.status}</span>
        {reviewer&&["pending","quarantined"].includes(g.status)&&["accept","reject",...(g.status==="pending"?["quarantine"]:[])].map(verb=><button key={verb} className={button} disabled={!reason.trim()} onClick={()=>action("receipts",g.id,g.revision,verb)}>{verb}</button>)}
        <button className={button} onClick={()=>void run(async()=>{setHistory(await apiFetch(`/api/v1/supply-planning/receipt/${g.id}/history`));},false)}>History</button></div>)}
      {!!history.length&&<details open><summary>Immutable audit snapshots</summary><pre className="overflow-auto text-xs">{JSON.stringify(history,null,2)}</pre></details>}
    </fieldset>
  </section>;
}
