import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext';
import ProductLibrary, { type DraftKit } from './ProductLibrary';
import type { KitMaterial, KitPackingUnit, KitSubject } from '../../entity/ProductTemplateVersion';
import { materialQuantity, type StudioBundle, type StudioSnapshot } from './studioContract';
import { studioRead } from './studioRead';
import { StudioLifecycle } from './StudioLifecycle';
import { reviewTarget } from './studioReview';
import { Badge, Panel } from '../../design/precision/primitives';
import '../../design/precision/precision.css';
import './liveKitStudio.css';

const libraryUrl = '?tab=product_library';
const studioUrl = (id = '') => `${libraryUrl}&studio=${encodeURIComponent(id)}`;

export default function ProductLibrarySurface() {
  const { user, token } = useAuth();
  // Clear on account, tenant, role or sign-out changes; token renewal preserves pending edits.
  return <StudioSession key={`${user?.id}:${user?.organization_id}:${user?.role}:${Boolean(token)}`} />;
}
function StudioSession() {
  const requested = new URLSearchParams(window.location.search).has('studio');
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    studioRead<{ enabled: boolean }>('/studio-access', controller.signal)
      .then(result => { if (!controller.signal.aborted) setEnabled(result.enabled); }).catch(() => {})
      .finally(() => clearTimeout(timer));
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  if (requested) return <LiveKitStudio />;
  return <>{enabled && <a className="inline-flex min-h-11 items-center mb-4 text-indigo-700 dark:text-indigo-300 underline" href={studioUrl()}>Open Kit Studio</a>}<ProductLibrary /></>;
}

function MaterialList({ materials, packing, owner }: { materials?: KitMaterial[]; packing?: KitPackingUnit[]; owner: string }) {
  if (!materials) return <p className="p-muted">Material requirements unavailable.</p>;
  if (!materials.length) return <p className="p-muted">No materials configured for this owner.</p>;
  function locations(id: string, units: KitPackingUnit[] = [], parent = ''): string[] {
    return units.flatMap(unit => {
      const path = `${parent}${unit.name || unit.kind}`;
      return [...(unit.inventory_item_ids.includes(id) ? [path] : []), ...locations(id, unit.children ?? [], `${path} / `)];
    });
  }
  return <ul className="live-materials">{materials.map(material => <li key={material.id} id={reviewTarget(material.id)} tabIndex={-1}>
    <strong>{material.item_name || 'Material name unavailable'}</strong>
    <span>{materialQuantity(material)}</span>
    <small>Owner: {owner} · Item: {material.inventory_item_id || 'Unavailable'}</small>
    <small>{packing ? `Packing: ${locations(material.inventory_item_id, packing).join('; ') || 'Mapping unavailable'}` : 'Packing-location mapping unavailable for crate materials'}</small>
    {(material.optional || material.reusable) && <small>{material.optional ? 'Optional ' : ''}{material.reusable ? 'Reusable/shared equipment' : ''}</small>}
    {material.notes && <p>{material.notes}</p>}
  </li>)}</ul>;
}
function PackingTree({ units, subjects }: { units: KitPackingUnit[]; subjects: KitSubject[] }) {
  return <ul className="live-tree">{units.map(unit => <li key={unit.id} id={reviewTarget(unit.id)} tabIndex={-1}>
    <strong>{unit.name || 'Unnamed unit'}</strong> · {unit.kind} {unit.code && `· ${unit.code}`}
    <p>Activities: {unit.activity_ids.map(id => subjects.flatMap(subject => subject.grades).flatMap(grade => grade.activities ?? []).find(activity => activity.id === id)?.name ?? `Unavailable (${id})`).join('; ') || 'No activity mappings'}</p>
    <p>Material mappings: {unit.inventory_item_ids.map(id => unit.inventory_labels?.[id] ? `${unit.inventory_labels[id]} (${id})` : `Name unavailable (${id})`).join('; ') || 'No material mappings'}</p>
    {unit.notes && <p>{unit.notes}</p>}
    {!!unit.children?.length && <PackingTree units={unit.children} subjects={subjects} />}
  </li>)}</ul>;
}
export function StudioContent({ snapshot }: { snapshot: Pick<StudioSnapshot, 'subjects'> }) {
  if (!snapshot.subjects) return <p role="status">Educational structure unavailable.</p>;
  if (!snapshot.subjects.length) return <p id={reviewTarget('structure')} tabIndex={-1} role="status">This kit is empty. No subjects or grades configured.</p>;
  return <div className="live-columns" id={reviewTarget('structure')} tabIndex={-1}>
    <Panel title="Education & material requirements"><div className="live-pad">
      {snapshot.subjects.map(subject => <section key={subject.id} className="live-subject"><h3>{subject.name || 'Subject name unavailable'}</h3>
        {!subject.grades.length && <p>No grades configured.</p>}
        {subject.grades.map(grade => <details key={grade.id} id={reviewTarget(grade.id)} tabIndex={-1} open><summary>{grade.name || 'Grade name unavailable'}</summary>
          {!grade.activities && <p>Activities unavailable.</p>}
          {grade.activities?.length === 0 && <p>No educational activities configured.</p>}
          {grade.activities?.map(activity => <details key={activity.id} id={reviewTarget(activity.id)} tabIndex={-1} className="live-activity" open><summary>{activity.code ? `${activity.code} · ` : ''}{activity.name || 'Activity name unavailable'}</summary>
            {activity.description && <p>{activity.description}</p>}{activity.instructions && <p>{activity.instructions}</p>}
            <MaterialList materials={activity.materials} packing={grade.packing} owner={activity.name} />
          </details>)}
        </details>)}
      </section>)}
    </div></Panel>
    <div className="live-stack"><Panel title="Physical packaging & mappings"><div className="live-pad">
      {snapshot.subjects.map(subject => <section key={subject.id}><h3>{subject.name}</h3>{subject.grades.map(grade => <details key={grade.id} open><summary>{grade.name}</summary>
        {grade.packing?.length ? <PackingTree units={grade.packing} subjects={snapshot.subjects!} /> : <p>{grade.packing ? 'No physical units configured.' : 'Physical packaging unavailable.'}</p>}
      </details>)}</section>)}
    </div></Panel>
    <Panel title="Shared materials & quantity rules"><div className="live-pad">
      <p className="p-muted">Persisted rule definitions below. Calculated quantity traces unavailable: this template read has no confirmed site/set context. No quantities are inferred.</p>
      {snapshot.subjects.map(subject => <section key={subject.id}><h3>{subject.name}</h3>
        {!subject.crates && <p>Crate definitions unavailable.</p>}{subject.crates?.length === 0 && <p>No shared crates configured.</p>}
        {subject.crates?.map(crate => <details key={crate.id} id={reviewTarget(crate.id)} tabIndex={-1} open><summary>{crate.name} · {crate.kind} crate</summary>
          <p>Rule: {crate.rule.kind}</p>
          {'quantity' in crate.rule ? <p>Configured rule quantity: {crate.rule.quantity}</p> : <ul>{crate.rule.components.map(component => <li key={component.grade_id}>{snapshot.subjects?.find(s => s.id === component.subject_id)?.name ?? 'Subject unavailable'} / {snapshot.subjects?.flatMap(s => s.grades).find(g => g.id === component.grade_id)?.name ?? 'Grade unavailable'} · {component.quantity}</li>)}</ul>}
          {crate.rule.kind === 'complete_sets' && <p>Requires explicit complete-set confirmation; unavailable here.</p>}
          {crate.notes && <p>{crate.notes}</p>}
          <MaterialList materials={crate.materials} owner={crate.name} />
        </details>)}
      </section>)}
    </div></Panel></div>
  </div>;
}

function LiveKitStudio() {
  const templateId = new URLSearchParams(window.location.search).get('studio') ?? '';
  const [kits, setKits] = useState<StudioSnapshot[]>([]);
  const [bundle, setBundle] = useState<StudioBundle | null>(null);
  const [selected, setSelected] = useState('draft');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [generation, setGeneration] = useState(0);
  const [editing, setEditing] = useState<DraftKit | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    setLoading(true); setError(''); setBundle(null); setKits([]); setSelected('draft');
    const load = templateId ? studioRead<StudioBundle>(`/${encodeURIComponent(templateId)}/studio`, controller.signal).then(result => { if (!controller.signal.aborted) setBundle(result); })
      : studioRead<StudioSnapshot[]>('/studio', controller.signal).then(result => { if (!controller.signal.aborted) setKits(result); });
    load.catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Live data unavailable.'); })
      .finally(() => { clearTimeout(timer); if (!controller.signal.aborted) setLoading(false); });
    const timeout = () => { setError('Request timed out. Check the connection and retry.'); setLoading(false); };
    controller.signal.addEventListener('abort', timeout, { once: true });
    const stale = () => setNotice('Data may be stale after leaving this page. Refresh to check the current revision.');
    const offline = () => { controller.signal.removeEventListener('abort', timeout); controller.abort(); clearTimeout(timer); setLoading(false); setBundle(null); setKits([]); setError('Offline. Live data unavailable; reconnect and retry.'); };
    window.addEventListener('focus', stale); window.addEventListener('offline', offline);
    return () => { controller.signal.removeEventListener('abort', timeout); controller.abort(); clearTimeout(timer); window.removeEventListener('focus', stale); window.removeEventListener('offline', offline); };
  }, [templateId, generation]);
  const snapshot = selected === 'draft' ? bundle?.draft : selected.startsWith('revision:')
    ? bundle?.history.find(row => `revision:${row.id}` === selected) : bundle?.approved.find(row => row.id === selected);
  function refresh() {
    setNotice(bundle ? `Previous draft revision ${bundle.draft.revision}. Refreshed data replaces it only after loading; reselect any historical snapshot.` : 'Loading current live data.');
    setGeneration(value => value + 1);
  }
  return <section className="precision live-studio" data-theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'} aria-labelledby="studio-title">
    <header className="live-header"><div><p className="p-muted">PRECISION OPERATIONS · DEVELOPMENT REVIEW</p><h1 id="studio-title">Kit Studio</h1><p>{editing ? 'Editing draft · Explicit save required' : 'Viewing saved data'}</p></div>
      <nav aria-label="Kit Studio navigation"><a href={libraryUrl}>Return to existing Kit Builder</a>{templateId && <a href={studioUrl()}>All kits</a>}<button type="button" disabled={loading || !!editing} onClick={refresh}>Refresh live data</button></nav>
    </header>
    {notice && <p role="status" className="live-notice">{notice}</p>}
    {error && <p role="alert" className="live-notice">{error}</p>}
    {editing && <ProductLibrary studio={{ draft: editing, onClose: () => { setEditing(null); refresh(); } }} />}
    {!editing && <div role="region" aria-busy={loading} aria-label="Live kit data">
      {loading ? <div role="status"><p>Loading live Kit Studio…</p><div className="live-skeleton" aria-hidden="true" /><div className="live-skeleton" aria-hidden="true" /></div> : !error && <>
        {!templateId && (kits.length ? <ul className="live-catalog">{kits.map(kit => <li key={kit.id}><a href={studioUrl(kit.template_id)}><strong>{kit.name}</strong><span>Draft · version {kit.version_number} · revision {kit.revision}</span></a></li>)}</ul> : <p role="status">No persisted kits in this organization.</p>)}
        {bundle && <><div className="live-toolbar"><div><h2>{bundle.draft.name}</h2><p>Template {bundle.draft.template_id}</p><Badge>Read-only</Badge></div>
          <label>Saved snapshot<select value={selected} onChange={event => setSelected(event.target.value)}>
            <option value="draft">Current draft · v{bundle.draft.version_number} · revision {bundle.draft.revision}</option>
            {bundle.history.map(row => <option key={row.id} value={`revision:${row.id}`}>Saved draft revision {row.revision} · {row.created_at}</option>)}
            {bundle.approved.map(row => <option key={row.id} value={row.id}>Approved immutable version {row.version_number} · revision {row.revision}</option>)}
          </select></label>
          {bundle.canEdit && selected === 'draft' && bundle.draft.status === 'draft' && bundle.draft.subjects && <button type="button" onClick={() => setEditing(bundle.draft)}>Edit draft</button>}</div>
          {selected !== 'draft' && bundle.canEdit && <button type="button" onClick={() => setEditing(bundle.draft)}>Continue current draft · revision {bundle.draft.revision}</button>}
          <p className="live-notice">History: latest 50 draft snapshots{!bundle.history.length ? ' — unavailable' : ''}. {!bundle.approved.length ? 'No approved snapshots returned.' : 'Approved snapshots retain their own content.'}</p>
      {snapshot && 'template_id' in snapshot && <div key={`${snapshot.id}:${snapshot.revision}:${generation}`}><StudioLifecycle bundle={bundle} snapshot={snapshot} onApproved={() => { setNotice('Approval confirmed by server. Loading approved history.'); setGeneration(value => value + 1); }} /></div>}
          {snapshot ? <><p className="live-meta">Snapshot: {snapshot.name} · {snapshot.status} · revision {snapshot.revision} · {'version_id' in snapshot ? snapshot.version_id : snapshot.id}</p><StudioContent snapshot={snapshot} /></> : <p role="status">Selected snapshot unavailable. No draft substitution.</p>}
        </>}
      </>}
    </div>}
  </section>;
}
