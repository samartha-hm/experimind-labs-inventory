import React, { useEffect, useState } from "react";
import { ArrowLeft, Plus, Search, Archive, Package } from "lucide-react";
import { useAuth } from "../../AuthContext";
import { apiFetch } from "../../utils/api";
import EmptyState from "../../shared/components/EmptyState";
import { SkeletonCard } from "../../shared/components/SkeletonLoader";

interface DraftKit {
  id: string; template_id: string; name: string; description: string; category: string;
  version_number: number; revision: number; updated_at: string;
}
const writers = new Set(["admin", "super_admin", "staff", "manager", "editor", "inventory_staff", "project_staff"]);
const inputClass = "w-full min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500";
const buttonClass = "min-h-11 px-4 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

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
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiFetch("/api/v1/product-templates").then((data: DraftKit[]) => { if (mounted) setKits(data); })
      .catch((e: Error) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  function create() { setContent({ name: "", description: "", category: "" }); setEditing("new"); setError(""); setMessage(""); }
  async function open(kit: DraftKit) {
    setBusy(true); setError(""); setMessage("");
    try {
      const fresh: DraftKit = await apiFetch(`/api/v1/product-templates/${kit.template_id}`);
      setEditing(fresh); setContent({ name: fresh.name, description: fresh.description, category: fresh.category });
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to open kit"); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const isNew = editing === "new";
      const saved: DraftKit = await apiFetch(`/api/v1/product-templates${isNew ? "" : `/${editing.template_id}`}`, {
        method: isNew ? "POST" : "PUT", body: JSON.stringify({ ...content, ...(isNew ? {} : { revision: editing.revision }) }),
      });
      setEditing(saved); setContent({ name: saved.name, description: saved.description, category: saved.category });
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
  const filtered = kits.filter(kit => `${kit.name} ${kit.description} ${kit.category}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="space-y-6" aria-labelledby="library-title">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Kit Builder</p>
        <h1 id="library-title" className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{editing === "new" ? "Create Kit" : editing ? editing.name : "Product Library"}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{editing ? "Save a draft now. Build its activities and packing structure in a later step." : "Create and manage reusable kit drafts for your organization."}</p></div>
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
        <p className="text-sm text-slate-500">Draft{editing !== "new" && ` · Version ${editing.version_number} · Revision ${editing.revision}`}</p>
        {canWrite && <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !content.name.trim()} className={`${buttonClass} bg-indigo-600 text-white`}>{busy ? "Saving…" : "Save draft"}</button>
          {editing !== "new" && <button type="button" disabled={busy} className={`${buttonClass} text-slate-600 dark:text-slate-300 flex items-center gap-2`} onClick={() => setConfirmArchive(true)}><Archive size={18} />Archive kit</button>}</div>}
      </form>
      {confirmArchive && <div role="alert" className="mt-6 rounded-xl border border-amber-200 p-4 text-slate-700 dark:text-slate-200"><p>Archive this kit? It will be removed from the active library. Its saved records will be retained.</p><div className="mt-3 flex gap-3"><button disabled={busy} onClick={archive} className={`${buttonClass} bg-amber-600 text-white`}>Confirm archive</button><button disabled={busy} onClick={() => setConfirmArchive(false)} className={buttonClass}>Cancel</button></div></div>}
    </div> : <>
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4"><Search size={18} className="text-slate-400" /><input aria-label="Search draft kits" className="w-full min-h-11 py-3 bg-transparent outline-none text-slate-900 dark:text-white" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search kits by name or category" /></label>
      {loading ? <div role="status" className="space-y-3"><span className="sr-only">Loading draft kits</span>{[1, 2, 3].map(id => <div key={id}><SkeletonCard /></div>)}</div>
        : !filtered.length ? <EmptyState preset="items" title={kits.length ? "No matching kits" : "Your Product Library is empty"} description="Start with a name and save your first draft kit." actionLabel={canWrite ? "Create Kit" : undefined} onAction={create} />
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(kit => <button key={kit.id} disabled={busy} onClick={() => open(kit)} className="text-left p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500">
          <Package className="text-indigo-500 mb-4" /><span className="text-xs rounded-full px-2 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">Draft · v{kit.version_number}</span>
          <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white break-words">{kit.name}</h2><p className="mt-2 text-sm text-slate-500 line-clamp-2">{kit.description || "No description yet"}</p><p className="mt-4 text-xs text-slate-500">{kit.category || "Uncategorized"} · Updated {new Date(kit.updated_at).toLocaleDateString()}</p>
        </button>)}</div>}
    </>}
  </section>;
}
