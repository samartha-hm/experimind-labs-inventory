import React, { useEffect, useState } from "react";
import type { KitSubject } from "../../entity/ProductTemplateVersion";
import { apiFetch } from "../../utils/api";
import { PackingEditor } from "./PackingEditor";
import { compareKitContent } from './revisionComparison';

interface Revision { id: string; revision: number; name: string; description: string; category: string; created_at: string; subjects: KitSubject[] }
export function RevisionHistory({ templateId, revision }: { templateId: string; revision: number }) {
  const [history, setHistory] = useState<Revision[]>([]);
  const [error, setError] = useState("");
  const [comparison, setComparison] = useState('');
  useEffect(() => {
    let active = true;
    setHistory([]); setError("");
    apiFetch(`/api/v1/product-templates/${templateId}/revisions`)
      .then((rows: Revision[]) => { if (active) setHistory(rows); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load revision history"); });
    return () => { active = false; };
  }, [templateId, revision]);
  const latest = history.find(row => row.revision === revision);
  const earlier = history.find(row => row.id === comparison);
  const content = (row: Revision) => ({ name: row.name, description: row.description, category: row.category, subjects: row.subjects });
  const changes = latest && earlier ? compareKitContent(content(earlier), content(latest)) : [];
  return <details className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
    <summary className="min-h-11 cursor-pointer font-semibold">Saved revision history</summary>
    <p className="text-sm text-slate-500">Latest 50 snapshots. Earlier revisions are read-only.</p>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {!history.length && !error && <p role="status">Loading revisions…</p>}
    {latest && <label>Compare an earlier revision with saved revision {revision}<select value={comparison} onChange={event => setComparison(event.target.value)}>
      <option value="">Select revision</option>{history.filter(row => row.revision !== revision).map(row => <option key={row.id} value={row.id}>Revision {row.revision} · {row.name}</option>)}
    </select></label>}
    {earlier && latest && <div className="revision-comparison" role="region" aria-label="Saved revision comparison" tabIndex={0}>
      <p>{changes.length} changed fields. Paths identify stable subject, grade, activity, material and packing IDs; order changes are included.</p>
      {changes.length > 0 && <table><caption>Revision {earlier.revision} compared with saved revision {revision}</caption><thead><tr><th scope="col">Field</th><th scope="col">Earlier</th><th scope="col">Saved</th></tr></thead><tbody>{changes.map(change => <tr key={change.path}><th scope="row">{change.path}</th><td>{change.before}</td><td>{change.after}</td></tr>)}</tbody></table>}
    </div>}
    {history.map(snapshot => <details key={snapshot.id} className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <summary className="min-h-11 cursor-pointer">Revision {snapshot.revision} · {snapshot.name} · {new Date(snapshot.created_at).toLocaleString()}</summary>
      {snapshot.subjects.map(subject => <section key={subject.id} className="space-y-3"><h3 className="font-semibold">{subject.name}</h3>
        {subject.grades.map(grade => <section key={grade.id} className="space-y-3"><h4 className="font-medium">{grade.name}</h4>
          {(grade.activities ?? []).map(activity => <p key={activity.id} className="text-sm">{activity.name}: {activity.materials.map(material => `${material.item_name} (${material.quantity} ${material.unit})`).join(", ") || "No materials"}</p>)}
          <PackingEditor units={grade.packing ?? []} activities={grade.activities ?? []} disabled onChange={() => {}} />
        </section>)}
      </section>)}
    </details>)}
  </details>;
}
