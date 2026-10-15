import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../AuthContext";
import { apiFetch } from "../../utils/api";
import type { PlanningView } from "../projects/planningTypes";
import type { PackingDetail, PackingOrder, PackingOrderSummary } from "../packing/packingTypes";
import type { DeliveryOrder, CustodyEvent } from "./deliveryTypes";
import type { CompletionProgress, InstallationJob } from "./completionTypes";
import { deliveryManifestPDF } from "./deliveryManifest";
import { dispatchRoots } from "./dispatchRoots";
const input = "min-h-11 rounded-xl border border-slate-300 bg-transparent p-3";
const button = "min-h-11 rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-40";
interface DeliveryDetail { order: DeliveryOrder; custody: CustodyEvent[]; history: unknown[] }
export default function DeliveryPanel({ project }: { project: PlanningView }) {
  const { currentUser } = useAuth(), role = currentUser?.role ?? "";
  const approver = ["admin", "super_admin", "manager"].includes(role), writer = approver || ["staff", "inventory_staff", "production_staff", "project_staff", "editor"].includes(role);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]), [packing, setPacking] = useState<PackingOrderSummary[]>([]), [allocation, setAllocation] = useState<PackingOrder>();
  const [detail, setDetail] = useState<DeliveryDetail>(), [progress, setProgress] = useState<CompletionProgress>();
  const [selected, setSelected] = useState<string[]>([]), [roots, setRoots] = useState<string[]>([]);
  const [carrier, setCarrier] = useState(""), [vehicle, setVehicle] = useState(""), [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [employee, setEmployee] = useState(""), [recipient, setRecipient] = useState(""), [notes, setNotes] = useState(""), [exception, setException] = useState("");
  const [kind, setKind] = useState<"shortage" | "damaged" | "missing" | "return">("missing");
  const [checklist, setChecklist] = useState("Prepare the site\nSet up the kits\nDemonstrate safe operation"), [survey, setSurvey] = useState("");
  const [required, setRequired] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(""), [pdfURL, setPdfURL] = useState("");
  const [retryKeys] = useState(() => new Map<string, string>());
  const [receiptTime, setReceiptTime] = useState(() => new Date().toISOString());
  const tasks = useMemo(() => checklist.split("\n").map(v => v.trim()).filter(Boolean).map(label => ({ id: crypto.randomUUID(), label, required: true })), [checklist]);
  const order = detail?.order, closed = progress?.completion?.status === "closed";
  async function load() {
    const [o, p, ready]: [DeliveryOrder[], CompletionProgress, PackingOrderSummary[]] = await Promise.all([apiFetch(`/api/v1/delivery?project_id=${project.id}`), apiFetch(`/api/v1/delivery/projects/${project.id}`), apiFetch("/api/v1/packing")]);
    setOrders(o); setProgress(p); setPacking(ready.filter(v => v.project_id === project.id && v.status === "ready"));
  }
  async function run(work: () => Promise<unknown>) { setBusy(true); setError(""); try { await work(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Delivery operation failed"); } finally { setBusy(false); } }
  useEffect(() => { setDetail(undefined); setAllocation(undefined); setSelected([]); setRoots([]); setPdfURL(""); retryKeys.clear(); void run(load); }, [project.id, currentUser?.organization_id]);
  useEffect(() => () => { if (pdfURL) URL.revokeObjectURL(pdfURL); }, [pdfURL]);
  async function write(path: string, body: unknown) {
    const fingerprint = JSON.stringify([path, body]), key = retryKeys.get(fingerprint) ?? crypto.randomUUID(); retryKeys.set(fingerprint, key);
    const result = await apiFetch(`/api/v1/delivery${path}`, { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(body) }); retryKeys.delete(fingerprint); return result;
  }
  async function open(id: string) { const d: DeliveryDetail = await apiFetch(`/api/v1/delivery/orders/${id}`); setDetail(d); setSelected([]); setPdfURL(""); }
  const transition = (action: string) => void run(async () => { await write(`/orders/${order!.id}/${action}`, { revision: order!.revision, reason: notes }); await open(order!.id); });
  const install = (job: InstallationJob, action: string, extra: object = {}) => void run(() => write(`/installations/${job.id}`, { revision: job.revision, action, notes, ...extra }));
  const toggle = (values: string[], id: string) => values.includes(id) ? values.filter(v => v !== id) : [...values, id];
  return <section className="space-y-4 rounded-2xl border border-slate-300 p-4">
    <h2 className="text-xl font-bold">Delivery, installation and project completion</h2>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <button className={button} disabled={busy} onClick={() => void run(async () => { if (order) await open(order.id); })}>Refresh progress</button>
    <div className="flex flex-wrap gap-2">
      <input className={input} aria-label="Recipient" placeholder="Recipient / customer representative" value={recipient} onChange={e => setRecipient(e.target.value)} />
      <textarea className={input} aria-label="Delivery or installation notes" placeholder="Acknowledgement, issue, correction or reopening notes" value={notes} onChange={e => setNotes(e.target.value)} />
    </div>
    {approver && !closed && <details><summary className="cursor-pointer py-3">Create school dispatch plan</summary><div className="space-y-2">
      <select className={input} aria-label="QC approved allocation" value={allocation?.id ?? ""} disabled={busy} onChange={e => { const id = e.target.value; setAllocation(undefined); setRoots([]); if (id) void run(async () => { const d: PackingDetail = await apiFetch(`/api/v1/packing/orders/${id}`); setAllocation(d.order); }); }}><option value="">Choose QC Ready school allocation</option>{packing.map(p => <option key={p.id} value={p.id}>{project.sites.find(s => s.id === p.site_id)?.name} · {p.batch_code}</option>)}</select>
      {(allocation ? dispatchRoots(allocation.snapshot.packages) : []).map(p => { const claimed = orders.some(o => o.manifest.some(v => v.id === p.id)); return <label key={p.id} className="block py-2"><input type="checkbox" disabled={busy || claimed} checked={roots.includes(p.id)} onChange={() => setRoots(toggle(roots, p.id))} /> {p.code} · {p.name}{claimed ? " · Already allocated" : ""}</label>; })}
      <input className={input} aria-label="Transport carrier" placeholder="Carrier" value={carrier} onChange={e => setCarrier(e.target.value)} />
      <input className={input} aria-label="Transport vehicle" placeholder="Vehicle" value={vehicle} onChange={e => setVehicle(e.target.value)} />
      <input className={input} aria-label="Planned dispatch date" type="date" value={date} onChange={e => setDate(e.target.value)} />
      <input className={input} aria-label="Responsible employee ID" placeholder="Responsible employee ID (optional)" value={employee} onChange={e => setEmployee(e.target.value)} />
      <button className={button} disabled={busy || !allocation || !roots.length || !carrier.trim() || !date} onClick={() => void run(async () => { const created: DeliveryOrder = await write("/orders", { packing_order_id: allocation!.id, package_ids: roots, transport: { carrier, vehicle, planned_date: date, notes, ...(employee ? { employee_id: employee } : {}) } }); setRoots([]); await open(created.id); })}>Create dispatch plan</button>
    </div></details>}
    <div className="flex flex-wrap gap-2">{orders.map(o => <button key={o.id} className={button} disabled={busy} onClick={() => void run(() => open(o.id))}>{o.destination.school_name} · {o.status} · {o.number.slice(0, 12)}</button>)}</div>
    {order && <div className="space-y-3 rounded-xl border p-3">
      <h3 className="font-bold">{order.number} · {order.destination.school_name} · {order.status}</h3><p>{order.destination.address} · {order.transport.carrier} · {order.transport.planned_date}</p>
      {approver && !closed && <div className="flex flex-wrap gap-2">{(order.status === "planned" ? ["dispatch"] : order.status === "dispatched" ? ["transit", "fail"] : ["in_transit", "partially_delivered"].includes(order.status) ? ["fail"] : order.status === "failed" ? ["return", "retry"] : order.status === "returned" ? ["retry"] : []).map(a => <button key={a} className={button} disabled={busy} onClick={() => transition(a)}>{a}</button>)}</div>}
      <button className={button} disabled={busy} onClick={() => void run(async () => { const fresh: DeliveryDetail = await apiFetch(`/api/v1/delivery/orders/${order.id}`); setPdfURL(URL.createObjectURL(deliveryManifestPDF(fresh.order).output("blob"))); })}>Preview delivery note</button>
      {pdfURL && <><a className={button} href={pdfURL} target="_blank" rel="noreferrer">Open PDF / print</a><a className={button} href={pdfURL} download={`${order.number}.pdf`}>Download delivery note</a><iframe title="Delivery note preview" className="h-96 w-full" src={pdfURL} /></>}
      <button className={button} disabled={busy} onClick={() => setSelected(order.manifest.filter(p => !order.execution.proofs.some(proof => proof.package_ids.includes(p.id))).map(p => p.id))}>Select remaining packages</button>
      <div className="max-h-72 overflow-auto">{order.manifest.map(p => { const received = order.execution.proofs.some(proof => proof.package_ids.includes(p.id)); return <label key={p.id} className="block py-2"><input type="checkbox" disabled={busy || !writer || closed} checked={selected.includes(p.id)} onChange={() => setSelected(toggle(selected, p.id))} /> {p.code} · {p.kind} · {p.name} · {received ? "Received" : "Pending"}</label>; })}</div>
      {writer && !closed && <div className="flex flex-wrap gap-2">
        <input className={input} aria-label="Receipt date and time" type="datetime-local" value={receiptTime.slice(0, 16)} onChange={e => { if (e.target.value) setReceiptTime(`${e.target.value}:00.000Z`); }} /><span>Receipt time (UTC)</span>
        <button className={button} disabled={busy || !selected.length || !recipient.trim() || !notes.trim() || !["dispatched", "in_transit", "partially_delivered"].includes(order.status)} onClick={() => void run(async () => { await write(`/orders/${order.id}/receive`, { revision: order.revision, package_ids: selected, recipient, acknowledged_at: receiptTime, acknowledgement: notes }); await open(order.id); })}>Confirm selected receipts</button>
        <select className={input} aria-label="Delivery issue type" value={kind} onChange={e => setKind(e.target.value as typeof kind)}>{["shortage", "damaged", "missing", "return"].map(k => <option key={k}>{k}</option>)}</select>
        <button className={button} disabled={busy || selected.length !== 1 || !notes.trim() || order.status === "planned"} onClick={() => void run(async () => { await write(`/orders/${order.id}/issues`, { revision: order.revision, package_id: selected[0], kind, notes }); await open(order.id); })}>Report selected package issue</button>
      </div>}
      {order.execution.issues.map(i => <div key={i.id}><p>{i.kind} · {i.package_id} · {i.notes} · {i.correction ?? "Unresolved"}</p>{approver && !closed && !i.corrected_by && <button className={button} disabled={busy || !notes.trim()} onClick={() => void run(async () => { await write(`/orders/${order.id}/issues`, { revision: order.revision, package_id: i.package_id, issue_id: i.id, kind: i.kind, notes }); await open(order.id); })}>Record correction</button>}</div>)}
      <details><summary className="cursor-pointer py-3">Receipts and immutable history</summary>{order.execution.proofs.map(p => <p key={p.id}>{p.recipient} · {p.acknowledged_at} · {p.package_ids.length} packages · {p.acknowledgement}</p>)}<pre className="max-h-64 overflow-auto text-xs">{JSON.stringify(detail?.history, null, 2)}</pre></details>
    </div>}
    {progress && <div className="space-y-3"><h3 className="font-bold">Project {closed ? "closed" : "active"} · {progress.schools.reduce((n, s) => n + s.remaining, 0)} packages remaining</h3>
      {progress.schools.map(s => <div key={s.site_id} className="space-y-2 rounded-xl border p-3"><h4 className="font-bold">{s.name} · {s.delivered}/{s.packages} received · {s.issues} unresolved issues</h4>
        {s.installation ? <><p>Installation: {s.installation.status} · {s.installation.required ? "Required" : "Optional"} · Installer {s.installation.employee_id ?? "unassigned"}</p><p>{s.installation.survey} · {s.installation.notes}</p>
          {s.installation.checklist.map(t => <label key={t.id} className="block py-2"><input type="checkbox" checked={t.checked} disabled={busy || !writer || closed || ["installed", "completed"].includes(s.installation!.status)} onChange={() => install(s.installation!, "check", { task_id: t.id, checked: !t.checked })} /> {t.label} · {t.required ? "Required" : "Optional"}</label>)}
          {writer && !closed && <div className="flex flex-wrap gap-2">
            {!["installed", "completed"].includes(s.installation.status) && <><button className={button} disabled={busy || !notes.trim()} onClick={() => install(s.installation!, "note", { survey })}>Save notes / survey</button><button className={button} disabled={busy} onClick={() => install(s.installation!, "finish")}>Submit installer completion</button></>}
            {s.installation.status !== "completed" && <button className={button} disabled={busy || !notes.trim()} onClick={() => install(s.installation!, "issue")}>Report installation issue</button>}
            {approver && <><button className={button} disabled={busy || s.installation.status !== "installed" || !recipient.trim() || !notes.trim()} onClick={() => install(s.installation!, "accept", { recipient })}>Accept installation</button><button className={button} disabled={busy || !notes.trim() || !["installed", "completed", "blocked"].includes(s.installation.status)} onClick={() => install(s.installation!, "reopen")}>Reopen / revisit</button><button className={button} disabled={busy || s.installation.status === "completed"} onClick={() => install(s.installation!, "assign", employee ? { employee_id: employee } : {})}>Assign responsible employee</button></>}
          </div>}
          {s.installation.issues.map(i => <p key={i.id}>{i.notes} · {i.correction ?? "Unresolved"} {approver && !closed && !i.corrected_by && <button className={button} disabled={busy || !notes.trim()} onClick={() => install(s.installation!, "correct", { issue_id: i.id })}>Record installation correction</button>}</p>)}
        </> : <><p>Delivery only · no installation required</p>{approver && !closed && orders.some(o => o.site_id === s.site_id) && <button className={button} disabled={busy || !checklist.trim()} onClick={() => void run(() => write("/installations", { project_id: project.id, site_id: s.site_id, required, ...(employee ? { employee_id: employee } : {}), survey, checklist: tasks }))}>Plan installation</button>}</>}
      </div>)}
      {approver && !closed && <details><summary className="cursor-pointer py-3">Installation plan settings</summary><label><input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} /> Required for project completion</label><textarea className={input} aria-label="Installation checklist configuration" value={checklist} onChange={e => setChecklist(e.target.value)} /><textarea className={input} aria-label="Site survey" placeholder="Site survey" value={survey} onChange={e => setSurvey(e.target.value)} /></details>}
      {progress.blockers.map(b => <p key={b} className="text-amber-700">{b}</p>)}
      {approver && <div className="flex flex-wrap gap-2">{!closed && <input className={input} aria-label="Authorized project closure exception" placeholder="Exception reason (only to override listed blockers)" value={exception} onChange={e => setException(e.target.value)} />}<button className={button} disabled={busy || !notes.trim() || (!closed && (!recipient.trim() || (progress.blockers.length > 0 && !exception.trim())))} onClick={() => void run(() => write(`/projects/${project.id}/completion`, { revision: progress.completion?.revision ?? 0, project_revision: progress.project_revision, action: closed ? "reopen" : "close", recipient, notes, ...(exception ? { exception_reason: exception } : {}) }))}>{closed ? "Reopen project" : "Record customer acceptance and close"}</button></div>}
      <details><summary className="cursor-pointer py-3">Installation and project acceptance history</summary><pre className="max-h-64 overflow-auto text-xs">{JSON.stringify(progress.history, null, 2)}</pre></details>
    </div>}
  </section>;
}
