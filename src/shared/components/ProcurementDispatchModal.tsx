import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
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
  Search,
  Filter,
  Building2,
  Calendar,
  ShieldCheck,
  ZoomIn,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  MinusSquare,
  SlidersHorizontal,
  DollarSign,
  Printer,
  ChevronDown,
  Sparkles,
  Smartphone,
  Monitor
} from 'lucide-react';
import {
  DispatchReportService,
  DispatchReportSummary,
  DispatchItem,
  ActionChannel
} from '../../services/DispatchReportService';
import { DispatchPdfService, PdfOrientation, PdfDocumentType } from '../../services/DispatchPdfService';
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

  // View Mode: Live PDF Document Preview vs Interactive Table Grid
  const [viewMode, setViewMode] = useState<'DOCUMENT_PREVIEW' | 'INTERACTIVE_GRID'>('DOCUMENT_PREVIEW');
  const [activeDocumentType, setActiveDocumentType] = useState<PdfDocumentType>('FULL_DISPATCH');
  const [pdfOrientation, setPdfOrientation] = useState<PdfOrientation>('landscape');

  // PDF Document Options
  const [includePrices, setIncludePrices] = useState<boolean>(true);
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [includeCheckboxes, setIncludeCheckboxes] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);

  // Smart Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChannelFilter, setActiveChannelFilter] = useState<ActionChannel | 'ALL'>('ALL');
  const [deficitOnly, setDeficitOnly] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('actionChannel');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Multi-Select
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

  // Extract unique categories
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

    if (activeChannelFilter !== 'ALL') {
      list = list.filter(i => i.actionChannel === activeChannelFilter);
    }

    if (deficitOnly) {
      list = list.filter(i => i.deficitQuantity > 0);
    }

    if (selectedCategory !== 'ALL') {
      list = list.filter(i => i.category === selectedCategory);
    }

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
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        filteredAndSortedItems.forEach(i => next.delete(i.id));
        return next;
      });
    } else {
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Dedicated PDF Downloads
  const handleDownloadShortagePdf = () => {
    try {
      DispatchPdfService.downloadShortageChecklistPdf(dispatchSummary, {
        orientation: pdfOrientation,
        includePrices,
        includeNotes,
        includeCheckboxes,
        includeSignatures
      });
      showToast('Downloaded Procurement & Shortage Shopping Checklist PDF!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate Shortage PDF.', 'error');
    }
  };

  const handleDownloadPickListPdf = () => {
    try {
      DispatchPdfService.downloadWarehousePickListPdf(dispatchSummary, {
        orientation: pdfOrientation,
        includePrices,
        includeNotes,
        includeCheckboxes,
        includeSignatures
      });
      showToast('Downloaded Warehouse Staging & Pick-List PDF!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate Pick-List PDF.', 'error');
    }
  };

  const handleDownloadFullDispatchPdf = () => {
    try {
      DispatchPdfService.downloadFullDispatchPdf(dispatchSummary, {
        orientation: pdfOrientation,
        includePrices,
        includeNotes,
        includeCheckboxes,
        includeSignatures
      });
      showToast('Downloaded Full Executive Dispatch Sheet PDF!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate Dispatch Sheet PDF.', 'error');
    }
  };

  const handleDownloadSelectedPdf = () => {
    if (selectedItemIds.size === 0) return;
    try {
      DispatchPdfService.downloadSelectedItemsPdf(dispatchSummary, selectedItemIds, {
        orientation: pdfOrientation,
        includePrices,
        includeNotes,
        includeCheckboxes,
        includeSignatures
      });
      showToast(`Downloaded Checklist PDF for ${selectedItemIds.size} Selected Items!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate Selected Items PDF.', 'error');
    }
  };

  // Excel, CSV & WhatsApp Handlers
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

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* ===== TOP CLEAN HEADER BAR ===== */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {dispatchSummary.documentRef}
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> ISO 9001 / 21 CFR Quality Document
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Executive Procurement & Production Readiness Dispatch Hub
            </h2>
          </div>

          {/* Top Level PDF 1-Click Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1-Click Shortage Shopping Checklist PDF */}
            <button
              onClick={handleDownloadShortagePdf}
              className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              title="Download Shortage & Local Market Shopping Checklist PDF"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Shortage / Buy List (PDF)
            </button>

            {/* 1-Click Warehouse Pick List PDF */}
            <button
              onClick={handleDownloadPickListPdf}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title="Download Warehouse Staging & Kitting Pick List PDF"
            >
              <Package className="w-3.5 h-3.5" /> Warehouse Pick List (PDF)
            </button>

            {/* 1-Click Full Executive Report PDF */}
            <button
              onClick={handleDownloadFullDispatchPdf}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              title="Download Full Executive Dispatch & Readiness PDF"
            >
              <Download className="w-3.5 h-3.5" /> Full Dispatch (PDF)
            </button>

            {/* Secondary Formats */}
            <button
              onClick={() => handleExportExcel(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              title="Export 5-Tab Excel Spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Excel
            </button>

            <button
              onClick={() => handleCopyWhatsApp(false)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                copiedWhatsApp ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Copy WhatsApp/Slack summary text"
            >
              {copiedWhatsApp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
              {copiedWhatsApp ? 'Copied' : 'Text'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===== SCOPE & VIEW CONTROL STRIP ===== */}
        <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Scope Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Scope:</span>
            <button
              onClick={() => setSourceMode('PROJECT')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sourceMode === 'PROJECT' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              📁 Project
            </button>
            <button
              onClick={() => setSourceMode('PRODUCTION_MATRIX')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sourceMode === 'PRODUCTION_MATRIX' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              🏭 Master Matrix
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

            {/* Batch Multiplier Adjuster */}
            <div className="flex items-center gap-1 ml-2 bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Batch:</span>
              <button
                type="button"
                onClick={() => setBatchMultiplier(prev => Math.max(1, prev - 1))}
                className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                -
              </button>
              <span className="px-1 font-mono text-xs font-black text-indigo-400">{batchMultiplier}x</span>
              <button
                type="button"
                onClick={() => setBatchMultiplier(prev => prev + 1)}
                className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('DOCUMENT_PREVIEW')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'DOCUMENT_PREVIEW' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> PDF Document Preview
            </button>
            <button
              onClick={() => setViewMode('INTERACTIVE_GRID')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'INTERACTIVE_GRID' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Interactive Grid ({filteredAndSortedItems.length})
            </button>
          </div>
        </div>

        {/* ===== VIEW 1: PDF DOCUMENT PREVIEW & CUSTOMIZER ===== */}
        {viewMode === 'DOCUMENT_PREVIEW' ? (
          <div className="flex-1 overflow-y-auto bg-slate-950 flex flex-col items-center p-4 sm:p-6 space-y-4">
            {/* Document Customizer Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 max-w-5xl w-full flex flex-wrap items-center justify-between gap-3 shadow-md">
              {/* Document Type Selector Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Report Mode:</span>
                <button
                  onClick={() => setActiveDocumentType('SHORTAGE_CHECKLIST')}
                  className={`text-xs px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                    activeDocumentType === 'SHORTAGE_CHECKLIST'
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  🛒 Shortage / Shopping List ({dispatchSummary.items.filter(i => i.deficitQuantity > 0).length})
                </button>
                <button
                  onClick={() => setActiveDocumentType('WAREHOUSE_PICKLIST')}
                  className={`text-xs px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                    activeDocumentType === 'WAREHOUSE_PICKLIST'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  📦 Warehouse Pick List ({dispatchSummary.inStockCount + dispatchSummary.fabricationCount})
                </button>
                <button
                  onClick={() => setActiveDocumentType('FULL_DISPATCH')}
                  className={`text-xs px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                    activeDocumentType === 'FULL_DISPATCH'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  📑 Full Dispatch ({dispatchSummary.totalItems})
                </button>
              </div>

              {/* Orientation & Toggles */}
              <div className="flex items-center gap-3 text-xs text-slate-300 font-medium flex-wrap">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setPdfOrientation('landscape')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                      pdfOrientation === 'landscape' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Landscape
                  </button>
                  <button
                    onClick={() => setPdfOrientation('portrait')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                      pdfOrientation === 'portrait' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Portrait
                  </button>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePrices}
                    onChange={e => setIncludePrices(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Prices</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={e => setIncludeNotes(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Notes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCheckboxes}
                    onChange={e => setIncludeCheckboxes(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Boxes [ ]</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSignatures}
                    onChange={e => setIncludeSignatures(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Signatures</span>
                </label>
              </div>
            </div>

            {/* Realistic White Document Canvas Preview */}
            <div className={`bg-white text-slate-900 rounded-xl shadow-2xl p-8 w-full border border-slate-200 font-sans space-y-5 ${
              pdfOrientation === 'landscape' ? 'max-w-6xl' : 'max-w-4xl'
            }`}>
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white font-black text-xs px-2 py-0.5 rounded tracking-wider">
                      EXPERIMIND LABS
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Quality System 21 CFR / ISO 9001
                    </span>
                  </div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    {activeDocumentType === 'SHORTAGE_CHECKLIST' && 'PROCUREMENT & SHORTAGE SHOPPING CHECKLIST'}
                    {activeDocumentType === 'WAREHOUSE_PICKLIST' && 'WAREHOUSE STAGING & KITTING PICK LIST'}
                    {activeDocumentType === 'FULL_DISPATCH' && 'EXECUTIVE DISPATCH & PRODUCTION READINESS REPORT'}
                  </h1>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded inline-block">
                    {dispatchSummary.documentRef}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Date: {dispatchSummary.generatedAt}
                  </div>
                </div>
              </div>

              {/* Project Metadata Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase">Project</span>
                  <span className="font-bold text-slate-900">{dispatchSummary.projectCode} — {dispatchSummary.projectName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase">Client / Scope</span>
                  <span className="font-bold text-slate-900">{dispatchSummary.clientName || 'Experimind Labs Internal'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase">Lead Engineer</span>
                  <span className="font-bold text-slate-900">{dispatchSummary.leadUserName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase">Target Delivery</span>
                  <span className="font-bold text-amber-700">{dispatchSummary.targetDeliveryDate} ({dispatchSummary.batchMultiplier}x Batch)</span>
                </div>
              </div>

              {/* Summary KPIs Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="border border-slate-200 p-2 rounded-lg bg-emerald-50/50">
                  <div className="text-[9px] font-bold text-emerald-800 uppercase">Readiness</div>
                  <div className="text-base font-black text-emerald-700 font-mono">{dispatchSummary.stockReadinessPct}%</div>
                  <div className="text-[9px] text-slate-600">{dispatchSummary.inStockCount} / {dispatchSummary.totalItems} In Stock</div>
                </div>

                <div className="border border-slate-200 p-2 rounded-lg bg-sky-50/50">
                  <div className="text-[9px] font-bold text-sky-800 uppercase">Local Cash Buy</div>
                  <div className="text-base font-black text-sky-700 font-mono">Rs. {dispatchSummary.localPurchaseCashINR.toLocaleString('en-IN')}</div>
                  <div className="text-[9px] text-slate-600">{dispatchSummary.localBuyCount} Items</div>
                </div>

                <div className="border border-slate-200 p-2 rounded-lg bg-purple-50/50">
                  <div className="text-[9px] font-bold text-purple-800 uppercase">Vendor POs</div>
                  <div className="text-base font-black text-purple-700 font-mono">Rs. {dispatchSummary.vendorOrdersTotalINR.toLocaleString('en-IN')}</div>
                  <div className="text-[9px] text-slate-600">{dispatchSummary.toOrderCount} Items</div>
                </div>

                <div className="border border-slate-200 p-2 rounded-lg bg-amber-50/50">
                  <div className="text-[9px] font-bold text-amber-800 uppercase">Total Budget</div>
                  <div className="text-base font-black text-amber-700 font-mono">Rs. {dispatchSummary.totalProcurementValueINR.toLocaleString('en-IN')}</div>
                  <div className="text-[9px] text-slate-600">Cash + PO Total</div>
                </div>
              </div>

              {/* Document Items Table */}
              <div className="space-y-1 overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-900 text-white font-bold text-[9px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-2.5 w-24">SKU / Code</th>
                      <th className="py-2 px-3">Component & Specification</th>
                      <th className="py-2 px-2 text-center w-24">Channel</th>
                      <th className="py-2 px-2 text-center w-20">
                        {activeDocumentType === 'SHORTAGE_CHECKLIST' ? 'Deficit Qty' : 'Req Qty'}
                      </th>
                      {activeDocumentType !== 'SHORTAGE_CHECKLIST' && (
                        <th className="py-2 px-2 text-center w-16">Stock</th>
                      )}
                      {activeDocumentType !== 'SHORTAGE_CHECKLIST' && (
                        <th className="py-2 px-2 text-center w-20">Deficit</th>
                      )}
                      {includePrices && (
                        <>
                          <th className="py-2 px-2 text-right w-20">Unit Cost</th>
                          <th className="py-2 px-2 text-right w-22">Ext Total</th>
                        </>
                      )}
                      <th className="py-2 px-3">
                        {activeDocumentType === 'WAREHOUSE_PICKLIST' ? 'Bin Location' : 'Location / Vendor'}
                      </th>
                      {includeCheckboxes && (
                        <th className="py-2 px-2 text-center w-12">[✓]</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {(activeDocumentType === 'SHORTAGE_CHECKLIST'
                      ? dispatchSummary.items.filter(i => i.deficitQuantity > 0)
                      : activeDocumentType === 'WAREHOUSE_PICKLIST'
                      ? dispatchSummary.items.filter(i => i.actionChannel === 'IN_STOCK' || i.actionChannel === 'IN_HOUSE_FABRICATION')
                      : dispatchSummary.items
                    ).slice(0, 50).map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="py-1.5 px-2.5 font-mono text-[10px] text-indigo-700 font-bold whitespace-nowrap">{item.sku}</td>
                        <td className="py-1.5 px-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">{item.specification}</div>
                          {includeNotes && item.notes && (
                            <div className="text-[9px] text-amber-800">📝 {item.notes}</div>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold text-[10px]">
                          {item.actionChannel === 'IN_STOCK' && <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">IN STOCK</span>}
                          {item.actionChannel === 'LOCAL_BUY' && <span className="bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 rounded-full">LOCAL BUY</span>}
                          {item.actionChannel === 'TO_ORDER' && <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-full">VENDOR PO</span>}
                          {item.actionChannel === 'IN_HOUSE_FABRICATION' && <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">IN-HOUSE</span>}
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold">
                          {activeDocumentType === 'SHORTAGE_CHECKLIST' ? (
                            <span className="text-rose-700">-{item.deficitQuantity} {item.unit}</span>
                          ) : (
                            <span>{item.requiredQuantity} {item.unit}</span>
                          )}
                        </td>
                        {activeDocumentType !== 'SHORTAGE_CHECKLIST' && (
                          <td className="py-1.5 px-2 text-center font-mono text-slate-600">{item.availableStock}</td>
                        )}
                        {activeDocumentType !== 'SHORTAGE_CHECKLIST' && (
                          <td className="py-1.5 px-2 text-center font-bold">
                            {item.deficitQuantity > 0 ? (
                              <span className="text-rose-700 font-black">-{item.deficitQuantity} {item.unit}</span>
                            ) : (
                              <span className="text-emerald-700">Covered</span>
                            )}
                          </td>
                        )}
                        {includePrices && (
                          <>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-600">Rs.{item.unitCost}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                              Rs.{item.extendedCost.toLocaleString('en-IN')}
                            </td>
                          </>
                        )}
                        <td className="py-1.5 px-3 text-[10px] text-slate-600">
                          {activeDocumentType === 'WAREHOUSE_PICKLIST' ? (
                            <span className="font-mono font-bold text-emerald-800">📍 {item.binLocation}</span>
                          ) : (
                            <span>{item.vendorOrLocation}</span>
                          )}
                        </td>
                        {includeCheckboxes && (
                          <td className="py-1.5 px-2 text-center">
                            <div className="w-3.5 h-3.5 border border-slate-400 rounded inline-block" />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 4 Signatures Authorization Box */}
              {includeSignatures && (
                <div className="border border-slate-900 p-3 rounded space-y-3">
                  <div className="text-[10px] font-black uppercase text-slate-900">
                    OFFICIAL DISPATCH & QUALITY VERIFICATION SIGN-OFF
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                    <div className="space-y-4">
                      <span className="text-slate-500 font-bold uppercase block">1. Production Planner</span>
                      <div className="border-b border-slate-400 pb-1 text-slate-800">Sig: __________________</div>
                      <div className="text-slate-500">Date: ____/____/2026</div>
                    </div>
                    <div className="space-y-4">
                      <span className="text-slate-500 font-bold uppercase block">2. Warehouse Dispatch</span>
                      <div className="border-b border-slate-400 pb-1 text-slate-800">Sig: __________________</div>
                      <div className="text-slate-500">Date: ____/____/2026</div>
                    </div>
                    <div className="space-y-4">
                      <span className="text-slate-500 font-bold uppercase block">3. Quality Assurance</span>
                      <div className="border-b border-slate-400 pb-1 text-slate-800">Sig: __________________</div>
                      <div className="text-slate-500">Date: ____/____/2026</div>
                    </div>
                    <div className="space-y-4">
                      <span className="text-slate-500 font-bold uppercase block">4. Management Approval</span>
                      <div className="border-b border-slate-400 pb-1 text-slate-800">Sig: __________________</div>
                      <div className="text-slate-500">Date: ____/____/2026</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center text-[9px] text-slate-400 border-t border-slate-200 pt-2">
                Experimind Labs Private Limited • ISO 9001 / 21 CFR Compliant • Generated on {dispatchSummary.generatedAt}
              </div>
            </div>
          </div>
        ) : (
          /* ===== VIEW 2: INTERACTIVE DATA GRID WITH MULTI-SELECT & MOBILE ADAPTIVE CARDS ===== */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter Bar */}
            <div className="px-5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
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

                <button
                  onClick={() => setDeficitOnly(prev => !prev)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                    deficitOnly
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Show only items with deficit / shortage"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  Shortage Only ({dispatchSummary.items.filter(i => i.deficitQuantity > 0).length})
                </button>

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

              {/* Instant Search Bar */}
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

            {/* Bulk Selection Bar */}
            {selectedItemIds.size > 0 && (
              <div className="px-5 py-2.5 bg-indigo-950/80 border-b border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 shrink-0 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-indigo-600 text-white font-black text-xs px-2.5 py-1 rounded-lg">
                    {selectedMetrics.count} Selected
                  </span>
                  <span className="text-xs text-indigo-200 font-mono">
                    Total Value: <strong className="text-amber-300 font-bold">Rs. {selectedMetrics.totalCost.toLocaleString('en-IN')}</strong>
                  </span>
                  {selectedMetrics.deficitCount > 0 && (
                    <span className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded font-bold">
                      {selectedMetrics.deficitCount} Shortages
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleDownloadSelectedPdf}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Download Selected (PDF)
                  </button>
                  <button
                    onClick={() => handleExportExcel(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3 h-3" /> Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleCopyWhatsApp(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Copy Text
                  </button>
                  <button
                    onClick={handleClearSelection}
                    className="text-slate-400 hover:text-white text-xs px-2 py-1 font-bold underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Table & Mobile Card Views */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Desktop Table View (Hidden on mobile < md) */}
              <div className="hidden md:block bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
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
                      <th onClick={() => handleSort('sku')} className="py-3 px-3 w-32 cursor-pointer hover:text-white transition-colors">
                        <div className="flex items-center gap-1">
                          <span>SKU / Code</span>
                          {sortField === 'sku' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th onClick={() => handleSort('name')} className="py-3 px-4 cursor-pointer hover:text-white transition-colors">
                        <div className="flex items-center gap-1">
                          <span>Component & Specification</span>
                          {sortField === 'name' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th onClick={() => handleSort('actionChannel')} className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors">
                        <div className="flex items-center justify-center gap-1">
                          <span>Channel</span>
                          {sortField === 'actionChannel' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th onClick={() => handleSort('requiredQuantity')} className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors">
                        <div className="flex items-center justify-center gap-1">
                          <span>Required Qty</span>
                          {sortField === 'requiredQuantity' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th onClick={() => handleSort('availableStock')} className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors">
                        <div className="flex items-center justify-center gap-1">
                          <span>Stock</span>
                          {sortField === 'availableStock' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th onClick={() => handleSort('deficitQuantity')} className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors">
                        <div className="flex items-center justify-center gap-1">
                          <span>To Procure</span>
                          {sortField === 'deficitQuantity' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th onClick={() => handleSort('unitCost')} className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors">
                        <div className="flex items-center justify-end gap-1">
                          <span>Unit Cost</span>
                          {sortField === 'unitCost' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th onClick={() => handleSort('extendedCost')} className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors">
                        <div className="flex items-center justify-end gap-1">
                          <span>Ext. Total</span>
                          {sortField === 'extendedCost' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th onClick={() => handleSort('vendorOrLocation')} className="py-3 px-4 cursor-pointer hover:text-white transition-colors">
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
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectItem(item.id)}
                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
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
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-400 text-[11px] whitespace-nowrap">
                              {item.sku}
                              <div className="text-[9px] text-slate-500 truncate">{item.targetClassOrProject}</div>
                            </td>
                            <td className="py-2.5 px-4 space-y-0.5">
                              <div className="font-bold text-white text-xs">{item.name}</div>
                              <div className="text-[11px] text-slate-400 line-clamp-1">{item.specification}</div>
                              {item.notes && <div className="text-[10px] text-amber-400/80">📝 {item.notes}</div>}
                            </td>
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
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                              {item.requiredQuantity} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                              {item.availableStock}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {isDeficit ? (
                                <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded font-black">
                                  -{item.deficitQuantity} {item.unit}
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-bold">Covered</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                              Rs.{item.unitCost}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                              Rs.{item.extendedCost.toLocaleString('en-IN')}
                            </td>
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

              {/* Mobile Adaptive Cards View (Visible on mobile < md) */}
              <div className="md:hidden space-y-3">
                {filteredAndSortedItems.length > 0 ? (
                  filteredAndSortedItems.map(item => {
                    const isSelected = selectedItemIds.has(item.id);
                    const isDeficit = item.deficitQuantity > 0;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectItem(item.id)}
                              className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shrink-0">
                              <ItemImage
                                src={item.imageUrl}
                                alt={item.name}
                                category={item.category}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="font-mono text-[10px] text-indigo-400 font-bold">{item.sku}</div>
                              <div className="font-bold text-white text-xs leading-tight">{item.name}</div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-amber-300 text-xs">Rs.{item.extendedCost.toLocaleString('en-IN')}</div>
                            <div className="text-[10px] text-slate-500">Rs.{item.unitCost} / {item.unit}</div>
                          </div>
                        </div>

                        {/* Specification */}
                        {item.specification && (
                          <div className="text-[11px] text-slate-400 mt-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                            {item.specification}
                          </div>
                        )}

                        {/* Channel Badge & Quantities Strip */}
                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/80 flex-wrap text-xs">
                          <div>
                            {item.actionChannel === 'IN_STOCK' && (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                🟢 In-Stock ({item.binLocation})
                              </span>
                            )}
                            {item.actionChannel === 'LOCAL_BUY' && (
                              <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                🔵 Local Buy
                              </span>
                            )}
                            {item.actionChannel === 'TO_ORDER' && (
                              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                🟣 Vendor PO
                              </span>
                            )}
                            {item.actionChannel === 'IN_HOUSE_FABRICATION' && (
                              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                🟠 In-House Fab
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-400 text-[11px]">Req: <strong className="text-white">{item.requiredQuantity}</strong></span>
                            <span className="text-slate-400 text-[11px]">Stock: <strong className="text-slate-300">{item.availableStock}</strong></span>
                            {isDeficit ? (
                              <span className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-bold text-[10px]">
                                -{item.deficitQuantity}
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-bold text-[10px]">Covered</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 bg-slate-950 rounded-2xl border border-slate-800">
                    No materials match the active filters.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== CLEAN FOOTER BAR ===== */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-xs text-slate-400">
          <div>
            <span>Delivery: <strong className="text-amber-300 font-mono">{dispatchSummary.targetDeliveryDate}</strong></span>
            <span className="mx-2">•</span>
            <span>Total Items: <strong className="text-white font-mono">{dispatchSummary.totalItems}</strong></span>
            <span className="mx-2">•</span>
            <span>Procurement Budget: <strong className="text-amber-300 font-mono font-bold">Rs. {dispatchSummary.totalProcurementValueINR.toLocaleString('en-IN')}</strong></span>
          </div>

          <div className="flex items-center gap-2">
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
            { label: 'Estimated Unit Cost', value: `Rs. ${previewItem.unitCost}` },
            { label: 'Extended Total', value: `Rs. ${previewItem.extendedCost}` },
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
