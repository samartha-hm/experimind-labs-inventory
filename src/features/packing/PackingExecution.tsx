import React, { useEffect, useRef, useState } from 'react';
import { apiFetch, getApiAuthToken } from '../../utils/api';
import type { PackingDetail, PackingOrder } from './packingTypes';

const root = '/api/v1/packing/workspace';
type Intent = { key: string; order: string; package: string; revision: number; endpoint: 'checklist' | 'exceptions'; body: Record<string, unknown>; label: string };
type Capabilities = { revision: number; packages: Record<string, { blocker: string | null }> };
export function PackingExecution({ detail, selected, actor, onReload, onLock }: {
  detail?: PackingDetail; selected: string; actor: string;
  onReload: (order: string, pkg: string) => Promise<boolean | undefined>; onLock: (locked: boolean) => void;
}) {
  const storage = `packing-execution:${actor}`;
  const [pending, setPending] = useState<Intent | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(storage) || 'null') as Intent | null; } catch { return null; }
  });
  const [action, setAction] = useState('assemble'), [notes, setNotes] = useState(''), [ack, setAck] = useState(false);
  const [review, setReview] = useState<Intent | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [blocked, setBlocked] = useState(false), [cap, setCap] = useState<Capabilities>();
  const inFlight = useRef(false);
  const order = detail?.order, pkg = order?.snapshot.packages.find(p => p.id === selected);
  useEffect(() => { onLock(!!pending || busy); return () => onLock(false); }, [pending, busy, onLock]);
  useEffect(() => {
    let live = true; setCap(undefined); setReview(null); setAck(false);
    if (order) void apiFetch(`${root}/orders/${order.id}/capabilities`).then((v: Capabilities) => { if (live) setCap(v); }).catch(() => { if (live) setMessage('Permissions unavailable. Refresh before preparing an action.'); });
    return () => { live = false; };
  }, [order?.id, order?.revision, selected]);
  useEffect(() => { setAction('assemble'); setNotes(''); }, [order?.id, selected]);
  const blocker = !order || !pkg ? 'Select a package to execute packing.' : !cap || cap.revision !== order.revision ? 'Refresh to verify action permissions.' : cap.packages[selected]?.blocker ?? (cap.packages[selected] ? null : 'Package permission unavailable.');
  async function prepare() {
    if (!order || !pkg || busy || pending || blocker || !notes.trim()) return;
    setBusy(true); setMessage(''); setReview(null); setAck(false);
    try {
      const fresh: PackingDetail = await apiFetch(`${root}/orders/${order.id}`);
      const permissions: Capabilities = await apiFetch(`${root}/orders/${order.id}/capabilities`);
      if (fresh.order.revision !== order.revision || permissions.revision !== order.revision) throw new Error('Stale revision. Refresh and reconcile your reason before preparing again.');
      if (!permissions.packages[selected]) throw new Error('Package permission unavailable.');
      if (permissions.packages[selected]?.blocker) throw new Error(permissions.packages[selected].blocker!);
      const correction = order.execution.exceptions.find(e => e.id === action && e.package_id === selected && !e.corrected_by);
      const checklist = action === 'assemble' || action === 'undo';
      const body = checklist ? { revision: order.revision, package_ids: [selected], assembled: action === 'assemble', notes: notes.trim() }
        : { revision: order.revision, package_id: selected, kind: correction?.kind ?? action, notes: notes.trim(), ...(correction ? { exception_id: correction.id } : {}) };
      setReview({ key: crypto.randomUUID(), order: order.id, package: selected, revision: order.revision, endpoint: checklist ? 'checklist' : 'exceptions', body,
        label: `${order.snapshot.project_name || 'Manual order'} / ${order.snapshot.site_name || 'School unavailable'} · ${order.number} · ${pkg.code} · ${action === 'assemble' ? 'Record assembled' : action === 'undo' ? 'Reset assembly' : correction ? 'Correct exception' : `Report ${action}`} ` });
    } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  async function send(intent: Intent) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setMessage(''); setBlocked(false);
    try {
      // Persist the exact intent before transmission; failure to persist blocks the write.
      sessionStorage.setItem(storage, JSON.stringify(intent)); setPending(intent); setReview(null);
      const response = await fetch(`${root}/orders/${intent.order}/${intent.endpoint}`, { method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getApiAuthToken() || ''}`, 'Idempotency-Key': intent.key }, body: JSON.stringify(intent.body) });
      if (!response.ok) {
        const data = await response.json();
        setBlocked(response.status < 500);
        throw new Error(`${response.status}: ${data.error || 'Packing action denied'}. Refresh and reconcile; no automatic overwrite.`);
      }
      const saved: PackingOrder = await response.json();
      setMessage(`Server confirmed persistence at revision ${saved.revision}. Reloading current records…`);
      localStorage.setItem('packing-execution-updated', JSON.stringify({ order: intent.order, key: intent.key }));
      const loaded = await onReload(intent.order, intent.package);
      if (!loaded) throw new Error(`Saved at revision ${saved.revision}; current records unavailable. Retry the same intent to reconcile.`);
      sessionStorage.removeItem(storage); setPending(null); setNotes(''); setAck(false);
      setMessage(`Saved and reloaded. Server confirmed revision ${saved.revision}; QC remains a separate inspection.`);
    } catch (e) { setMessage(`${(e as Error).message} Pending intent retained when available; retry uses the identical key and payload.`); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section className="pw-card" aria-label="Packing execution" aria-busy={busy}>
    <h3>Supported packing execution</h3>
    <p>Package assembly and exception evidence only. Required quantities and approved contents remain authoritative. Packing changes reset this package and ancestor progress; inspection is still required.</p>
    {message && <p role="status" className="pw-alert">{message}</p>}
    {pending ? <><p>Interrupted or unresolved intent: {pending.label} · expected revision {pending.revision}. Reason: {String(pending.body.notes)}</p>
      <button disabled={busy || blocked} onClick={() => void send(pending)}>Retry identical pending intent</button>
      <button disabled={busy} onClick={() => void onReload(pending.order, pending.package)}>Reload pending package</button>
      <button disabled={busy} onClick={() => { setNotes(String(pending.body.notes)); sessionStorage.removeItem(storage); setPending(null); setReview(null); setAck(false); setMessage('Intent released for reconciliation. This does not undo a committed action. Review server history before preparing another action.'); }}>Release intent and reconcile server history</button></>
      : <>{blocker && <p role="status">{blocker}</p>}
      <label htmlFor="pw-action">Package action</label><select id="pw-action" disabled={busy || !!blocker} value={action} onChange={e => { setAction(e.target.value); setReview(null); setAck(false); }}>
        <option value="assemble">Record assembled</option><option value="undo">Reset assembly with reason</option>
        <option value="missing">Report missing contents</option><option value="damaged">Report damage</option><option value="other">Report other exception</option>
        {order?.execution.exceptions.filter(e => e.package_id === selected && !e.corrected_by).map(e => <option key={e.id} value={e.id}>Correct {e.kind}: {e.notes}</option>)}
      </select>
      <label htmlFor="pw-reason">Operator evidence / exception or correction reason (required)</label>
      <textarea id="pw-reason" maxLength={2000} disabled={busy || !!blocker} value={notes} onChange={e => { setNotes(e.target.value); setReview(null); setAck(false); }} />
      <button disabled={busy || !!blocker || !notes.trim()} onClick={() => void prepare()}>Prepare package action</button>
      {review && <div className="pw-evidence"><p>{review.label} · expected revision {review.revision}</p><p>Reason: {String(review.body.notes)}</p>
        <label><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} /> I confirm this package identity, physical packing evidence and the stated progress reset.</label>
        <button disabled={!ack || busy} onClick={() => { if (ack) void send(review); }}>Confirm and save package action</button></div>}
    </>}
    <p>Per-material packed quantity entry, material substitutions, picking, QC approval and dispatch are unavailable in this workspace. Scanner input only selects identity.</p>
  </section>;
}
