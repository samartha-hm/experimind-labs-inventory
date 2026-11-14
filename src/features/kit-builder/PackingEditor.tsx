import React from "react";
import type { KitActivity, KitPackingUnit } from "../../entity/ProductTemplateVersion";
import { MaterialSearch } from "./MaterialSearch";

interface Props {
  units: KitPackingUnit[];
  activities: KitActivity[];
  disabled: boolean;
  onChange: (units: KitPackingUnit[]) => void;
  kind?: KitPackingUnit["kind"];
}
const inputClass = "w-full min-h-11 rounded-xl border border-slate-300 bg-transparent p-3";
const buttonClass = "min-h-11 rounded-xl border border-slate-300 px-3 py-2 disabled:opacity-40";

export function PackingEditor({ units, activities, disabled, onChange, kind = "box" }: Props) {
  const update = (id: string, patch: Partial<KitPackingUnit>) => onChange(units.map(unit => unit.id === id ? { ...unit, ...patch } : unit));
  const move = (index: number, delta: number) => {
    const reordered = [...units];
    [reordered[index], reordered[index + delta]] = [reordered[index + delta], reordered[index]];
    onChange(reordered);
  };
  const remove = (unit: KitPackingUnit) => {
    if ((unit.children.length || unit.activity_ids.length || unit.inventory_item_ids.length) &&
      !window.confirm(`Remove ${unit.name}, its contents, and all their packing assignments? Saved earlier revisions remain available.`)) return;
    onChange(units.filter(candidate => candidate.id !== unit.id));
  };
  return <div className="space-y-3">
    <p className="text-sm text-slate-500">{units.length} {kind}{units.length === 1 ? "" : "s"}</p>
    {units.map((unit, index) => <section key={unit.id} className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="flex-1 min-w-40 text-sm">{kind} name
          <input className={inputClass} value={unit.name} maxLength={100} disabled={disabled} onChange={event => update(unit.id, { name: event.target.value })} />
        </label>
        <button type="button" className={buttonClass} disabled={disabled || index === 0} aria-label={`Move ${unit.name} up`} onClick={() => move(index, -1)}>↑</button>
        <button type="button" className={buttonClass} disabled={disabled || index === units.length - 1} aria-label={`Move ${unit.name} down`} onClick={() => move(index, 1)}>↓</button>
        <button type="button" className={buttonClass} disabled={disabled} onClick={() => remove(unit)}>Remove {kind}</button>
      </div>
      <label className="block text-sm">Code<input className={inputClass} value={unit.code ?? ""} maxLength={50} disabled={disabled} onChange={event => update(unit.id, { code: event.target.value })} /></label>
      <label className="block text-sm">Notes<textarea className={inputClass} value={unit.notes ?? ""} maxLength={2000} disabled={disabled} onChange={event => update(unit.id, { notes: event.target.value })} /></label>
      {kind === "pouch" && <fieldset className="space-y-2"><legend className="font-medium">Linked activities</legend>
        {!activities.length && <p className="text-sm text-slate-500">Add activities to this grade to link them.</p>}
        {activities.map(activity => <label key={activity.id} className="flex min-h-11 items-center gap-3">
          <input type="checkbox" disabled={disabled} checked={unit.activity_ids.includes(activity.id)} onChange={event => update(unit.id, { activity_ids: event.target.checked ? [...unit.activity_ids, activity.id] : unit.activity_ids.filter(id => id !== activity.id) })} />{activity.name}
        </label>)}
      </fieldset>}
      <fieldset className="space-y-2"><legend className="font-medium">Inventory components packed here</legend>
        <p className="text-xs text-slate-500">Location assignments do not change activity quantities or stock.</p>
        {unit.inventory_item_ids.map(id => <div key={id} className="flex flex-wrap items-center gap-2 text-sm">
          <span>{unit.inventory_labels?.[id] ?? activities.flatMap(activity => activity.materials).find(material => material.inventory_item_id === id)?.item_name ?? `Inventory component (${id})`}</span>
          <button type="button" className={buttonClass} disabled={disabled} onClick={() => update(unit.id, { inventory_item_ids: unit.inventory_item_ids.filter(itemId => itemId !== id) })}>Unassign</button>
        </div>)}
        <MaterialSearch disabled={disabled || unit.inventory_item_ids.length >= 100} onPick={item => {
          if (!unit.inventory_item_ids.includes(item.id)) update(unit.id, { inventory_item_ids: [...unit.inventory_item_ids, item.id], inventory_labels: { ...unit.inventory_labels, [item.id]: item.name } });
        }} />
      </fieldset>
      {kind !== "pouch" && <PackingEditor units={unit.children} activities={activities} disabled={disabled} kind={kind === "box" ? "partition" : "pouch"} onChange={children => update(unit.id, { children })} />}
    </section>)}
    <button type="button" className={buttonClass} disabled={disabled || units.length >= 100} onClick={() => {
      const names = new Set(units.map(unit => unit.name.trim().toLowerCase()));
      let number = units.length + 1;
      while (names.has(`${kind} ${number}`)) number++;
      onChange([...units, { id: crypto.randomUUID(), kind, name: `${kind} ${number}`, activity_ids: [], inventory_item_ids: [], children: [] }]);
    }}>Add {kind}</button>
  </div>;
}
