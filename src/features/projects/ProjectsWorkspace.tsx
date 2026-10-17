import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../AuthContext';
import { apiFetch } from '../../utils/api';
import { requirementRows, type ProjectsWorkspaceDetail } from './projectsWorkspaceContract';
import type { PlanningContent, PlanningView } from './planningTypes';
import { ProjectStages } from './ProjectStages';
import '../../design/precision/precision.css';
import './projectsWorkspace.css';
const root = '/api/v1/planning-projects';
export function ProjectsWorkspaceEntry({ children, direct = false }: { children?: React.ReactNode; direct?: boolean }) {
  const { currentUser } = useAuth();
  const [enabled, setEnabled] = useState(false), [open, setOpen] = useState(direct);
  useEffect(() => { let live = true; setEnabled(false); void apiFetch(`${root}/workspace-access`).then((v: { enabled: boolean }) => { if (live) setEnabled(v.enabled); }).catch(() => { if (live) setEnabled(false); }); return () => { live = false; }; }, [currentUser?.id, currentUser?.organization_id]);
  return <>{enabled && <button className="min-h-12 rounded-xl border px-4 py-3 mb-3" onClick={() => setOpen(v => !v)}>{open ? 'Return to legacy Projects' : 'Open Projects / Schools workspace'}</button>}{enabled && open ? <ProjectsWorkspace key={`${currentUser?.id}:${currentUser?.organization_id}`} /> : children}{direct && !enabled && <p role="status">Projects workspace unavailable. Legacy Projects remains available.</p>}</>;
}
export function ProjectsWorkspace() {
  const [projects, setProjects] = useState<Pick<PlanningView, 'id' | 'name' | 'client' | 'revision'>[]>([]);
  const [detail, setDetail] = useState<ProjectsWorkspaceDetail>(), [projectSearch, setProjectSearch] = useState(''), [schoolSearch, setSchoolSearch] = useState('');
  const [subject, setSubject] = useState(''), [materialSearch, setMaterialSearch] = useState(''), [shortages, setShortages] = useState(false);
  const [historical, setHistorical] = useState<number>(), [school, setSchool] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [stamp, setStamp] = useState('');
  const generation = useRef(0), title = useRef<HTMLHeadingElement>(null);
  async function load(id?: string) {
    const sameProject = !!id && detail?.project.id === id;
    const request = ++generation.current; setBusy(true); setError('');
    if (!sameProject) { setDetail(undefined); setSchool(''); setHistorical(undefined); }
    try {
      const list = await apiFetch(`${root}/workspace/projects`);
      const result = id ? await apiFetch(`${root}/workspace/projects/${id}`) as ProjectsWorkspaceDetail : undefined;
      if (request !== generation.current) return;
      setProjects(list); setDetail(result); setStamp(new Date().toLocaleTimeString());
      if (result && historical !== undefined && !result.history.some(h => h.revision === historical)) setHistorical(undefined);
      if (result && !sameProject) { setSchoolSearch(''); setSubject(''); setMaterialSearch(''); setShortages(false); }
    } catch (e) { if (request === generation.current) { setProjects([]); setError(e instanceof Error ? e.message : 'Project evidence unavailable'); } }
    finally { if (request === generation.current) setBusy(false); }
  }
  useEffect(() => { void load(); return () => { generation.current++; }; }, []);
  useEffect(() => { if (detail) title.current?.focus(); }, [detail]);
  const project = detail?.project;
  const content: PlanningContent | undefined = historical === undefined ? project : detail?.history.find(h => h.revision === historical)?.content;
  const rows = content && detail ? requirementRows(content, detail.versions) : [];
  const schools = content?.sites.filter(s => `${s.name} ${s.location} ${s.address}`.toLowerCase().includes(schoolSearch.toLowerCase()) && (!subject || rows.some(r => r.site === s.id && r.subject === subject))) ?? [];
  const materials = detail?.preview.materials.filter(m => `${m.name} ${m.unit}`.toLowerCase().includes(materialSearch.toLowerCase()) && (!shortages || (m.immediate_shortage !== null && m.immediate_shortage > 0))) ?? [];
  return <section className="precision projects-workspace" aria-label="Projects and Schools workspace" aria-busy={busy} data-theme={typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'}>
    <header className="pj-header"><div><p className="pj-eyebrow">Precision Operations · Read-only authorized records</p><h2 ref={title} tabIndex={-1}>{project?.name || 'Projects & Schools'}</h2><p>{project ? `${project.client || 'Client not recorded'} · project revision ${project.revision} · ${project.id}` : 'School requirements, material context and independent operational evidence.'}</p></div><button disabled={busy} onClick={() => void load(project?.id)}>Refresh records</button></header>
    <p role="status">{busy ? 'Loading project evidence…' : `Last loaded ${stamp || 'not yet'}. No actions in this workspace change records.`}</p>{error && <p role="alert" className="pj-error">Unable to load authorized records: {error}. Refresh or return to legacy Projects.</p>}
    <div className="pj-layout"><aside className="pj-card" aria-label="Project navigation"><label htmlFor="pj-search">Search projects</label><input id="pj-search" value={projectSearch} onChange={e => setProjectSearch(e.target.value)} /><p>Latest 200 active projects. Search filters loaded records.</p><div className="pj-projects">{projects.filter(p => `${p.name} ${p.client}`.toLowerCase().includes(projectSearch.toLowerCase())).map(p => <button key={p.id} disabled={busy} aria-current={project?.id === p.id ? 'true' : undefined} onClick={() => void load(p.id)}>{p.name}<small>{p.client || 'No client'} · r{p.revision}</small></button>)}</div>{!busy && !projects.length && !error && <p>No authorized active projects.</p>}</aside>
    <div className="pj-detail">{!project || !detail || !content ? <div className="pj-card"><h3>Select a project</h3><p>Choose an authorized project to view its schools and persisted requirement revision.</p></div> : <>
      <section className="pj-card" aria-label="Requirement provenance"><h3>Requirements and provenance</h3><p>{project.sites.length} schools · {project.sites.reduce((n, s) => n + s.selections.length, 0)} kit selections. These are saved allocations to approved kit versions. The API has no independent school requirement draft/approval status.</p>
        <label htmlFor="pj-revision">Requirement revision</label><select id="pj-revision" value={historical ?? 'current'} onChange={e => { setHistorical(e.target.value === 'current' ? undefined : Number(e.target.value)); setSchool(''); }}><option value="current">Current saved project revision {project.revision}</option>{detail.history.map(h => <option key={h.revision} value={h.revision}>Snapshot r{h.revision} · {h.created_at}</option>)}</select>
        <p>Latest 50 project snapshots. Historical requirements are displayed as saved; demand and stage evidence below are only available for the current revision.</p>{historical !== undefined && <p className="pj-notice">Viewing historical revision {historical}. Kit labels may be unavailable for versions no longer selected in the current project.</p>}
        <details><summary>Kit approvals and source draft provenance</summary>{detail.versions.map(v => { const a = detail.approvals.find(a => a.version_id === v.id); return <article key={v.id}><h4>{v.name} · approved v{v.version_number}</h4><p>Immutable version {v.id}</p><p>{a ? `Approved by ${a.approved_by} at ${a.approved_at}. Source draft ${a.source_version_id}, revision ${a.source_revision}.` : 'Approval provenance unavailable.'}</p><p>Current draft edits are independent and are not school requirements.</p></article>; })}</details>
        <details><summary>Requirement revision actors</summary>{detail.history.map(h => <p key={h.revision}>r{h.revision} · actor {h.updated_by} · {h.created_at}{h.archived ? ' · archived snapshot' : ''}</p>)}</details>
      </section>
      <section className="pj-card" aria-label="School requirements matrix"><h3>School requirements matrix</h3><div className="pj-filters"><div><label htmlFor="pj-school">Find school or destination</label><input id="pj-school" value={schoolSearch} onChange={e => setSchoolSearch(e.target.value)} /></div><div><label htmlFor="pj-subject">Subject</label><select id="pj-subject" value={subject} onChange={e => setSubject(e.target.value)}><option value="">All subjects</option>{[...new Set(rows.map(r => r.subject))].map(s => <option key={s}>{s}</option>)}</select></div></div><p role="status">{schools.length} matching schools</p><p>Legend: saved quantities are requested sets; approved refers to the kit version; unknown means no evidence. Operational states are separate and do not imply project readiness.</p>
        {schools.map(s => <details key={`${historical}:${s.id}`} className="pj-school" open={school === s.id} onToggle={e => { if (e.currentTarget.open) setSchool(s.id); else setSchool(v => v === s.id ? '' : v); }}><summary>{s.name} · {s.selections.length} kit selections · {s.location || 'Location not recorded'}</summary><p>School {s.id} · destination {s.address || 'Not recorded'} · contact {s.contact || 'Not recorded'}</p><p>Schedule: {s.schedule || 'Not recorded'} · fulfillment notes: {s.fulfillment || 'Not recorded'}</p><table><caption>Saved subject and grade requests · {s.name}</caption><thead><tr><th scope="col">Kit version</th><th scope="col">Subject / grade</th><th scope="col">Requested sets</th><th scope="col">Explicit complete sets</th></tr></thead><tbody>{rows.filter(r => r.site === s.id && (!subject || r.subject === subject)).map((r, i) => <tr key={`${r.selection}:${i}`}><td data-label="Kit">{r.kit}</td><td data-label="Subject / grade">{r.subject} / {r.grade}</td><td data-label="Requested sets">{r.quantity ?? 'Unknown / not provided'}</td><td data-label="Complete sets">{r.complete ?? 'Not confirmed'}</td></tr>)}</tbody></table>{!s.selections.length && <p>No kit requirements saved for this school.</p>}
          {school === s.id && historical === undefined && <><details><summary>Server-calculated school requirement trace</summary>{detail.preview.lines.filter(l => l.site_id === s.id).map((l, i) => <p key={i}>{l.template_name} v{l.version_number} · {l.subject_name} {l.grade_name} · {l.owner_name}: {l.quantity} {l.unit} · multiplier {l.multiplier} · {l.basis}{l.override_scope ? ` · ${l.override_scope} override` : ''} · selection {l.selection_id}</p>)}</details><ProjectStages key={`${project.id}:${s.id}:${project.revision}:${stamp}`} project={project.id} site={s.id} revision={project.revision} /></>}
        </details>)}{!schools.length && <p>No schools match these filters.</p>}
      </section>
      {historical === undefined && <section className="pj-card" aria-label="Material demand and shortages"><h3>Material context · current revision {detail.preview.revision}</h3><p>Derived by the existing requirement service. Stock without verification remains unknown. Quantities retain their units; no cross-unit totals.</p>{detail.preview.warnings.map((w, i) => <p className="pj-notice" key={i}>{w}</p>)}<label htmlFor="pj-material">Search materials</label><input id="pj-material" value={materialSearch} onChange={e => setMaterialSearch(e.target.value)} /><label className="pj-check"><input type="checkbox" checked={shortages} onChange={e => setShortages(e.target.checked)} /> Only known immediate shortages</label><p>{materials.length} matching material lines</p><div className="pj-materials">{materials.map(m => <article key={`${m.inventory_item_id}:${m.unit}`}><h4>{m.name}</h4><dl>{Object.entries({ 'Gross demand': m.gross_demand, 'Verified on-hand': m.verified_on_hand, 'Available to promise': m.available_to_promise, 'Project reservations': m.project_reservations, 'Project incoming': m.project_incoming, 'Immediate shortage': m.immediate_shortage, 'Projected shortage': m.projected_shortage }).map(([label, n]) => <div key={label}><dt>{label}</dt><dd>{n == null ? 'Unknown / unverified' : `${n} ${m.unit}`}</dd></div>)}</dl></article>)}</div>{!materials.length && <p>No material lines match. Unknown shortages are excluded by the known-shortage filter.</p>}</section>}
    </>}</div></div>
  </section>;
}
