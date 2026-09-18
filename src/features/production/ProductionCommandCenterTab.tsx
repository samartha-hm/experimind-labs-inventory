import React, { useState, useMemo } from 'react';
import {
  Factory,
  Layers,
  FlaskConical,
  Scissors,
  Package,
  Truck,
  Plus,
  Printer,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Building2,
  Briefcase,
  FolderKanban,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  Barcode,
  CheckSquare,
  Square,
  ExternalLink,
  Flame,
  Info,
  X
} from 'lucide-react';
import {
  MASTER_PRODUCTION_ITEMS,
  MASTER_PRODUCTION_DOUBTS,
  ProductionItem,
  ProductionDoubt,
  SourcingType,
  ItemStatus,
  PouchCategory,
  CrateLevel,
  BranchOrigin
} from '../../data/productionDataset';
import { ProductionWorkflowService, BatchCalculationResult } from '../../services/ProductionWorkflowService';
import { ProjectManagementService } from '../../services/ProjectManagementService';
import { Project } from '../../data/projectsDataset';
import { useToast } from '../../contexts/ToastContext';

export default function ProductionCommandCenterTab() {
  const { showToast } = useToast();

  // Multi-Project State
  const [projectsList] = useState<Project[]>(() => ProjectManagementService.getAllProjects());
  const [activeProjectId, setActiveProjectId] = useState<string>('ALL');

  // State
  const [items, setItems] = useState<ProductionItem[]>(() => ProductionWorkflowService.getItems());
  const [doubts, setDoubts] = useState<ProductionDoubt[]>(() => ProductionWorkflowService.getDoubts());
  const [batchMultiplier, setBatchMultiplier] = useState<number>(5);
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [activeSubView, setActiveSubView] = useState<'matrix' | 'chemicals' | 'laser' | 'bagging' | 'procurement'>('matrix');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSourcing, setSelectedSourcing] = useState<SourcingType | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | 'ALL'>('ALL');
  const [selectedCrate, setSelectedCrate] = useState<CrateLevel | 'ALL'>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<BranchOrigin | 'ALL'>('ALL');

  // Selection for bulk actions
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // New Item Form State
  const [newItemGrade, setNewItemGrade] = useState<string>('Grade 10');
  const [newItemActivityCode, setNewItemActivityCode] = useState<string>('');
  const [newItemActivityName, setNewItemActivityName] = useState<string>('');
  const [newItemMaterialName, setNewItemMaterialName] = useState<string>('');
  const [newItemPrepSpec, setNewItemPrepSpec] = useState<string>('1 unit');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemSourcing, setNewItemSourcing] = useState<SourcingType>('IN_HOUSE_PREP');
  const [newItemPouchCat, setNewItemPouchCat] = useState<PouchCategory>('HARDWARE_BLUE');
  const [newItemCrateLevel, setNewItemCrateLevel] = useState<CrateLevel>('ACTIVITY_POUCH');
  const [newItemCost, setNewItemCost] = useState<number>(25);
  const [newItemBin, setNewItemBin] = useState<string>('Rack 1, Shelf A');

  // Calculate Batch Metrics
  const batchStats: BatchCalculationResult = useMemo(() => {
    return ProductionWorkflowService.calculateBatchRequirements(batchMultiplier, selectedGrade);
  }, [batchMultiplier, selectedGrade, items]);

  // Filtered Items for Display
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedGrade !== 'ALL' && item.grade.toLowerCase() !== selectedGrade.toLowerCase()) {
        return false;
      }
      if (selectedSourcing !== 'ALL' && item.sourcingType !== selectedSourcing) {
        return false;
      }
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false;
      }
      if (selectedCrate !== 'ALL' && item.crateLevel !== selectedCrate) {
        return false;
      }
      if (selectedBranch !== 'ALL' && item.branchOrigin !== selectedBranch) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.materialName.toLowerCase().includes(q) ||
          item.activityCode.toLowerCase().includes(q) ||
          item.activityName.toLowerCase().includes(q) ||
          item.prepSpecification.toLowerCase().includes(q) ||
          item.warehouseBin.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, selectedGrade, selectedSourcing, selectedStatus, selectedCrate, selectedBranch, searchQuery]);

  // Handlers
  const handleStatusToggle = (item: ProductionItem) => {
    const nextStatusMap: Record<ItemStatus, ItemStatus> = {
      PENDING: 'IN_PREP',
      IN_PREP: 'PREPPED',
      PREPPED: 'BAGGED',
      BAGGED: 'PACKED',
      PACKED: 'PENDING',
      BLOCKED: 'PENDING'
    };
    const nextStatus = nextStatusMap[item.status];
    const updated = ProductionWorkflowService.updateItemStatus(item.id, nextStatus, {
      preppedCount: nextStatus === 'PREPPED' || nextStatus === 'BAGGED' || nextStatus === 'PACKED' ? item.quantityPerKit * batchMultiplier : 0,
      packedCount: nextStatus === 'PACKED' ? item.quantityPerKit * batchMultiplier : 0
    });
    if (updated) {
      setItems([...ProductionWorkflowService.getItems()]);
      showToast(`${item.materialName} marked as ${nextStatus}`, 'success');
    }
  };

  const handleBulkStatus = (status: ItemStatus) => {
    if (selectedItemIds.size === 0) return;
    const count = ProductionWorkflowService.batchUpdateStatus(Array.from(selectedItemIds), status);
    setItems([...ProductionWorkflowService.getItems()]);
    setSelectedItemIds(new Set());
    showToast(`Updated ${count} items to ${status}`, 'success');
  };

  const handleSelectAll = () => {
    if (selectedItemIds.size === filteredItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const toggleItemSelection = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  const handleCreateCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemMaterialName.trim()) {
      showToast('Material Name is required', 'error');
      return;
    }
    const created = ProductionWorkflowService.addCustomItem({
      grade: newItemGrade,
      activityCode: newItemActivityCode || 'EXP.CUSTOM',
      activityName: newItemActivityName || 'Custom Educational Activity',
      materialName: newItemMaterialName,
      prepSpecification: newItemPrepSpec,
      quantityPerKit: newItemQty,
      sourcingType: newItemSourcing,
      pouchCategory: newItemPouchCat,
      crateLevel: newItemCrateLevel,
      unitCost: newItemCost,
      warehouseBin: newItemBin,
      currentStock: 30
    });
    setItems([...ProductionWorkflowService.getItems()]);
    setIsAddModalOpen(false);
    showToast(`Added ${created.materialName} to Production Master!`, 'success');
    // Reset Form
    setNewItemMaterialName('');
    setNewItemActivityCode('');
    setNewItemActivityName('');
  };

  const handleExportCSV = () => {
    const headers = [
      'Item ID',
      'Grade',
      'Chapter',
      'Activity Code',
      'Activity Name',
      'Material Name',
      'Prep Specification',
      'Unit Qty',
      'Batch Required (' + batchMultiplier + 'x)',
      'Available Stock',
      'Deficit',
      'Sourcing Channel',
      'Pouch Type',
      'Crate Tier',
      'Location Bin',
      'Status',
      'Unit Cost (INR)',
      'Total Batch Cost (INR)',
      'QA Notes'
    ];

    const rows = filteredItems.map(item => {
      const required = item.quantityPerKit * batchMultiplier;
      const deficit = Math.max(0, required - item.currentStock);
      return [
        item.id,
        item.grade,
        `"${item.chapter}"`,
        item.activityCode,
        `"${item.activityName}"`,
        `"${item.materialName}"`,
        `"${item.prepSpecification}"`,
        item.quantityPerKit,
        required,
        item.currentStock,
        deficit,
        item.sourcingType,
        item.pouchCategory,
        item.crateLevel,
        `"${item.warehouseBin}"`,
        item.status,
        item.unitCost,
        item.unitCost * required,
        `"${item.qaNotes || ''}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ExperiMind_Production_Matrix_${selectedGrade}_${batchMultiplier}Sets.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported production matrix to CSV!', 'success');
  };

  // Helper styling
  const getSourcingBadge = (st: SourcingType) => {
    switch (st) {
      case 'IN_STOCK':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Package className="w-3 h-3" /> In Stock</span>;
      case 'TO_ORDER':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Truck className="w-3 h-3" /> To Order / Sirsi</span>;
      case 'IN_HOUSE_PREP':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20"><FlaskConical className="w-3 h-3" /> In-House Prep</span>;
      case 'LASER_CUT_FABLAB':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"><Scissors className="w-3 h-3" /> FabLab Laser</span>;
      case 'CRATE_SHARED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-300 border border-slate-500/20"><Layers className="w-3 h-3" /> Common Crate</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300">{st}</span>;
    }
  };

  const getPouchBadge = (cat: PouchCategory) => {
    switch (cat) {
      case 'BIOLOGY_YELLOW':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">🟡 Yellow Pouch (Bio)</span>;
      case 'OPTICS_GREEN':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">🟢 Green Pouch (Optics)</span>;
      case 'HARDWARE_BLUE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-400/20 text-blue-300 border border-blue-400/30">🔵 Blue Pouch (Hardware)</span>;
      case 'CHEMICAL_ORANGE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-400/20 text-orange-300 border border-orange-400/30">🔴 Orange (Reagents)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">📦 Crate Apparatus</span>;
    }
  };

  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case 'PACKED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Packed</span>;
      case 'BAGGED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1"><Package className="w-3 h-3" /> Bagged</span>;
      case 'PREPPED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1"><FlaskConical className="w-3 h-3" /> Prepped</span>;
      case 'IN_PREP':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><Clock className="w-3 h-3" /> In Prep</span>;
      case 'BLOCKED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Blocked</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-700/50 text-slate-400 border border-slate-600/30 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== 1. Command Center Top Header ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 p-6 md:p-8 border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wide uppercase">
                <Factory className="w-3.5 h-3.5" /> STEM Production & Sourcing Engine
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" /> Top 1% Precision Matrix
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Master Kitting & Production Sourcing
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Granular tracking across <strong className="text-indigo-300">236+ curriculum items</strong> (Grades 8, 9, 10 & Crates). Monitor warehouse stock, laser cutting queues, in-house chemical aliquoting, and Sirsi branch dispatches.
            </p>
          </div>

          {/* Dynamic Batch Multiplier & Project Context Control Station */}
          <div className="bg-slate-950/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-indigo-500/30 flex flex-col gap-3 min-w-[300px]">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" /> Active Project Context
              </label>
              <select
                value={activeProjectId}
                onChange={e => {
                  const pid = e.target.value;
                  setActiveProjectId(pid);
                  if (pid !== 'ALL') {
                    const p = projectsList.find(x => x.id === pid);
                    if (p && p.batchConfigurations.length > 0) {
                      setBatchMultiplier(p.batchConfigurations[0].targetQuantity);
                      if (p.batchConfigurations[0].gradeOrKitId.includes('Grade')) {
                        setSelectedGrade(p.batchConfigurations[0].gradeOrKitId);
                      }
                      showToast(`Switched context to ${p.name}`, 'info');
                    }
                  } else {
                    setSelectedGrade('ALL');
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="ALL">🌐 All Projects (Master Matrix)</option>
                {projectsList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name} ({p.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" /> Batch Production Run
              </label>
              <span className="text-xs font-black text-indigo-400 font-mono bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
                {batchMultiplier} Sets
              </span>
            </div>

            <div className="flex items-center gap-2">
              {[1, 5, 10, 20, 50, 100].map(multiplier => (
                <button
                  key={multiplier}
                  onClick={() => setBatchMultiplier(multiplier)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                    batchMultiplier === multiplier
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 scale-105'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {multiplier}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
              <span>Total Units to Make: <strong className="text-white font-mono">{batchStats.totalUnitsRequired}</strong></span>
              <span>•</span>
              <span>BOM Cost: <strong className="text-emerald-400 font-mono">₹{batchStats.totalEstimatedCost.toLocaleString('en-IN')}</strong></span>
            </div>
          </div>
        </div>

        {/* ===== Live KPI Metric Badges ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Prepped</div>
            <div className="text-xl font-black text-purple-400 mt-1 flex items-baseline gap-1">
              {batchStats.overallPreppedPercent}%
              <span className="text-[10px] text-slate-400 font-normal">rate</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${batchStats.overallPreppedPercent}%` }} />
            </div>
          </div>

          <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Master Box Packed</div>
            <div className="text-xl font-black text-emerald-400 mt-1 flex items-baseline gap-1">
              {batchStats.overallPackedPercent}%
              <span className="text-[10px] text-slate-400 font-normal">ready</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${batchStats.overallPackedPercent}%` }} />
            </div>
          </div>

          <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Shortages</div>
            <div className="text-xl font-black text-rose-400 mt-1 flex items-baseline gap-1">
              {batchStats.shortageList.length}
              <span className="text-[10px] text-slate-400 font-normal">items</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Requires PO generation</div>
          </div>

          <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In-House Chem Prep</div>
            <div className="text-xl font-black text-orange-400 mt-1 flex items-baseline gap-1">
              {batchStats.chemicalPrepQueue.length}
              <span className="text-[10px] text-slate-400 font-normal">bottles</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Aliquots & Droppers</div>
          </div>

          <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">FabLab Laser Queue</div>
            <div className="text-xl font-black text-cyan-400 mt-1 flex items-baseline gap-1">
              {batchStats.laserCuttingQueue.reduce((a, b) => a + b.unitsToCut, 0)}
              <span className="text-[10px] text-slate-400 font-normal">parts</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{batchStats.laserCuttingQueue.reduce((a, b) => a + b.estimatedSheetsNeeded, 0)} MDF sheets</div>
          </div>

          <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sirsi Branch Items</div>
            <div className="text-xl font-black text-amber-400 mt-1 flex items-baseline gap-1">
              {doubts.filter(d => d.status === 'Open').length}
              <span className="text-[10px] text-slate-400 font-normal">open QA</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Inter-branch dispatches</div>
          </div>
        </div>
      </div>

      {/* ===== 2. Sub-View Navigation Tabs ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveSubView('matrix')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubView === 'matrix'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" /> Master Sourcing Matrix ({filteredItems.length})
          </button>
          <button
            onClick={() => setActiveSubView('chemicals')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubView === 'chemicals'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FlaskConical className="w-4 h-4" /> Chemical Prep & Aliquoting ({batchStats.chemicalPrepQueue.length})
          </button>
          <button
            onClick={() => setActiveSubView('laser')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubView === 'laser'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Scissors className="w-4 h-4" /> FabLab & Laser Queue ({batchStats.laserCuttingQueue.length})
          </button>
          <button
            onClick={() => setActiveSubView('bagging')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubView === 'bagging'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" /> Pouch Bagging & Crating
          </button>
          <button
            onClick={() => setActiveSubView('procurement')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubView === 'procurement'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/25'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" /> Sirsi & Procurement ({doubts.length})
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" /> Add Component
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Job Cards
          </button>
        </div>
      </div>

      {/* ===== 3. Sub-View 1: Master Sourcing Matrix ===== */}
      {activeSubView === 'matrix' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search material, code, bin, or notes..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Grade Filter */}
            <div>
              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="ALL">All Grades (8, 9, 10)</option>
                <option value="Grade 8">Grade 8 (73 items)</option>
                <option value="Grade 9">Grade 9 (68 items)</option>
                <option value="Grade 10">Grade 10 (95 items)</option>
              </select>
            </div>

            {/* Sourcing Channel Filter */}
            <div>
              <select
                value={selectedSourcing}
                onChange={e => setSelectedSourcing(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="ALL">All Sourcing Streams</option>
                <option value="IN_STOCK">📦 In-Stock (Warehouse)</option>
                <option value="TO_ORDER">🛒 To Order / Sirsi</option>
                <option value="IN_HOUSE_PREP">🔬 In-House Chemical Prep</option>
                <option value="LASER_CUT_FABLAB">⚡ FabLab Laser Cut</option>
                <option value="CRATE_SHARED">⚪ Common Crate</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PREP">In Prep</option>
                <option value="PREPPED">Prepped</option>
                <option value="BAGGED">Bagged</option>
                <option value="PACKED">Packed</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>

            {/* Crate Level Filter */}
            <div>
              <select
                value={selectedCrate}
                onChange={e => setSelectedCrate(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="ALL">All Crate Levels</option>
                <option value="ACTIVITY_POUCH">Activity Pouch</option>
                <option value="COMMON_CRATE">Common Crate</option>
                <option value="UNIVERSAL_CRATE">Universal Crate</option>
              </select>
            </div>
          </div>

          {/* Bulk Selection Actions Bar */}
          {selectedItemIds.size > 0 && (
            <div className="bg-indigo-950/60 border border-indigo-500/30 p-3 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                <span>{selectedItemIds.size} components selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkStatus('PREPPED')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Mark Prepped
                </button>
                <button
                  onClick={() => handleBulkStatus('BAGGED')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Mark Bagged
                </button>
                <button
                  onClick={() => handleBulkStatus('PACKED')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Mark Packed
                </button>
                <button
                  onClick={() => setSelectedItemIds(new Set())}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Responsive Data Table */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <button onClick={handleSelectAll} className="hover:text-white">
                        {selectedItemIds.size === filteredItems.length && filteredItems.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">Activity / Code</th>
                    <th className="p-3">Material & Prep Spec</th>
                    <th className="p-3">Sourcing Channel</th>
                    <th className="p-3">Pouch / Crate</th>
                    <th className="p-3">Storage Bin</th>
                    <th className="p-3 text-right">Batch Qty ({batchMultiplier}x)</th>
                    <th className="p-3 text-center">Stock Status</th>
                    <th className="p-3 text-center">Action / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                  {filteredItems.map(item => {
                    const required = item.quantityPerKit * batchMultiplier;
                    const isShortage = required > item.currentStock;
                    const isSelected = selectedItemIds.has(item.id);

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-indigo-950/30' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <button onClick={() => toggleItemSelection(item.id)} className="hover:text-white">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500" />
                            )}
                          </button>
                        </td>

                        {/* Activity */}
                        <td className="p-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[11px] border border-indigo-500/20">
                              {item.activityCode}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">({item.grade})</span>
                          </div>
                          <div className="text-[11px] text-slate-300 truncate max-w-[200px] mt-0.5" title={item.activityName}>
                            {item.activityName}
                          </div>
                        </td>

                        {/* Material & Prep Spec */}
                        <td className="p-3">
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            {item.materialName}
                            {item.branchOrigin === 'SIRSI_BRANCH' && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/30">
                                Sirsi Pending
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-purple-300/80 font-mono mt-0.5">
                            {item.prepSpecification}
                          </div>
                        </td>

                        {/* Sourcing Channel */}
                        <td className="p-3">{getSourcingBadge(item.sourcingType)}</td>

                        {/* Pouch / Crate */}
                        <td className="p-3 space-y-1">
                          <div>{getPouchBadge(item.pouchCategory)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.crateLevel.replace('_', ' ')}</div>
                        </td>

                        {/* Shelf Bin */}
                        <td className="p-3">
                          <div className="text-[11px] font-mono text-amber-300/90 flex items-center gap-1">
                            📍 {item.warehouseBin}
                          </div>
                        </td>

                        {/* Batch Qty */}
                        <td className="p-3 text-right font-mono">
                          <div className="font-bold text-white text-sm">
                            {required} <span className="text-[10px] text-slate-400">{item.unit}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ({item.quantityPerKit}/kit)
                          </div>
                        </td>

                        {/* Stock Status */}
                        <td className="p-3 text-center">
                          {isShortage ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              <AlertTriangle className="w-3 h-3" /> Short: {required - item.currentStock}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" /> In Stock ({item.currentStock})
                            </span>
                          )}
                        </td>

                        {/* Action / Status Toggle */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleStatusToggle(item)}
                            className="hover:scale-105 transition-transform"
                            title="Click to advance status"
                          >
                            {getStatusBadge(item.status)}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== 4. Sub-View 2: Chemical Aliquoting & Formulation Workbench ===== */}
      {activeSubView === 'chemicals' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-950/40 to-slate-900 p-5 rounded-2xl border border-purple-500/20 flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-400" /> In-House Chemical Aliquoting & Bottle Filling Queue
              </h2>
              <p className="text-xs text-slate-400">
                Automated volume scaling for batch size of <strong className="text-purple-300">{batchMultiplier} sets</strong>. Standardized dropper bottles, 30ml jars, and secondary containment leak checks.
              </p>
            </div>
            <div className="text-right font-mono">
              <div className="text-xl font-black text-purple-400">{batchStats.chemicalPrepQueue.length}</div>
              <div className="text-[10px] text-slate-400 uppercase">Chemical Lines</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batchStats.chemicalPrepQueue.map((chem, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-all space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      {chem.activityCode}
                    </span>
                    <h3 className="font-bold text-white text-sm mt-1">{chem.materialName}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    chem.hazardLevel.includes('Corrosive')
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  }`}>
                    {chem.hazardLevel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">Total Volume</div>
                    <div className="font-bold text-purple-300 font-mono text-sm">{chem.totalVolumeMl} ml</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Bottles to Fill</div>
                    <div className="font-bold text-white font-mono text-sm">{chem.bottlesToFill} units</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Container: <strong className="text-slate-200">{chem.containerType}</strong></span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-emerald-400 hover:text-emerald-300">
                    <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-purple-500" />
                    <span>Leak Verified</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 5. Sub-View 3: FabLab & Laser Cutting Production Queue ===== */}
      {activeSubView === 'laser' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-cyan-950/40 to-slate-900 p-5 rounded-2xl border border-cyan-500/20 flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Scissors className="w-5 h-5 text-cyan-400" /> FabLab Laser Cutting & 3D Print Schedule
              </h2>
              <p className="text-xs text-slate-400">
                Machine run-time estimation and MDF/Acrylic sheet nesting budget for <strong className="text-cyan-300">{batchMultiplier} sets</strong>.
              </p>
            </div>
            <div className="text-right font-mono">
              <div className="text-xl font-black text-cyan-400">
                {batchStats.laserCuttingQueue.reduce((a, b) => a + b.totalCutMinutes, 0).toFixed(0)} min
              </div>
              <div className="text-[10px] text-slate-400 uppercase">Estimated Cut Time</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batchStats.laserCuttingQueue.map((job, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {job.activityCode}
                    </span>
                    <h3 className="font-bold text-white text-sm mt-1">{job.materialName}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-300 border border-cyan-500/30">
                    {job.materialType}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">Units</div>
                    <div className="font-bold text-white font-mono">{job.unitsToCut} pcs</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Cut Time</div>
                    <div className="font-bold text-cyan-300 font-mono">{job.totalCutMinutes} m</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Sheets</div>
                    <div className="font-bold text-purple-300 font-mono">{job.estimatedSheetsNeeded} sht</div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                  <span>Fitting QA: <strong className="text-slate-300">{job.kerfOffset}</strong></span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-cyan-400 hover:text-cyan-300">
                    <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-cyan-500" />
                    <span>Cut Complete</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 6. Sub-View 4: Pouch Bagging & Master Crate Packing Line ===== */}
      {activeSubView === 'bagging' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 p-5 rounded-2xl border border-blue-500/20 flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" /> Color-Coded Activity Pouch Bagging & Master Crate Line
              </h2>
              <p className="text-xs text-slate-400">
                Segregate individual experiment pouches into color-coded zip-locks before boxing into Grade Activity Boxes and Common Crates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">🟡 Bio (Yellow)</span>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">🟢 Optics (Green)</span>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">🔵 Hardware (Blue)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Grade 8', 'Grade 9', 'Grade 10'].map(gradeName => {
              const gradeItems = items.filter(i => i.grade.toLowerCase() === gradeName.toLowerCase());
              const preppedGrade = gradeItems.filter(i => i.status === 'PREPPED' || i.status === 'BAGGED' || i.status === 'PACKED').length;
              const percent = gradeItems.length > 0 ? Math.round((preppedGrade / gradeItems.length) * 100) : 0;

              return (
                <div key={gradeName} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-base">{gradeName} STEM Kit</h3>
                      <div className="text-xs text-slate-400">{gradeItems.length} Total Components</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-lg font-black text-blue-400">{percent}%</div>
                      <div className="text-[10px] text-slate-400">Pouch Ready</div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {gradeItems.slice(0, 8).map(item => (
                      <div
                        key={item.id}
                        className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="truncate max-w-[180px]">
                          <div className="font-bold text-white truncate">{item.materialName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.activityCode} • {item.prepSpecification}</div>
                        </div>
                        <button onClick={() => handleStatusToggle(item)}>
                          {getStatusBadge(item.status)}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== 7. Sub-View 5: Sirsi & Procurement Logistics Tracker ===== */}
      {activeSubView === 'procurement' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-950/40 to-slate-900 p-5 rounded-2xl border border-amber-500/20 flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" /> Sirsi Branch & Procurement Dispatch Tracker
              </h2>
              <p className="text-xs text-slate-400">
                Log of inter-branch shipments, pending chemical containers, and quality fitting doubts.
              </p>
            </div>
            <button
              onClick={() => showToast('Purchase Requisition exported for Sirsi Center!', 'success')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4" /> Generate Branch PO
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doubts.map(doubt => (
              <div
                key={doubt.id}
                className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {doubt.id} • {doubt.grade}
                    </span>
                    <h3 className="font-bold text-white text-sm mt-1">{doubt.material}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    doubt.priority === 'High'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {doubt.priority} Priority
                  </span>
                </div>

                <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Issue / Blocker:</div>
                  {doubt.issue}
                </div>

                <div className="text-xs text-emerald-300 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-400 uppercase font-bold mb-0.5">Resolution Notes:</div>
                  {doubt.resolutionNotes || 'Coordinating with dispatch center.'}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>Raised By: <strong className="text-slate-200">{doubt.raisedBy}</strong></span>
                  <span className="font-bold text-amber-400">Status: {doubt.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 8. Modal: Add Custom Component / Experiment ===== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" /> Add Custom Component / Material
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Grade Level</label>
                  <select
                    value={newItemGrade}
                    onChange={e => setNewItemGrade(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Activity Code</label>
                  <input
                    type="text"
                    value={newItemActivityCode}
                    onChange={e => setNewItemActivityCode(e.target.value)}
                    placeholder="e.g. 10.4.5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Activity Name</label>
                <input
                  type="text"
                  value={newItemActivityName}
                  onChange={e => setNewItemActivityName(e.target.value)}
                  placeholder="e.g. Demonstration of Magnetic Swing"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Material Description *</label>
                <input
                  type="text"
                  value={newItemMaterialName}
                  onChange={e => setNewItemMaterialName(e.target.value)}
                  placeholder="e.g. Dilute HCl Solution (50ml)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Prep Specification</label>
                  <input
                    type="text"
                    value={newItemPrepSpec}
                    onChange={e => setNewItemPrepSpec(e.target.value)}
                    placeholder="e.g. 75% in white small container"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Quantity Per Kit</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemQty}
                    onChange={e => setNewItemQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Sourcing Channel</label>
                  <select
                    value={newItemSourcing}
                    onChange={e => setNewItemSourcing(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="IN_STOCK">📦 In-Stock</option>
                    <option value="IN_HOUSE_PREP">🔬 In-House Prep</option>
                    <option value="LASER_CUT_FABLAB">⚡ FabLab Laser</option>
                    <option value="TO_ORDER">🛒 To Order / Sirsi</option>
                    <option value="CRATE_SHARED">⚪ Common Crate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Pouch Classification</label>
                  <select
                    value={newItemPouchCat}
                    onChange={e => setNewItemPouchCat(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="HARDWARE_BLUE">🔵 Blue Pouch (Hardware)</option>
                    <option value="BIOLOGY_YELLOW">🟡 Yellow Pouch (Bio)</option>
                    <option value="OPTICS_GREEN">🟢 Green Pouch (Optics)</option>
                    <option value="CHEMICAL_ORANGE">🔴 Orange (Chemicals)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                >
                  Save Component
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== 9. Modal: Print-Ready Job Cards & Packing Slips ===== */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-4xl w-full p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  EXPERIMIND LABS — SHOP FLOOR PRODUCTION JOB CARD
                </h2>
                <div className="text-xs text-slate-600 font-mono mt-0.5">
                  Batch Run: {batchMultiplier} Complete Sets | Target Grade: {selectedGrade} | Generated: {new Date().toLocaleDateString('en-IN')}
                </div>
              </div>
              <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Total Items</div>
                  <div className="font-bold text-slate-900 text-base">{filteredItems.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Units Required</div>
                  <div className="font-bold text-slate-900 text-base">{batchStats.totalUnitsRequired}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Laser Cut Parts</div>
                  <div className="font-bold text-slate-900 text-base">{batchStats.laserCuttingQueue.reduce((a, b) => a + b.unitsToCut, 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Chemical Vials</div>
                  <div className="font-bold text-slate-900 text-base">{batchStats.chemicalPrepQueue.length}</div>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-200">
                    <th className="p-2 border border-slate-200 w-8">Check</th>
                    <th className="p-2 border border-slate-200">Code</th>
                    <th className="p-2 border border-slate-200">Component Description</th>
                    <th className="p-2 border border-slate-200">Prep Specs</th>
                    <th className="p-2 border border-slate-200">Rack / Bin</th>
                    <th className="p-2 border border-slate-200 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.slice(0, 30).map(item => (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 text-center">□</td>
                      <td className="p-2 border border-slate-200 font-mono font-bold">{item.activityCode}</td>
                      <td className="p-2 border border-slate-200 font-bold">{item.materialName}</td>
                      <td className="p-2 border border-slate-200 text-slate-600">{item.prepSpecification}</td>
                      <td className="p-2 border border-slate-200 font-mono">{item.warehouseBin}</td>
                      <td className="p-2 border border-slate-200 text-right font-mono font-bold">{item.quantityPerKit * batchMultiplier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="text-xs text-slate-500">
                QC Supervisor Signature: _______________________ Date: ____________
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                >
                  Print to Zebra / Standard Printer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
