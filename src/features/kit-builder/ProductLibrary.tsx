import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Search, Archive, Package, Trash2 } from "lucide-react";
import { useAuth } from "../../AuthContext";
import { apiFetch } from "../../utils/api";
import EmptyState from "../../shared/components/EmptyState";
import { SkeletonCard } from "../../shared/components/SkeletonLoader";

interface KitGrade { id: string; name: string }
interface KitSubject { id: string; name: string; grades: KitGrade[] }
interface DraftKit {
  id: string; template_id: string; name: string; description: string; category: string;
  version_number: number; revision: number; updated_at: string; subjects?: KitSubject[];
}
const writers = new Set(["admin", "super_admin", "staff", "manager", "editor", "inventory_staff", "project_staff"]);
const inputClass = "w-full min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500";
const buttonClass = "min-h-11 px-4 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
const iconButtonClass = "min-h-11 min-w-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed";
function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function ProductLibrary() {
  const { role } = useAuth();
  const canWrite = writers.has(role ?? "");
  const [kits, setKits] = useState<DraftKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<DraftKit | "new" | null>(null);
  const [content, setContent] = useState({ name: "", description: "", category: "" });
  const [subjects, setSubjects] = useState<KitSubject[]>([]);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiFetch("/api/v1/product-templates").then((data: DraftKit[]) => { if (mounted) setKits(data); })
      .catch((e: Error) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  function create() { setContent({ name: "", description: "", category: "" }); setSubjects([]); setEditing("new"); setError(""); setMessage(""); }
  async function open(kit: DraftKit) {
    setBusy(true); setError(""); setMessage("");
    try {
      const fresh: DraftKit = await apiFetch(`/api/v1/product-templates/${kit.template_id}`);
      setEditing(fresh); setContent({ name: fresh.name, description: fresh.description, category: fresh.category });
      setSubjects(fresh.subjects ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to open kit"); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const isNew = editing === "new";
      const saved: DraftKit = await apiFetch(`/api/v1/product-templates${isNew ? "" : `/${editing.template_id}`}`, {
        method: isNew ? "POST" : "PUT", body: JSON.stringify({ ...content, subjects, ...(isNew ? {} : { revision: editing.revision }) }),
      });
      setEditing(saved); setContent({ name: saved.name, description: saved.description, category: saved.category });
      setSubjects(saved.subjects ?? []);
      setKits(previous => [saved, ...previous.filter(kit => kit.template_id !== saved.template_id)]);
      setMessage("Draft saved. You can reopen it from Product Library.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save draft"); }
    finally { setBusy(false); }
  }
  async function archive() {
    if (!editing || editing === "new") return;
    setBusy(true); setError("");
    try {
      await apiFetch(`/api/v1/product-templates/${editing.template_id}/archive`, { method: "POST", body: JSON.stringify({ revision: editing.revision }) });
      setKits(previous => previous.filter(kit => kit.template_id !== editing.template_id));
      setEditing(null); setConfirmArchive(false); setMessage("Kit archived.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to archive draft"); }
    finally { setBusy(false); }
  }
  function updateSubject(id: string, patch: Partial<KitSubject>) {
    setSubjects(previous => previous.map(subject => subject.id === id ? { ...subject, ...patch } : subject));
  }
  function moveSubject(id: string, delta: number) {
    setSubjects(previous => {
      const index = previous.findIndex(subject => subject.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function removeSubject(id: string) { setSubjects(previous => previous.filter(subject => subject.id !== id)); }
  function addSubject() { setSubjects(previous => [...previous, { id: newId(), name: "", grades: [] }]); }
  function updateGrade(subjectId: string, gradeId: string, patch: Partial<KitGrade>) {
    setSubjects(previous => previous.map(subject => subject.id !== subjectId ? subject
      : { ...subject, grades: subject.grades.map(grade => grade.id === gradeId ? { ...grade, ...patch } : grade) }));
  }
  function moveGrade(subjectId: string, gradeId: string, delta: number) {
    setSubjects(previous => previous.map(subject => {
      if (subject.id !== subjectId) return subject;
      const index = subject.grades.findIndex(grade => grade.id === gradeId);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= subject.grades.length) return subject;
      const grades = [...subject.grades];
      [grades[index], grades[target]] = [grades[target], grades[index]];
      return { ...subject, grades };
    }));
  }
  function removeGrade(subjectId: string, gradeId: string) {
    setSubjects(previous => previous.map(subject => subject.id !== subjectId ? subject
      : { ...subject, grades: subject.grades.filter(grade => grade.id !== gradeId) }));
  }
  function addGrade(subjectId: string) {
    setSubjects(previous => previous.map(subject => subject.id !== subjectId ? subject
      : { ...subject, grades: [...subject.grades, { id: newId(), name: "" }] }));
  }
  const blankName = subjects.some(subject => !subject.name.trim() || subject.grades.some(grade => !grade.name.trim()));
  const filtered = kits.filter(kit => `${kit.name} ${kit.description} ${kit.category}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="space-y-6" aria-labelledby="library-title">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Kit Builder</p>
        <h1 id="library-title" className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{editing === "new" ? "Create Kit" : editing ? editing.name : "Product Library"}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{editing ? "Define subjects and grades, then save the draft. Activities and packing structure come in a later step." : "Create and manage reusable kit drafts for your organization."}</p></div>
      {!editing && canWrite && <button onClick={create} className={`${buttonClass} bg-indigo-600 text-white flex items-center gap-2`} disabled={busy}><Plus size={18} />Create Kit</button>}
    </div>
    {error && <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950 p-4 text-red-700 dark:text-red-300">{error}</div>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-950 p-4 text-emerald-700 dark:text-emerald-300">{message}</p>}
    {editing ? <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8">
      <button type="button" disabled={busy} onClick={() => { setEditing(null); setConfirmArchive(false); setError(""); }} className={`${buttonClass} mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-300`}><ArrowLeft size={18} />Back to Product Library</button>
      <form onSubmit={save} className="max-w-2xl space-y-5">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Kit name<input autoFocus required maxLength={200} disabled={!canWrite || busy} className={`${inputClass} mt-2`} value={content.name} onChange={e => setContent({ ...content, name: e.target.value })} /></label>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Category <span className="font-normal text-slate-500">(optional)</span><input maxLength={100} disabled={!canWrite || busy} className={`${inputClass} mt-2`} value={content.category} onChange={e => setContent({ ...content, category: e.target.value })} placeholder="For example, Science or Robotics" /></label>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Description <span className="font-normal text-slate-500">(optional)</span><textarea rows={5} maxLength={5000} disabled={!canWrite || busy} className={`${inputClass} mt-2`} value={content.description} onChange={e => setContent({ ...content, description: e.target.value })} /></label>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">Subjects and grades</legend>
          <p className="text-sm text-slate-500 dark:text-slate-400">Add each subject, then its grades. Use the arrows to reorder; changes are saved with the draft.</p>
          {subjects.map((subject, index) => <div key={subject.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input aria-label={`Subject ${index + 1} name`} placeholder="Subject name, for example Science" maxLength={100} disabled={!canWrite || busy} className={`${inputClass} flex-1 min-w-48`} value={subject.name} onChange={e => updateSubject(subject.id, { name: e.target.value })} />
              <button type="button" aria-label={`Move ${subject.name || "subject"} up`} disabled={busy || index === 0} onClick={() => moveSubject(subject.id, -1)} className={iconButtonClass}><ArrowUp size={16} /></button>
              <button type="button" aria-label={`Move ${subject.name || "subject"} down`} disabled={busy || index === subjects.length - 1} onClick={() => moveSubject(subject.id, 1)} className={iconButtonClass}><ArrowDown size={16} /></button>
              {canWrite && <button type="button" aria-label={`Remove ${subject.name || "subject"}`} disabled={busy} onClick={() => removeSubject(subject.id)} className={`${iconButtonClass} text-red-600 dark:text-red-400`}><Trash2 size={16} /></button>}
            </div>
            {subject.grades.map((grade, gradeIndex) => <div key={grade.id} className="flex flex-wrap items-center gap-2 sm:pl-8">
              <input aria-label={`${subject.name || "Subject"} grade ${gradeIndex + 1} name`} placeholder="Grade name, for example Grade 8" maxLength={100} disabled={!canWrite || busy} className={`${inputClass} flex-1 min-w-48`} value={grade.name} onChange={e => updateGrade(subject.id, grade.id, { name: e.target.value })} />
              <button type="button" aria-label={`Move ${grade.name || "grade"} up`} disabled={busy || gradeIndex === 0} onClick={() => moveGrade(subject.id, grade.id, -1)} className={iconButtonClass}><ArrowUp size={16} /></button>
              <button type="button" aria-label={`Move ${grade.name || "grade"} down`} disabled={busy || gradeIndex === subject.grades.length - 1} onClick={() => moveGrade(subject.id, grade.id, 1)} className={iconButtonClass}><ArrowDown size={16} /></button>
              {canWrite && <button type="button" aria-label={`Remove ${grade.name || "grade"} from ${subject.name || "subject"}`} disabled={busy} onClick={() => removeGrade(subject.id, grade.id)} className={`${iconButtonClass} text-red-600 dark:text-red-400`}><Trash2 size={16} /></button>}
            </div>)}
            {canWrite && <button type="button" disabled={busy || subject.grades.length >= 100} onClick={() => addGrade(subject.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"><Plus size={14} />Add grade</button>}
          </div>)}
          {canWrite && <button type="button" disabled={busy || subjects.length >= 100} onClick={addSubject} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"><Plus size={16} />Add subject</button>}
          {blankName && <p className="text-sm text-amber-700 dark:text-amber-300">Every subject and grade needs a name before saving.</p>}
        </fieldset>
        <p className="text-sm text-slate-500">Draft{editing !== "new" && ` · Version ${editing.version_number} · Revision ${editing.revision}`}</p>
        {canWrite && <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !content.name.trim() || blankName} className={`${buttonClass} bg-indigo-600 text-white`}>{busy ? "Saving…" : "Save draft"}</button>
          {editing !== "new" && <button type="button" disabled={busy} className={`${buttonClass} text-slate-600 dark:text-slate-300 flex items-center gap-2`} onClick={() => setConfirmArchive(true)}><Archive size={18} />Archive kit</button>}</div>}
      </form>
      {confirmArchive && <div role="alert" className="mt-6 rounded-xl border border-amber-200 p-4 text-slate-700 dark:text-slate-200"><p>Archive this kit? It will be removed from the active library. Its saved records will be retained.</p><div className="mt-3 flex gap-3"><button disabled={busy} onClick={archive} className={`${buttonClass} bg-amber-600 text-white`}>Confirm archive</button><button disabled={busy} onClick={() => setConfirmArchive(false)} className={buttonClass}>Cancel</button></div></div>}
    </div> : <>
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4"><Search size={18} className="text-slate-400" /><input aria-label="Search draft kits" className="w-full min-h-11 py-3 bg-transparent outline-none text-slate-900 dark:text-white" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search kits by name or category" /></label>
      {loading ? <div role="status" className="space-y-3"><span className="sr-only">Loading draft kits</span>{[1, 2, 3].map(id => <div key={id}><SkeletonCard /></div>)}</div>
        : !filtered.length ? <EmptyState preset="items" title={kits.length ? "No matching kits" : "Your Product Library is empty"} description="Start with a name and save your first draft kit." actionLabel={canWrite ? "Create Kit" : undefined} onAction={create} />
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(kit => <button key={kit.id} disabled={busy} onClick={() => open(kit)} className="text-left p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500">
          <Package className="text-indigo-500 mb-4" /><span className="text-xs rounded-full px-2 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">Draft · v{kit.version_number}</span>
          <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white break-words">{kit.name}</h2><p className="mt-2 text-sm text-slate-500 line-clamp-2">{kit.description || "No description yet"}</p><p className="mt-4 text-xs text-slate-500">{kit.category || "Uncategorized"}{kit.subjects?.length ? ` · ${kit.subjects.length} subject${kit.subjects.length === 1 ? "" : "s"}` : ""} · Updated {new Date(kit.updated_at).toLocaleDateString()}</p>
        </button>)}</div>}
    </>}
  </section>;
}
