import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Sliders,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  UserCheck,
  Shield,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
  Sparkles,
  Lock,
  ChevronDown
} from 'lucide-react';
import { useApproval, ApprovalRequest } from '@/src/contexts/ApprovalContext';
import { useToast } from '@/src/contexts/ToastContext';
import CustomRolesModal from './CustomRolesModal';

export default function ApprovalCenterTab() {
  const { requests, approveRequest, rejectRequest, thresholds, updateThresholds, pendingCount, roles } = useApproval();
  const { showToast } = useToast();

  const [activeFilter, setActiveFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [isThresholdsModalOpen, setIsThresholdsModalOpen] = useState(false);

  // Review Modals
  const [reviewingRequest, setReviewingRequest] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNote, setReviewNote] = useState('');

  // Threshold form
  const [tempThresholds, setTempThresholds] = useState(thresholds);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesFilter = activeFilter === 'ALL' || r.status === activeFilter;
      const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.targetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.submittedBy.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [requests, activeFilter, searchQuery]);

  const handleExecuteReview = async () => {
    if (!reviewingRequest) return;
    if (actionType === 'APPROVE') {
      await approveRequest(reviewingRequest.id, reviewNote.trim() || 'Approved via Governance Console.');
      showToast('success', `Authorized and approved ${reviewingRequest.title}`);
    } else {
      if (!reviewNote.trim()) {
        showToast('error', 'Please provide a reason for rejecting this request.');
        return;
      }
      await rejectRequest(reviewingRequest.id, reviewNote.trim());
      showToast('info', `Rejected ${reviewingRequest.title}`);
    }
    setReviewingRequest(null);
    setReviewNote('');
  };

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    updateThresholds(tempThresholds);
    setIsThresholdsModalOpen(false);
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn">
      
      {/* Top Banner Header */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Approval Center & Governance Inbox
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black animate-pulse">
                    {pendingCount} PENDING
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Multi-level authorization chains for high-value Purchase Orders, stock write-offs, and Kit BOM engineering changes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setTempThresholds(thresholds);
              setIsThresholdsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>Approval Rules & Thresholds</span>
          </button>

          <button
            onClick={() => setIsRolesModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            <span>Custom Roles & Permissions Matrix ({roles.length})</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Pending Reviews</span>
          <strong className="text-2xl font-black text-amber-500 mt-1 block font-mono">{pendingCount}</strong>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Requires Authorized Sign-off</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">PO Approval Tier 1</span>
          <strong className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block font-mono">
            ₹{thresholds.poTier1Threshold.toLocaleString()}
          </strong>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Procurement Lead Required</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">PO Approval Tier 2</span>
          <strong className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block font-mono">
            ₹{thresholds.poTier2Threshold.toLocaleString()}
          </strong>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Finance / Admin Dual Approval</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Stock Scrap Limit</span>
          <strong className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">
            {thresholds.stockAdjustQtyThreshold} Units
          </strong>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Supervisor Sign-off Threshold</span>
        </div>
      </div>

      {/* Main Inbox Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-5">
        
        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200/80 dark:border-slate-700 w-full sm:w-auto">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((filterKey) => {
              const count = requests.filter(r => filterKey === 'ALL' || r.status === filterKey).length;
              return (
                <button
                  key={filterKey}
                  onClick={() => setActiveFilter(filterKey)}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeFilter === filterKey
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{filterKey === 'PENDING' ? '⏳ Pending' : filterKey === 'APPROVED' ? '✅ Approved' : filterKey === 'REJECTED' ? '❌ Rejected' : 'All'}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[9px] font-mono font-bold">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search request title, ID, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';

            return (
              <div
                key={req.id}
                className={`p-5 rounded-3xl border transition-all space-y-4 ${
                  isPending
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60 shadow-xs'
                    : isApproved
                    ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700'
                    : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/60'
                }`}
              >
                {/* Header info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold">
                        {req.type === 'purchase_order' ? '🛒 Purchase Order' : req.type === 'stock_adjustment' ? '📦 Stock Write-Off' : '🔬 BOM Recipe Change'}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {req.targetId}
                      </span>
                      {req.amount && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs shadow-2xs">
                          ₹{req.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">{req.title}</h3>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span>Submitted by <strong>{req.submittedBy.name}</strong> ({req.submittedBy.role})</span>
                      <span>•</span>
                      <span>{new Date(req.submittedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                    {isPending ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setReviewingRequest(req);
                            setActionType('APPROVE');
                            setReviewNote('');
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => {
                            setReviewingRequest(req);
                            setActionType('REJECT');
                            setReviewNote('');
                          }}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    ) : isApproved ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-xs border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-4 h-4" /> Authorized by {req.reviewedBy?.name || 'Admin'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs border border-rose-200 dark:border-rose-800">
                        <XCircle className="w-4 h-4" /> Rejected
                      </div>
                    )}
                  </div>
                </div>

                {/* Diff inspection preview */}
                {req.diffs && req.diffs.length > 0 && (
                  <div className="p-3 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Proposed Operational Property Changes (Diff):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {req.diffs.map((d, dIdx) => (
                        <div key={dIdx} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs flex flex-col gap-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{d.field}</span>
                          <div className="flex items-center gap-2 text-[10px] font-mono">
                            <span className="line-through text-rose-500 truncate">{d.oldValue}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate">{d.newValue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviewer Note (If reviewed) */}
                {req.reviewedBy && (
                  <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 text-xs flex items-start gap-2 text-slate-600 dark:text-slate-300">
                    <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 dark:text-white">{req.reviewedBy.name}:</strong> "{req.reviewedBy.note}"
                      <span className="text-[10px] text-slate-400 block mt-0.5">{new Date(req.reviewedBy.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredRequests.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">All Clear! No requests in this view.</p>
              <p className="text-slate-400 text-[11px]">When high-value POs or stock write-offs are triggered, they will appear here for governance review.</p>
            </div>
          )}
        </div>
      </div>

      {/* APPROVE / REJECT MODAL */}
      {reviewingRequest && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                {actionType === 'APPROVE' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Authorize & Approve Request
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    Reject Request
                  </>
                )}
              </h3>
              <button
                onClick={() => setReviewingRequest(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">{reviewingRequest.title}</span>
              <span className="text-[10px] font-mono text-slate-400 block">ID: {reviewingRequest.targetId} • Submitter: {reviewingRequest.submittedBy.name}</span>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                {actionType === 'APPROVE' ? 'Reviewer Note (Optional)' : 'Rejection Reason (Required) *'}
              </label>
              <textarea
                rows={3}
                required={actionType === 'REJECT'}
                placeholder={actionType === 'APPROVE' ? 'e.g. Verified with budget ledger; proceeding.' : 'e.g. Exceeds department quota; please revise quantity.'}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReviewingRequest(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReview}
                className={`px-5 py-2 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5 ${
                  actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionType === 'APPROVE' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                <span>{actionType === 'APPROVE' ? 'Confirm Sign-Off' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* APPROVAL THRESHOLDS CONFIGURATION MODAL */}
      {isThresholdsModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                Configure Approval Thresholds & Rules
              </h3>
              <button
                onClick={() => setIsThresholdsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveThresholds} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  PO Tier 1 Approval Threshold (₹ INR)
                </label>
                <input
                  type="number"
                  value={tempThresholds.poTier1Threshold}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, poTier1Threshold: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Purchase Orders above this amount require Procurement Lead review.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  PO Tier 2 High-Value Dual Approval Threshold (₹ INR)
                </label>
                <input
                  type="number"
                  value={tempThresholds.poTier2Threshold}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, poTier2Threshold: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  High-value orders above this amount require Finance Director / Admin sign-off.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Stock Write-Off Max Scrap Quantity (Units)
                </label>
                <input
                  type="number"
                  value={tempThresholds.stockAdjustQtyThreshold}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, stockAdjustQtyThreshold: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Inventory adjustments exceeding this unit count trigger Supervisor review.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsThresholdsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save Policy Rules
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CUSTOM ROLES & PERMISSIONS MODAL */}
      <CustomRolesModal
        isOpen={isRolesModalOpen}
        onClose={() => setIsRolesModalOpen(false)}
      />
    </div>
  );
}
