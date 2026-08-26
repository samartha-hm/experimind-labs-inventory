import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Layers,
  FileSpreadsheet,
  Building2,
  Calendar,
  Tag,
  CheckCircle2,
  Package,
  Plus
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { StockTransactionType } from '@/src/types';

export default function StockLedgerTab() {
  const { stockLedger, postStockAdjustment, inventory, loadStockLedger } = useData();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Manual Adjustment Form State
  const [selectedItemId, setSelectedItemId] = useState('');
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('Stock Count Correction');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustBin, setAdjustBin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered Ledger Entries
  const filteredEntries = useMemo(() => {
    return stockLedger.filter(entry => {
      const matchSearch =
        entry.item_name.toLowerCase().includes(search.toLowerCase()) ||
        entry.item_sku.toLowerCase().includes(search.toLowerCase()) ||
        (entry.reference_id && entry.reference_id.toLowerCase().includes(search.toLowerCase())) ||
        (entry.reason_code && entry.reason_code.toLowerCase().includes(search.toLowerCase())) ||
        (entry.bin_location && entry.bin_location.toLowerCase().includes(search.toLowerCase()));

      const matchType = typeFilter === 'ALL' || entry.transaction_type === typeFilter;
      return matchSearch && matchType;
    });
  }, [stockLedger, search, typeFilter]);

  const handlePostAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || adjustQty === 0) {
      alert('Please select an item and provide a non-zero adjustment delta.');
      return;
    }

    setIsSubmitting(true);
    try {
      await postStockAdjustment(selectedItemId, adjustQty, adjustBin || undefined, adjustReason, adjustNotes);
      showToast('success', 'Adjustment Posted', `Recorded ${adjustQty > 0 ? `+${adjustQty}` : adjustQty} units to Immutable Stock Ledger`);
      setIsAdjustModalOpen(false);
      setSelectedItemId('');
      setAdjustQty(0);
      setAdjustNotes('');
    } catch (e: any) {
      showToast('error', 'Adjustment Error', e.message || 'Failed to post adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCsv = () => {
    const headers = ['Timestamp', 'Transaction Type', 'Part Name', 'SKU', 'Bin Location', 'Qty Delta', 'Unit Cost (INR)', 'Running Balance', 'Reference', 'Reason', 'Actor'];
    const rows = filteredEntries.map(e => [
      e.created_at,
      e.transaction_type,
      `"${e.item_name.replace(/"/g, '""')}"`,
      e.item_sku,
      e.bin_location || 'N/A',
      e.qty_delta,
      e.unit_cost,
      e.running_balance,
      e.reference_id || 'N/A',
      `"${(e.reason_code || '').replace(/"/g, '""')}"`,
      e.actor_name || 'System'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Ledger_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBadgeStyle = (type: StockTransactionType) => {
    switch (type) {
      case 'PO_RECEIPT':
      case 'TRANSFER_IN':
      case 'KIT_PRODUCTION':
      case 'RETURN_RESTOCK':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'SO_SHIPMENT':
      case 'TRANSFER_OUT':
      case 'KIT_CONSUMPTION':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'CYCLE_COUNT_VARIANCE':
      case 'MANUAL_ADJUSTMENT':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase flex items-center gap-1">
              <History className="w-3 h-3 text-emerald-400" /> APPEND-ONLY IMMUTABLE STOCK JOURNAL
            </span>
            <span className="text-slate-400 text-xs">• Real-Time Double-Entry Inventory Audit</span>
          </div>
          <h2 className="text-2xl font-black text-white">Stock Ledger & Movement History</h2>
          <p className="text-xs text-slate-300">
            Every inventory receipt, shipment, transfer, BOM kitting consumption, and cycle audit variance is permanently recorded.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={exportCsv}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-xs transition-all cursor-pointer flex items-center gap-2 border border-slate-700 shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-indigo-600/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Post Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search part, SKU, reference, bin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Movement Types ({stockLedger.length})</option>
            <option value="PO_RECEIPT">PO Receipts (Inbound)</option>
            <option value="SO_SHIPMENT">SO Shipments (Outbound)</option>
            <option value="TRANSFER_IN">Transfer In</option>
            <option value="TRANSFER_OUT">Transfer Out</option>
            <option value="MANUAL_ADJUSTMENT">Manual Adjustments</option>
            <option value="KIT_CONSUMPTION">BOM Kit Consumption</option>
            <option value="KIT_PRODUCTION">BOM Kit Packed</option>
            <option value="CYCLE_COUNT_VARIANCE">Cycle Audit Variances</option>
            <option value="INITIAL_BALANCE">Initial Opening Balance</option>
          </select>
        </div>
      </div>

      {/* Ledger Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Transaction Type</th>
                <th className="p-4">Component / Part</th>
                <th className="p-4">Location / Bin</th>
                <th className="p-4 text-center">Movement Delta</th>
                <th className="p-4 text-center">Running Balance</th>
                <th className="p-4">Reference & Reason</th>
                <th className="p-4 text-right">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No ledger entries match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isPositive = Number(entry.qty_delta) > 0;
                  const isNegative = Number(entry.qty_delta) < 0;

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {new Date(entry.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${getBadgeStyle(entry.transaction_type)}`}>
                          {entry.transaction_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <strong className="text-slate-900 dark:text-white block">{entry.item_name}</strong>
                        <span className="font-mono text-[10px] text-slate-400">SKU: {entry.item_sku}</span>
                      </td>
                      <td className="p-4 whitespace-nowrap font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {entry.bin_location || 'Unassigned'}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap font-mono font-bold">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md ${
                          isPositive
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                            : isNegative
                            ? 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                            : 'text-slate-400'
                        }`}>
                          {isPositive && <ArrowDownLeft className="w-3 h-3" />}
                          {isNegative && <ArrowUpRight className="w-3 h-3" />}
                          {isPositive ? `+${entry.qty_delta}` : entry.qty_delta}
                        </span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap font-mono font-bold text-slate-900 dark:text-white">
                        {entry.running_balance}
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-slate-900 dark:text-white font-bold">
                          {entry.reason_code || 'General Entry'}
                        </div>
                        {entry.reference_id && (
                          <span className="font-mono text-[10px] text-slate-400">
                            Ref: {entry.reference_id}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap text-[11px] text-slate-500">
                        {entry.actor_name || 'System Operator'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white">Post Stock Adjustment</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostAdjustment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Component</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const item = inventory.find(i => i.id === e.target.value);
                    if (item?.binLocation) setAdjustBin(item.binLocation);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                  required
                >
                  <option value="">-- Choose Item --</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (On hand: {item.stockQty} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity Delta (Positive for Addition, Negative for Deduction)
                </label>
                <input
                  type="number"
                  placeholder="e.g. +10 or -5"
                  value={adjustQty || ''}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bin Location</label>
                <input
                  type="text"
                  placeholder="e.g. Rack - Shelf 1"
                  value={adjustBin}
                  onChange={(e) => setAdjustBin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mandatory Reason Code</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-medium"
                >
                  <option value="Physical Count Reconciliation">Physical Count Reconciliation</option>
                  <option value="Damaged / Expired Goods">Damaged / Expired Goods</option>
                  <option value="Lab Testing Sample Taken">Lab Testing Sample Taken</option>
                  <option value="Supplier Sample Addition">Supplier Sample Addition</option>
                  <option value="Scrap / Defective Quarantine">Scrap / Defective Quarantine</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Audit Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Additional context..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Posting...' : 'Post to Ledger'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
