import React, { useState } from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  Search,
  Box,
  ShieldAlert,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

interface BatchRecord {
  id: string;
  lotCode: string;
  itemId: string;
  itemName: string;
  category: string;
  batchQty: number;
  expiryDate: string;
  storageCondition: string;
}

export default function BatchExpiryTab() {
  const { inventory } = useData();
  const { showToast } = useToast();

  const [batches, setBatches] = useState<BatchRecord[]>([
    {
      id: 'BAT-2026-001',
      lotCode: 'LOT-CHM-8821',
      itemId: '1766124946616',
      itemName: 'Ph Papers',
      category: 'Chemicals / Reagents',
      batchQty: 10,
      expiryDate: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0], // 15 days left
      storageCondition: 'Dry Room Temp (15-25°C)',
    },
    {
      id: 'BAT-2026-002',
      lotCode: 'LOT-CHM-9910',
      itemId: '1766128075625',
      itemName: 'Spirit Lamp Fuel & Reagent',
      category: 'Chemicals',
      batchQty: 8,
      expiryDate: new Date(Date.now() + 86400000 * 180).toISOString().split('T')[0], // 180 days left
      storageCondition: 'Cold Storage (2-8°C)',
    },
    {
      id: 'BAT-2025-099',
      lotCode: 'LOT-OLD-7721',
      itemId: '1766124805780',
      itemName: 'Blotting Paper Box',
      category: 'Stationary',
      batchQty: 2,
      expiryDate: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], // Expired 5 days ago
      storageCondition: 'Standard Storage',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lotCode, setLotCode] = useState('LOT-2026-X9');
  const [selectedItemId, setSelectedItemId] = useState(inventory[0]?.id || '');
  const [batchQty, setBatchQty] = useState('10');
  const [expiryDate, setExpiryDate] = useState('2026-12-31');
  const [storageCondition, setStorageCondition] = useState('Dry Room Temp (15-25°C)');

  const getExpiryStatus = (expDateStr: string) => {
    const today = new Date();
    const expDate = new Date(expDateStr);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) return { label: 'EXPIRED', days: Math.abs(diffDays), color: 'bg-rose-600 text-white border-rose-700' };
    if (diffDays <= 30) return { label: `EXPIRING SOON (${diffDays}d)`, days: diffDays, color: 'bg-amber-500 text-white border-amber-600 animate-pulse' };
    return { label: `HEALTHY (${diffDays}d)`, days: diffDays, color: 'bg-emerald-600 text-white border-emerald-700' };
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find((i) => i.id === selectedItemId);
    if (!item || !lotCode || !expiryDate) return;

    const newBatch: BatchRecord = {
      id: `BAT-${Date.now().toString().slice(-4)}`,
      lotCode: lotCode.trim(),
      itemId: item.id,
      itemName: item.name,
      category: item.category || 'General',
      batchQty: parseInt(batchQty) || 1,
      expiryDate,
      storageCondition,
    };

    setBatches([newBatch, ...batches]);
    setIsModalOpen(false);
    showToast('success', 'Batch Registered', `Registered Lot #${newBatch.lotCode} for ${item.name} expiring on ${expiryDate}`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-500/40 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-rose-400" /> BATCH & EXPIRY MANAGEMENT
            </span>
            <span className="text-slate-400 text-xs">• Lot Compliance Engine</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Batch & Reagent Expiry Tracker</h2>
          <p className="text-xs text-slate-300">
            Track lot/batch expiration dates, cold-storage environmental conditions, and early-warning alerts for chemical reagents and sensitive components.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Register New Batch Lot
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Expired Batches Alert</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {batches.filter((b) => getExpiryStatus(b.expiryDate).label === 'EXPIRED').length} Lots
            </div>
          </div>
          <ShieldAlert className="w-8 h-8 text-rose-500/40" />
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Expiring in &lt;30 Days</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {batches.filter((b) => getExpiryStatus(b.expiryDate).label.includes('EXPIRING SOON')).length} Lots
            </div>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-500/40" />
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Healthy Active Batches</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {batches.filter((b) => getExpiryStatus(b.expiryDate).label.includes('HEALTHY')).length} Lots
            </div>
          </div>
          <ShieldCheck className="w-8 h-8 text-emerald-500/40" />
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-rose-500" /> Active Inventory Lot & Batch Audit
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">Showing {batches.length} batch records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/60 dark:border-slate-700">
                <th className="p-3.5">Batch ID & Lot Code</th>
                <th className="p-3.5">Item Name & Category</th>
                <th className="p-3.5 text-center">Batch Size</th>
                <th className="p-3.5">Storage Environment</th>
                <th className="p-3.5">Expiry Date</th>
                <th className="p-3.5 text-right">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              {batches.map((b) => {
                const status = getExpiryStatus(b.expiryDate);
                return (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{b.id}</div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400">{b.lotCode}</div>
                    </td>
                    <td className="p-3.5 font-sans font-bold text-slate-900 dark:text-slate-100">
                      {b.itemName}
                      <div className="text-[10px] text-slate-400 font-mono font-normal">{b.category}</div>
                    </td>
                    <td className="p-3.5 text-center font-bold text-sm">{b.batchQty} pcs</td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400 font-sans text-xs">{b.storageCondition}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">{b.expiryDate}</td>
                    <td className="p-3.5 text-right">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg shadow-xs ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-400" /> Register Inventory Batch & Lot
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                ×
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-6 space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div>
                <label className="block font-bold uppercase text-[10px] text-slate-400 mb-1">Select Catalog Item *</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                >
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-[10px] text-slate-400 mb-1">Lot / Batch Code *</label>
                  <input
                    type="text"
                    required
                    value={lotCode}
                    onChange={(e) => setLotCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-[10px] text-slate-400 mb-1">Batch Size (Qty) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={batchQty}
                    onChange={(e) => setBatchQty(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-[10px] text-slate-400 mb-1">Expiration Date *</label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-[10px] text-slate-400 mb-1">Storage Condition</label>
                <select
                  value={storageCondition}
                  onChange={(e) => setStorageCondition(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                >
                  <option value="Dry Room Temp (15-25°C)">Dry Room Temp (15-25°C)</option>
                  <option value="Cold Storage (2-8°C)">Cold Storage (2-8°C)</option>
                  <option value="Deep Freeze (-20°C)">Deep Freeze (-20°C)</option>
                  <option value="ESD Safe Storage">ESD Safe Shielded Storage</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md"
                >
                  Register Lot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
