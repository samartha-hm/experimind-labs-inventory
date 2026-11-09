import React, { useMemo, useState } from 'react';
import { useData } from '@/src/DataContext';
import { stockStatus, summarizeInventory, type StockStatus } from './inventorySnapshot';
import type { InventoryItem } from '../../types';

const labels: Record<StockStatus, string> = {
  unlimited: 'Common / unlimited', invalid: 'Review data', out: 'Out of stock', low: 'Below threshold', ok: 'At or above threshold',
};
const PAGE_SIZE = 25;

export default function PredictiveAnalyticsTab() {
  const { inventory, loading, inventoryLoadError } = useData();
  return <InventoryReportsView inventory={inventory} loading={loading} error={inventoryLoadError} />;
}

export function InventoryReportsView({ inventory, loading, error = null }: { inventory: InventoryItem[]; loading: boolean; error?: string | null }) {
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const categories = useMemo(() => [...new Set(inventory.map(item => item.category).filter(Boolean))].sort(), [inventory]);
  const scoped = useMemo(() => inventory.filter(item =>
    (!category || item.category === category) &&
    (!query.trim() || `${item.name} ${item.sku ?? ''} ${item.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  ), [inventory, category, query]);
  const summary = useMemo(() => summarizeInventory(scoped), [scoped]);
  const filtered = useMemo(() => scoped.filter(item => !status || stockStatus(item) === status), [scoped, status]);
  const lastPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const control = 'min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

  return (
    <section aria-labelledby="inventory-reports-title" className="space-y-5 text-slate-900 dark:text-slate-100">
      <header>
        <h2 id="inventory-reports-title" className="text-2xl font-bold tracking-tight">Inventory reports</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Current loaded inventory snapshot. Quantities are recorded stock, not available-to-promise stock or a physical count.</p>
      </header>
      <aside className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
        Refresh completeness and freshness are not verified here. Forecasting, turnover, valuation and scheduled email reports are unavailable until their source data and services are connected.
      </aside>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium">Search items
          <input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Name, SKU or category" className={control} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">Category
          <select value={category} onChange={event => { setCategory(event.target.value); setPage(0); }} className={control}>
            <option value="">All categories</option>
            {categories.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">Stock signal
          <select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }} className={control}>
            <option value="">All signals</option>
            {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      {loading ? <div role="status" className="animate-pulse rounded-xl bg-slate-100 p-8 motion-reduce:animate-none dark:bg-slate-800">Loading inventory snapshot…</div> : error ? <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-950 dark:border-red-700 dark:bg-red-950 dark:text-red-100">{error}</p> : <>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {([['Loaded items', summary.total], ['Out of stock', summary.out], ['Below threshold', summary.low], ['Review data', summary.invalid]] as const).map(([label, count]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <dt className="text-sm text-slate-600 dark:text-slate-300">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{count.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-slate-600 dark:text-slate-300">Counts follow search and category. Common / unlimited items are excluded from shortage signals. Below threshold means recorded quantity is strictly below its configured threshold.</p>
        <p role="status" className="text-sm">{filtered.length.toLocaleString()} matching items</p>
        {visible.length === 0 ? <p className="rounded-xl border border-slate-200 p-6 dark:border-slate-700">{inventory.length === 0 ? 'No inventory records are loaded. Check connectivity and your access before treating this as an empty warehouse.' : 'No items match these filters.'}</p> : <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
          {visible.map(item => <li key={item.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0"><h3 className="break-words font-semibold">{item.name}</h3><p className="break-words text-sm text-slate-600 dark:text-slate-300">{item.sku || 'No SKU'} · {item.category || 'Uncategorized'}</p></div>
            <div className="min-w-0 text-sm md:text-right"><p className="font-medium">{labels[stockStatus(item)]}</p><p className="break-words tabular-nums text-slate-600 dark:text-slate-300">Recorded: {Number.isFinite(item.stockQty) ? item.stockQty.toLocaleString() : 'Invalid'} {item.unit} · Threshold: {Number.isFinite(item.threshold) ? item.threshold.toLocaleString() : 'Invalid'}</p></div>
          </li>)}
        </ul>}
        {filtered.length > PAGE_SIZE && <nav aria-label="Inventory report pages" className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className={`${control} disabled:opacity-50`}>Previous</button>
          <span className="text-sm tabular-nums">Page {currentPage + 1} of {lastPage + 1}</span>
          <button type="button" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)} className={`${control} disabled:opacity-50`}>Next</button>
        </nav>}
      </>}
    </section>
  );
}
