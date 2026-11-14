import React from "react";
import type { KitCrate, KitQuantityRule, KitSubject } from "../../entity/ProductTemplateVersion";
import { MaterialSearch } from "./MaterialSearch";

const input = "min-h-11 w-full rounded-xl border border-slate-300 bg-transparent p-3";
const button = "min-h-11 rounded-xl border border-slate-300 px-3 py-2 disabled:opacity-40";
export function CrateEditor({ crates, subjects, disabled, onChange }: {
  crates: KitCrate[]; subjects: KitSubject[]; disabled: boolean; onChange: (crates: KitCrate[]) => void;
}) {
  const update = (id: string, patch: Partial<KitCrate>) => onChange(crates.map(crate => crate.id === id ? { ...crate, ...patch } : crate));
  const move = (index: number, delta: number) => { const next = [...crates]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; onChange(next); };
  return <fieldset className="space-y-3"><legend className="font-semibold">Common and universal crates</legend>
    <p className="text-sm text-slate-500">Define shared materials once per crate. Choose the quantity rule explicitly; crate kind and subject names do not change calculations. Reusable flags describe handling and do not reduce quantities.</p>
    {crates.map((crate, index) => <section key={crate.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
      <label className="block text-sm">Crate name<input className={input} disabled={disabled} maxLength={100} value={crate.name} onChange={event => update(crate.id, { name: event.target.value })} /></label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={disabled || index === 0} aria-label={`Move ${crate.name} up`} onClick={() => move(index, -1)}>↑</button>
        <button type="button" className={button} disabled={disabled || index === crates.length - 1} aria-label={`Move ${crate.name} down`} onClick={() => move(index, 1)}>↓</button>
        <button type="button" className={button} disabled={disabled} onClick={() => {
          if (!crate.materials.length || window.confirm(`Remove ${crate.name} and its material definitions? Earlier saved revisions remain available.`)) onChange(crates.filter(entry => entry.id !== crate.id));
        }}>Remove crate</button>
      </div>
      <label className="block text-sm">Crate kind<select className={input} disabled={disabled} value={crate.kind} onChange={event => update(crate.id, { kind: event.target.value as KitCrate["kind"] })}>
        <option value="common">Common</option><option value="universal">Universal</option><option value="custom">Custom</option>
      </select></label>
      <label className="block text-sm">Notes<textarea className={input} disabled={disabled} maxLength={2000} value={crate.notes ?? ""} onChange={event => update(crate.id, { notes: event.target.value })} /></label>
      {(["optional", "reusable"] as const).map(flag => <label key={flag} className="flex min-h-11 items-center gap-3"><input type="checkbox" disabled={disabled} checked={!!crate[flag]} onChange={event => update(crate.id, { [flag]: event.target.checked })} />{flag}</label>)}
      <label className="block text-sm">Quantity rule<select className={input} disabled={disabled} value={crate.rule.kind} onChange={event => {
        const kind = event.target.value as KitQuantityRule["kind"];
        update(crate.id, { rule: kind === "selected_sets" || kind === "complete_sets" ? { kind, components: [] } : { kind, quantity: 1 } });
      }}><option value="selected_sets">Per selected subject / grade sets</option><option value="complete_sets">Per explicit complete multi-grade set</option><option value="fixed">Fixed quantity</option><option value="per_project">Per explicitly configured project</option><option value="per_site">Per explicitly configured site</option></select></label>
      {"quantity" in crate.rule ? <label className="block text-sm">Crates per rule unit<input type="number" className={input} min={0} max={1000000} step={1} disabled={disabled} value={crate.rule.quantity} onChange={event => update(crate.id, { rule: { ...crate.rule, quantity: Number(event.target.value) } as KitQuantityRule })} /></label>
        : <fieldset className="space-y-2"><legend>Rule components</legend>
          <p className="text-xs text-slate-500">Selected-set rules sum the selected quantities × component quantity. Complete-set rules require an explicit bundle count and enough of every component.</p>
          {subjects.flatMap(subject => subject.grades.map(grade => {
            const rule = crate.rule;
            if (!("components" in rule)) return null;
            const component = rule.components.find(entry => entry.grade_id === grade.id);
            return <div key={grade.id} className="flex flex-wrap items-center gap-3">
              <label className="flex min-h-11 items-center gap-3"><input type="checkbox" disabled={disabled} checked={!!component} onChange={event => update(crate.id, { rule: { ...rule, components: event.target.checked ? [...rule.components, { subject_id: subject.id, grade_id: grade.id, quantity: 1 }] : rule.components.filter(entry => entry.grade_id !== grade.id) } })} />{subject.name} / {grade.name}</label>
              {component && <label className="text-sm">Component quantity<input type="number" className={input} min={1} max={1000000} step={1} disabled={disabled} value={component.quantity} onChange={event => update(crate.id, { rule: { ...rule, components: rule.components.map(entry => entry.grade_id === grade.id ? { ...entry, quantity: Number(event.target.value) } : entry) } })} /></label>}
            </div>;
          }))}
        </fieldset>}
      <fieldset className="space-y-3"><legend className="font-medium">Inventory materials per crate</legend>
        {crate.materials.map(material => <div key={material.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
          <p>{material.item_name}</p>
          <label className="block text-sm">Quantity per crate<input className={input} type="number" min={0} max={1000000000} step="0.000001" disabled={disabled} value={material.quantity} onChange={event => update(crate.id, { materials: crate.materials.map(entry => entry.id === material.id ? { ...entry, quantity: Number(event.target.value) } : entry) })} /></label>
          <label className="block text-sm">Unit<input className={input} maxLength={20} disabled={disabled} value={material.unit} onChange={event => update(crate.id, { materials: crate.materials.map(entry => entry.id === material.id ? { ...entry, unit: event.target.value } : entry) })} /></label>
          <label className="block text-sm">Material notes<input className={input} maxLength={500} disabled={disabled} value={material.notes ?? ""} onChange={event => update(crate.id, { materials: crate.materials.map(entry => entry.id === material.id ? { ...entry, notes: event.target.value } : entry) })} /></label>
          {(["optional", "reusable"] as const).map(flag => <label key={flag} className="flex min-h-11 items-center gap-3"><input type="checkbox" disabled={disabled} checked={!!material[flag]} onChange={event => update(crate.id, { materials: crate.materials.map(entry => entry.id === material.id ? { ...entry, [flag]: event.target.checked } : entry) })} />{flag}</label>)}
          <button type="button" className={button} disabled={disabled} onClick={() => update(crate.id, { materials: crate.materials.filter(entry => entry.id !== material.id) })}>Remove material</button>
        </div>)}
        <MaterialSearch disabled={disabled || crate.materials.length >= 100} onPick={item => {
          if (!crate.materials.some(material => material.inventory_item_id === item.id)) update(crate.id, { materials: [...crate.materials, { id: crypto.randomUUID(), inventory_item_id: item.id, item_name: item.name, quantity: 0, unit: item.unit || "pcs" }] });
        }} />
      </fieldset>
    </section>)}
    <button type="button" className={button} disabled={disabled || crates.length >= 100} onClick={() => {
      let number = crates.length + 1; while (crates.some(crate => crate.name.toLowerCase() === `crate ${number}`)) number++;
      onChange([...crates, { id: crypto.randomUUID(), name: `Crate ${number}`, kind: "common", reusable: true, materials: [], rule: { kind: "selected_sets", components: [] } }]);
    }}>Add crate</button>
  </fieldset>;
}
