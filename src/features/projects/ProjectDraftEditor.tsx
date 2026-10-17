import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../utils/api';
import type { ProductTemplateVersion } from '../../entity/ProductTemplateVersion';
import type { PlanningContent, PlanningSite, PlanningView } from './planningTypes';
import { planningContent, draftIssues } from './projectDraft';
import { SelectionQuantities } from './SelectionQuantities';

export function ProjectDraftEditor({ project, school, onSchool, onGuard, onSaved }: {
  project: PlanningView; school: string; onSchool: (id: string) => void;
  onGuard: (blocked: boolean) => void; onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<PlanningContent>(() => planningContent(project));
  const [versions, setVersions] = useState<ProductTemplateVersion[]>([]);
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const saving = useRef(false);
  useEffect(() => { setDraft(planningContent(project)); setUncertain(false); setError(''); }, [project]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(planningContent(project));
  const blocked = dirty || busy || uncertain;
  const issues = draftIssues(draft, versions);
  useEffect(() => {
    let live = true;
    void apiFetch('/api/v1/planning-projects/workspace/approved-kits').then((v: ProductTemplateVersion[]) => { if (live) setVersions(v); }).catch(() => { if (live) setError('Approved catalog unavailable. Reload before editing.'); });
    return () => { live = false; };
  }, []);
  useEffect(() => { onGuard(blocked); return () => onGuard(false); }, [blocked, onGuard]);
  useEffect(() => {
    if (!blocked) return;
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const leave = (e: Event) => { e.preventDefault(); setError('Unsaved or unresolved changes: save, or discard and reload before leaving this project.'); };
    window.addEventListener('beforeunload', unload); window.addEventListener('projects-workspace-leave', leave);
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener('projects-workspace-leave', leave); };
  }, [blocked]);
  function updateSite(id: string, change: Partial<PlanningSite>) {
    setDraft(d => ({ ...d, sites: d.sites.map(s => s.id === id ? { ...s, ...change } : s) }));
  }
  async function save() {
    if (saving.current || uncertain || !dirty || issues.length) return;
    saving.current = true; setBusy(true); setError('');
    try {
      await apiFetch(`/api/v1/planning-projects/workspace/projects/${project.id}`, { method: 'PUT', body: JSON.stringify({ ...draft, revision: project.revision }) });
      // Never retry a mutation after an ambiguous response; reconcile by reading.
      await onSaved();
    } catch (e) {
      setUncertain(true);
      setError(`${e instanceof Error ? e.message : 'Save failed'}. Local edits retained. Saving is blocked until you discard and reload the authoritative revision; the request may have committed. No automatic retry or merge.`);
    } finally { saving.current = false; setBusy(false); }
  }
  return <section className="pj-card pj-editor" aria-label="Draft project planning">
    <h3>Draft planning · based on saved r{project.revision}</h3>
    <p>Project {project.name} · {project.id}. Saved allocations reference immutable approved kits; this does not approve school requirements. All schools save together with one project revision check.</p>
    <p role="status">{busy ? 'Saving and reloading authoritative records…' : blocked ? 'Unsaved or unresolved changes. Navigation away is blocked; school switching retains all edits.' : 'Saved draft loaded. Blank quantities remain unknown; zero is explicit.'}</p>
    {error && <p role="alert" className="pj-error">{error}</p>}
    {!!issues.length && <div className="pj-notice" role="status"><p>Resolve before saving:</p><ul>{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></div>}
    <form onSubmit={e => { e.preventDefault(); void save(); }}>
      <fieldset disabled={busy || uncertain || !versions.length}><legend>Project draft fields</legend>
        <label>Project name<input required maxLength={200} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        <label>Client<input maxLength={200} value={draft.client} onChange={e => setDraft({ ...draft, client: e.target.value })} /></label>
        <label>Planning notes<textarea maxLength={5000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></label>
        <label>Find draft school<input value={filter} onChange={e => setFilter(e.target.value)} /></label>
        <nav aria-label="Draft school navigation" className="pj-draft-schools">{draft.sites.filter(s => s.name.toLowerCase().includes(filter.toLowerCase())).map(s => <button key={s.id} type="button" aria-current={school === s.id ? 'true' : undefined} onClick={() => onSchool(s.id)}>{s.name || 'Unnamed school'} · {s.selections.length} kits</button>)}</nav>
        <button type="button" disabled={draft.sites.length >= 100} onClick={() => {
          const id = crypto.randomUUID(); setDraft({ ...draft, sites: [...draft.sites, { id, name: '', address: '', location: '', contact: '', notes: '', schedule: '', fulfillment: '', selections: [] }] }); onSchool(id);
        }}>Add draft school</button>
        {draft.sites.filter(s => s.id === school).map(site => <section key={site.id} aria-label="Selected draft school">
          <h4>Editing {site.name || 'Unnamed school'} · {site.id}</h4>
          {(['name', 'address', 'location', 'contact', 'schedule', 'fulfillment', 'notes'] as const).map(field => <label key={field}>School {field}<input required={field === 'name'} maxLength={{ name: 200, address: 2000, location: 500, contact: 1000, schedule: 1000, fulfillment: 2000, notes: 5000 }[field]} value={site[field]} onChange={e => updateSite(site.id, { [field]: e.target.value })} /></label>)}
          {site.selections.map(selection => {
            const version = versions.find(v => v.id === selection.version_id);
            return <article key={selection.id}><h4>{version?.name || 'Unavailable kit'} · approved v{version?.version_number} · selection {selection.id}</h4><p>Immutable kit {selection.version_id}. Additional selections add demand. Replacing or removing saved selections is unavailable here; use legacy Projects after saving or discarding this draft.</p>
              {version && <SelectionQuantities preserveUnknown subjects={version.subjects} value={selection.context} onChange={context => updateSite(site.id, { selections: site.selections.map(s => s.id === selection.id ? { ...s, context } : s) })} />}
            </article>;
          })}
          <label>Add approved kit revision<select value="" onChange={e => {
            if (!e.target.value) return;
            updateSite(site.id, { selections: [...site.selections, { id: crypto.randomUUID(), version_id: e.target.value, context: { grade_quantities: {} } }] });
          }}><option value="">Choose immutable approved revision</option>{versions.map(v => <option key={v.id} value={v.id}>{v.name} · approved v{v.version_number} · {v.id}</option>)}</select></label>
        </section>)}
      </fieldset>
      <div className="pj-filters"><button type="submit" disabled={!dirty || busy || uncertain || !!issues.length}>Save draft changes</button><button type="button" disabled={busy} onClick={() => void onSaved().catch(() => setError('Reload failed. Local draft retained.'))}>Discard local edits and reload saved revision</button></div>
    </form>
    <p>Material demand below describes saved r{project.revision}, not unsaved edits. Save and reload to calculate authoritative demand. No stock or operational records are created.</p>
  </section>;
}
