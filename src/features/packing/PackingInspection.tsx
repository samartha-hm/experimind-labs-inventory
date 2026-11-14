import React from 'react';
import { qcChecks, type PackingDetail, type PackageProgress } from './packingTypes';

/** Snapshot provenance only: unchanged snapshots are not new inspection attempts. */
export function inspectionSnapshot(snapshot: unknown, packageId: string): Partial<PackageProgress> | undefined {
  if (!snapshot || typeof snapshot !== 'object' || !('execution' in snapshot)) return;
  const execution = snapshot.execution;
  if (!execution || typeof execution !== 'object' || !('progress' in execution)) return;
  const progress = execution.progress;
  if (!progress || typeof progress !== 'object' || !(packageId in progress)) return;
  const value = (progress as Record<string, unknown>)[packageId];
  if (!value || typeof value !== 'object' || !('qc' in value) || !['pending', 'accepted', 'rejected'].includes(String(value.qc))) return;
  return value as Partial<PackageProgress>;
}

export function PackingInspection({ detail, selected }: { detail: PackingDetail; selected: string }) {
  const progress = detail.order.execution.progress[selected];
  const state = (p?: Partial<PackageProgress>) => p?.qc === 'accepted' ? 'Pass · accepted by server' : p?.qc === 'rejected' ? 'Fail · rejected by server' : 'Needs attention · inspection pending';
  return <section aria-label="Package inspection evidence">
    <h4>Package inspection</h4><p>Rejection requires admin, super_admin, manager or inventory_staff permission and an assembled, unaccepted package tree.</p><p>{state(progress)}</p>
    <p>Recorded inspector ID: {progress?.checked_by || 'Not recorded'} · inspection time: {progress?.checked_at || 'Not recorded'}</p>
    <ul>{qcChecks.map(c => <li key={c}>{c}: {typeof progress?.checks?.[c] !== 'boolean' ? 'Needs attention · no recorded result' : progress.checks[c] ? 'Recorded pass' : 'Recorded fail'}</li>)}</ul>
    <p>{progress?.notes || 'No current package reason recorded.'}</p>
    <button disabled>Final QC acceptance unavailable</button><p>Acceptance can automatically make an order ready. That transition requires further review. Passing individual checks does not approve QC.</p>
    <details><summary>Inspection provenance · latest 100 order snapshots</summary>
      <p>Snapshots may repeat unchanged evidence; these are not a complete list of inspection attempts. Event actor and recorded inspector can differ.</p>
      {detail.history.map(h => { const p = inspectionSnapshot(h.snapshot, selected); return p && <article key={h.revision}><h5>Order revision {h.revision} · {state(p)}</h5><p>Snapshot event actor {h.actor_id} · {h.created_at}</p><p>Recorded inspector {p.checked_by || 'Not recorded'} · {p.checked_at || 'Not recorded'} · reason: {p.notes || 'Not recorded'}</p><ul>{qcChecks.map(c => <li key={c}>{c}: {typeof p.checks?.[c] !== 'boolean' ? 'No recorded result' : p.checks[c] ? 'Pass' : 'Fail'}</li>)}</ul></article>; })}
    </details>
  </section>;
}
