import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { StudioBundle, StudioSnapshot } from './studioContract';
import { reviewKit } from './studioReview';
import { compareKitContent } from './revisionComparison';
import { studioApprove } from './studioApprove';
import { StudioReadError } from './studioRead';
import { QuantityPreview } from './QuantityPreview';

export function StudioLifecycle({ bundle, snapshot, onApproved }: {
  bundle: StudioBundle; snapshot: StudioSnapshot; onApproved: () => void;
}) {
  const draft = snapshot.id === bundle.draft.id && snapshot.status === 'draft';
  const review = useMemo(() => reviewKit(snapshot.subjects ?? []), [snapshot]);
  const errors = review.issues.filter(issue => issue.severity === 'error');
  const approval = bundle.approvals?.find(row => row.version_id === snapshot.id);
  const alreadyApproved = bundle.approvals?.some(row => row.source_version_id === snapshot.id && row.source_revision === snapshot.revision);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [comparison, setComparison] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const baseline = bundle.approved.find(row => row.id === comparison);
  const changes = useMemo(() => baseline ? compareKitContent(
    { name: baseline.name, description: baseline.description, category: baseline.category, subjects: baseline.subjects },
    { name: snapshot.name, description: snapshot.description, category: snapshot.category, subjects: snapshot.subjects },
  ) : [], [baseline, snapshot]);
  useEffect(() => {
    if (!busy) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const guard = (event: MouseEvent) => { if (event.target instanceof Element && event.target.closest('a,button,select') && !dialog.current?.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); } };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', guard, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', guard, true); };
  }, [busy]);
  function close() { dialog.current?.close(); trigger.current?.focus(); }
  async function approve() {
    if (busy || blocked || !bundle.canEdit || !draft) return;
    setBusy(true); setError('');
    try {
      await studioApprove(snapshot.template_id, snapshot.revision);
      close(); onApproved();
    } catch (reason) {
      setBlocked(true); close();
      setError(reason instanceof StudioReadError ? `${reason.message} Refresh live data before another approval.` : 'Approval response unavailable. Refresh live data to check whether approval was recorded before retrying.');
    } finally { setBusy(false); }
  }
  function navigate(target: string) {
    const node = document.getElementById(target);
    if (!node) return;
    let parent = node.parentElement;
    while (parent) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
    if (node instanceof HTMLDetailsElement) node.open = true;
    node.scrollIntoView({ block: 'center' }); node.focus();
  }
  return <section className="live-review live-pad" aria-label="Lifecycle review" aria-busy={busy}>
    <h3>{draft ? 'Review saved draft' : 'Approved immutable snapshot'} · version {snapshot.version_number} · revision {snapshot.revision}</h3>
    <p>{review.subjects} subjects · {review.grades} grades · {review.activities} activities · {review.materials} material rows · {review.packing} packing locations</p>
    <p>{draft ? 'Draft changes remain separate from every approved snapshot. Approval copies this saved revision; the current draft remains editable.' : 'This approved content is read-only. Continue the current draft to prepare another approval; this snapshot stays unchanged.'}</p>
    {approval && <p>Approved {new Date(approval.approved_at).toLocaleString()} · Actor ID {approval.approved_by} · Source draft revision {approval.source_revision}</p>}
    {alreadyApproved && <p role="status">This saved draft revision already has an approved snapshot. Edit and save the draft to prepare a new revision.</p>}
    {draft && <>
      <p>{errors.length ? `${errors.length} blocking completeness errors` : 'No local completeness blockers'} · {review.issues.length - errors.length} informational warnings. The server revalidates content, inventory references, permissions and revision at approval.</p>
      {!!review.issues.length && <details><summary>Inspect completeness and packing guidance ({review.issues.length})</summary><ul>{review.issues.map((issue, index) => <li key={`${issue.target}-${index}`}><button type="button" onClick={() => navigate(issue.target)}>{issue.severity === 'error' ? 'Blocking' : 'Warning'}: {issue.message}</button></li>)}</ul></details>}
      <QuantityPreview subjects={snapshot.subjects ?? []} templateId={snapshot.template_id} revision={snapshot.revision} dirty={false} disabled={busy} />
      {bundle.canEdit ? <button ref={trigger} type="button" disabled={busy || blocked || !!errors.length || alreadyApproved} onClick={() => dialog.current?.showModal()}>Review and approve saved revision</button> : <p>Approval unavailable: this account or the Studio editing flag does not permit changes.</p>}
    </>}
    <p>Rejection, return-for-correction and creating a separate draft from an approved snapshot are unavailable in the existing API. Continue the current draft for corrections.</p>
    {error && <p role="alert">{error}</p>}
    <label>Compare an approved version with this snapshot<select value={comparison} disabled={busy} onChange={event => setComparison(event.target.value)}><option value="">Choose approved baseline</option>{bundle.approved.filter(row => row.id !== snapshot.id).map(row => <option key={row.id} value={row.id}>Approved version {row.version_number}</option>)}</select></label>
    {baseline && <div className="revision-comparison" role="region" aria-label="Approved version comparison" tabIndex={0}>{changes.length ? <table><caption>Approved version {baseline.version_number} → {draft ? 'current saved draft' : `approved version ${snapshot.version_number}`} ({changes.length} differences)</caption><thead><tr><th scope="col">Field</th><th scope="col">Approved baseline</th><th scope="col">Selected snapshot</th></tr></thead><tbody>{changes.map(change => <tr key={change.path}><th scope="row">{change.path}</th><td>{change.before}</td><td>{change.after}</td></tr>)}</tbody></table> : <p>No content differences.</p>}</div>}
    <dialog ref={dialog} aria-labelledby="approval-title" aria-describedby="approval-consequences" onCancel={event => { if (busy) event.preventDefault(); }}>
      <h2 id="approval-title">Approve {snapshot.name}?</h2>
      <p id="approval-consequences">Saved draft revision {snapshot.revision} becomes an immutable version available for project planning. The draft stays editable. Approval does not reserve, purchase, produce, dispatch or change stock.</p>
      <p>Check calculated requirements using your explicit site/set context before approval. Packing warnings are informational.</p>
      <div className="live-toolbar"><button type="button" autoFocus disabled={busy} onClick={close}>Cancel approval</button><button type="button" disabled={busy} onClick={() => void approve()}>{busy ? 'Approving…' : 'Confirm immutable approval'}</button></div>
    </dialog>
  </section>;
}
