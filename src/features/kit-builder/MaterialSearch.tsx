import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { apiFetch } from "../../utils/api";
export interface InventoryPick { id: string; name: string; unit: string; sku: string }
const inputClass = "w-full min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500";
export function MaterialSearch({ onPick, disabled }: { onPick: (item: InventoryPick) => void; disabled: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InventoryPick[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const text = query.trim();
    setError('');
    if (text.length < 2) { setResults([]); setOpen(false); setBusy(false); return; }
    let mounted = true;
    setBusy(true);
    const timer = setTimeout(() => {
      apiFetch(`/api/v1/product-templates/materials?q=${encodeURIComponent(text)}`)
        .then((data: InventoryPick[]) => { if (mounted) { setResults(data); setOpen(true); } })
        .catch((reason: unknown) => { if (mounted) { setResults([]); setOpen(false); setError(reason instanceof Error ? reason.message : 'Search unavailable. Check the connection and try again.'); } })
        .finally(() => { if (mounted) setBusy(false); });
    }, 300);
    return () => { mounted = false; clearTimeout(timer); };
  }, [query]);
  const pick = (item: InventoryPick) => { onPick(item); setQuery(""); setResults([]); setOpen(false); };
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          aria-label="Search inventory to add a material"
          placeholder="Search inventory to add a material"
          maxLength={100}
          className={`${inputClass} flex-1`}
          value={query}
          disabled={disabled}
          onChange={event => setQuery(event.target.value)}
        />
      </div>
      {busy && <p role="status" className="mt-1 text-xs text-slate-500">Searching…</p>}
      {error && <p role="alert">{error}</p>}
      {open && !busy && (
        results.length ? (
          <ul className="mt-1 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {results.map(item => (
              <li key={item.id}>
                <button type="button" disabled={disabled} className="w-full min-h-11 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => pick(item)}>
                  <span className="font-medium">{item.name}</span>
                  {item.sku ? <span className="ml-2 text-xs text-slate-500">{item.sku}</span> : null}
                  {item.unit ? <span className="ml-2 text-xs text-slate-500">{item.unit}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-slate-500">No matching inventory items.</p>
        )
      )}
    </div>
  );
}
