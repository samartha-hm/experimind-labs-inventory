import { useEffect, useState } from "react";
import { useAuth } from "../../../AuthContext";
import { apiFetch } from "../../../utils/api";
import type { PurchaseGoodsReceipt } from "../../../entity/SupplyPlanning";
import type { ReceiptMutation } from "../../../services/ReceiptCommitmentService";

type Coverage = Pick<ReceiptMutation,"order"|"orderRevision"|"line"|"project"|"site"|"item"|"unit"|"approval"|"demandRevision"> & {coverage:string;remaining:string;locations:string[]};
interface Pending {key:string;input:ReceiptMutation}
const endpoint="/api/v1/supply-planning",control="min-h-11 w-full rounded-xl border border-slate-300 bg-transparent p-3";
const button="min-h-11 rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-40";

export default function TrustedReceiptPanel({projectId,projectName,sites=[],items=[],onChange}:{projectId?:string;projectName?:string;sites?:{id:string;name:string}[];items?:{id:string;name:string}[];onChange:()=>Promise<void>}) {
  const {currentUser}=useAuth(),writer=["admin","super_admin"].includes(currentUser?.role??"");
  const storageKey=`receipts.pending.${currentUser?.id}`;
  const [coverage,setCoverage]=useState<Coverage[]>([]),[receipts,setReceipts]=useState<PurchaseGoodsReceipt[]>([]);
  const [enabled,setEnabled]=useState(false),[selected,setSelected]=useState(""),[receiptId,setReceiptId]=useState("");
  const [transition,setTransition]=useState<ReceiptMutation["transition"]>("receive");
  const [quantity,setQuantity]=useState(""),[location,setLocation]=useState(""),[reason,setReason]=useState("");
  const [pending,setPending]=useState<Pending|null>(null),[storageError,setStorageError]=useState(false);
  const [confirmed,setConfirmed]=useState(false),[reconciled,setReconciled]=useState(false),[busy,setBusy]=useState(false);
  const [error,setError]=useState(""),[message,setMessage]=useState("");
  async function refresh() {
    const [queue,data]=await Promise.all([apiFetch(`${endpoint}/trusted-receipts`),apiFetch(endpoint)]);
    setCoverage(queue.coverage.filter((c:Coverage)=>!projectId||c.project===projectId));setEnabled(queue.enabled);setReceipts(data.receipts);
  }
  useEffect(()=>{
    setPending(null);setStorageError(false);setConfirmed(false);setReconciled(false);setSelected("");
    try {const saved=sessionStorage.getItem(storageKey);if(saved){const p=JSON.parse(saved) as Pending;if(!p.key||!p.input?.id||!p.input.transition)throw Error();setPending(p);}}
    catch {setStorageError(true);setError("Saved request cannot be read. Reconcile receipt evidence before restoring browser storage.");}
    void refresh().catch(e=>setError(e instanceof Error?e.message:"Receipt evidence unavailable"));
  },[storageKey,projectId]);
  const source=coverage.find(c=>c.coverage===selected),receipt=receipts.find(r=>r.id===receiptId);
  const schoolName=(id:string)=>sites.find(s=>s.id===id)?.name.trim()||`School ${id}`;
  const materialName=(id:string)=>items.find(i=>i.id===id)?.name.trim()||id;
  async function submit(operation:Pending) {
    setBusy(true);setError("");setMessage("");setReconciled(false);setConfirmed(false);
    try {
      sessionStorage.setItem(storageKey,JSON.stringify(operation));setPending(operation);
      const i=operation.input,path=i.transition==="receive"?`orders/${i.order}/receipts`:`receipts/${i.id}/${i.transition}`;
      const result=await apiFetch(`${endpoint}/operator/${path}`,{method:"POST",headers:{"Idempotency-Key":operation.key},body:JSON.stringify(i)});
      sessionStorage.removeItem(storageKey);setPending(null);setConfirmed(false);
      setMessage(`Receipt ${result.id}: ${result.status}. Only accepted receipts add verified stock.`);
      await refresh();await onChange();
    } catch(e) {setError(`${e instanceof Error?e.message:"Request failed"}. Keep the saved identity and retry unchanged, or refresh and reconcile its audit history.`);}
    finally {setBusy(false);}
  }
  function prepare() {
    if(!source||!confirmed)return;
    const {coverage:coverageId,remaining:_remaining,locations:_locations,...lineage}=source;
    const common={...lineage,id:transition==="receive"?crypto.randomUUID():receiptId,reason};
    const input:ReceiptMutation=transition==="receive"?{...common,transition,coverage:coverageId,quantity,location}:{...common,transition,revision:receipt!.revision};
    void submit({key:crypto.randomUUID(),input});
  }
  return <section aria-label="Trusted supplier receiving" className="space-y-4 rounded-2xl border border-slate-300 p-4">
    <h3 className="text-lg font-semibold">Trusted supplier receiving and QC</h3>
    <p>Receive against approved PO coverage. Pending, rejected and quarantined receipts are unusable. Acceptance posts verified stock once; it does not consume material or fulfill school demand.</p>
    <button className={button} disabled={busy} onClick={()=>{setBusy(true);setConfirmed(false);setReconciled(false);void refresh().then(()=>setReconciled(true)).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Refresh receipt evidence</button>
    {!enabled&&<p role="status">Trusted receiving is unavailable in this environment.</p>}
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    {pending&&<div className="space-y-3 rounded-xl border border-amber-400 p-3">
      <p className="break-all">Saved receipt: {pending.input.id} · {pending.input.transition}</p>
      <button className={button} disabled={busy||!writer||!enabled||storageError} onClick={()=>void submit(pending)}>Retry saved receipt request</button>
      <label className="block"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I refreshed and reconciled this receipt and its audit history.</label>
      <button className={button} disabled={busy||!reconciled||!confirmed} onClick={()=>{try{sessionStorage.removeItem(storageKey);setPending(null);setConfirmed(false);}catch{setError("Cannot clear saved request.");}}}>Clear reconciled receipt request</button>
    </div>}
    {!writer&&<p>Only an active tenant administrator can receive or inspect goods.</p>}
    <fieldset disabled={busy||!!pending||storageError||!enabled||!writer} className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-2 font-medium">Approved source and operation</legend>
      <label className="sm:col-span-2">PO coverage <select className={control} value={selected} onChange={e=>{setSelected(e.target.value);setReceiptId("");setLocation("");setConfirmed(false);}}><option value="">Select approved PO coverage</option>{coverage.map(c=><option key={c.coverage} value={c.coverage}>{schoolName(c.site)} · {materialName(c.item)} · {c.remaining} {c.unit} remaining · PO {c.order} · {c.coverage}</option>)}</select></label>
      {source&&<div className="min-w-0 sm:col-span-2 space-y-2"><p className="break-words">{source.project===projectId&&projectName?.trim()||source.project} · {schoolName(source.site)} · {materialName(source.item)} · Revision {source.demandRevision}</p><details className="break-all"><summary>Receipt source references</summary><p>Project {source.project} · School {source.site} · Material {source.item} · Approval {source.approval} · PO {source.order} · Coverage {source.coverage}</p></details></div>}
      <label>Receipt operation <select className={control} value={transition} onChange={e=>{setTransition(e.target.value as ReceiptMutation["transition"]);setConfirmed(false);}}><option value="receive">Receive pending QC</option><option value="accept">Accept QC</option><option value="reject">Reject QC</option><option value="quarantine">Quarantine</option></select></label>
      {transition==="receive"?<><label>Receipt quantity <input className={control} inputMode="decimal" value={quantity} onChange={e=>{setQuantity(e.target.value);setConfirmed(false);}}/></label><label>Receiving location <select className={control} value={location} onChange={e=>{setLocation(e.target.value);setConfirmed(false);}}><option value="">Select verified location</option>{source?.locations.map(value=><option key={value} value={value}>{value}</option>)}</select></label></>:<label>Receipt to inspect <select className={control} value={receiptId} onChange={e=>{setReceiptId(e.target.value);setConfirmed(false);}}><option value="">Select receipt</option>{receipts.filter(r=>r.po_id===source?.order&&r.line_id===source.line&&["pending","quarantined"].includes(r.status)).map(r=><option key={r.id} value={r.id}>{r.id} · {r.quantity} {r.unit} · {r.status} · {r.location}</option>)}</select></label>}
      <label className="sm:col-span-2">Receipt / QC reason <input className={control} maxLength={1000} value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false);}}/></label>
      <label className="sm:col-span-2"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I verified this source, quantity, location and QC decision.</label>
      <button className={button} disabled={!source||!confirmed||!reason.trim()||(transition==="receive"?(!quantity||!location.trim()):!receipt)} onClick={prepare}>Record receipt operation</button>
    </fieldset>
  </section>;
}
