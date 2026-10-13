import React, { useEffect, useRef, useState } from "react";
import type { KitSubject } from "../../entity/ProductTemplateVersion";
import type { QuantityContext, QuantityLine } from "./quantityRules";
import { apiFetch } from "../../utils/api";

const input = "min-h-11 w-full rounded-xl border border-slate-300 bg-transparent p-3";
export function QuantityPreview({ subjects, templateId, revision, dirty, disabled }: {
  subjects: KitSubject[]; templateId?: string; revision?: number; dirty: boolean; disabled: boolean;
}) {
  const [context, setContext] = useState<QuantityContext>({ grade_quantities: {} });
  const [result, setResult] = useState<{ lines: QuantityLine[]; totals: { inventory_item_id: string; unit: string; quantity: number }[] }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestGeneration = useRef(0);
  useEffect(() => {
    requestGeneration.current++;
    setResult(undefined); setError("");
    return () => { requestGeneration.current++; };
  }, [subjects, revision, context, templateId, dirty]);
  useEffect(() => { setContext({ grade_quantities: {} }); }, [templateId, subjects]);
  const crates = subjects.flatMap(subject => subject.crates ?? []);
  const activities = subjects.flatMap(subject => subject.grades.flatMap(grade => grade.activities));
  const materials = [...crates.flatMap(crate => crate.materials), ...activities.flatMap(activity => activity.materials)];
  const optional = [...crates, ...activities, ...materials].filter(entry => entry.optional);
  const overrideChoices = [...crates.map(crate => ({ id: crate.id, name: crate.name, step: 1 })), ...materials.map(material => ({ id: material.id, name: material.item_name, step: 0.000001 }))];
  async function calculate() {
    const generation = ++requestGeneration.current;
    setBusy(true); setError(""); setResult(undefined);
    try {
      const preview = await apiFetch(`/api/v1/product-templates/${templateId}/preview`, { method: "POST", body: JSON.stringify({ revision, context }) });
      if (generation === requestGeneration.current) setResult(preview);
    }
    catch (error) { if (generation === requestGeneration.current) setError(error instanceof Error ? error.message : "Unable to preview quantities"); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-slate-200 p-4">
    <h3 className="font-semibold">Quantity preview</h3>
    <p className="text-sm text-slate-500">Preview only. No stock, reservation, purchase or production changes. Save definitions first. Subject quantities are independent; enter complete-set counts explicitly, including zero for partial selections. Optional requirements are excluded until selected.</p>
    <fieldset disabled={busy || disabled} className="space-y-3"><legend>Selected sets</legend>
      {subjects.flatMap(subject => subject.grades.map(grade => <label key={grade.id} className="block text-sm">{subject.name} / {grade.name} sets
        <input type="number" className={input} min={0} max={1000000} step={1} value={context.grade_quantities[grade.id] ?? 0} onChange={event => setContext({ ...context, grade_quantities: { ...context.grade_quantities, [grade.id]: Number(event.target.value) } })} />
      </label>))}
      {crates.filter(crate => crate.rule.kind === "complete_sets").map(crate => <label key={crate.id} className="block text-sm">{crate.name}: explicit complete sets
        <input type="number" className={input} placeholder="Required explicit count" min={0} max={1000000} step={1} value={context.complete_sets?.[crate.id] ?? ""} onChange={event => {
          const counts = { ...context.complete_sets }; if (event.target.value === "") delete counts[crate.id]; else counts[crate.id] = Number(event.target.value);
          setContext({ ...context, complete_sets: counts });
        }} />
      </label>)}
      {(["per_project", "per_site"] as const).filter(kind => crates.some(crate => crate.rule.kind === kind)).map(kind => {
        const field = kind === "per_project" ? "project_count" : "site_count";
        return <label key={kind} className="block text-sm">Explicit {kind === "per_project" ? "project" : "site"} count<input className={input} type="number" placeholder="Required explicit count" min={0} max={1000000} step={1} value={context[field] ?? ""} onChange={event => setContext({ ...context, [field]: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>;
      })}
      {optional.map(entry => <label key={entry.id} className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={context.included_optional?.includes(entry.id) ?? false} onChange={event => setContext({ ...context, included_optional: event.target.checked ? [...(context.included_optional ?? []), entry.id] : (context.included_optional ?? []).filter(id => id !== entry.id) })} />Include optional {"name" in entry ? entry.name : entry.item_name}</label>)}
      <details><summary className="min-h-11 cursor-pointer py-3">Explicit quantity overrides</summary>
        <p className="text-xs text-slate-500">Crate overrides replace crate counts; material overrides replace final material totals for that definition. Each override requires a reason. Include optional definitions first.</p>
        {overrideChoices.map(entry => <div key={entry.id} className="space-y-2 py-2">
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={!!context.overrides?.[entry.id]} onChange={event => {
            const overrides = { ...context.overrides }; if (event.target.checked) overrides[entry.id] = { quantity: 0, reason: "" }; else delete overrides[entry.id]; setContext({ ...context, overrides });
          }} />Override {entry.name}</label>
          {context.overrides?.[entry.id] && <>
            <label className="block text-sm">Override quantity<input className={input} type="number" min={0} max={entry.step === 1 ? 1000000 : 1000000000} step={entry.step} value={context.overrides[entry.id].quantity} onChange={event => setContext({ ...context, overrides: { ...context.overrides, [entry.id]: { ...context.overrides![entry.id], quantity: Number(event.target.value) } } })} /></label>
            <label className="block text-sm">Override reason<input className={input} maxLength={500} value={context.overrides[entry.id].reason} onChange={event => setContext({ ...context, overrides: { ...context.overrides, [entry.id]: { ...context.overrides![entry.id], reason: event.target.value } } })} /></label>
          </>}
        </div>)}
      </details>
    </fieldset>
    <button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-40" disabled={!templateId || dirty || busy || disabled} onClick={calculate}>{busy ? "Calculating…" : "Calculate preview"}</button>
    {(!templateId || dirty) && <p className="text-sm text-slate-500">Save this draft to calculate quantities for its saved revision.</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {result && <div aria-live="polite" className="space-y-3">
      <p className="text-sm">Saved revision {revision} · Requirements by definition (shared crate materials are counted once per crate).</p>
      {result.lines.map((line, index) => <div key={index} className="rounded-xl border border-slate-200 p-3 text-sm"><p>{line.owner_name}: {line.quantity} {line.unit}{line.reusable ? " · reusable" : ""}</p><p className="break-words text-xs text-slate-500">{line.material_id ? `${materials.find(material => material.id === line.material_id)?.item_name ?? "Material"}: ` : ""}{line.basis}</p></div>)}
      <h4 className="font-medium">Inventory requirements</h4>
      {result.totals.map(total => <p key={`${total.inventory_item_id}/${total.unit}`} className="text-sm">{materials.find(material => material.inventory_item_id === total.inventory_item_id)?.item_name ?? total.inventory_item_id}: {total.quantity} {total.unit}</p>)}
      {!result.lines.length && <p className="text-sm text-slate-500">No material or crate requirements configured.</p>}
    </div>}
  </section>;
}
