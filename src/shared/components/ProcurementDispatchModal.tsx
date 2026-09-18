import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  Share2,
  Copy,
  Check,
  Package,
  Layers,
  ShoppingBag,
  Truck,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  QrCode,
  Search,
  Filter,
  Building2,
  Calendar,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  ZoomIn
} from 'lucide-react';
import {
  DispatchReportService,
  DispatchReportSummary,
  DispatchItem,
  ActionChannel
} from '../../services/DispatchReportService';
import { ProjectManagementService } from '../../services/ProjectManagementService';
import { ProductionWorkflowService } from '../../services/ProductionWorkflowService';
import { Project } from '../../data/projectsDataset';
import ItemImage from './ItemImage';
import ImagePreviewModal from './ImagePreviewModal';
import { useToast } from '../../contexts/ToastContext';

interface ProcurementDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  initialMultiplier?: number;
  initialSource?: 'PROJECT' | 'PRODUCTION_MATRIX';
}

export default function ProcurementDispatchModal({
  isOpen,
  onClose,
  projectId,
  initialMultiplier = 5,
  initialSource = 'PROJECT'
}: ProcurementDispatchModalProps) {
  const { showToast } = useToast();

  // Mode & Project Selection
  const [sourceMode, setSourceMode] = useState<'PROJECT' | 'PRODUCTION_MATRIX'>(initialSource);
  const [projects, setProjects] = useState<Project[]>(() => ProjectManagementService.getAllProjects());
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projectId || projects[0]?.id || 'PRJ-001'
  );
  const [batchMultiplier, setBatchMultiplier] = useState<number>(initialMultiplier);
  const [activeChannelFilter, setActiveChannelFilter] = useState<ActionChannel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  // Preview Image Lightbox
  const [previewItem, setPreviewItem] = useState<DispatchItem | null>(null);

  // Print Mode
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState<boolean>(false);

  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
      setSourceMode('PROJECT');
      const p = ProjectManagementService.getProjectById(projectId);
      if (p && p.defaultBatchMultiplier) {
        setBatchMultiplier(p.defaultBatchMultiplier);
      }
    }
  }, [projectId]);

  useEffect(() => {
    const handleUpdate = () => {
      setProjects(ProjectManagementService.getAllProjects());
    };
    window.addEventListener('experimind_projects_updated', handleUpdate);
    return () => window.removeEventListener('experimind_projects_updated', handleUpdate);
  }, []);

  // Active Project Reference
  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  // Compute Dispatch Report Summary
  const dispatchSummary: DispatchReportSummary = useMemo(() => {
    if (sourceMode === 'PROJECT' && activeProject) {
      const rep = DispatchReportService.buildProjectDispatchReport(activeProject.id, {
        overrideBatchMultiplier: batchMultiplier,
        classFilterId: selectedClassId !== 'ALL' ? selectedClassId : undefined
      });
      if (rep) return rep;
    }
    return DispatchReportService.buildProductionMatrixDispatchReport(batchMultiplier, 'ALL');
  }, [sourceMode, activeProject, selectedProjectId, batchMultiplier, selectedClassId]);

  // Filtered Items for Display
  const filteredItems = useMemo(() => {
    let list = [...dispatchSummary.items];
    if (activeChannelFilter !== 'ALL') {
      list = list.filter(i => i.actionChannel === activeChannelFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.specification.toLowerCase().includes(q) ||
          i.vendorOrLocation.toLowerCase().includes(q) ||
          i.targetClassOrProject.toLowerCase().includes(q)
      );
    }
    return list;
  }, [dispatchSummary, activeChannelFilter, searchQuery]);

  if (!isOpen) return null;

  // Handlers
  const handleExportExcel = () => {
    try {
      DispatchReportService.downloadExcel(dispatchSummary);
      showToast('Exported Multi-Sheet Excel Dispatch Spreadsheet (.xlsx)!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export Excel file.', 'error');
    }
  };

  const handleExportCsv = () => {
    try {
      DispatchReportService.downloadCsv(dispatchSummary);
      showToast('Exported Dispatch CSV Data File!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export CSV file.', 'error');
    }
  };

  const handleCopyWhatsApp = () => {
    try {
      const text = DispatchReportService.generateWhatsAppSummaryText(dispatchSummary);
      navigator.clipboard.writeText(text);
      setCopiedWhatsApp(true);
      showToast('Copied Team Standup Dispatch Text to clipboard!', 'success');
      setTimeout(() => setCopiedWhatsApp(false), 3000);
    } catch (err) {
      console.error(err);
      showToast('Failed to copy to clipboard.', 'error');
    }
  };

  const handleTriggerPrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* ===== MODAL HEADER ===== */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {dispatchSummary.documentRef}
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> 21 CFR / ISO 9001 Sourcing Slip
              </span>
              <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded">
                Generated: {dispatchSummary.generatedAt}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
              Executive Procurement & Production Readiness Dispatch Sheet
            </h2>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title="Download 5-Tab Excel Workbook"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel (.xlsx)
            </button>

            <button
              onClick={handleTriggerPrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              title="Print Executive Clean Document or Save PDF"
            >
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>

            <button
              onClick={handleCopyWhatsApp}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                copiedWhatsApp
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Copy Formatted Text for WhatsApp/Slack"
            >
              {copiedWhatsApp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedWhatsApp ? 'Copied!' : 'WhatsApp / Slack'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===== CONTROLS & KPI METRICS BAR ===== */}
        <div className="p-5 bg-slate-900/90 border-b border-slate-800 space-y-4 shrink-0">
          {/* Source & Multiplier Selectors */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Source Scope:</span>
              <button
                onClick={() => setSourceMode('PROJECT')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sourceMode === 'PROJECT'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                📁 Active Project
              </button>
              <button
                onClick={() => setSourceMode('PRODUCTION_MATRIX')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sourceMode === 'PRODUCTION_MATRIX'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                🏭 Master Production Matrix
              </button>

              {sourceMode === 'PROJECT' && (
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              )}

              {sourceMode === 'PROJECT' && activeProject?.classes && activeProject.classes.length > 0 && (
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-indigo-300 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">All Classes ({activeProject.classes.length})</option>
                  {activeProject.classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.items.length} items)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Batch Multiplier Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batch Multiplier:</span>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setBatchMultiplier(prev => Math.max(1, prev - 1))}
                  className="px-2 py-0.5 text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
                >
                  -
                </button>
                <span className="px-2 font-mono text-xs font-black text-indigo-400">{batchMultiplier}x</span>
                <button
                  type="button"
                  onClick={() => setBatchMultiplier(prev => prev + 1)}
                  className="px-2 py-0.5 text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
                >
                  +
                </button>
              </div>

              <div className="flex items-center gap-1">
                {[1, 5, 10, 25, 50].map(mult => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => setBatchMultiplier(mult)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      batchMultiplier === mult
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {mult}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4-Channel KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Total Line Items */}
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Total SKUs / Items</div>
              <div className="text-xl font-black text-white font-mono mt-0.5">{dispatchSummary.totalItems}</div>
              <div className="text-[10px] text-slate-500 font-mono">Scaled at {batchMultiplier}x</div>
            </div>

            {/* In Stock & Ready */}
            <div
              onClick={() => setActiveChannelFilter(activeChannelFilter === 'IN_STOCK' ? 'ALL' : 'IN_STOCK')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                activeChannelFilter === 'IN_STOCK'
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              <div className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> In-Stock (Warehouse)
              </div>
              <div className="text-xl font-black text-emerald-300 font-mono mt-0.5">
                {dispatchSummary.inStockCount} <span className="text-xs text-emerald-500">({dispatchSummary.stockReadinessPct}%)</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-800">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dispatchSummary.stockReadinessPct}%` }} />
              </div>
            </div>

            {/* Local Market Buy */}
            <div
              onClick={() => setActiveChannelFilter(activeChannelFilter === 'LOCAL_BUY' ? 'ALL' : 'LOCAL_BUY')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                activeChannelFilter === 'LOCAL_BUY'
                  ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-500/10'
                  : 'bg-slate-950/80 border-slate-800 hover:border-sky-500/50'
              }`}
            >
              <div className="text-[10px] text-sky-400 uppercase font-bold flex items-center gap-1">
                <ShoppingBag className="w-3 h-3" /> Local Market Buy
              </div>
              <div className="text-xl font-black text-sky-300 font-mono mt-0.5">{dispatchSummary.localBuyCount} items</div>
              <div className="text-[10px] text-sky-400 font-mono font-bold">~₹{dispatchSummary.localPurchaseCashINR.toLocaleString('en-IN')} Cash</div>
            </div>

            {/* Vendor Orders (PO) */}
            <div
              onClick={() => setActiveChannelFilter(activeChannelFilter === 'TO_ORDER' ? 'ALL' : 'TO_ORDER')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                activeChannelFilter === 'TO_ORDER'
                  ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/10'
                  : 'bg-slate-950/80 border-slate-800 hover:border-purple-500/50'
              }`}
            >
              <div className="text-[10px] text-purple-400 uppercase font-bold flex items-center gap-1">
                <Truck className="w-3 h-3" /> Vendor POs (Online)
              </div>
              <div className="text-xl font-black text-purple-300 font-mono mt-0.5">{dispatchSummary.toOrderCount} items</div>
              <div className="text-[10px] text-purple-400 font-mono font-bold">~₹{dispatchSummary.vendorOrdersTotalINR.toLocaleString('en-IN')} PO</div>
            </div>

            {/* In-House Fabrication */}
            <div
              onClick={() => setActiveChannelFilter(activeChannelFilter === 'IN_HOUSE_FABRICATION' ? 'ALL' : 'IN_HOUSE_FABRICATION')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                activeChannelFilter === 'IN_HOUSE_FABRICATION'
                  ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/50'
              }`}
            >
              <div className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" /> In-House Fab & Prep
              </div>
              <div className="text-xl font-black text-amber-300 font-mono mt-0.5">{dispatchSummary.fabricationCount} jobs</div>
              <div className="text-[10px] text-amber-400 font-mono">Laser / 3D / Solutions</div>
            </div>
          </div>
        </div>

        {/* ===== CHANNEL FILTER PILLS & SEARCH ===== */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">View Filter:</span>
            {[
              { id: 'ALL', label: `All Items (${dispatchSummary.totalItems})` },
              { id: 'IN_STOCK', label: `🟢 In Stock (${dispatchSummary.inStockCount})` },
              { id: 'LOCAL_BUY', label: `🔵 Local Buy (${dispatchSummary.localBuyCount})` },
              { id: 'TO_ORDER', label: `🟣 Vendor PO (${dispatchSummary.toOrderCount})` },
              { id: 'IN_HOUSE_FABRICATION', label: `🟠 Fabrication (${dispatchSummary.fabricationCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveChannelFilter(tab.id as any)}
                className={`text-xs px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  activeChannelFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by SKU, item, spec, vendor..."
              className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* ===== DISPATCH ITEMS TABLE ===== */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">Image</th>
                  <th className="py-3 px-3 w-28">SKU / Code</th>
                  <th className="py-3 px-4">Component & Specification</th>
                  <th className="py-3 px-3 text-center">Channel</th>
                  <th className="py-3 px-3 text-center">Required Qty</th>
                  <th className="py-3 px-3 text-center">Stock</th>
                  <th className="py-3 px-3 text-center">To Procure</th>
                  <th className="py-3 px-3 text-right">Unit Cost</th>
                  <th className="py-3 px-3 text-right">Ext. Total</th>
                  <th className="py-3 px-4">Sourcing Location / Vendor</th>
                  <th className="py-3 px-3 text-center">Sign-off [✓]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => {
                    const isDeficit = item.deficitQuantity > 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                        {/* Thumbnail & Image Studio Preview Trigger */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            title="Open Deep-Zoom Lightbox & Image Studio"
                            className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 hover:border-indigo-500 transition-all cursor-pointer group relative inline-block"
                          >
                            <ItemImage
                              src={item.imageUrl}
                              alt={item.name}
                              category={item.category}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ZoomIn className="w-3 h-3 text-indigo-300" />
                            </div>
                          </button>
                        </td>

                        {/* SKU */}
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-400 text-[11px]">
                          {item.sku}
                          <div className="text-[9px] text-slate-500 truncate">{item.targetClassOrProject}</div>
                        </td>

                        {/* Component Name & Specification */}
                        <td className="py-2.5 px-4 space-y-0.5">
                          <div className="font-bold text-white text-xs">{item.name}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">{item.specification}</div>
                          {item.notes && <div className="text-[10px] text-amber-400/80">📝 {item.notes}</div>}
                        </td>

                        {/* Action Channel Badge */}
                        <td className="py-2.5 px-3 text-center">
                          {item.actionChannel === 'IN_STOCK' && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> In-Stock
                            </span>
                          )}
                          {item.actionChannel === 'LOCAL_BUY' && (
                            <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              <ShoppingBag className="w-2.5 h-2.5" /> Local Buy
                            </span>
                          )}
                          {item.actionChannel === 'TO_ORDER' && (
                            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              <Truck className="w-2.5 h-2.5" /> Vendor PO
                            </span>
                          )}
                          {item.actionChannel === 'IN_HOUSE_FABRICATION' && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              <Flame className="w-2.5 h-2.5" /> In-House
                            </span>
                          )}
                        </td>

                        {/* Required Qty */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                          {item.requiredQuantity} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                        </td>

                        {/* Stock Qty */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                          {item.availableStock}
                        </td>

                        {/* To Procure / Deficit */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {isDeficit ? (
                            <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded font-black">
                              -{item.deficitQuantity} {item.unit}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold">✓ Covered</span>
                          )}
                        </td>

                        {/* Unit Cost */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          ₹{item.unitCost}
                        </td>

                        {/* Extended Cost */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                          ₹{item.extendedCost.toLocaleString('en-IN')}
                        </td>

                        {/* Sourcing Location / Preferred Vendor */}
                        <td className="py-2.5 px-4 text-[11px] text-slate-300">
                          <div>{item.vendorOrLocation}</div>
                          {item.actionChannel === 'IN_STOCK' ? (
                            <div className="text-[10px] text-slate-500 font-mono">📍 {item.binLocation}</div>
                          ) : (
                            <div className="text-[10px] text-purple-400/80 font-mono">⏱️ Lead: {item.leadTimeDays}d</div>
                          )}
                        </td>

                        {/* Floor Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No materials match the selected channel filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== MODAL FOOTER ===== */}
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-xs text-slate-400">
          <div>
            <span>Project Delivery Target: <strong className="text-amber-300 font-mono">{dispatchSummary.targetDeliveryDate}</strong></span>
            <span className="mx-2">•</span>
            <span>Lead: <strong className="text-indigo-300">{dispatchSummary.leadUserName}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-300">
              Procurement Cash & PO Total: <strong className="text-amber-300 font-mono text-sm">₹{dispatchSummary.totalProcurementValueINR.toLocaleString('en-IN')}</strong>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ===== DEEP-ZOOM LIGHTBOX & IMAGE STUDIO MODAL ===== */}
      {previewItem && (
        <ImagePreviewModal
          isOpen={!!previewItem}
          onClose={() => setPreviewItem(null)}
          imageUrl={previewItem.imageUrl}
          title={previewItem.name}
          subtitle={previewItem.specification}
          category={previewItem.category}
          badge={previewItem.actionChannel}
          sku={previewItem.sku}
          binLocation={previewItem.binLocation}
          stockQty={previewItem.availableStock}
          unit={previewItem.unit}
          details={[
            { label: 'Action Channel', value: previewItem.actionChannel },
            { label: 'Required Quantity', value: `${previewItem.requiredQuantity} ${previewItem.unit}` },
            { label: 'Deficit to Buy', value: `${previewItem.deficitQuantity} ${previewItem.unit}` },
            { label: 'Estimated Unit Cost', value: `₹${previewItem.unitCost}` },
            { label: 'Extended Total', value: `₹${previewItem.extendedCost}` },
            { label: 'Vendor / Market', value: previewItem.vendorOrLocation },
            { label: 'Target Scope', value: previewItem.targetClassOrProject }
          ]}
          editable={true}
          onSaveImage={(newUrl) => {
            if (sourceMode === 'PROJECT' && activeProject) {
              // Try saving to project deliverable
              ProjectManagementService.updateDeliverableImage(activeProject.id, activeProject.classes[0]?.id || '', previewItem.id, newUrl);
            } else {
              // Save to master production items
              ProductionWorkflowService.updateItemImage(previewItem.id, newUrl);
            }
            previewItem.imageUrl = newUrl;
            showToast('Updated component image with Image Studio!', 'success');
          }}
        />
      )}
    </div>,
    document.body
  );
}
