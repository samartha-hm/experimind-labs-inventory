import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
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
  ShieldCheck,
  ZoomIn,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckSquare,
  Square,
  MinusSquare,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  DollarSign
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

type SortField =
  | 'sku'
  | 'name'
  | 'category'
  | 'actionChannel'
  | 'requiredQuantity'
  | 'availableStock'
  | 'deficitQuantity'
  | 'unitCost'
  | 'extendedCost'
  | 'vendorOrLocation'
  | 'leadTimeDays';

export default function ProcurementDispatchModal({
  isOpen,
  onClose,
  projectId,
  initialMultiplier = 5,
  initialSource = 'PROJECT'
}: ProcurementDispatchModalProps) {
  const { showToast } = useToast();

  // Mode & Project Scope Selection
  const [sourceMode, setSourceMode] = useState<'PROJECT' | 'PRODUCTION_MATRIX'>(initialSource);
  const [projects, setProjects] = useState<Project[]>(() => ProjectManagementService.getAllProjects());
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projectId || projects[0]?.id || 'PRJ-001'
  );
  const [batchMultiplier, setBatchMultiplier] = useState<number>(initialMultiplier);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  // View Mode: Interactive Grid vs Official Standard Document / PDF Preview
  const [viewMode, setViewMode] = useState<'GRID' | 'STANDARD_DOCUMENT'>('GRID');

  // Smart Search & Multi-Faceted Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChannelFilter, setActiveChannelFilter] = useState<ActionChannel | 'ALL'>('ALL');
  const [deficitOnly, setDeficitOnly] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Interactive Sorting
  const [sortField, setSortField] = useState<SortField>('actionChannel');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Multi-Select System
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Deep-Zoom Lightbox / Image Studio
  const [previewItem, setPreviewItem] = useState<DispatchItem | null>(null);

  // Copy Feedback
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

  // Compute Master Dispatch Report Summary
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

  // Extract unique categories for filtering
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    dispatchSummary.items.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [dispatchSummary]);

  // Filtered & Sorted Items
  const filteredAndSortedItems = useMemo(() => {
    let list = [...dispatchSummary.items];

    // 1. Channel Filter
    if (activeChannelFilter !== 'ALL') {
      list = list.filter(i => i.actionChannel === activeChannelFilter);
    }

    // 2. Deficit / Shortage Filter
    if (deficitOnly) {
      list = list.filter(i => i.deficitQuantity > 0);
    }

    // 3. Category Filter
    if (selectedCategory !== 'ALL') {
      list = list.filter(i => i.category === selectedCategory);
    }

    // 4. Smart Search Query (SKU, name, spec, vendor, location, notes, target class)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.specification.toLowerCase().includes(q) ||
          i.vendorOrLocation.toLowerCase().includes(q) ||
          i.targetClassOrProject.toLowerCase().includes(q) ||
          (i.binLocation && i.binLocation.toLowerCase().includes(q)) ||
          (i.notes && i.notes.toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q))
      );
    }

    // 5. Sorting
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toString().toLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (typeof valA === 'number') {
        valA = valA || 0;
        valB = valB || 0;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      return 0;
    });

    return list;
  }, [dispatchSummary, activeChannelFilter, deficitOnly, selectedCategory, searchQuery, sortField, sortDirection]);

  // Selection Metrics
  const isAllFilteredSelected = useMemo(() => {
    if (filteredAndSortedItems.length === 0) return false;
    return filteredAndSortedItems.every(i => selectedItemIds.has(i.id));
  }, [filteredAndSortedItems, selectedItemIds]);

  const isPartialSelected = useMemo(() => {
    if (filteredAndSortedItems.length === 0) return false;
    const count = filteredAndSortedItems.filter(i => selectedItemIds.has(i.id)).length;
    return count > 0 && count < filteredAndSortedItems.length;
  }, [filteredAndSortedItems, selectedItemIds]);

  const selectedMetrics = useMemo(() => {
    const selectedItems = dispatchSummary.items.filter(i => selectedItemIds.has(i.id));
    const totalCost = selectedItems.reduce((acc, i) => acc + i.extendedCost, 0);
    const deficitItems = selectedItems.filter(i => i.deficitQuantity > 0);
    return {
      count: selectedItems.length,
      totalCost,
      deficitCount: deficitItems.length
    };
  }, [dispatchSummary, selectedItemIds]);

  if (!isOpen) return null;

  // Selection Handlers
  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Unselect filtered items
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        filteredAndSortedItems.forEach(i => next.delete(i.id));
        return next;
      });
    } else {
      // Select all filtered items
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        filteredAndSortedItems.forEach(i => next.add(i.id));
        return next;
      });
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedItemIds(new Set());
  };

  // Sort Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Export Handlers
  const handleExportExcel = (onlySelected = false) => {
    try {
      const targetSummary = onlySelected && selectedItemIds.size > 0
        ? DispatchReportService.filterSummaryToItems(dispatchSummary, selectedItemIds)
        : dispatchSummary;

      DispatchReportService.downloadExcel(targetSummary);
      showToast(
        onlySelected
          ? `Exported ${selectedItemIds.size} Selected Items to Excel (.xlsx)!`
          : 'Exported Complete 5-Tab Excel Dispatch Spreadsheet (.xlsx)!',
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to export Excel file.', 'error');
    }
  };

  const handleExportCsv = (onlySelected = false) => {
    try {
      const targetSummary = onlySelected && selectedItemIds.size > 0
        ? DispatchReportService.filterSummaryToItems(dispatchSummary, selectedItemIds)
        : dispatchSummary;

      DispatchReportService.downloadCsv(targetSummary);
      showToast(
        onlySelected
          ? `Exported ${selectedItemIds.size} Selected Items to CSV!`
          : 'Exported Dispatch CSV Data File!',
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to export CSV file.', 'error');
    }
  };

  const handleCopyWhatsApp = (onlySelected = false) => {
    try {
      const targetSummary = onlySelected && selectedItemIds.size > 0
        ? DispatchReportService.filterSummaryToItems(dispatchSummary, selectedItemIds)
        : dispatchSummary;

      const text = DispatchReportService.generateWhatsAppSummaryText(targetSummary);
      navigator.clipboard.writeText(text);
      setCopiedWhatsApp(true);
      showToast(
        onlySelected
          ? `Copied ${selectedItemIds.size} Selected Items summary to clipboard!`
          : 'Copied Team Standup Dispatch Text to clipboard!',
        'success'
      );
      setTimeout(() => setCopiedWhatsApp(false), 3000);
    } catch (err) {
      console.error(err);
      showToast('Failed to copy to clipboard.', 'error');
    }
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Print CSS Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #standard-printable-document, #standard-printable-document * {
            visibility: visible;
          }
          #standard-printable-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* ===== TOP MODAL HEADER & ACTIONS ===== */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 no-print">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {dispatchSummary.documentRef}
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> ISO 9001 / 21 CFR Standard Slip
              </span>
              <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded">
                Generated: {dispatchSummary.generatedAt}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
              Executive Procurement & Production Readiness Dispatch Sheet Hub
            </h2>
          </div>

          {/* View Mode & Export Toolbars */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher: Interactive Grid vs Official Document View */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'GRID'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Interactive Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('STANDARD_DOCUMENT')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'STANDARD_DOCUMENT'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Standard PDF / Slip
              </button>
            </div>

            {/* Quick Export Actions */}
            <button
              onClick={() => handleExportExcel(false)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title="Download Multi-Sheet Excel Workbook (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" /> Excel (.xlsx)
            </button>

            <button
              onClick={handleTriggerPrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              title="Print Executive Document or Save PDF"
            >
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>

            <button
              onClick={() => handleCopyWhatsApp(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                copiedWhatsApp
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Copy Formatted Team Standup Text"
            >
              {copiedWhatsApp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedWhatsApp ? 'Copied!' : 'WhatsApp / Slack'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===== CONTROLS BAR: SCOPE, MULTIPLIER & 5-CHANNEL KPI CARDS ===== */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-3.5 shrink-0 no-print">
          {/* Scope Selectors & Multiplier Tuning */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source Scope:</span>
              <button
                onClick={() => setSourceMode('PROJECT')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sourceMode === 'PROJECT'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                📁 Active Project
              </button>
              <button
                onClick={() => setSourceMode('PRODUCTION_MATRIX')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Batch Multiplier:</span>
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

          {/* 5-Channel KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* Total Line Items */}
            <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Total SKUs / Items</div>
              <div className="text-lg font-black text-white font-mono mt-0.5">{dispatchSummary.totalItems}</div>
              <div className="text-[10px] text-slate-500 font-mono">Scaled at {batchMultiplier}x</div>
            </div>

            {/* In Stock & Ready */}
            <div
              onClick={() => setActiveChannelFilter(activeChannelFilter === 'IN_STOCK' ? 'ALL' : 'IN_STOCK')}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                activeChannelFilter === 'IN_STOCK'
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              <div className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> In-Stock (Warehouse)
              </div>
              <div className="text-lg font-black text-emerald-300 font-mono mt-0.5">
                {dispatchSummary.inStockCount} <span className="text-xs text-emerald-500">({dispatchSummary.stockReadinessPct}%)</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-800">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dispatchSummary.stockReadinessPct}%` }} />
              </div>
            </div>

            {/* Local Market Buy */}
            <div
              onClick={() => setActiveChannelFilter(activeChannelFilter === 'LOCAL_BUY' ? 'ALL' : 'LOCAL_BUY')}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                activeChannelFilter === 'LOCAL_BUY'
                  ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-500/10'
                  : 'bg-slate-950/80 border-slate-800 hover:border-sky-500/50'
              }`}
            >
              <div className="text-[10px] text-sky-400 uppercase font-bold flex items-center gap-1">
                <ShoppingBag className="w-3 h-3" /> Local Market Buy
              </div>
              <div className="text-lg font-black text-sky-300 font-mono mt-0.5">{dispatchSummary.localBuyCount} items</div>
              <div className="text-[10px] text-sky-400 font-mono font-bold">~₹{dispatchSummary.localPurchaseCashINR.toLocaleString('en-IN')} Cash</div>
            </div>

            {/* Vendor Orders (PO) */}
            <div
              onClick={() => setActiveChannelFilter(activeChannelFilter === 'TO_ORDER' ? 'ALL' : 'TO_ORDER')}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                activeChannelFilter === 'TO_ORDER'
                  ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/10'
                  : 'bg-slate-950/80 border-slate-800 hover:border-purple-500/50'
              }`}
            >
              <div className="text-[10px] text-purple-400 uppercase font-bold flex items-center gap-1">
                <Truck className="w-3 h-3" /> Vendor POs (Online)
              </div>
              <div className="text-lg font-black text-purple-300 font-mono mt-0.5">{dispatchSummary.toOrderCount} items</div>
              <div className="text-[10px] text-purple-400 font-mono font-bold">~₹{dispatchSummary.vendorOrdersTotalINR.toLocaleString('en-IN')} PO</div>
            </div>

            {/* In-House Fabrication */}
            <div
              onClick={() => setActiveChannelFilter(activeChannelFilter === 'IN_HOUSE_FABRICATION' ? 'ALL' : 'IN_HOUSE_FABRICATION')}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                activeChannelFilter === 'IN_HOUSE_FABRICATION'
                  ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/50'
              }`}
            >
              <div className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" /> In-House Fab & Prep
              </div>
              <div className="text-lg font-black text-amber-300 font-mono mt-0.5">{dispatchSummary.fabricationCount} jobs</div>
              <div className="text-[10px] text-amber-400 font-mono">Laser / 3D / Solutions</div>
            </div>
          </div>
        </div>

        {/* ===== SMART SEARCH, MULTI-SELECT & FILTER BAR ===== */}
        <div className="px-5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 no-print">
          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Channel:</span>
            {[
              { id: 'ALL', label: `All (${dispatchSummary.totalItems})` },
              { id: 'IN_STOCK', label: `🟢 In Stock (${dispatchSummary.inStockCount})` },
              { id: 'LOCAL_BUY', label: `🔵 Local Buy (${dispatchSummary.localBuyCount})` },
              { id: 'TO_ORDER', label: `🟣 Vendor PO (${dispatchSummary.toOrderCount})` },
              { id: 'IN_HOUSE_FABRICATION', label: `🟠 Fabrication (${dispatchSummary.fabricationCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveChannelFilter(tab.id as any)}
                className={`text-[11px] px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  activeChannelFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Deficit / Shortage Switch */}
            <button
              onClick={() => setDeficitOnly(prev => !prev)}
              className={`text-[11px] px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                deficitOnly
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Show only items with deficit / shortage that need procurement"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              Shortage Only ({dispatchSummary.items.filter(i => i.deficitQuantity > 0).length})
            </button>

            {/* Category Dropdown Filter */}
            {availableCategories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-[11px] text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories ({availableCategories.length})</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Instant Search Bar with Clear Button */}
          <div className="relative flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search SKU, name, spec, vendor, bin..."
                className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===== MULTI-SELECT FLOATING BULK ACTIONS TOOLBAR ===== */}
        {selectedItemIds.size > 0 && viewMode === 'GRID' && (
          <div className="px-5 py-2.5 bg-indigo-950/70 border-b border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 no-print">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-600 text-white font-black text-xs px-2.5 py-1 rounded-lg">
                {selectedMetrics.count} Selected
              </span>
              <span className="text-xs text-indigo-200 font-mono">
                Total Value: <strong className="text-amber-300 font-bold">₹{selectedMetrics.totalCost.toLocaleString('en-IN')}</strong>
              </span>
              {selectedMetrics.deficitCount > 0 && (
                <span className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded font-bold">
                  {selectedMetrics.deficitCount} Shortages
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleExportExcel(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Download className="w-3 h-3" /> Export Selected Excel
              </button>

              <button
                onClick={() => handleExportCsv(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <FileText className="w-3 h-3" /> Export Selected CSV
              </button>

              <button
                onClick={() => handleCopyWhatsApp(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Copy className="w-3 h-3" /> Copy Selected Text
              </button>

              <button
                onClick={handleClearSelection}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 font-bold underline cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* ===== MAIN CONTENT AREA ===== */}
        {viewMode === 'GRID' ? (
          /* ================= INTERACTIVE DATA GRID ================= */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-sm">
                  <tr>
                    {/* Select All Checkbox */}
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                        title={isAllFilteredSelected ? 'Deselect All' : 'Select All Filtered'}
                      >
                        {isAllFilteredSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : isPartialSelected ? (
                          <MinusSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>

                    <th className="py-3 px-2 w-12 text-center">Image</th>

                    {/* Sortable: SKU */}
                    <th
                      onClick={() => handleSort('sku')}
                      className="py-3 px-3 w-28 cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>SKU / Code</span>
                        {sortField === 'sku' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>

                    {/* Sortable: Name */}
                    <th
                      onClick={() => handleSort('name')}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Component & Specification</span>
                        {sortField === 'name' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>

                    {/* Sortable: Channel */}
                    <th
                      onClick={() => handleSort('actionChannel')}
                      className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Channel</span>
                        {sortField === 'actionChannel' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>

                    {/* Sortable: Required Qty */}
                    <th
                      onClick={() => handleSort('requiredQuantity')}
                      className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Required Qty</span>
                        {sortField === 'requiredQuantity' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>

                    {/* Sortable: Stock */}
                    <th
                      onClick={() => handleSort('availableStock')}
                      className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Stock</span>
                        {sortField === 'availableStock' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>

                    {/* Sortable: Deficit */}
                    <th
                      onClick={() => handleSort('deficitQuantity')}
                      className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>To Procure</span>
                        {sortField === 'deficitQuantity' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>

                    {/* Sortable: Unit Cost */}
                    <th
                      onClick={() => handleSort('unitCost')}
                      className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Unit Cost</span>
                        {sortField === 'unitCost' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>

                    {/* Sortable: Ext Total */}
                    <th
                      onClick={() => handleSort('extendedCost')}
                      className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Ext. Total</span>
                        {sortField === 'extendedCost' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>

                    {/* Sortable: Vendor / Location */}
                    <th
                      onClick={() => handleSort('vendorOrLocation')}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Sourcing / Location</span>
                        {sortField === 'vendorOrLocation' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAndSortedItems.length > 0 ? (
                    filteredAndSortedItems.map(item => {
                      const isSelected = selectedItemIds.has(item.id);
                      const isDeficit = item.deficitQuantity > 0;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-indigo-950/30 hover:bg-indigo-950/50' : 'hover:bg-slate-900/50'
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectItem(item.id)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          {/* Thumbnail & Image Studio Preview Trigger */}
                          <td className="py-2.5 px-2 text-center">
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
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        No materials match the active search or filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ================= STANDARDIZED PUBLICATION-GRADE EXECUTIVE PRINT / PDF SLIP ================= */
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex justify-center">
            <div
              id="standard-printable-document"
              className="bg-white text-slate-900 rounded-xl shadow-2xl p-8 max-w-4xl w-full border border-slate-200 font-sans space-y-6"
            >
              {/* Official Corporate Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white font-black text-sm px-2.5 py-1 rounded tracking-wider">
                      EXPERIMIND LABS
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Quality System 21 CFR / ISO 9001
                    </span>
                  </div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    EXECUTIVE DISPATCH & PROCUREMENT READINESS SHEET
                  </h1>
                  <p className="text-xs text-slate-500">
                    Official Production Floor Order • Warehouse Pick List • Sourcing Authorization Slip
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <div className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-300 px-2 py-1 rounded inline-block">
                    {dispatchSummary.documentRef}
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    Date: {dispatchSummary.generatedAt}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold">
                    ✓ System Verified & Authorized
                  </div>
                </div>
              </div>

              {/* Project & Client Metadata Block */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Project Code & Name</span>
                  <span className="font-bold text-slate-900">{dispatchSummary.projectCode} — {dispatchSummary.projectName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Client / Scope</span>
                  <span className="font-bold text-slate-900">{dispatchSummary.clientName || 'Experimind Labs Internal'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Lead Engineer</span>
                  <span className="font-bold text-slate-900">{dispatchSummary.leadUserName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Target Delivery</span>
                  <span className="font-bold text-amber-700">{dispatchSummary.targetDeliveryDate} ({dispatchSummary.batchMultiplier}x Batch)</span>
                </div>
              </div>

              {/* Executive Summary Financial & Readiness Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="border border-slate-200 p-3 rounded-lg bg-emerald-50/50">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase">Warehouse Readiness</div>
                  <div className="text-lg font-black text-emerald-700 font-mono">{dispatchSummary.stockReadinessPct}%</div>
                  <div className="text-[10px] text-slate-600">{dispatchSummary.inStockCount} / {dispatchSummary.totalItems} Items In-Stock</div>
                </div>

                <div className="border border-slate-200 p-3 rounded-lg bg-sky-50/50">
                  <div className="text-[10px] font-bold text-sky-800 uppercase">Local Cash Purchase</div>
                  <div className="text-lg font-black text-sky-700 font-mono">₹{dispatchSummary.localPurchaseCashINR.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-slate-600">{dispatchSummary.localBuyCount} Items to Buy Locally</div>
                </div>

                <div className="border border-slate-200 p-3 rounded-lg bg-purple-50/50">
                  <div className="text-[10px] font-bold text-purple-800 uppercase">Vendor PO Commitments</div>
                  <div className="text-lg font-black text-purple-700 font-mono">₹{dispatchSummary.vendorOrdersTotalINR.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-slate-600">{dispatchSummary.toOrderCount} Items to Order Online</div>
                </div>

                <div className="border border-slate-200 p-3 rounded-lg bg-amber-50/50">
                  <div className="text-[10px] font-bold text-amber-800 uppercase">Total Procurement Budget</div>
                  <div className="text-lg font-black text-amber-700 font-mono">₹{dispatchSummary.totalProcurementValueINR.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-slate-600">Cash + PO Extended Value</div>
                </div>
              </div>

              {/* Section 1: Local Market Shopping List */}
              {dispatchSummary.localBuyCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                    <h3 className="text-xs font-bold uppercase text-sky-900 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" /> 1. Local Market Direct Purchase Indent (Cash)
                    </h3>
                    <span className="text-[11px] font-mono font-bold text-slate-600">
                      Total Cash: ₹{dispatchSummary.localPurchaseCashINR.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                      <tr>
                        <th className="py-1.5 px-2 w-20">SKU</th>
                        <th className="py-1.5 px-3">Item Name & Specification</th>
                        <th className="py-1.5 px-2 text-center w-24">Qty to Buy</th>
                        <th className="py-1.5 px-2 text-right w-20">Unit Est.</th>
                        <th className="py-1.5 px-2 text-right w-24">Total Est.</th>
                        <th className="py-1.5 px-3">Market / Vendor</th>
                        <th className="py-1.5 px-2 text-center w-12">Procured</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dispatchSummary.items
                        .filter(i => i.actionChannel === 'LOCAL_BUY')
                        .map(item => (
                          <tr key={item.id}>
                            <td className="py-1 px-2 font-mono text-[10px] text-slate-700">{item.sku}</td>
                            <td className="py-1 px-3">
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[10px] text-slate-500">{item.specification}</div>
                            </td>
                            <td className="py-1 px-2 text-center font-bold text-sky-800">
                              {item.deficitQuantity} {item.unit}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-slate-600">₹{item.unitCost}</td>
                            <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">
                              ₹{item.extendedCost.toLocaleString('en-IN')}
                            </td>
                            <td className="py-1 px-3 text-[11px] text-slate-600">{item.vendorOrLocation}</td>
                            <td className="py-1 px-2 text-center">
                              <div className="w-3.5 h-3.5 border border-slate-400 rounded inline-block" />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Section 2: Vendor Purchase Orders Dispatch */}
              {dispatchSummary.toOrderCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                    <h3 className="text-xs font-bold uppercase text-purple-900 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> 2. Vendor Purchase Orders Dispatch Queue (Online / B2B)
                    </h3>
                    <span className="text-[11px] font-mono font-bold text-slate-600">
                      Total PO: ₹{dispatchSummary.vendorOrdersTotalINR.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                      <tr>
                        <th className="py-1.5 px-2 w-20">SKU</th>
                        <th className="py-1.5 px-3">Component / Material</th>
                        <th className="py-1.5 px-2 text-center w-24">Order Qty</th>
                        <th className="py-1.5 px-2 text-right w-20">Unit Cost</th>
                        <th className="py-1.5 px-2 text-right w-24">Total PO</th>
                        <th className="py-1.5 px-3">Preferred Vendor & Lead</th>
                        <th className="py-1.5 px-2 text-center w-12">PO Sent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dispatchSummary.items
                        .filter(i => i.actionChannel === 'TO_ORDER')
                        .map(item => (
                          <tr key={item.id}>
                            <td className="py-1 px-2 font-mono text-[10px] text-slate-700">{item.sku}</td>
                            <td className="py-1 px-3">
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[10px] text-slate-500">{item.specification}</div>
                            </td>
                            <td className="py-1 px-2 text-center font-bold text-purple-800">
                              {item.deficitQuantity} {item.unit}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-slate-600">₹{item.unitCost}</td>
                            <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">
                              ₹{item.extendedCost.toLocaleString('en-IN')}
                            </td>
                            <td className="py-1 px-3 text-[11px] text-slate-600">
                              {item.vendorOrLocation} (Lead: {item.leadTimeDays}d)
                            </td>
                            <td className="py-1 px-2 text-center">
                              <div className="w-3.5 h-3.5 border border-slate-400 rounded inline-block" />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Section 3: In-Stock Warehouse Pick List */}
              {dispatchSummary.inStockCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                    <h3 className="text-xs font-bold uppercase text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 3. Warehouse Staging & Kitting Pick List
                    </h3>
                    <span className="text-[11px] font-mono text-slate-600">{dispatchSummary.inStockCount} items ready to issue</span>
                  </div>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                      <tr>
                        <th className="py-1.5 px-2 w-20">SKU</th>
                        <th className="py-1.5 px-3">Component & Model</th>
                        <th className="py-1.5 px-3 w-28">Bin Location</th>
                        <th className="py-1.5 px-2 text-center w-24">Pick Qty</th>
                        <th className="py-1.5 px-2 text-center w-20">On Hand</th>
                        <th className="py-1.5 px-2 text-center w-12">Picked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dispatchSummary.items
                        .filter(i => i.actionChannel === 'IN_STOCK')
                        .map(item => (
                          <tr key={item.id}>
                            <td className="py-1 px-2 font-mono text-[10px] text-slate-700">{item.sku}</td>
                            <td className="py-1 px-3">
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[10px] text-slate-500">{item.specification}</div>
                            </td>
                            <td className="py-1 px-3 font-mono text-[11px] text-emerald-800 font-bold">{item.binLocation}</td>
                            <td className="py-1 px-2 text-center font-bold text-slate-900">
                              {item.requiredQuantity} {item.unit}
                            </td>
                            <td className="py-1 px-2 text-center font-mono text-slate-500">{item.availableStock}</td>
                            <td className="py-1 px-2 text-center">
                              <div className="w-3.5 h-3.5 border border-slate-400 rounded inline-block" />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Official Sign-off & Verification Box */}
              <div className="border-2 border-slate-900 p-4 rounded-lg space-y-4">
                <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                  OFFICIAL DISPATCH & VERIFICATION AUTHORIZATION SIGN-OFF
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-6">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Production Planner</span>
                    <div className="border-b border-slate-400 pb-1 text-slate-800 font-medium">Sig: __________________</div>
                    <div className="text-[10px] text-slate-500">Date: ____/____/2026</div>
                  </div>
                  <div className="space-y-6">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">2. Warehouse Dispatch</span>
                    <div className="border-b border-slate-400 pb-1 text-slate-800 font-medium">Sig: __________________</div>
                    <div className="text-[10px] text-slate-500">Date: ____/____/2026</div>
                  </div>
                  <div className="space-y-6">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">3. Quality Assurance</span>
                    <div className="border-b border-slate-400 pb-1 text-slate-800 font-medium">Sig: __________________</div>
                    <div className="text-[10px] text-slate-500">Date: ____/____/2026</div>
                  </div>
                  <div className="space-y-6">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">4. Management Approval</span>
                    <div className="border-b border-slate-400 pb-1 text-slate-800 font-medium">Sig: __________________</div>
                    <div className="text-[10px] text-slate-500">Date: ____/____/2026</div>
                  </div>
                </div>
              </div>

              {/* Standard Footer Note */}
              <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
                Experimind Labs Private Limited • Inventory, Quality & Dispatch Control System • Generated automatically on {dispatchSummary.generatedAt}
              </div>
            </div>
          </div>
        )}

        {/* ===== MODAL FOOTER ===== */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-xs text-slate-400 no-print">
          <div>
            <span>Target Delivery: <strong className="text-amber-300 font-mono">{dispatchSummary.targetDeliveryDate}</strong></span>
            <span className="mx-2">•</span>
            <span>Items Matching Filter: <strong className="text-white font-mono">{filteredAndSortedItems.length}</strong> of {dispatchSummary.totalItems}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-300">
              Procurement Budget Required: <strong className="text-amber-300 font-mono text-sm">₹{dispatchSummary.totalProcurementValueINR.toLocaleString('en-IN')}</strong>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
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
              ProjectManagementService.updateDeliverableImage(activeProject.id, activeProject.classes[0]?.id || '', previewItem.id, newUrl);
            } else {
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
