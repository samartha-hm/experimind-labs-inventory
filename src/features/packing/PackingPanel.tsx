import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { apiFetch } from "../../utils/api";
import type { PlanningView } from "../projects/planningTypes";
import { actualMaterials, qcChecks, type PackingDetail, type PackingOrderSummary } from "./packingTypes";
import { PackingLabelsPanel } from "./PackingLabelsPanel";
import { PackingWorkspaceEntry } from './PackingWorkspace';

const input = "min-h-11 rounded-xl border border-slate-300 bg-transparent p-3";
const button = "min-h-11 rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-40";
export default function PackingPanel({ project }: { project?: PlanningView }) {
  return <PackingWorkspaceEntry projectId={project?.id}><LegacyPackingPanel project={project} /></PackingWorkspaceEntry>;
}
function LegacyPackingPanel({ project }: { project?: PlanningView }) {
  const { currentUser } = useAuth(), role = currentUser?.role ?? "";
  const writer = ["admin", "super_admin", "manager", "staff", "inventory_staff", "production_staff", "project_staff", "editor"].includes(role);
  const approver = ["admin", "super_admin", "manager"].includes(role), inspector = approver || role === "inventory_staff";
  const [orders, setOrders] = useState<PackingOrderSummary[]>([]), [detail, setDetail] = useState<PackingDetail>();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [site, setSite] = useState(""), [batch, setBatch] = useState("");
  const [team, setTeam] = useState(""), [employee, setEmployee] = useState("");
  const [item, setItem] = useState(""), [quantity, setQuantity] = useState(""), [location, setLocation] = useState(""), [reservation, setReservation] = useState("");
  const [selected, setSelected] = useState<string[]>([]), [notes, setNotes] = useState("");
  const [checks, setChecks] = useState<Record<typeof qcChecks[number], boolean>>({ material:false, quantity:false, placement:false, packaging:false, stickers:false, instructions:false });
  const [exceptionKind, setExceptionKind] = useState("missing"), [retryKeys] = useState(() => new Map<string, string>());
  const order = detail?.order, active = order?.status === "packing";
  async function load() { setOrders(await apiFetch("/api/v1/packing")); }
  async function open(id: string) { const d: PackingDetail = await apiFetch(`/api/v1/packing/orders/${id}`); setDetail(d); setTeam(d.order.assigned_team); setEmployee(d.order.assigned_employee_id ?? ""); }
  async function run(work: () => Promise<void>) { setBusy(true); setError(""); try { await work(); await load(); } catch(e) { setError(e instanceof Error ? e.message : "Packing operation failed"); } finally { setBusy(false); } }
  useEffect(() => { void run(load); }, []);
  useEffect(() => { setSite(project?.sites[0]?.id ?? ""); setDetail(undefined); setSelected([]); }, [project?.id]);
  async function write(path: string, body: unknown) {
    const fingerprint = JSON.stringify([path, body]), key = retryKeys.get(fingerprint) ?? crypto.randomUUID(); retryKeys.set(fingerprint, key);
    const result = await apiFetch(`/api/v1/packing${path}`, { method:"POST", headers:{"Idempotency-Key":key}, body:JSON.stringify(body) }); retryKeys.delete(fingerprint); return result;
  }
  const act = (verb: string, extra: object = {}) => void run(async () => { await write(`/orders/${order!.id}/${verb}`, { revision:order!.revision, ...extra }); await open(order!.id); });
  return <section className="space-y-4 rounded-2xl border border-slate-300 p-4">
    <h2 className="text-xl font-bold">Assembly, packing and QC</h2>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {writer && project && <div className="flex flex-wrap gap-2">
      <select aria-label="Packing school" className={input} value={site} onChange={e=>setSite(e.target.value)}>{project.sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <input aria-label="Packing batch code" placeholder="Batch code" className={input} value={batch} onChange={e=>setBatch(e.target.value)}/>
      <button className={button} disabled={busy || !site || !batch.trim()} onClick={()=>void run(async()=>{const o=await write("/orders",{project_id:project.id,site_id:site,demand_revision:project.revision,batch_code:batch});await open(o.id);setSelected([]);})}>Generate packing order</button>
    </div>}
    <div className="flex flex-wrap gap-2">{orders.filter(o=>!project || o.project_id===project.id).map(o=><button className={button} disabled={busy} key={o.id} onClick={()=>void run(async()=>{await open(o.id);setSelected([]);})}>{o.site_name || o.number} · {o.batch_code} · {o.status === "ready" ? "Ready for Delivery" : o.status}</button>)}</div>
    {order && <>
      <p>{order.number} · {order.snapshot.project_name} / {order.snapshot.site_name} · revision {order.revision} · <strong>{order.status === "ready" ? "Ready for Delivery" : order.status}</strong></p>
      <p className="text-sm">Assigned: {order.assigned_team || "No team"} · {order.assigned_employee_id || "No operator"}</p>
      {writer && <div className="flex flex-wrap gap-2">
        {approver && order.status==="draft" && <button className={button} disabled={busy} onClick={()=>act("release")}>Release for packing</button>}
        {active && <button className={button} disabled={busy} onClick={()=>act("pause")}>Pause</button>}
        {order.status==="paused" && <button className={button} disabled={busy} onClick={()=>act("resume")}>Resume</button>}
        {approver && order.status==="ready" && <button className={button} disabled={busy || !notes.trim()} onClick={()=>act("reopen",{reason:notes})}>Reopen for rework</button>}
        {!["ready","cancelled"].includes(order.status) && <><input className={input} aria-label="Packing team" placeholder="Team" value={team} onChange={e=>setTeam(e.target.value)}/><input className={input} aria-label="Packing employee ID" placeholder="Employee ID (optional)" value={employee} onChange={e=>setEmployee(e.target.value)}/><button className={button} disabled={busy} onClick={()=>act("assign",{team,...(employee?{employee_id:employee}:{})})}>Assign</button></>}
      </div>}
      <div className="overflow-auto"><table className="w-full text-sm"><thead><tr>{["Material","Unit","Required","Picked","Packed","QC passed","Remaining","Shortage"].map(h=><th className="p-2 text-left" key={h}>{h}</th>)}</tr></thead><tbody>{detail.materials.map(m=><tr key={m.item_id+m.unit}>{[m.name,m.unit,m.planned,m.picked,m.assembled,m.completed,m.remaining,m.shortage ?? "Unverified"].map((v,i)=><td className="p-2" key={i}>{v}</td>)}</tr>)}</tbody></table></div>
      {writer && active && <div className="flex flex-wrap gap-2">
        <select aria-label="Pick material" className={input} value={item} onChange={e=>setItem(e.target.value)}><option value="">Select material</option>{detail.materials.map(m=><option key={m.item_id} value={m.item_id}>{m.name} ({m.unit})</option>)}</select>
        <input className={input} aria-label="Pick quantity" placeholder="Partial quantity" value={quantity} onChange={e=>setQuantity(e.target.value)}/><input className={input} aria-label="Pick location" placeholder="Verified location" value={location} onChange={e=>setLocation(e.target.value)}/><input className={input} aria-label="Reservation ID" placeholder="Reservation ID (optional)" value={reservation} onChange={e=>setReservation(e.target.value)}/>
        <button className={button} disabled={busy || !item || !quantity || !location} onClick={()=>act("picks",{item_id:item,quantity,unit:detail.materials.find(m=>m.item_id===item)!.unit,location,...(reservation?{reservation_id:reservation}:{})})}>Pick stock</button>
      </div>}
      <div className="flex gap-2"><button className={button} disabled={busy} onClick={()=>setSelected(order.snapshot.packages.map(p=>p.id))}>Select all packages</button><button className={button} onClick={()=>setSelected([])}>Clear selection</button></div>
      <div className="max-h-96 overflow-auto space-y-2">{order.snapshot.packages.map(p=>{const progress=order.execution.progress[p.id];return <label className="block rounded-xl border border-slate-200 p-3" key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={e=>setSelected(e.target.checked?[...selected,p.id]:selected.filter(id=>id!==p.id))}/> {p.kind}: {p.name} #{p.pack_number} · {p.grade} · {progress?.assembled?"Packed":"Pending"} · QC {progress?.qc ?? "pending"}<small className="block">{p.code} · template v{p.version_number} · parent {p.parent_id ?? "root"}</small><small className="block">{actualMaterials(order,p.id).map(m=>`${m.name}: ${m.quantity} ${m.unit}`).join("; ") || "Container checklist: verify child packages"}</small><small className="block">Packed by {progress?.packed_by ?? "—"}; checked by {progress?.checked_by ?? "—"} {progress?.notes}</small></label>;})}</div>
      <textarea className={`${input} w-full`} aria-label="Packing notes and correction" placeholder="Exception, correction or inspection notes" value={notes} onChange={e=>setNotes(e.target.value)}/>
      {writer && active && <div className="flex flex-wrap gap-2"><button className={button} disabled={busy || !selected.length} onClick={()=>act("checklist",{package_ids:selected,assembled:true,notes})}>Complete selected checklists</button><button className={button} disabled={busy || !selected.length} onClick={()=>act("checklist",{package_ids:selected,assembled:false,notes})}>Return selected to rework</button><select className={input} value={exceptionKind} onChange={e=>setExceptionKind(e.target.value)}><option value="missing">Missing item</option><option value="damaged">Damaged item</option><option value="other">Other exception</option></select><button className={button} disabled={busy || selected.length!==1 || !notes.trim()} onClick={()=>act("exceptions",{package_id:selected[0],kind:exceptionKind,notes})}>Report exception on selected package</button></div>}
      {order.execution.exceptions.map(e=><div className="rounded-xl border p-3" key={e.id}>{e.kind}: {e.notes} · {e.corrected_by?`Corrected: ${e.correction}`:"Open"}{writer && active && !e.corrected_by && <button className={button} disabled={busy || !notes.trim()} onClick={()=>act("exceptions",{package_id:e.package_id,kind:e.kind,exception_id:e.id,notes})}>Record correction</button>}</div>)}
      {inspector && active && <fieldset className="space-y-2"><legend>Packing QC inspection</legend><div className="flex flex-wrap gap-3">{qcChecks.map(k=><label key={k}><input type="checkbox" checked={checks[k]} onChange={e=>setChecks({...checks,[k]:e.target.checked})}/> {k}</label>)}</div><button className={button} disabled={busy || !selected.length || qcChecks.some(k=>!checks[k])} onClick={()=>act("qc",{package_ids:selected,decision:"accept",checks,notes})}>Accept selected QC</button> <button className={button} disabled={busy || !selected.length || !notes.trim()} onClick={()=>act("qc",{package_ids:selected,decision:"reject",checks,notes})}>Reject selected QC</button></fieldset>}
      <PackingLabelsPanel order={order} ids={selected}/>
      <details><summary>Audit history ({detail.history.length})</summary>{detail.history.map(h=><p key={h.revision}>Revision {h.revision} · {h.actor_id} · {h.created_at}</p>)}</details>
    </>}
  </section>;
}
