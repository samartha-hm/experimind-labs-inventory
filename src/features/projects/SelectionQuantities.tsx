import type { KitSubject } from "../../entity/ProductTemplateVersion";
import type { QuantityContext } from "../kit-builder/quantityRules";

const input = "min-h-11 w-full rounded-xl border border-slate-300 bg-transparent p-3";
export function SelectionQuantities({ subjects, value, onChange, onlyOverrides = false, preserveUnknown = false }: {
  subjects: KitSubject[]; value: QuantityContext; onChange: (value: QuantityContext) => void; onlyOverrides?: boolean; preserveUnknown?: boolean;
}) {
  const crates = subjects.flatMap(s => s.crates ?? []);
  const activities = subjects.flatMap(s => s.grades.flatMap(g => g.activities));
  const materials = [...activities.flatMap(a => a.materials), ...crates.flatMap(c => c.materials)];
  const choices = [...crates.map(c => ({ id: c.id, name: c.name, step: 1 })), ...materials.map(m => ({ id: m.id, name: m.item_name, step: 0.000001 }))];
  return <div className="space-y-3">
    {!onlyOverrides && <>
      {subjects.flatMap(s => s.grades.map(g => <label key={g.id} className="block text-sm">{s.name} / {g.name} sets
        <input className={input} type="number" min={0} max={1000000} step={1} placeholder={preserveUnknown ? 'Unknown / not provided' : undefined} value={value.grade_quantities[g.id] ?? (preserveUnknown ? '' : 0)} onChange={e => {
          const quantities = { ...value.grade_quantities };
          if (preserveUnknown && e.target.value === '') delete quantities[g.id]; else quantities[g.id] = Number(e.target.value);
          onChange({ ...value, grade_quantities: quantities });
        }} />
      </label>))}
      {crates.filter(c => c.rule.kind === "complete_sets").map(c => <label key={c.id} className="block text-sm">{c.name}: explicit complete sets (enter 0 for partial selections)
        <input className={input} type="number" min={0} max={1000000} step={1} placeholder="Required explicit allocation" value={value.complete_sets?.[c.id] ?? ""} onChange={e => {
          const counts = { ...value.complete_sets }; if (e.target.value === "") delete counts[c.id]; else counts[c.id] = Number(e.target.value); onChange({ ...value, complete_sets: counts });
        }} />
      </label>)}
      {(["per_project", "per_site"] as const).filter(kind => crates.some(c => c.rule.kind === kind)).map(kind => {
        const field = kind === "per_project" ? "project_count" : "site_count";
        return <label key={kind} className="block text-sm">{kind === "per_project" ? "Project allocation: 1 at one site only, 0 elsewhere" : "Site allocation: 0 or 1"}
          <input className={input} type="number" min={0} max={1} step={1} value={value[field] ?? ""} placeholder="Explicit count" onChange={e => onChange({ ...value, [field]: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>;
      })}
      {[...crates, ...activities, ...materials].filter(e => e.optional).map(entry => <label key={entry.id} className="flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={value.included_optional?.includes(entry.id) ?? false} onChange={e => onChange({ ...value, included_optional: e.target.checked ? [...(value.included_optional ?? []), entry.id] : (value.included_optional ?? []).filter(id => id !== entry.id) })} />Include optional {"name" in entry ? entry.name : entry.item_name}</label>)}
    </>}
    <details><summary className="min-h-11 cursor-pointer py-3">{onlyOverrides ? "Project override defaults" : "Site overrides"}</summary>
      <p className="text-sm text-slate-500">Material overrides replace final demand for that definition in each selection. Crate overrides replace counts. Site overrides take precedence over project defaults. A reason is required.</p>
      {choices.map(entry => <div key={entry.id} className="space-y-2 py-2">
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={!!value.overrides?.[entry.id]} onChange={e => {
          const overrides = { ...value.overrides }; if (e.target.checked) overrides[entry.id] = { quantity: 0, reason: "" }; else delete overrides[entry.id]; onChange({ ...value, overrides });
        }} />Override {entry.name}</label>
        {value.overrides?.[entry.id] && <>
          <label className="block text-sm">Quantity<input className={input} type="number" min={0} max={entry.step === 1 ? 1000000 : 1000000000} step={entry.step} value={value.overrides[entry.id].quantity} onChange={e => onChange({ ...value, overrides: { ...value.overrides, [entry.id]: { ...value.overrides![entry.id], quantity: Number(e.target.value) } } })} /></label>
          <label className="block text-sm">Reason<input className={input} maxLength={500} value={value.overrides[entry.id].reason} onChange={e => onChange({ ...value, overrides: { ...value.overrides, [entry.id]: { ...value.overrides![entry.id], reason: e.target.value } } })} /></label>
        </>}
      </div>)}
    </details>
  </div>;
}
