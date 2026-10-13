import React, { useEffect, useState } from "react";
import type { KitSubject } from "../../entity/ProductTemplateVersion";
import { apiFetch } from "../../utils/api";
import { PackingEditor } from "./PackingEditor";

interface Revision { id: string; revision: number; name: string; created_at: string; subjects: KitSubject[] }
export function RevisionHistory({ templateId, revision }: { templateId: string; revision: number }) {
  const [history, setHistory] = useState<Revision[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setHistory([]); setError("");
    apiFetch(`/api/v1/product-templates/${templateId}/revisions`)
      .then((rows: Revision[]) => { if (active) setHistory(rows); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load revision history"); });
    return () => { active = false; };
  }, [templateId, revision]);
  return <details className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
    <summary className="min-h-11 cursor-pointer font-semibold">Saved revision history</summary>
    <p className="text-sm text-slate-500">Latest 50 snapshots. Earlier revisions are read-only.</p>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {!history.length && !error && <p role="status">Loading revisions…</p>}
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
