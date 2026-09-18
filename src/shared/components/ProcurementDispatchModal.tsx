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
  Monitor,
  Loader2,
  Wrench,
  FlaskConical,
  Upload,
  FileUp,
  FolderPlus
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
import {
  downloadStandardPrastutiTemplateXlsx,
  parsePrastutiSpreadsheet,
  ParsedPrastutiProject
} from '../../utils/prastutiTemplateEngine';
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

/**
 * Bulletproof clipboard helper that works in both secure contexts and fallback legacy environments
 */
async function copyToClipboardSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

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

  // Loading / Feedback States
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState<boolean>(false);

  // Import Spreadsheet Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importedProjectsPreview, setImportedProjectsPreview] = useState<ParsedPrastutiProject[]>([]);
  const [selectedImportIndex, setSelectedImportIndex] = useState<number>(0);
  const [isImporting, setIsImporting] = useState<boolean>(false);

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

  // Keyboard Escape Handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImportModalOpen) {
          setIsImportModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isImportModalOpen, onClose]);

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
  const handleToggleSelectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleToggleSelectItem = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
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

  const handleClearSelection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
  const handleDownloadShortagePdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsGenerating('shortage');
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      DispatchPdfService.downloadShortageChecklistPdf(dispatchSummary, {
        orientation: pdfOrientation,
        includePrices,
        includeNotes,
        includeCheckboxes,
        includeSignatures
      });
      showToast('success', 'PDF Downloaded', 'Procurement & Shortage Shopping Checklist PDF saved.');
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Download Failed', err?.message || 'Failed to generate Shortage PDF.');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDownloadPickListPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsGenerating('picklist');
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      DispatchPdfService.downloadWarehousePickListPdf(dispatchSummary, {
        orientation: pdfOrientation,
        includePrices,
        includeNotes,
        includeCheckboxes,
        includeSignatures
      });
      showToast('success', 'PDF Downloaded', 'Warehouse Staging & Pick-List PDF saved.');
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Download Failed', err?.message || 'Failed to generate Pick-List PDF.');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDownloadLaserCuttingPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsGenerating('laser');
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      DispatchPdfService.downloadLaserCuttingDispatchPdf(dispatchSummary, {
        orientation: pdfOrientation,
        includePrices,
        includeNotes,
        includeCheckboxes,
        includeSignatures
      });
      showToast('success', 'PDF Downloaded', 'In-House Laser Cutting & Fabrication Job Card PDF saved.');
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Download Failed', err?.message || 'Failed to generate Laser Cutting PDF.');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDownloadLabPrepPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsGenerating('lab');
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      DispatchPdfService.downloadLabPreparationDispatchPdf(dispatchSummary, {
        orientation: pdfOrientation,
        includePrices,
        includeNotes,
        includeCheckboxes,
        includeSignatures
      });
      showToast('success', 'PDF Downloaded', 'Chemical & Lab Reagent Preparation Sheet PDF saved.');
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Download Failed', err?.message || 'Failed to generate Lab Prep PDF.');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDownloadStandardTemplate = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      downloadStandardPrastutiTemplateXlsx();
      showToast('success', 'Template Downloaded', 'Standard 6-Column Prastuti Excel Template (.xlsx) downloaded.');
    } catch (err: any) {
      showToast('error', 'Download Failed', err?.message || 'Failed to download standard template.');
    }
  };

  const handleDownloadFullDispatchPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsGenerating('full');
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      DispatchPdfService.downloadFullDispatchPdf(dispatchSummary, {
        orientation: pdfOrientation,
        includePrices,
        includeNotes,
        includeCheckboxes,
        includeSignatures
      });
      showToast('success', 'PDF Downloaded', 'Full Executive Dispatch Sheet PDF saved.');
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Download Failed', err?.message || 'Failed to generate Dispatch Sheet PDF.');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDownloadCurrentPreviewPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (activeDocumentType === 'SHORTAGE_CHECKLIST') {
      await handleDownloadShortagePdf();
    } else if (activeDocumentType === 'WAREHOUSE_PICKLIST') {
      await handleDownloadPickListPdf();
    } else if (activeDocumentType === 'LASER_CUTTING') {
      await handleDownloadLaserCuttingPdf();
    } else if (activeDocumentType === 'LAB_PREPARATION') {
      await handleDownloadLabPrepPdf();
    } else {
      await handleDownloadFullDispatchPdf();
    }
  };

  const handleFileUploadForImport = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parsePrastutiSpreadsheet(buffer);
      if (parsed.length === 0) {
        showToast('error', 'Import Empty', 'No valid sheets or rows found in the uploaded workbook.');
        return;
      }
      setImportedProjectsPreview(parsed);
      setSelectedImportIndex(0);
      setIsImportModalOpen(true);
      showToast('success', 'Spreadsheet Parsed', `Parsed ${parsed.length} project sheets with total ${parsed.reduce((s, p) => s + p.summary.totalItems, 0)} material items.`);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Parse Error', err?.message || 'Failed to parse Excel/CSV file.');
    }
  };

  const handleConfirmImportProject = async () => {
    if (importedProjectsPreview.length === 0) return;
    const selected = importedProjectsPreview[selectedImportIndex];
    if (!selected) return;

    setIsImporting(true);
    try {
      // Create Project from Parsed Rows
      const newProjectId = `PRJ-${selected.grade.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
      const newProject: Project = {
        id: newProjectId,
        code: `PRJ-${selected.grade.toUpperCase()}`,
        name: selected.name,
        description: selected.description,
        category: 'STEM_CURRICULUM',
        clientName: 'Experimind Labs Standard Curriculum',
        leadUserName: 'Dr. Samartha HM',
        assignedUserIds: ['usr-admin-01', 'usr-op-02'],
        assignedUserNames: ['Dr. Samartha HM', 'Ravi Kumar (Lead Tech)'],
        status: 'IN_PREP',
        priority: 'HIGH',
        startDate: new Date().toISOString().slice(0, 10),
        targetDeliveryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        defaultBatchMultiplier: 5,
        budgetINR: selected.rows.reduce((sum, r) => sum + (r.unitCost || 50) * (r.qtyPerKit || 1) * 5, 0),
        invoicedRevenueINR: selected.rows.reduce((sum, r) => sum + (r.unitCost || 50) * (r.qtyPerKit || 1) * 5 * 1.4, 0),
        classes: [
          {
            id: `cls-${selected.grade.toLowerCase()}`,
            name: `${selected.grade} Science Activities`,
            batchMultiplier: 5,
            description: `${selected.rows.length} materials across activities`,
            items: selected.rows.map((r, idx) => ({
              id: `ITM-imp-${idx + 1}`,
              classId: `cls-${selected.grade.toLowerCase()}`,
              name: r.materialDescription,
              category: r.laserCutting ? 'FABRICATION_LASER_3D' : r.prepare ? 'CHEMICAL_REAGENT' : r.toOrder ? 'HARDWARE_SUPPLIES' : 'ACTIVITY_KIT',
              specification: r.specification || r.activityName,
              quantityPerBatchUnit: r.qtyPerKit || 1,
              totalQuantity: (r.qtyPerKit || 1) * 5,
              unit: r.unit || 'units',
              sourcingChannel: r.laserCutting ? 'LASER_CUT' : r.prepare ? 'CHEMICAL_PREP' : r.toOrder ? 'ORDER_ONLINE' : 'IN_STOCK',
              status: 'PENDING',
              unitCost: r.unitCost || 50,
              sourceChapter: r.activityName
            }))
          }
        ],
        batchConfigurations: [
          { gradeOrKitId: selected.grade, kitName: selected.name, targetQuantity: 5 }
        ],
        expenses: [],
        auditLogs: [],
        qaSignOff: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      ProjectManagementService.createProject(newProject);
      setProjects(ProjectManagementService.getAllProjects());
      setSelectedProjectId(newProjectId);
      setSourceMode('PROJECT');
      setIsImportModalOpen(false);
      showToast('success', 'Project Imported', `Successfully created and loaded project: ${selected.name}`);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Import Failed', err?.message || 'Failed to save project.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadSelectedPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (selectedItemIds.size === 0) return;
    setIsGenerating('selected');
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      DispatchPdfService.downloadSelectedItemsPdf(dispatchSummary, selectedItemIds, {
        orientation: pdfOrientation,
        includePrices,
        includeNotes,
        includeCheckboxes,
        includeSignatures
      });
      showToast('success', 'PDF Downloaded', `Checklist PDF for ${selectedItemIds.size} Selected Items downloaded.`);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Download Failed', err?.message || 'Failed to generate Selected Items PDF.');
    } finally {
      setIsGenerating(null);
    }
  };

  // Excel, CSV & WhatsApp Handlers
  const handleExportExcel = async (onlySelected = false, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsGenerating('excel');
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const targetSummary = onlySelected && selectedItemIds.size > 0
        ? DispatchReportService.filterSummaryToItems(dispatchSummary, selectedItemIds)
        : dispatchSummary;

      DispatchReportService.downloadExcel(targetSummary);
      showToast(
        'success',
        'Excel Exported',
        onlySelected
          ? `Exported ${selectedItemIds.size} selected items to Excel (.xlsx).`
          : 'Exported complete 5-tab Excel Dispatch workbook (.xlsx).'
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Export Failed', err?.message || 'Failed to export Excel file.');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleExportCsv = (onlySelected = false, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const targetSummary = onlySelected && selectedItemIds.size > 0
        ? DispatchReportService.filterSummaryToItems(dispatchSummary, selectedItemIds)
        : dispatchSummary;

      DispatchReportService.downloadCsv(targetSummary);
      showToast(
        'success',
        'CSV Exported',
        onlySelected
          ? `Exported ${selectedItemIds.size} selected items to CSV.`
          : 'Exported Dispatch CSV Data File.'
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Export Failed', err?.message || 'Failed to export CSV file.');
    }
  };

  const handleCopyWhatsApp = async (onlySelected = false, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const targetSummary = onlySelected && selectedItemIds.size > 0
        ? DispatchReportService.filterSummaryToItems(dispatchSummary, selectedItemIds)
        : dispatchSummary;

      const text = DispatchReportService.generateWhatsAppSummaryText(targetSummary);
      const success = await copyToClipboardSafe(text);
      if (success) {
        setCopiedWhatsApp(true);
        showToast(
          'success',
          'Copied to Clipboard',
          onlySelected
            ? `Copied ${selectedItemIds.size} Selected Items standup text.`
            : 'Copied Team Standup Dispatch text to clipboard.'
        );
        setTimeout(() => setCopiedWhatsApp(false), 3000);
      } else {
        throw new Error('Clipboard write operation was not permitted.');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Copy Failed', err?.message || 'Failed to copy to clipboard.');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        
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

          {/* Top Level PDF & Template Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1-Click Shortage Shopping Checklist PDF */}
            <button
              type="button"
              onClick={handleDownloadShortagePdf}
              disabled={isGenerating === 'shortage'}
              className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer min-h-[40px] disabled:opacity-50"
              title="Download Shortage & Local Market Shopping Checklist PDF"
            >
              {isGenerating === 'shortage' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingBag className="w-3.5 h-3.5" />}
              <span>Shortage / Buy List</span>
            </button>

            {/* 1-Click Warehouse Pick List PDF */}
            <button
              type="button"
              onClick={handleDownloadPickListPdf}
              disabled={isGenerating === 'picklist'}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer min-h-[40px] disabled:opacity-50"
              title="Download Warehouse Staging & Kitting Pick List PDF"
            >
              {isGenerating === 'picklist' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
              <span>Warehouse Pick List</span>
            </button>

            {/* 1-Click In-House Laser Cutting Job Card PDF */}
            <button
              type="button"
              onClick={handleDownloadLaserCuttingPdf}
              disabled={isGenerating === 'laser'}
              className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95 transition-all cursor-pointer min-h-[40px] disabled:opacity-50"
              title="Download In-House Laser Cutting & Fabrication Job Card PDF"
            >
              {isGenerating === 'laser' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
              <span>Laser & Fab</span>
            </button>

            {/* 1-Click Chemical Lab Preparation PDF */}
            <button
              type="button"
              onClick={handleDownloadLabPrepPdf}
              disabled={isGenerating === 'lab'}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 active:scale-95 transition-all cursor-pointer min-h-[40px] disabled:opacity-50"
              title="Download Chemical Formulation & Reagent Prep Sheet PDF"
            >
              {isGenerating === 'lab' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
              <span>Lab Prep</span>
            </button>

            {/* 1-Click Full Executive Report PDF */}
            <button
              type="button"
              onClick={handleDownloadFullDispatchPdf}
              disabled={isGenerating === 'full'}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer min-h-[40px] disabled:opacity-50"
              title="Download Full Executive Dispatch & Readiness PDF"
            >
              {isGenerating === 'full' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Full Dispatch</span>
            </button>

            {/* Standard Excel Template (.xlsx) */}
            <button
              type="button"
              onClick={handleDownloadStandardTemplate}
              className="bg-emerald-950/70 border border-emerald-500/30 hover:bg-emerald-900/60 text-emerald-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer min-h-[40px]"
              title="Download official 6-column standard Excel template (8th, 9th, 10th grades)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Standard Template (.xlsx)</span>
            </button>

            {/* Import Project Spreadsheet */}
            <label
              className="bg-indigo-950/70 border border-indigo-500/30 hover:bg-indigo-900/60 text-indigo-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer min-h-[40px]"
              title="Import .xlsx or .csv standard project spreadsheet"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Import Excel</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUploadForImport(file);
                    e.target.value = '';
                  }
                }}
              />
            </label>

            {/* Export Full Excel */}
            <button
              type="button"
              onClick={(e) => handleExportExcel(false, e)}
              disabled={isGenerating === 'excel'}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer min-h-[40px] disabled:opacity-50"
              title="Export 5-Tab Excel Spreadsheet (.xlsx)"
            >
              {isGenerating === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleCopyWhatsApp(false, e)}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer min-h-[40px] ${
                copiedWhatsApp ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Copy WhatsApp/Slack summary text"
            >
              {copiedWhatsApp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
              <span>{copiedWhatsApp ? 'Copied' : 'Text'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer ml-1 min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Close Dispatch Hub (Esc)"
              aria-label="Close"
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
              type="button"
              onClick={() => setSourceMode('PROJECT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sourceMode === 'PROJECT' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              📁 Project
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('PRODUCTION_MATRIX')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sourceMode === 'PRODUCTION_MATRIX' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              🏭 Master Matrix
            </button>

            {sourceMode === 'PROJECT' && (
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-indigo-300 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setBatchMultiplier(prev => Math.max(1, prev - 1));
                }}
                className="px-2 py-0.5 text-xs text-slate-400 hover:text-white font-bold cursor-pointer rounded hover:bg-slate-800"
                title="Decrease batch multiplier"
              >
                -
              </button>
              <span className="px-1.5 font-mono text-xs font-black text-indigo-400 tabular-num">{batchMultiplier}x</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setBatchMultiplier(prev => prev + 1);
                }}
                className="px-2 py-0.5 text-xs text-slate-400 hover:text-white font-bold cursor-pointer rounded hover:bg-slate-800"
                title="Increase batch multiplier"
              >
                +
              </button>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('DOCUMENT_PREVIEW')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'DOCUMENT_PREVIEW' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> PDF Document Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode('INTERACTIVE_GRID')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
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
                  type="button"
                  onClick={() => setActiveDocumentType('SHORTAGE_CHECKLIST')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeDocumentType === 'SHORTAGE_CHECKLIST'
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  🛒 Shortage ({dispatchSummary.items.filter(i => i.deficitQuantity > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocumentType('WAREHOUSE_PICKLIST')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeDocumentType === 'WAREHOUSE_PICKLIST'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  📦 Warehouse Pick List ({dispatchSummary.inStockCount + dispatchSummary.fabricationCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocumentType('LASER_CUTTING')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeDocumentType === 'LASER_CUTTING'
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  🛠️ Laser & Fab Job Card
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocumentType('LAB_PREPARATION')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeDocumentType === 'LAB_PREPARATION'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  🧪 Lab Reagents Prep
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocumentType('FULL_DISPATCH')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeDocumentType === 'FULL_DISPATCH'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  📑 Full Dispatch ({dispatchSummary.totalItems})
                </button>
              </div>

              {/* Orientation, Options & Direct Download */}
              <div className="flex items-center gap-3 text-xs text-slate-300 font-medium flex-wrap">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setPdfOrientation('landscape')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                      pdfOrientation === 'landscape' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfOrientation('portrait')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
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

                {/* Direct Download of Current Preview */}
                <button
                  type="button"
                  onClick={handleDownloadCurrentPreviewPdf}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ml-auto"
                  title="Download this exact preview as PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download This Preview (PDF)</span>
                </button>
              </div>
            </div>

            {/* Realistic White Document Canvas Preview */}
            <div className={`bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-8 w-full border border-slate-200 font-sans space-y-5 ${
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
                  <div className="text-base font-black text-emerald-700 font-mono tabular-num">{dispatchSummary.stockReadinessPct}%</div>
                  <div className="text-[9px] text-slate-600">{dispatchSummary.inStockCount} / {dispatchSummary.totalItems} In Stock</div>
                </div>

                <div className="border border-slate-200 p-2 rounded-lg bg-sky-50/50">
                  <div className="text-[9px] font-bold text-sky-800 uppercase">Local Cash Buy</div>
                  <div className="text-base font-black text-sky-700 font-mono tabular-num">Rs. {dispatchSummary.localPurchaseCashINR.toLocaleString('en-IN')}</div>
                  <div className="text-[9px] text-slate-600">{dispatchSummary.localBuyCount} Items</div>
                </div>

                <div className="border border-slate-200 p-2 rounded-lg bg-purple-50/50">
                  <div className="text-[9px] font-bold text-purple-800 uppercase">Vendor POs</div>
                  <div className="text-base font-black text-purple-700 font-mono tabular-num">Rs. {dispatchSummary.vendorOrdersTotalINR.toLocaleString('en-IN')}</div>
                  <div className="text-[9px] text-slate-600">{dispatchSummary.toOrderCount} Items</div>
                </div>

                <div className="border border-slate-200 p-2 rounded-lg bg-amber-50/50">
                  <div className="text-[9px] font-bold text-amber-800 uppercase">Total Budget</div>
                  <div className="text-base font-black text-amber-700 font-mono tabular-num">Rs. {dispatchSummary.totalProcurementValueINR.toLocaleString('en-IN')}</div>
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
                    ).slice(0, 15).map((item) => {
                      const isDeficit = item.deficitQuantity > 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2.5 font-mono font-bold text-indigo-700">{item.sku}</td>
                          <td className="py-1.5 px-3">
                            <span className="font-bold text-slate-900">{item.name}</span>
                            {includeNotes && item.notes && (
                              <span className="text-[10px] text-slate-500 block truncate max-w-xs">{item.notes}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {item.actionChannel === 'IN_STOCK' && (
                              <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[9px]">IN STOCK</span>
                            )}
                            {item.actionChannel === 'LOCAL_BUY' && (
                              <span className="font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded text-[9px]">LOCAL BUY</span>
                            )}
                            {item.actionChannel === 'TO_ORDER' && (
                              <span className="font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded text-[9px]">VENDOR PO</span>
                            )}
                            {item.actionChannel === 'IN_HOUSE_FABRICATION' && (
                              <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[9px]">IN-HOUSE</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center font-bold font-mono">
                            {activeDocumentType === 'SHORTAGE_CHECKLIST' ? item.deficitQuantity : item.requiredQuantity} {item.unit}
                          </td>
                          {activeDocumentType !== 'SHORTAGE_CHECKLIST' && (
                            <td className="py-1.5 px-2 text-center font-mono">{item.availableStock}</td>
                          )}
                          {activeDocumentType !== 'SHORTAGE_CHECKLIST' && (
                            <td className="py-1.5 px-2 text-center font-bold font-mono">
                              {isDeficit ? (
                                <span className="text-rose-600">-{item.deficitQuantity}</span>
                              ) : (
                                <span className="text-emerald-700">Covered</span>
                              )}
                            </td>
                          )}
                          {includePrices && (
                            <>
                              <td className="py-1.5 px-2 text-right font-mono text-slate-600">Rs.{item.unitCost}</td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">Rs.{item.extendedCost.toLocaleString('en-IN')}</td>
                            </>
                          )}
                          <td className="py-1.5 px-3 text-[10px] text-slate-600 truncate max-w-xs">
                            {activeDocumentType === 'WAREHOUSE_PICKLIST' ? item.binLocation : item.vendorOrLocation}
                          </td>
                          {includeCheckboxes && (
                            <td className="py-1.5 px-2 text-center">
                              <div className="w-3.5 h-3.5 border border-slate-400 rounded-xs mx-auto" />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="text-[10px] text-slate-500 text-center italic pt-1">
                  (Showing preview of first 15 line items — Full downloadable PDF includes all {dispatchSummary.totalItems} items across formatted pages)
                </div>
              </div>

              {/* 4-Tier Verification Signatures (If Enabled) */}
              {includeSignatures && (
                <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="border-t border-slate-400 pt-1">
                    <div className="text-[10px] font-black text-slate-900 uppercase">1. Material Planner</div>
                    <div className="text-[9px] text-slate-500">BOM Verified & Scaled</div>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <div className="text-[10px] font-black text-slate-900 uppercase">2. Warehouse Dispatch</div>
                    <div className="text-[9px] text-slate-500">Pick & Kitting Staged</div>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <div className="text-[10px] font-black text-slate-900 uppercase">3. QA & Compliance</div>
                    <div className="text-[9px] text-slate-500">ISO 9001 / 21 CFR Pass</div>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <div className="text-[10px] font-black text-slate-900 uppercase">4. Lead Engineer</div>
                    <div className="text-[9px] text-slate-500">Final Release Authorized</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ===== VIEW 2: INTERACTIVE DATA GRID & FILTER SUITE ===== */
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
                    type="button"
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
                  type="button"
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
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-[11px] text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
                    type="button"
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
                    Total Value: <strong className="text-amber-300 font-bold tabular-num">Rs. {selectedMetrics.totalCost.toLocaleString('en-IN')}</strong>
                  </span>
                  {selectedMetrics.deficitCount > 0 && (
                    <span className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded font-bold">
                      {selectedMetrics.deficitCount} Shortages
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadSelectedPdf}
                    disabled={isGenerating === 'selected'}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating === 'selected' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    <span>Download Selected (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleExportExcel(true, e)}
                    disabled={isGenerating === 'excel'}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating === 'excel' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleCopyWhatsApp(true, e)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </button>
                  <button
                    type="button"
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
                      <th onClick={() => handleSort('extendedCost')} className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors">
                        <div className="flex items-center justify-end gap-1">
                          <span>Ext. Total</span>
                          {sortField === 'extendedCost' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-4">Sourcing / Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {filteredAndSortedItems.length > 0 ? (
                      filteredAndSortedItems.map(item => {
                        const isSelected = selectedItemIds.has(item.id);
                        const isDeficit = item.deficitQuantity > 0;

                        return (
                          <tr
                            key={item.id}
                            onClick={() => handleToggleSelectItem(item.id)}
                            className={`hover:bg-slate-900/80 transition-colors cursor-pointer ${
                              isSelected ? 'bg-indigo-950/40' : ''
                            }`}
                          >
                            <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => handleToggleSelectItem(item.id, e)}
                                className="text-slate-500 hover:text-indigo-400 cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>

                            <td className="py-2 px-2 text-center" onClick={(e) => {
                              e.stopPropagation();
                              setPreviewItem(item);
                            }}>
                              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden mx-auto relative group">
                                <ItemImage
                                  src={item.imageUrl}
                                  alt={item.name}
                                  category={item.category}
                                  className="w-full h-full object-contain p-0.5"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <ZoomIn className="w-3 h-3" />
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3 font-mono font-bold text-indigo-400">
                              <div>{item.sku}</div>
                              <div className="text-[10px] text-slate-500 font-normal">{item.targetClassOrProject}</div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-white leading-tight">{item.name}</div>
                              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{item.specification}</div>
                              {item.notes && (
                                <div className="text-[10px] text-amber-400/90 font-medium flex items-center gap-1 mt-0.5">
                                  📄 {item.notes}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              {item.actionChannel === 'IN_STOCK' && (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block">
                                  In Stock
                                </span>
                              )}
                              {item.actionChannel === 'LOCAL_BUY' && (
                                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block">
                                  Local Buy
                                </span>
                              )}
                              {item.actionChannel === 'TO_ORDER' && (
                                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block">
                                  Vendor PO
                                </span>
                              )}
                              {item.actionChannel === 'IN_HOUSE_FABRICATION' && (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block">
                                  In-House
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center font-mono font-bold text-white tabular-num">
                              {item.requiredQuantity} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                            </td>

                            <td className="py-3 px-3 text-center font-mono text-slate-300 tabular-num">
                              {item.availableStock}
                            </td>

                            <td className="py-3 px-3 text-center font-mono font-bold tabular-num">
                              {isDeficit ? (
                                <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded text-[11px]">
                                  -{item.deficitQuantity} {item.unit}
                                </span>
                              ) : (
                                <span className="text-emerald-400 text-[11px]">Covered</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right font-mono text-slate-400 tabular-num">
                              Rs.{item.unitCost}
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-300 tabular-num">
                              Rs.{item.extendedCost.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3 px-4 text-[11px]">
                              <div className="text-slate-300 font-medium">{item.vendorOrLocation}</div>
                              {item.leadTimeDays > 0 && (
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  ⏱ Lead: {item.leadTimeDays}d
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400">
                          No components match the active search or channel filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Adaptive Touch Card View (Shown on screens < md) */}
              <div className="md:hidden space-y-3">
                {filteredAndSortedItems.length > 0 ? (
                  filteredAndSortedItems.map(item => {
                    const isSelected = selectedItemIds.has(item.id);
                    const isDeficit = item.deficitQuantity > 0;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleSelectItem(item.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500/50 shadow-md'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => handleToggleSelectItem(item.id, e)}
                              className="text-slate-500 hover:text-indigo-400 p-1"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-indigo-400" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>

                            <div
                              className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 relative"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewItem(item);
                              }}
                            >
                              <ItemImage
                                src={item.imageUrl}
                                alt={item.name}
                                category={item.category}
                                className="w-full h-full object-contain p-1"
                              />
                            </div>

                            <div>
                              <div className="font-bold text-white text-sm leading-tight">{item.name}</div>
                              <div className="font-mono text-[10px] text-indigo-400 mt-0.5">{item.sku}</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-amber-300 text-sm tabular-num">
                              Rs.{item.extendedCost.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-slate-500">Rs.{item.unitCost}/unit</div>
                          </div>
                        </div>

                        {/* Specification & Notes */}
                        <div className="text-xs text-slate-400 mt-2 line-clamp-2">
                          {item.specification}
                        </div>

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
                            <span className="text-slate-400 text-[11px]">Req: <strong className="text-white tabular-num">{item.requiredQuantity}</strong></span>
                            <span className="text-slate-400 text-[11px]">Stock: <strong className="text-slate-300 tabular-num">{item.availableStock}</strong></span>
                            {isDeficit ? (
                              <span className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-bold text-[10px] tabular-num">
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
            <span>Total Items: <strong className="text-white font-mono tabular-num">{dispatchSummary.totalItems}</strong></span>
            <span className="mx-2">•</span>
            <span>Procurement Budget: <strong className="text-amber-300 font-mono font-bold tabular-num">Rs. {dispatchSummary.totalProcurementValueINR.toLocaleString('en-IN')}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer min-h-[40px] flex items-center justify-center active:scale-95"
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
            showToast('success', 'Image Updated', 'Component image updated with Image Studio.');
          }}
        />
      )}

      {/* ===== IMPORT PROJECT SPREADSHEET MODAL ===== */}
      {isImportModalOpen && importedProjectsPreview.length > 0 && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Import Standard Project Spreadsheet</h3>
                  <p className="text-xs text-slate-400">Preview and load curriculum activities & BOM into the production system</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sheet Selector Tabs */}
            {importedProjectsPreview.length > 1 && (
              <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-bold text-slate-400 uppercase">Workbook Sheets:</span>
                {importedProjectsPreview.map((proj, idx) => (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => setSelectedImportIndex(idx)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedImportIndex === idx
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{proj.grade || `Sheet ${idx + 1}`}</span>
                    <span className="px-1.5 py-0.2 text-[10px] rounded bg-black/30 font-mono">
                      {proj.rows.length} items
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Modal Body / Summary Cards & Table Preview */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {(() => {
                const current = importedProjectsPreview[selectedImportIndex];
                if (!current) return null;
                return (
                  <>
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Total Materials</div>
                        <div className="text-lg font-black text-white font-mono mt-0.5">{current.summary.totalItems}</div>
                      </div>
                      <div className="bg-slate-950 border border-purple-500/20 rounded-2xl p-3">
                        <div className="text-[10px] uppercase font-bold text-purple-400">Vendor PO / Buy</div>
                        <div className="text-lg font-black text-purple-300 font-mono mt-0.5">{current.summary.toOrderCount}</div>
                      </div>
                      <div className="bg-slate-950 border border-amber-500/20 rounded-2xl p-3">
                        <div className="text-[10px] uppercase font-bold text-amber-400">Laser Cutting</div>
                        <div className="text-lg font-black text-amber-300 font-mono mt-0.5">{current.summary.laserCuttingCount}</div>
                      </div>
                      <div className="bg-slate-950 border border-cyan-500/20 rounded-2xl p-3">
                        <div className="text-[10px] uppercase font-bold text-cyan-400">Chemical Prep</div>
                        <div className="text-lg font-black text-cyan-300 font-mono mt-0.5">{current.summary.prepareCount}</div>
                      </div>
                      <div className="bg-slate-950 border border-emerald-500/20 rounded-2xl p-3">
                        <div className="text-[10px] uppercase font-bold text-emerald-400">In-Stock Pick</div>
                        <div className="text-lg font-black text-emerald-300 font-mono mt-0.5">{current.summary.inStockCount}</div>
                      </div>
                    </div>

                    {/* Table Preview */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
                      <div className="max-h-[360px] overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <tr>
                              <th className="p-3">#</th>
                              <th className="p-3">Activity Name</th>
                              <th className="p-3">Component / Material Description</th>
                              <th className="p-3 text-center">To Order</th>
                              <th className="p-3 text-center">Laser Cut</th>
                              <th className="p-3 text-center">In Stock</th>
                              <th className="p-3 text-center">Prepare</th>
                              <th className="p-3 text-center">Channel</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {current.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-900/50 transition-colors">
                                <td className="p-3 font-mono text-slate-500 text-[10px]">{rIdx + 1}</td>
                                <td className="p-3 font-medium text-slate-300 max-w-[220px] truncate">{row.activityName}</td>
                                <td className="p-3 font-bold text-white max-w-[260px] truncate">{row.materialDescription}</td>
                                <td className="p-3 text-center">
                                  {row.toOrder ? <span className="text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded text-[10px]">YES</span> : <span className="text-slate-600">no</span>}
                                </td>
                                <td className="p-3 text-center">
                                  {row.laserCutting ? <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">YES</span> : <span className="text-slate-600">no</span>}
                                </td>
                                <td className="p-3 text-center">
                                  {row.inStock ? <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">YES</span> : <span className="text-slate-600">no</span>}
                                </td>
                                <td className="p-3 text-center">
                                  {row.prepare ? <span className="text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded text-[10px]">YES</span> : <span className="text-slate-600">no</span>}
                                </td>
                                <td className="p-3 text-center">
                                  {row.channel === 'laser_cutting' && <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold">Laser Lab</span>}
                                  {row.channel === 'lab_prepare' && <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full font-bold">Chemical Prep</span>}
                                  {row.channel === 'vendor_po' && <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full font-bold">Vendor PO</span>}
                                  {row.channel === 'in_stock' && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Warehouse</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmImportProject}
                disabled={isImporting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
                <span>Create & Load Project ({importedProjectsPreview[selectedImportIndex]?.grade || 'Selected Sheet'})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
