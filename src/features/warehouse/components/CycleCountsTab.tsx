import React, { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  Search,
  Building2,
  Plus,
  ArrowRight,
  RotateCcw,
  Check,
  Download,
  Filter
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

interface CycleCountsTabProps {
  role?: string | null;
}

export default function CycleCountsTab({ role }: CycleCountsTabProps) {
  const { wmsCycleCounts = [], createWmsCycleCount, submitWmsCycleCount, approveWmsCycleCount, inventory = [] } = useData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'count' | 'review'>('list');
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);

  // New Audit Form
  const [newTitle, setNewTitle] = useState('Quarterly High-Value STEM Parts Audit');
  const [newWarehouse, setNewWarehouse] = useState('WH-MAIN-01');
  const [newZone, setNewZone] = useState('ALL');
  const [isBlind, setIsBlind] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Physical Count Inputs
  const [counts, setCounts] = useState<Record<string, { countedQty: number; reason: string }>>({});

  const handleStartNewAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await createWmsCycleCount({
        title: newTitle,
        warehouseCode: newWarehouse,
        targetZoneOrCategory: newZone,
        isBlindCount: isBlind,
      });
      showToast('success', 'Audit Initiated', `Created cycle audit ${created.audit_number}`);
      setSelectedAudit(created);
      setActiveTab('count');
    } catch (e: any) {
      showToast('error', 'Error', e.message || 'Failed to start audit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCounts = async () => {
    if (!selectedAudit) return;
    setIsSubmitting(true);
    try {
      const lines = Object.entries(counts).map(([id, c]: [string, { countedQty: number; reason: string }]) => ({
        id,
        countedQty: c.countedQty,
        varianceReason: c.reason,
      }));
      await submitWmsCycleCount(selectedAudit.id, lines);
      showToast('success', 'Counts Recorded', 'Count sheets updated and submitted for manager approval.');
      setActiveTab('list');
    } catch (e: any) {
      showToast('error', 'Error', e.message || 'Failed to submit count');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveVariances = async () => {
    if (!selectedAudit) return;
    setIsSubmitting(true);
    try {
      await approveWmsCycleCount(selectedAudit.id);
      showToast('success', 'Audit Approved', 'Variances posted to Immutable Stock Ledger.');
      setActiveTab('list');
    } catch (e: any) {
      showToast('error', 'Error', e.message || 'Failed to approve variances');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn select-none pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 uppercase">
              WMS Physical Audits
            </span>
            <span className="text-xs text-slate-400 font-mono">Blind & Standard Counts</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-indigo-400" /> Physical Stock Cycle Counts
          </h1>
          <p className="text-xs text-slate-300 font-medium max-w-2xl">
            Schedule periodic inventory audits, capture blind counts without operator bias, and reconcile variances directly into the ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Cycle Count Audit
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md overflow-hidden">
        
        {/* Navigation Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'list' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Audit Records ({wmsCycleCounts.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'create' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              + Initiate New Count
            </button>
          </div>
        </div>

        {/* Tab 1: Audit List */}
        {activeTab === 'list' && (
          <div className="p-6 space-y-4">
            {wmsCycleCounts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Cycle Count Audits Active</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Initiate a blind cycle count to verify physical on-hand stocks against system balances.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Create First Audit
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Audit #</th>
                      <th className="py-3 px-4">Title & Scope</th>
                      <th className="py-3 px-4">Warehouse</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {wmsCycleCounts.map((audit) => (
                      <tr key={audit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {audit.audit_number || audit.id.slice(0, 8)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 dark:text-white block">{audit.title}</span>
                          <span className="text-[10px] text-slate-400">{audit.target_zone_or_category || 'All Items'}</span>
                        </td>
                        <td className="py-3 px-4 font-medium">{audit.warehouse_code}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                            audit.is_blind_count ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                          }`}>
                            {audit.is_blind_count ? 'Blind Count' : 'Standard'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            audit.status === 'approved'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                              : audit.status === 'submitted'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                          }`}>
                            {audit.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {audit.status === 'draft' || audit.status === 'in_progress' ? (
                            <button
                              onClick={() => {
                                setSelectedAudit(audit);
                                setActiveTab('count');
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              Perform Count →
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedAudit(audit);
                                setActiveTab('review');
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              Review & Ledger
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create Form */}
        {activeTab === 'create' && (
          <form onSubmit={handleStartNewAudit} className="p-6 max-w-xl space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Audit Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Warehouse Facility</label>
                <select
                  value={newWarehouse}
                  onChange={(e) => setNewWarehouse(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="WH-MAIN-01">WH-MAIN-01 (Main Lab & Science Assembly)</option>
                  <option value="WH-CLEAN-02">WH-CLEAN-02 (Electronics & Sensor Cleanroom)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category / Zone Filter</label>
                <input
                  type="text"
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  placeholder="e.g. ALL, Electronics, Zone A"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
              <input
                type="checkbox"
                id="blindCheckbox"
                checked={isBlind}
                onChange={(e) => setIsBlind(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="blindCheckbox" className="text-xs cursor-pointer">
                <span className="font-bold text-slate-900 dark:text-white block">Blind Count Mode (Recommended)</span>
                <span className="text-slate-500 dark:text-slate-400">Hides system on-hand quantities from warehouse operators to ensure 100% unbiased physical counts.</span>
              </label>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Starting...' : 'Launch Cycle Count'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Perform Count */}
        {activeTab === 'count' && selectedAudit && (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-200">{selectedAudit.title}</h3>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">Audit #{selectedAudit.audit_number} • Warehouse: {selectedAudit.warehouse_code}</span>
              </div>
              <button
                onClick={handleSaveCounts}
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Physical Counts'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Item SKU & Name</th>
                    <th className="py-3 px-4">Storage Location</th>
                    {!selectedAudit.is_blind_count && <th className="py-3 px-4">System Qty</th>}
                    <th className="py-3 px-4">Physical Count (Pcs)</th>
                    <th className="py-3 px-4">Notes / Discrepancy Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inventory.slice(0, 15).map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">{item.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">{item.binLocation || 'Rack A'}</td>
                      {!selectedAudit.is_blind_count && (
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">{item.stockQty}</td>
                      )}
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          defaultValue={item.stockQty}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCounts((prev) => ({
                              ...prev,
                              [item.id]: {
                                countedQty: val,
                                reason: prev[item.id]?.reason || '',
                              },
                            }));
                          }}
                          className="w-24 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="e.g. Broken packaging / Verified ok"
                          onChange={(e) => {
                            const txt = e.target.value;
                            setCounts((prev) => ({
                              ...prev,
                              [item.id]: {
                                countedQty: prev[item.id]?.countedQty ?? item.stockQty,
                                reason: txt,
                              },
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
