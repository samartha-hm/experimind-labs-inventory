import { useEffect, useRef, useState } from "react";
import type { ProductTemplateVersion } from "../../entity/ProductTemplateVersion";
import { useAuth } from "../../AuthContext";
import { apiFetch } from "../../utils/api";
import type { PlanningContent, PlanningPreview, PlanningSite, PlanningView } from "./planningTypes";
import { SelectionQuantities } from "./SelectionQuantities";
import SupplyPlanningPanel from "../procurement/components/SupplyPlanningPanel";
import ProductionPlanningPanel from "../production/ProductionPlanningPanel";
import PackingPanel from "../packing/PackingPanel";

const input = "min-h-11 w-full rounded-xl border border-slate-300 bg-transparent p-3";
const button = "min-h-11 rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-40";
const empty = (): PlanningContent => ({ name: "", client: "", notes: "", commercial_links: [], overrides: {}, sites: [] });
const header = (view: PlanningView): PlanningContent => { const { id: _id, revision: _r, updated_at: _t, ...content } = view; return content; };
export default function ProjectPlanningTab() {
  const { currentUser } = useAuth();
  const canWrite = ["admin", "super_admin", "staff", "manager", "editor", "inventory_staff", "project_staff"].includes(currentUser?.role ?? "");
  const [projects, setProjects] = useState<Pick<PlanningView, "id" | "name" | "client" | "revision">[]>([]);
  const [versions, setVersions] = useState<ProductTemplateVersion[]>([]);
  const [saved, setSaved] = useState<PlanningView>();
  const [content, setContent] = useState<PlanningContent>();
  const [result, setResult] = useState<PlanningPreview>();
  const [history, setHistory] = useState<{ revision: number; created_at: string; content: PlanningContent }[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const generation = useRef(0);
  const dirty = !!content && (!saved || JSON.stringify(content) !== JSON.stringify(header(saved)));
  useEffect(() => { generation.current++; setResult(undefined); setHistory([]); }, [content]);
  useEffect(() => { void refresh().catch(e => setError(e instanceof Error ? e.message : "Unable to load projects")); return () => { generation.current++; }; }, []);
  async function refresh() {
    const [list, catalog] = await Promise.all([apiFetch("/api/v1/planning-projects"), apiFetch("/api/v1/product-templates/approved")]);
    setProjects(list); setVersions(catalog);
  }
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(""); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : "Project request failed"); } finally { setBusy(false); }
  }
  function leave() { if (dirty && !window.confirm("Discard unsaved project changes?")) return; generation.current++; setContent(undefined); setSaved(undefined); setResult(undefined); setHistory([]); }
  async function open(id: string) {
    if (dirty && !window.confirm("Discard unsaved project changes?")) return;
    await run(async () => { const project: PlanningView = await apiFetch(`/api/v1/planning-projects/${id}`); setSaved(project); setContent(header(project)); });
  }
  async function save() {
    await run(async () => {
      const project: PlanningView = await apiFetch(`/api/v1/planning-projects${saved ? `/${saved.id}` : ""}`, { method: saved ? "PUT" : "POST", body: JSON.stringify({ ...content, ...(saved ? { revision: saved.revision } : {}) }) });
      setSaved(project); setContent(header(project)); await refresh();
    });
  }
  function updateSite(id: string, patch: Partial<PlanningSite>) { setContent(previous => previous && ({ ...previous, sites: previous.sites.map(s => s.id === id ? { ...s, ...patch } : s) })); }
  function removeSelection(site: PlanningSite, id: string) {
    if (!content) return;
    const sites = content.sites.map(s => s.id === site.id ? { ...s, selections: s.selections.filter(k => k.id !== id) } : s);
    const selected = new Set(sites.flatMap(s => s.selections.map(k => k.version_id)));
    setContent({ ...content, sites, overrides: Object.fromEntries(Object.entries(content.overrides).filter(([id]) => selected.has(id))) });
  }
  const selectedVersions = versions.filter(v => content?.sites.some(s => s.selections.some(k => k.version_id === v.id)));
  return <section className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Project requirement planning</h1><p className="text-sm text-slate-500">School allocations and read-only material demand. Stock NOT VERIFIED; operational release disabled.</p></div>
      {!content && canWrite && <button className={button} disabled={busy} onClick={() => { setSaved(undefined); setContent(empty()); }}>Create project</button>}
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {!content ? <div className="space-y-3">{projects.map(p => <button key={p.id} className={`${button} block w-full text-left`} disabled={busy} onClick={() => void open(p.id)}>{p.name} · {p.client || "No client specified"} · revision {p.revision}</button>)}{!projects.length && <p>No projects yet.</p>}</div> : <>
      <fieldset disabled={busy || !canWrite} className="space-y-4"><legend className="font-semibold">Project details</legend>
        {(["name", "client", "notes"] as const).map(key => <label key={key} className="block text-sm">{key === "client" ? "Client / NGO" : key}<input className={input} maxLength={key === "notes" ? 5000 : 200} value={content[key]} onChange={e => setContent({ ...content, [key]: e.target.value })} /></label>)}
        <details><summary className="min-h-11 cursor-pointer py-3">Optional commercial document references</summary><p className="text-sm text-slate-500">References only; quotation and order records are not required or created.</p>
          {content.commercial_links.map((link, index) => <div key={index} className="flex flex-wrap gap-2 py-2"><select aria-label="Document kind" className={input} value={link.kind} onChange={e => setContent({ ...content, commercial_links: content.commercial_links.map((l, i) => i === index ? { ...l, kind: e.target.value as typeof link.kind } : l) })}><option value="quotation">Quotation</option><option value="sales_order">Sales order</option></select>
            <input aria-label="Document reference" className={input} maxLength={200} value={link.reference} onChange={e => setContent({ ...content, commercial_links: content.commercial_links.map((l, i) => i === index ? { ...l, reference: e.target.value } : l) })} /><button className={button} onClick={() => setContent({ ...content, commercial_links: content.commercial_links.filter((_, i) => i !== index) })}>Remove reference</button></div>)}
          <button className={button} onClick={() => setContent({ ...content, commercial_links: [...content.commercial_links, { kind: "quotation", reference: "" }] })}>Add reference</button>
        </details>
        <button className={button} onClick={() => setContent({ ...content, sites: [...content.sites, { id: crypto.randomUUID(), name: "", address: "", location: "", contact: "", notes: "", schedule: "", fulfillment: "", selections: [] }] })}>Add school / site</button>
        {content.sites.map(site => <section key={site.id} className="space-y-3 rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">{site.name || "New school / site"}</h2>
          {(["name", "address", "location", "contact", "notes", "schedule", "fulfillment"] as const).map(key => <label key={key} className="block text-sm">Site {key}<input className={input} maxLength={key === "name" ? 200 : key === "notes" ? 5000 : key === "location" ? 500 : key === "address" || key === "fulfillment" ? 2000 : 1000} value={site[key]} onChange={e => updateSite(site.id, { [key]: e.target.value })} /></label>)}
          <label className="block text-sm">Add approved kit version<select className={input} value="" onChange={e => { if (e.target.value) updateSite(site.id, { selections: [...site.selections, { id: crypto.randomUUID(), version_id: e.target.value, context: { grade_quantities: {} } }] }); }}><option value="">Select version…</option>{versions.map(v => <option key={v.id} value={v.id}>{v.name} · approved version {v.version_number}</option>)}</select></label>
          {!versions.length && <p className="text-sm text-amber-700">Approve a saved kit in Product Library before allocating it.</p>}
          {site.selections.map(selection => { const version = versions.find(v => v.id === selection.version_id); return <div key={selection.id} className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="font-medium">{version?.name ?? "Unavailable version"} · immutable version {version?.version_number}</h3>
            {version && <SelectionQuantities subjects={version.subjects} value={selection.context} onChange={context => updateSite(site.id, { selections: site.selections.map(s => s.id === selection.id ? { ...s, context } : s) })} />}
            <button className={button} onClick={() => removeSelection(site, selection.id)}>Remove kit selection</button>
          </div>; })}
          <button className={button} onClick={() => { if (!window.confirm("Remove this site and its allocations?")) return; const sites = content.sites.filter(s => s.id !== site.id); const ids = new Set(sites.flatMap(s => s.selections.map(k => k.version_id))); setContent({ ...content, sites, overrides: Object.fromEntries(Object.entries(content.overrides).filter(([id]) => ids.has(id))) }); }}>Remove site</button>
        </section>)}
        {selectedVersions.map(v => <section key={v.id} className="rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">{v.name} version {v.version_number}: project defaults</h2><SelectionQuantities onlyOverrides subjects={v.subjects} value={{ grade_quantities: {}, overrides: content.overrides[v.id] ?? {} }} onChange={value => setContent({ ...content, overrides: { ...content.overrides, [v.id]: value.overrides ?? {} } })} /></section>)}
      </fieldset>
      <div className="flex flex-wrap gap-3">
        {canWrite && <button className={button} disabled={busy || !dirty || !content.name.trim()} onClick={() => void save()}>Save project</button>}
        <button className={button} disabled={busy || dirty || !saved} onClick={() => void run(async () => { const request = ++generation.current; const preview: PlanningPreview = await apiFetch(`/api/v1/planning-projects/${saved!.id}/preview`, { method: "POST", body: JSON.stringify({ revision: saved!.revision }) }); if (request === generation.current) setResult(preview); })}>Calculate requirements</button>
        <button className={button} disabled={busy || dirty || !saved} onClick={() => void run(async () => { setHistory(await apiFetch(`/api/v1/planning-projects/${saved!.id}/revisions`)); })}>Project revision history</button>
        <button className={button} disabled={busy} onClick={leave}>Back to projects</button>
        {canWrite && saved && <button className={button} disabled={busy || dirty} onClick={() => { if (window.confirm("Archive this project? Its revisions will be preserved.")) void run(async () => { await apiFetch(`/api/v1/planning-projects/${saved.id}/archive`, { method: "POST", body: JSON.stringify({ revision: saved.revision }) }); setContent(undefined); setSaved(undefined); await refresh(); }); }}>Archive project</button>}
      </div>
      {dirty && <p className="text-sm text-slate-500">Save changes before calculating the persisted allocation.</p>}
      {saved&&!dirty&&<SupplyPlanningPanel project={saved} onChange={()=>setResult(undefined)}/>}
      {saved&&!dirty&&<ProductionPlanningPanel project={saved} onChange={()=>setResult(undefined)}/>}
      {saved&&!dirty&&<PackingPanel project={saved}/>}
      {history.map(h => <details key={h.revision}><summary className="min-h-11 cursor-pointer py-3">Revision {h.revision} · {h.created_at}</summary><pre className="overflow-auto rounded-xl border p-3 text-xs">{JSON.stringify(h.content, null, 2)}</pre></details>)}
      {result && <div aria-live="polite" className="space-y-4">
        {result.warnings.map(w => <p key={w} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{w}</p>)}
        <h2 className="text-lg font-semibold">Consolidated material demand · revision {result.revision}</h2>
        <div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{["Material", "Gross demand", "Verified on-hand", "Active reservations", "Available (unreserved)", "Incoming", "Immediate shortage", "Projected shortage"].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{result.materials.map(m => <tr key={`${m.inventory_item_id}/${m.unit}`}><td className="p-3">{m.name}</td><td className="p-3">{m.gross_demand} {m.unit}</td>{[m.verified_on_hand, m.active_reservations, m.available_to_promise, m.incoming, m.immediate_shortage, m.projected_shortage].map((value, index) => <td className="p-3" key={index}>{value === null ? "Unverified" : value}</td>)}</tr>)}</tbody></table></div>
        {content.sites.map(site => <details key={site.id}><summary className="min-h-11 cursor-pointer py-3">{site.name}: requirement trace</summary><div className="space-y-2">{result.lines.filter(l => l.site_id === site.id).map((l, index) => <div key={index} className="rounded-xl border p-3 text-sm"><p>{l.template_name} v{l.version_number} · {l.subject_name} {l.grade_name} · {l.owner_name}: {l.quantity} {l.unit}{l.reusable ? " · reusable" : ""}</p><p>{l.basis}{l.override_scope ? ` · ${l.override_scope} override` : ""}</p><p className="text-xs text-slate-500">Selection {l.selection_id} · version {l.version_id} · source {l.owner_id}{l.material_id ? ` · material ${l.material_id}` : ""}{l.inventory_item_id ? ` · inventory ${l.inventory_item_id}` : ""}{l.conversion_id ? ` · converted from ${l.source_quantity} ${l.source_unit} via ${l.conversion_id}` : ""}</p></div>)}</div></details>)}
        <details><summary className="min-h-11 cursor-pointer py-3">Packing assignments (no additional demand)</summary>{result.packing_assignments.map((a, i) => <p key={i} className="break-words py-2 text-sm">{content.sites.find(s => s.id === a.site_id)?.name} · {a.kind} {a.name} · activities {a.activity_ids.join(", ") || "none"} · inventory {a.inventory_item_ids.join(", ") || "none"}</p>)}</details>
      </div>}
    </>}
  </section>;
}
