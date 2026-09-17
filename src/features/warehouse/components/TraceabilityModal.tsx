import React, { useState } from 'react';
import {
  GitFork,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Package,
  School,
  Calendar,
  Layers,
  ShieldCheck,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { TraceabilityService, ForwardTraceResult, BackwardTraceResult } from '@/src/services/TraceabilityService';
import { useToast } from '@/src/contexts/ToastContext';

interface TraceabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialTab?: 'forward' | 'backward';
}

export default function TraceabilityModal({
  isOpen,
  onClose,
  initialQuery = 'LOT-LCSC-2026-ESP32',
  initialTab = 'forward'
}: TraceabilityModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'forward' | 'backward'>(initialTab);
  const [query, setQuery] = useState(initialQuery);

  const [forwardResult, setForwardResult] = useState<ForwardTraceResult | null>(() => {
    return TraceabilityService.forwardTrace(initialQuery);
  });
  const [backwardResult, setBackwardResult] = useState<BackwardTraceResult | null>(null);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (activeTab === 'forward') {
      const res = TraceabilityService.forwardTrace(query.trim());
      setForwardResult(res);
      showToast('info', 'Forward Trace Executed', `Found ${res.totalKitsAffected} kits containing this component.`);
    } else {
      const res = TraceabilityService.backwardTrace(query.trim());
      setBackwardResult(res);
      showToast('info', 'Backward Trace Executed', `Loaded hardware pedigree for ${res.serialNumber}.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Bidirectional Component Traceability & Instant Recall Tree
              </h2>
              <p className="text-xs text-slate-400">
                Track supplier component lots forward to customer orders or trace kit serials backward to silicon chip UIDs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Query Bar */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('forward');
                setQuery('LOT-LCSC-2026-ESP32');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'forward'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Forward Trace (Lot → Kits & Orders)
            </button>
            <button
              onClick={() => {
                setActiveTab('backward');
                setQuery('EXP-ANB-26-0001');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'backward'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Backward Trace (Serial → Chip UID & Lots)
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={
                  activeTab === 'forward'
                    ? 'Enter Component Reel Lot Number or MPN (e.g. LOT-LCSC-2026-ESP32)...'
                    : 'Enter Kit Serial Number (e.g. EXP-ANB-26-0001)...'
                }
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
            >
              Run Trace
            </button>
          </form>
        </div>

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'forward' && forwardResult && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Queried Component</span>
                  <div className="text-sm font-bold text-white truncate">{forwardResult.targetComponent.componentName}</div>
                  <div className="text-[11px] font-mono text-slate-400">{forwardResult.targetComponent.mpn} ({forwardResult.targetComponent.supplier})</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Affected Kits Built</span>
                  <div className="text-xl font-mono font-bold text-amber-400">{forwardResult.totalKitsAffected} Units</div>
                  <div className="text-[11px] text-slate-400">Manufactured with this lot</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Dispatched Institutional Orders</span>
                  <div className="text-xl font-mono font-bold text-rose-400">{forwardResult.totalOrdersAffected} Orders</div>
                  <div className="text-[11px] text-slate-400">Schools/Colleges requiring notification</div>
                </div>
              </div>

              {/* Affected Orders / Schools */}
              {forwardResult.affectedOrders.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <School className="w-4 h-4 text-indigo-400" />
                    Destination Educational Institutions
                  </h3>
                  <div className="space-y-2">
                    {forwardResult.affectedOrders.map(o => (
                      <div
                        key={o.salesOrderId}
                        className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{o.institutionName}</div>
                          <div className="text-[11px] text-slate-400">Order: {o.salesOrderId} • State: {o.state} • Date: {o.orderDate.slice(0, 10)}</div>
                        </div>
                        <span className="px-2 py-1 bg-amber-950/80 border border-amber-800 text-amber-300 font-mono text-[10px] rounded-lg">
                          {o.kitSerials.length} Serial{o.kitSerials.length === 1 ? '' : 's'} Affected
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Affected Kits List */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-400" />
                  Kit Serials Built with this Lot
                </h3>
                <div className="space-y-2">
                  {forwardResult.affectedKits.map(k => (
                    <div
                      key={k.serialNumber}
                      className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-indigo-300">{k.serialNumber}</span>
                        <div className="text-[11px] text-slate-400">{k.kitName} (Batch: {k.batchNumber})</div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            k.dispatchStatus === 'DISPATCHED_TO_SCHOOL'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {k.dispatchStatus === 'DISPATCHED_TO_SCHOOL' ? 'Dispatched' : 'In Lab'}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{k.buildDate.slice(0, 10)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backward' && backwardResult && (
            <div className="space-y-4">
              {/* Hardware Pedigree Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white uppercase">Hardware Silicon & QC Pedigree</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-mono text-[10px]">
                    Loopback: {backwardResult.hardwarePedigree.loopbackVerification}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase">MCU Chip UID:</span>
                    <div className="font-mono text-white text-[11px] truncate">{backwardResult.hardwarePedigree.mcuChipUid || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase">Factory MAC:</span>
                    <div className="font-mono text-white text-[11px]">{backwardResult.hardwarePedigree.macAddress || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase">Firmware:</span>
                    <div className="font-mono text-white text-[11px]">{backwardResult.hardwarePedigree.firmwareVersion || 'v1.0.0'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase">QC Tech:</span>
                    <div className="text-white text-[11px]">{backwardResult.hardwarePedigree.qcTechnicianId}</div>
                  </div>
                </div>
              </div>

              {/* Component Origins */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Supplier Component Lot Origins
                </h3>
                {backwardResult.componentPedigree.length > 0 ? (
                  <div className="space-y-2">
                    {backwardResult.componentPedigree.map((c, i) => (
                      <div
                        key={i}
                        className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{c.componentName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            IPN: {c.ipn} • MPN: {c.mpn}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-indigo-300 font-bold">{c.lotNumber}</span>
                          <div className="text-[10px] text-slate-500">{c.supplierName} ({c.inboundPo})</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No discrete component lots registered for this serial number.</p>
                )}
              </div>

              {/* Distribution */}
              {backwardResult.distributionPedigree && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Shipped To Institution</span>
                    <div className="font-bold text-white">{backwardResult.distributionPedigree.institutionName}</div>
                    <div className="text-[11px] text-slate-400">Order: {backwardResult.distributionPedigree.salesOrderId}</div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Dispatched: {backwardResult.distributionPedigree.dispatchDate.slice(0, 10)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
