import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  Search,
  Building2,
  Plus
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

interface CycleCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: string | null;
}

export default function CycleCountModal({ isOpen, onClose, role }: CycleCountModalProps) {
  const { wmsCycleCounts, createWmsCycleCount, submitWmsCycleCount, approveWmsCycleCount, inventory } = useData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'count' | 'review'>('list');
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);

  // New Audit Form
  const [newTitle, setNewTitle] = useState('Weekly High-Velocity Parts Audit');
  const [newWarehouse, setNewWarehouse] = useState('WH-MAIN-01');
  const [newZone, setNewZone] = useState('ALL');
  const [isBlind, setIsBlind] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Physical Count Inputs
  const [counts, setCounts] = useState<Record<string, { countedQty: number; reason: string }>>({});

  if (!isOpen) return null;

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

  const handleCountSubmit = async () => {
    if (!selectedAudit) return;
    setIsSubmitting(true);
    try {
      const payload = Object.entries(counts).map(([lineId, data]: [string, { countedQty: number; reason: string }]) => ({
        lineId,
        countedQty: Number(data.countedQty),
        reason: data.reason || 'Physical Count Recorded',
      }));

      const submitted = await submitWmsCycleCount(selectedAudit.id, payload);
      showToast('success', 'Counts Submitted', 'Submitted audit for manager variance review');
      setSelectedAudit(submitted);
      setActiveTab('review');
    } catch (e: any) {
      showToast('error', 'Error', e.message || 'Failed to submit counts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveVariance = async () => {
    if (!selectedAudit) return;
    setIsSubmitting(true);
    try {
      await approveWmsCycleCount(selectedAudit.id);
      showToast('success', 'Audit Approved & Posted', 'Adjusted inventory and posted variance entries to Stock Ledger');
      onClose();
    } catch (e: any) {
      showToast('error', 'Error', e.message || 'Approval failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <span className="font-mono text-xs text-amber-400 font-bold uppercase tracking-wider">
                ABC Cycle Counting & Inventory Audits
              </span>
              <h2 className="text-xl font-black text-white">Physical Stock Reconciliation</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('create')}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Audit</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation */}
        <div className="px-6 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
              activeTab === 'list' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
            }`}
          >
            Audit History ({wmsCycleCounts.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
              activeTab === 'create' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
            }`}
          >
            New Audit Config
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: AUDIT LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {wmsCycleCounts.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-500">No cycle audits recorded yet. Click "Start New Audit" to begin a physical count.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  {wmsCycleCounts.map((audit: any) => (
                    <div key={audit.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{audit.audit_number}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            audit.status === 'approved_posted'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : audit.status === 'pending_review'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {audit.status}
                          </span>
                        </div>
                        <strong className="text-sm text-slate-900 dark:text-white block mt-0.5">{audit.title}</strong>
                        <span className="text-xs text-slate-400">Target: {audit.target_zone_or_category} • {audit.lines?.length || 0} Line Items</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {audit.status === 'in_progress' && (
                          <button
                            onClick={() => {
                              setSelectedAudit(audit);
                              setActiveTab('count');
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Enter Counts
                          </button>
                        )}
                        {audit.status === 'pending_review' && (
                          <button
                            onClick={() => {
                              setSelectedAudit(audit);
                              setActiveTab('review');
                            }}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Review & Post
                          </button>
                        )}
                        {audit.status === 'approved_posted' && (
                          <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Reconciled
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE AUDIT */}
          {activeTab === 'create' && (
            <form onSubmit={handleStartNewAudit} className="space-y-4 max-w-lg mx-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Audit Title / Reason</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target Category or Storage Zone</label>
                <select
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Items (Full Facility Audit)</option>
                  <option value="Electronics">Electronics & ICs</option>
                  <option value="Sensors">Sensors & Modules</option>
                  <option value="Chemicals">Chemicals & Reagents</option>
                  <option value="Hardware">Hardware & Fasteners</option>
                </select>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="isBlind"
                  checked={isBlind}
                  onChange={(e) => setIsBlind(e.target.checked)}
                  className="rounded text-indigo-600 w-4 h-4"
                />
                <label htmlFor="isBlind" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  <strong>Blind Count Mode</strong> (Hides expected system numbers to prevent confirmation bias)
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>{isSubmitting ? 'Starting...' : 'Generate Physical Audit Manifest'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PHYSICAL COUNT ENTRY */}
          {activeTab === 'count' && selectedAudit && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <div>
                  <strong>Audit in progress: {selectedAudit.audit_number}</strong> — Record physical quantities in bins.
                </div>
                <span className="font-mono text-[10px] font-bold uppercase bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                  {selectedAudit.is_blind_count ? 'Blind Count Active' : 'Open Count'}
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Component</th>
                      <th className="p-3">Bin Location</th>
                      {!selectedAudit.is_blind_count && <th className="p-3 text-center">System Qty</th>}
                      <th className="p-3">Counted Qty</th>
                      <th className="p-3">Notes / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(selectedAudit.lines || []).map((line: any) => (
                      <tr key={line.id}>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{line.item_name}</td>
                        <td className="p-3 font-mono text-indigo-600 dark:text-indigo-400">{line.bin_location || 'Unassigned'}</td>
                        {!selectedAudit.is_blind_count && <td className="p-3 text-center font-mono">{line.system_qty}</td>}
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={counts[line.id]?.countedQty ?? ''}
                            onChange={(e) => setCounts(prev => ({
                              ...prev,
                              [line.id]: { ...prev[line.id], countedQty: Number(e.target.value) }
                            }))}
                            className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            placeholder="Discrepancy reason..."
                            value={counts[line.id]?.reason || ''}
                            onChange={(e) => setCounts(prev => ({
                              ...prev,
                              [line.id]: { ...prev[line.id], reason: e.target.value }
                            }))}
                            className="w-48 px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 border rounded-xl text-xs font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCountSubmit}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Submit Physical Counts for Review</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: VARIANCE REVIEW & POST */}
          {activeTab === 'review' && selectedAudit && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Audit Variance Summary</h3>
                  <p className="text-xs text-slate-500">Review discrepancies between physical counts and system balances.</p>
                </div>
                <div className="font-mono text-sm font-bold text-amber-600">
                  Total Variance: ₹{selectedAudit.total_variance_value?.toLocaleString('en-IN') || 0}
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Part</th>
                      <th className="p-3 text-center">System Qty</th>
                      <th className="p-3 text-center">Counted Qty</th>
                      <th className="p-3 text-center">Variance Qty</th>
                      <th className="p-3 text-right">Variance Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(selectedAudit.lines || []).map((line: any) => {
                      const varQty = Number(line.variance_qty || 0);
                      return (
                        <tr key={line.id}>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{line.item_name}</td>
                          <td className="p-3 text-center font-mono">{line.system_qty}</td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">{line.counted_qty ?? 'N/A'}</td>
                          <td className={`p-3 text-center font-mono font-bold ${varQty < 0 ? 'text-rose-500' : varQty > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {varQty > 0 ? `+${varQty}` : varQty}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            ₹{Number(line.variance_value || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 border rounded-xl text-xs font-bold"
                >
                  Close
                </button>
                {selectedAudit.status === 'pending_review' && (
                  <button
                    type="button"
                    onClick={handleApproveVariance}
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Post Discrepancies to Ledger</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
