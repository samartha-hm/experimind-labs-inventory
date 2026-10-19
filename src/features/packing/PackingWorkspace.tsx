import { PackingInspection } from './PackingInspection';
import { PackingExecution } from './PackingExecution';
import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../AuthContext';
import { actualMaterials, type PackingDetail, type PackingOrderSummary, type PackingPackageView } from './packingTypes';
import { packageAncestry, packageLookupId } from './workspaceContract';
import '../../design/precision/precision.css';
import './packingWorkspace.css';

const root = '/api/v1/packing/workspace';
export function PackingWorkspaceEntry({ projectId, children, direct = false }: { projectId?: string; children?: React.ReactNode; direct?: boolean }) {
  const { currentUser } = useAuth();
  const [enabled, setEnabled] = useState(false), [open, setOpen] = useState(direct);
  useEffect(() => {
    let live = true; setEnabled(false);
    void apiFetch(root).then((v: { enabled: boolean }) => { if (live) setEnabled(v.enabled); }).catch(() => { if (live) setEnabled(false); });
    return () => { live = false; };
  }, [currentUser?.id, currentUser?.organization_id]);
  return <>{enabled && <button className="min-h-12 rounded-xl border px-4 py-3 mb-3" onClick={() => setOpen(!open)}>{open ? 'Return to operational packing' : 'Open Packing / QC workspace'}</button>}
    {enabled && open ? <PackingWorkspace key={`${projectId ?? 'all'}:${currentUser?.id}`} projectId={projectId} /> : children}
    {direct && !enabled && <p role="status">Packing workspace unavailable. Use the operational packing panel in Projects.</p>}</>;
}

export function PackingWorkspace({ projectId }: { projectId?: string; key?: string }) {
  const [orders, setOrders] = useState<PackingOrderSummary[]>([]), [detail, setDetail] = useState<PackingDetail>();
  const [selected, setSelected] = useState(''), [scan, setScan] = useState(''), [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [identity, setIdentity] = useState<{ role: string; user_id: string; execution_enabled: boolean; blocker?: string | null }>();
  const [locked, setLocked] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const generation = useRef(0), heading = useRef<HTMLHeadingElement>(null), scanner = useRef<HTMLInputElement>(null);
  useEffect(() => { if (focusRequest) heading.current?.focus(); }, [focusRequest]);
  function selectPackage(id: string) { setSelected(id); setFocusRequest(n => n + 1); }
  const order = detail?.order, packages = order?.snapshot.packages ?? [], pkg = packages.find(p => p.id === selected);
  const progress = order?.execution.progress[selected];
  async function load(id?: string, packageId?: string) {
    const request = ++generation.current; setBusy(true); setError(''); setNotice('');
    try {
      const capabilities: { enabled: boolean; role: string; user_id: string; execution_enabled: boolean; blocker?: string | null } = await apiFetch(root);
      if (!capabilities.enabled) throw new Error('Packing workspace unavailable. Return to operational packing.');
      const list: PackingOrderSummary[] = await apiFetch(`${root}/orders`);
      const target = id ? await apiFetch(`${root}/orders/${id}`) as PackingDetail : undefined;
      if (target && projectId && target.order.project_id !== projectId) throw new Error('Package belongs to another project. Open its project workspace.');
      if (target && packageId && !target.order.snapshot.packages.some(p => p.id === packageId)) throw new Error('Package context changed. Refresh the order.');
      if (request !== generation.current) return;
      setIdentity(capabilities); setOrders(list); setDetail(target);
      setSelected(target ? packageId ?? target.order.snapshot.packages[0]?.id ?? '' : '');
      setNotice(target ? 'Authorized order loaded. Server snapshot refreshed.' : 'Authorized packing queue loaded.');
      return true;
    } catch (e) {
      if (request === generation.current) { setDetail(undefined); setSelected(''); setOrders([]); setIdentity(undefined); setError(e instanceof Error ? e.message : 'Unable to load packing. Refresh before continuing.'); }
    } finally { if (request === generation.current) setBusy(false); }
  }
  useEffect(() => { void load(); return () => { generation.current++; }; }, [projectId]);
  useEffect(() => {
    const refresh = (event: StorageEvent) => { if (event.key === 'packing-execution-updated' && !locked && !busy && order) void load(order.id, selected); };
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [order?.id, selected, locked, busy]);
  async function lookup() {
    setError(''); setNotice('');
    let id: string;
    try { id = packageLookupId(scan, window.location.origin); }
    catch (e) { setError((e as Error).message); return; }
    const request = ++generation.current; setBusy(true);
    try {
      const found: PackingPackageView = await apiFetch(`${root}/packages/${id}`);
      if (request !== generation.current) return;
      await load(found.order_id, id);
      scanner.current?.focus(); scanner.current?.select();
    } catch (e) {
      if (request === generation.current) {
        const message = e instanceof Error ? e.message : 'Lookup failed';
        const unknown = message === 'Package not found';
        if (!unknown) { setDetail(undefined); setSelected(''); setOrders([]); setIdentity(undefined); }
        setError(`${message}. ${unknown ? 'Previous selection retained' : 'Context cleared; refresh authorized records'}; no operation recorded.`); setBusy(false);
      }
    }
  }
  const exceptions = order?.execution.exceptions.filter(e => e.package_id === selected) ?? [];
  const openExceptions = order?.execution.exceptions.filter(e => !e.corrected_by) ?? [];
  const visible = packages.filter(p => `${p.name} ${p.code} ${p.kind} ${p.subject} ${p.grade}`.toLowerCase().includes(filter.toLowerCase()));
  const contents = order && pkg ? actualMaterials(order, pkg.id) : [];
  const activities = pkg && order ? order.snapshot.versions.flatMap(v => v.subjects.flatMap(s => s.grades.flatMap(g => g.activities))).filter(a => pkg.activity_ids.includes(a.id)) : [];
  return <section className="precision packing-workspace" aria-label="Packing QC workspace" aria-busy={busy}>
    <header className="pw-header"><div><p className="pw-eyebrow">Precision Operations · Live authorized records</p><h2>Packing / QC</h2><p>{identity?.execution_enabled ? 'Packing execution and authorized QC rejection · acceptance and stock operations unavailable' : 'Read-only · execution disabled'}</p></div><button onClick={() => void load(order?.id, selected)} disabled={busy || locked}>Refresh records</button></header>
    <form className="pw-scan" onSubmit={e => { e.preventDefault(); if (!busy && !locked) void lookup(); }}>
      <label htmlFor="pw-scan">Scan or enter package label</label><div><input ref={scanner} id="pw-scan" value={scan} onChange={e => setScan(e.target.value)} placeholder="PK code, package UUID or ERP QR URL" autoComplete="off" spellCheck={false} /><button disabled={busy || locked || !scan.trim()}>Look up package</button></div><p>Keyboard scanner input + Enter performs lookup only. Physical scanner validation pending.</p>
    </form>
    {busy && <p role="status">Loading authorized records…</p>}{error && <p className="pw-alert" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {identity?.blocker && <p className="pw-alert" role="status">{identity.blocker}</p>}
    {identity?.execution_enabled && <PackingExecution detail={detail} selected={selected} actor={`${identity.user_id}`} onReload={load} onLock={setLocked} />}
    <div className="pw-layout"><nav aria-label="Packing orders and packages" className="pw-card">
      <h3>Destination queue</h3><p>Latest 200 authorized orders{projectId ? ' · current project' : ''}. Refresh for new records.</p>
      <label htmlFor="pw-order">Project / school / batch</label><select id="pw-order" value={order?.id ?? ''} disabled={busy || locked} onChange={e => { setFilter(''); void load(e.target.value || undefined); }}><option value="">Choose an order</option>{orders.filter(o => !projectId || o.project_id === projectId).map(o => <option key={o.id} value={o.id}>{o.project_name || 'Manual order'} / {o.site_name || 'School unavailable'} · {o.batch_code} · {o.status}</option>)}</select>
      {!orders.some(o => !projectId || o.project_id === projectId) && !busy && <p>No authorized packing orders available.</p>}
      <label htmlFor="pw-filter">Find in package outline</label><input id="pw-filter" value={filter} onChange={e => setFilter(e.target.value)} />
      <p>{visible.length} / {packages.length} packages</p><div className="pw-outline">{visible.map(p => <button type="button" key={p.id} disabled={busy || locked} aria-current={selected === p.id ? 'true' : undefined} onClick={() => { selectPackage(p.id); }}><strong>{p.kind.replaceAll('_', ' ')} · {p.name} #{p.pack_number}</strong><span>{p.subject} {p.grade} · QC {order?.execution.progress[p.id]?.qc ?? 'pending'}</span><small>{p.code}</small></button>)}</div>{order && !visible.length && <p>No matching packages.</p>}
    </nav><div className="pw-detail">
      {order ? <><section className="pw-card" aria-label="Order context"><h3>{order.snapshot.project_name || 'Manual packing order'} / {order.snapshot.site_name || 'School unavailable'}</h3><p>{order.number} · Batch {order.batch_code} · order revision {order.revision} · {order.status}</p><p>Requirement revision {order.demand_revision ?? 'unavailable (manual order)'} · snapshot context, not a live requirement approval</p><p>Assigned team: {order.assigned_team || 'Unassigned'} · operator ID: {order.assigned_employee_id || 'Unassigned'}</p><p>Signed-in actor ID: {identity?.user_id} · current server role: {identity?.role}. Assignment does not grant permission.</p><p className={openExceptions.length ? 'pw-alert' : ''}>{openExceptions.length} unresolved order exceptions{openExceptions.length ? ' · review affected packages before operational work' : ''}</p>{openExceptions.map(e => <button key={e.id} disabled={busy || locked} onClick={() => { selectPackage(e.package_id); setFilter(''); }}>Review {e.kind} · {packages.find(p => p.id === e.package_id)?.name ?? e.package_id}</button>)}</section>
      {pkg && <section className="pw-card" aria-label="Selected package"><h3 ref={heading} tabIndex={-1}>{pkg.kind.replaceAll('_', ' ')} · {pkg.name} #{pkg.pack_number}</h3><p className="pw-code">{pkg.code}</p><nav aria-label="Package ancestry">{packageAncestry(packages, pkg.id).map(p => <button key={p.id} disabled={busy || locked} onClick={() => selectPackage(p.id)}>{p.name} #{p.pack_number}</button>)}</nav><p>{pkg.subject || 'Subject unavailable'} / {pkg.grade || 'Grade unavailable'} · template {pkg.version_id} v{pkg.version_number}</p><p>Package ID {pkg.id} · parent {pkg.parent_id ?? 'root'}</p>
        <div className="pw-metrics"><div><strong>{progress?.assembled ? 'Recorded assembled' : 'Not recorded assembled'}</strong><p>Packed by {progress?.packed_by ?? 'unavailable'} · {progress?.packed_at ?? 'time unavailable'}</p></div><div><strong>QC {progress?.qc ?? 'pending'}</strong><p>Reviewer ID {progress?.checked_by ?? 'unavailable'} · {progress?.checked_at ?? 'time unavailable'}</p></div></div>
        <PackingInspection detail={detail!} selected={selected} />
        <h3>Package exceptions and provenance</h3>{!exceptions.length && <p>No exceptions recorded for this package.</p>}{exceptions.map(e => <div className="pw-evidence" key={e.id}><strong>{e.corrected_by ? 'Corrected' : 'Unresolved'} · {e.kind}</strong><p>{e.notes}</p><p>Reported by {e.reported_by} · {e.reported_at}</p>{e.corrected_by && <p>Correction: {e.correction} · {e.corrected_by} · {e.corrected_at}</p>}</div>)}
        <h3>Required contents (including approved changes)</h3><p>Per-material packed counts are unavailable for a single package. Assembly and QC above are recorded package states.</p>{contents.map((m, i) => <div className="pw-material" key={`${m.line_id}:${i}`}><strong>{m.name}</strong><span>{m.quantity} {m.unit} required</span><small>Item {m.item_id} · source line {m.line_id}</small></div>)}{!contents.length && <p>No directly allocated materials. Inspect child packages.</p>}
        <h3>Activity links</h3>{activities.length ? activities.map(a => <p key={a.id}>{a.name} · {a.id}</p>) : <p>No named activity links available for this package.</p>}
        <h3>Approved material changes</h3>{order.execution.changes.filter(c => c.package_id === selected).map(c => <p key={c.id}>{c.kind}: {c.material.name} · {c.reason} · actor {c.approved_by} · {c.approved_at}</p>)}
      </section>}
      <section className="pw-card" aria-label="Order material totals"><h3>Order quantities · authoritative summary</h3><p>{packages.filter(p => order.execution.progress[p.id]?.assembled).length} / {packages.length} packages recorded assembled · {packages.filter(p => order.execution.progress[p.id]?.qc === 'accepted').length} QC accepted. Counts include hierarchy containers.</p>{detail.materials.map(m => <div className="pw-material" key={`${m.item_id}:${m.unit}`}><strong>{m.name} ({m.unit})</strong><p>Required {m.planned} · picked {m.picked} · assembled {m.assembled} · QC passed {m.checked} · completed {m.completed} · remaining to pick {m.remaining}</p><p>Stock {m.stock_status} · available {m.available ?? 'unavailable'} · shortage {m.shortage ?? 'unavailable'}</p></div>)}</section>
      <section className="pw-card"><h3>Recorded activity · latest 100 order events</h3>{detail.history.map(h => <p key={h.revision}>Revision {h.revision} · actor {h.actor_id} · {h.created_at}</p>)}</section>
      <aside className="pw-next"><strong>Next: {openExceptions.length ? 'review unresolved exceptions' : pkg ? 'inspect required contents and recorded evidence' : 'select a package'}.</strong><p>Authorized rejection is available through package actions; final QC approval remains blocked. Review server evidence before further operational work.</p><button onClick={() => scanner.current?.focus()}>Focus package scanner</button></aside></> : <section className="pw-card"><h3>Select a destination or scan a label</h3><p>Authorized package context will appear here. No completion or inspection is inferred.</p></section>}
    </div></div>
  </section>;
}
