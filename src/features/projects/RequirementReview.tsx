import React, { useState } from 'react';
import type { ProjectsWorkspaceDetail } from './projectsWorkspaceContract';
import type { PlanningContent } from './planningTypes';

export interface RequirementChange { field: string; before: string; after: string }
const display = (value: unknown): string => value === undefined ? 'Not recorded' : JSON.stringify(value);
/** Compare persisted evidence only. ID-keyed collections avoid attributing another school's changes. */
export function requirementChanges(before: unknown, after: unknown, field = ''): RequirementChange[] {
  if (Object.is(before, after)) return [];
  if ((Array.isArray(before) || before === undefined) && (Array.isArray(after) || after === undefined) && (Array.isArray(before) || Array.isArray(after))) {
    const oldValues: unknown[] = Array.isArray(before) ? before : [], newValues: unknown[] = Array.isArray(after) ? after : [];
    const hasId = (value: unknown): value is Record<string, unknown> & { id: string } => !!value && typeof value === 'object' && 'id' in value && typeof value.id === 'string';
    if (oldValues.every(hasId) && newValues.every(hasId) && before !== undefined && after !== undefined) {
      const old = new Map(oldValues.map(v => [v.id, v])), current = new Map(newValues.map(v => [v.id, v]));
      return [...new Set([...old.keys(), ...current.keys()])].flatMap(id => requirementChanges(old.get(id), current.get(id), `${field} / ${id}`));
    }
  } else if ((before === undefined || (before && typeof before === 'object' && !Array.isArray(before))) && (after === undefined || (after && typeof after === 'object' && !Array.isArray(after)))) {
    const old = (before ?? {}) as Record<string, unknown>, current = (after ?? {}) as Record<string, unknown>;
    return [...new Set([...Object.keys(old), ...Object.keys(current)])].flatMap(key => requirementChanges(old[key], current[key], field ? `${field} / ${key}` : key));
  }
  return display(before) === display(after) ? [] : [{ field, before: display(before), after: display(after) }];
}

export function RequirementReview({ detail, content, revision, school }: {
  key?: string; detail: ProjectsWorkspaceDetail; content: PlanningContent; revision: number; school: string;
}) {
  const candidates = detail.history.filter(h => h.revision < revision);
  const [baseline, setBaseline] = useState<number>();
  const previous = candidates.find(h => h.revision === baseline) ?? candidates[0];
  const snapshot = detail.history.find(h => h.revision === revision);
  const selected = content.sites.find(s => s.id === school);
  const oldSchool = previous?.content.sites.find(s => s.id === school);
  const changes = previous && selected ? requirementChanges(oldSchool, selected, 'School') : [];
  const header = ({ sites: _sites, ...value }: PlanningContent) => value;
  const projectChanges = previous ? requirementChanges(header(previous.content), header(content)) : [];
  const schoolChanges = previous ? requirementChanges(previous.content.sites, content.sites, 'Schools') : [];
  return <section className="pj-card" aria-label="Saved requirement review">
    <h3>Saved requirement review · r{revision}</h3>
    <p className="pj-notice">Requirement approval unavailable: no project or school approval contract exists. Saving records allocations; it does not approve school requirements or authorize execution.</p>
    <p>Project {detail.project.id} · saved revision {revision}. Unsaved editor changes are excluded from this review.</p>
    <p>{snapshot ? `Saved by ${snapshot.updated_by} at ${snapshot.created_at}.` : 'Revision actor evidence unavailable.'} Approved kit snapshots and their approval actors are listed in provenance above.</p>
    <p>Validation: this saved revision passed the planning service when saved. Current revision demand and stock warnings appear below; historical demand is unavailable. Stock, reservations, purchasing, production and packing need their own current validation.</p>
    {previous ? <>
      <label htmlFor="pj-review-baseline">Compare saved revision {revision} with</label>
      <select id="pj-review-baseline" value={previous.revision} onChange={e => setBaseline(Number(e.target.value))}>
        {candidates.map(h => <option key={h.revision} value={h.revision}>r{h.revision} · {h.created_at}</option>)}
      </select>
      <p>Baseline r{previous.revision} · saved by {previous.updated_by} at {previous.created_at}. Latest 50 snapshots only.</p>
      <p role="status">{selected ? `${selected.name} · school ${selected.id} · ${changes.length} changed fields` : 'Select a school in the requirements matrix to compare its saved requirements.'}</p>
      {selected && <ChangeTable changes={changes} caption={`School changes · r${previous.revision} to r${revision}`} />}
      <details><summary>All school changes, including removed schools ({schoolChanges.length})</summary><ChangeTable changes={schoolChanges} caption={`All school changes · r${previous.revision} to r${revision}`} /></details>
      <details><summary>Project metadata and default override changes ({projectChanges.length})</summary><ChangeTable changes={projectChanges} caption={`Project changes · r${previous.revision} to r${revision}`} /></details>
    </> : <p>No earlier saved revision is available for comparison.</p>}
    <p>Rejection, return for correction and revision cloning are unavailable. Review does not change records.</p>
  </section>;
}

function ChangeTable({ changes, caption }: { changes: RequirementChange[]; caption: string }) {
  const [expanded, setExpanded] = useState(false);
  return <>{changes.length ? <>
    <table><caption>{caption}</caption><thead><tr><th scope="col">Field / identity</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>
      {(expanded ? changes : changes.slice(0, 50)).map(change => <tr key={change.field}><td data-label="Field / identity">{change.field}</td><td data-label="Before">{change.before}</td><td data-label="After">{change.after}</td></tr>)}
    </tbody></table>
    {changes.length > 50 && <button onClick={() => setExpanded(v => !v)}>{expanded ? 'Show first 50 changes' : `Show all ${changes.length} changes`}</button>}
  </> : <p>No saved field changes.</p>}</>;
}
