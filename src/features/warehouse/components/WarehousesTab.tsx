import React, { useState, useMemo } from 'react';
import {
  Warehouse,
  Layers,
  Plus,
  MapPin,
  CheckCircle2,
  Box,
  ArrowRight,
  Edit2,
  Trash2,
  X,
  Printer,
  Package,
  Search,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  QrCode,
  Tag,
  Building2,
  LayoutGrid,
  List,
  Grid,
  Sparkles,
  Sliders
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { InventoryItem } from '@/src/types';
import BarcodeSvg from '@/src/shared/components/BarcodeSvg';
import VisualStockRoom from './VisualStockRoom';
import FloorPlanDesignerTab from './FloorPlanDesignerTab';

interface WarehousesTabProps {
  role: string | null;
}

export default function WarehousesTab({ role }: WarehousesTabProps) {
  const {
    warehouses,
    bins,
    inventory,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    addBin,
    deleteBin,
    updateInventoryItem,
    logTransaction
  } = useData();
  const { showToast } = useToast();

  const [activeViewMode, setActiveViewMode] = useState<'visual_shelf' | 'floor_plan' | 'topology'>('visual_shelf');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newWh, setNewWh] = useState({ code: '', name: '', address: '' });
  const [editingWh, setEditingWh] = useState<any | null>(null);

  // New Bin State
  const [newBinCode, setNewBinCode] = useState('');
  const [newBinDesc, setNewBinDesc] = useState('');
  const [newBinWhCode, setNewBinWhCode] = useState('');
  const [isAddBinOpen, setIsAddBinOpen] = useState(false);

  // Quick Assign Items to Bin Modal
  const [assigningBin, setAssigningBin] = useState<any | null>(null);
  const [assignItemSearch, setAssignItemSearch] = useState('');

  // Print Shelf Sticker Modal
  const [printingBin, setPrintingBin] = useState<any | null>(null);

  // Expanded Bins accordion state
  const [expandedBinIds, setExpandedBinIds] = useState<Record<string, boolean>>({});

  const toggleBinExpanded = (binId: string) => {
    setExpandedBinIds(prev => ({ ...prev, [binId]: !prev[binId] }));
  };

  // Map inventory items to bins
  const getItemsInBin = (binCode: string): InventoryItem[] => {
    const cleanBin = binCode.trim().toLowerCase();
    return inventory.filter(item => {
      const itemBin = (item.binLocation || '').trim().toLowerCase();
      return itemBin === cleanBin || itemBin.includes(cleanBin);
    });
  };

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWh.name) return;

    const created = {
      code: newWh.code || `WH-DC-0${warehouses.length + 1}`,
      name: newWh.name,
      address: newWh.address || 'Tech Logistics Park',
      isDefault: false,
    };
    await addWarehouse(created);
    setIsAddModalOpen(false);
    setNewWh({ code: '', name: '', address: '' });
    showToast('success', 'Warehouse Added', `Created facility "${created.name}"`);
  };

  const handleEditSaveWh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWh) return;

    await updateWarehouse(editingWh.id, editingWh);
    setEditingWh(null);
    showToast('success', 'Warehouse Updated', `Updated "${editingWh.name}"`);
  };

  const handleDeleteWh = async (id: string) => {
    if (confirm('Are you sure you want to delete this warehouse facility?')) {
      await deleteWarehouse(id);
      showToast('info', 'Warehouse Removed', 'Facility deleted.');
    }
  };

  const handleDeleteBin = async (id: string) => {
    if (confirm('Are you sure you want to delete this bin storage location?')) {
      await deleteBin(id);
      showToast('info', 'Bin Removed', 'Storage bin deleted.');
    }
  };

  const handleAddBinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBinCode) return;
    const whCode = newBinWhCode || warehouses[0]?.code || 'WH-MAIN-01';
    await addBin({
      code: newBinCode.trim(),
      description: newBinDesc.trim() || 'General Storage Rack',
      warehouseCode: whCode,
    });
    setNewBinCode('');
    setNewBinDesc('');
    setIsAddBinOpen(false);
    showToast('success', 'Bin Created', `Storage bin "${newBinCode}" created under facility ${whCode}`);
  };

  // Assign component to bin
  const handleAssignItemToBin = async (item: InventoryItem, binCode: string) => {
    const oldBin = item.binLocation;
    await updateInventoryItem(item.id, { binLocation: binCode });
    
    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'adjust',
      description: `Moved "${item.name}" from [${oldBin || 'Unassigned'}] to Bin [${binCode}]`,
      items: [{ componentId: item.id, componentName: item.name, qtyDiff: 0 }],
      diffs: [{ field: 'binLocation', oldValue: oldBin || null, newValue: binCode }]
    });

    showToast('success', 'Item Assigned to Bin', `Assigned "${item.name}" to ${binCode}`);
  };

  // Filtered Bins list
  const filteredBins = useMemo(() => {
    return bins.filter(bin => {
      const matchesSearch = bin.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bin.description && bin.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        bin.warehouseCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWh = selectedWarehouseFilter === 'ALL' || bin.warehouseCode === selectedWarehouseFilter;
      return matchesSearch && matchesWh;
    });
  }, [bins, searchQuery, selectedWarehouseFilter]);

  // Overall Warehouse Stats
  const totalBinsCount = bins.length;
  const occupiedBinsCount = bins.filter(b => getItemsInBin(b.code).length > 0).length;
  const totalAllocatedItems = inventory.filter(i => !!i.binLocation).length;

  return (
    <div className="space-y-6 w-full animate-fadeIn">
      {/* Top View Mode Navigation Switcher */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveViewMode('visual_shelf')}
            className={`flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeViewMode === 'visual_shelf'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Visual Shelving Matrix</span>
          </button>

          <button
            onClick={() => setActiveViewMode('floor_plan')}
            className={`flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeViewMode === 'floor_plan'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>2D Floor Plan Blueprint</span>
          </button>

          <button
            onClick={() => setActiveViewMode('topology')}
            className={`flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeViewMode === 'topology'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Facilities Topology & Bins</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium px-3 hidden xl:inline">
          {activeViewMode === 'visual_shelf' ? 'Physical Storage Units & Compartments' : activeViewMode === 'floor_plan' ? 'Top-Down Spatial Blueprint' : 'Facility & Bin Management'}
        </span>
      </div>

      {/* RENDER VIEW 1: VISUAL PHYSICAL STORAGE MATRIX */}
      {activeViewMode === 'visual_shelf' && (
        <VisualStockRoom />
      )}

      {/* RENDER VIEW 2: 2D FLOOR PLAN DESIGNER */}
      {activeViewMode === 'floor_plan' && (
        <FloorPlanDesignerTab />
      )}

      {/* RENDER VIEW 2: TOPOLOGY & BINS DATABASE */}
      {activeViewMode === 'topology' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100/80 dark:border-indigo-800">
                  <Warehouse className="w-5 h-5" />
                </div>
                Warehouse Facilities & Storage Topology
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Configure physical warehouse buildings, zone partitions, shelf codes, and database bin records.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
              <button
                onClick={() => setIsAddBinOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-2xl text-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Add Storage Bin</span>
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Warehouse className="w-4 h-4" />
                <span>Add Warehouse Facility</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Statistics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Active Facilities</span>
              <strong className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{warehouses.length} Hubs</strong>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Configured Bins</span>
              <strong className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">{totalBinsCount} Slots</strong>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Occupied Bins</span>
              <strong className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{occupiedBinsCount} Filled</strong>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Items Slotted</span>
              <strong className="text-xl font-black text-amber-500 mt-1 block">{totalAllocatedItems} / {inventory.length} Parts</strong>
            </div>
          </div>

          {/* Warehouse Facilities Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {warehouses.map((wh) => {
              const whBins = bins.filter(b => b.warehouseCode === wh.code);
              const whItemCount = inventory.filter(i => whBins.some(b => (i.binLocation || '').toLowerCase().includes(b.code.toLowerCase()))).length;

              return (
                <div
                  key={wh.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-lg transition-all space-y-3 relative group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">{wh.code}</span>
                        {wh.isDefault && (
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-200/60 dark:border-emerald-800">
                            Default Facility
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-slate-900 dark:text-white text-base mt-0.5">{wh.name}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingWh(wh)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="Edit Facility"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWh(wh.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="Delete Facility"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {wh.address || 'Tech Logistics Center'}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Bins</span>
                      <strong className="text-slate-900 dark:text-white font-mono text-sm">{whBins.length} Bins</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">SKUs Stored</span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">{whItemCount} Parts</strong>
                    </div>
                  </div>

                  {/* 1-Click Launch Visual Storage Unit */}
                  <button
                    onClick={() => setActiveViewMode('visual_shelf')}
                    className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5" /> View Storage Units & Shelves
                  </button>
                </div>
              );
            })}
          </div>

          {/* Storage Bins Management Hub */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-5">
            
            {/* Search, Filter & Quick Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Storage Bins & Shelf Allocation Database ({filteredBins.length})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search bin code, rack, or shelf..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <select
                  value={selectedWarehouseFilter}
                  onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Facilities ({warehouses.length})</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.code}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Bins Accordion Table */}
            <div className="space-y-3">
              {filteredBins.map((bin) => {
                const itemsInBin = getItemsInBin(bin.code);
                const isExpanded = !!expandedBinIds[bin.id];

                return (
                  <div
                    key={bin.id}
                    className="bg-slate-50/70 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden transition-all"
                  >
                    {/* Bin Header Row */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleBinExpanded(bin.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-transform cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-indigo-600" /> : <ChevronRight className="w-5 h-5" />}
                        </button>

                        <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 rounded-xl text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs">
                          {bin.code}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs">{bin.description || 'General Storage Shelf'}</h4>
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold">
                              {bin.warehouseCode}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {itemsInBin.length} unique component(s) stored here ({itemsInBin.reduce((sum, i) => sum + i.stockQty, 0)} total units)
                          </span>
                        </div>
                      </div>

                      {/* Actions: Assign Parts, Print Sticker, Delete */}
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setAssigningBin(bin);
                            setAssignItemSearch('');
                          }}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Package className="w-3.5 h-3.5" /> Assign Parts
                        </button>

                        <button
                          type="button"
                          onClick={() => setPrintingBin(bin)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" /> Print Shelf Sticker
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteBin(bin.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                          title="Delete Bin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stored Components Drawer (When Expanded) */}
                    {isExpanded && (
                      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 animate-fadeIn">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Components currently stored in {bin.code}:
                        </div>

                        {itemsInBin.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400">
                            No components assigned to this bin yet. Click <strong>"Assign Parts"</strong> to store items here.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                            {itemsInBin.map((item) => (
                              <div
                                key={item.id}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2"
                              >
                                <div className="truncate">
                                  <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">{item.name}</span>
                                  <span className="text-[10px] font-mono text-slate-400">{item.barcode || `EL-${item.id}`}</span>
                                </div>
                                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-mono font-bold shrink-0 border border-emerald-200 dark:border-emerald-800">
                                {item.stockQty} {item.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredBins.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400 text-xs">
                  No storage bins found matching your search. Click "Add Storage Bin" above to configure your racks and shelves.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK ASSIGN PARTS TO BIN MODAL */}
      {assigningBin && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Assign Parts to Storage Bin [{assigningBin.code}]
                </h3>
                <p className="text-xs text-slate-400">{assigningBin.description} • Facility: {assigningBin.warehouseCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningBin(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog components to move to this bin..."
                value={assignItemSearch}
                onChange={(e) => setAssignItemSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Scrollable Component Catalog List */}
            <div className="overflow-y-auto space-y-2 pr-1 flex-1 custom-scrollbar">
              {inventory
                .filter(item => item.name.toLowerCase().includes(assignItemSearch.toLowerCase()) || (item.barcode || '').toLowerCase().includes(assignItemSearch.toLowerCase()))
                .map(item => {
                  const isCurrentlyInThisBin = (item.binLocation || '').toLowerCase() === assigningBin.code.toLowerCase();

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="truncate">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Current Location: <strong className="text-indigo-600 dark:text-indigo-400">{item.binLocation || 'Unassigned'}</strong> • Stock: {item.stockQty} {item.unit}
                        </span>
                      </div>

                      {isCurrentlyInThisBin ? (
                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1 border border-emerald-200 dark:border-emerald-800 shrink-0">
                          <Check className="w-3.5 h-3.5" /> Stored Here
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAssignItemToBin(item, assigningBin.code)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer shrink-0"
                        >
                          Move Here
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* PRINT PHYSICAL SHELF BARCODE STICKER MODAL */}
      {printingBin && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                Print Physical Rack / Shelf Sticker
              </h3>
              <button
                type="button"
                onClick={() => setPrintingBin(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Rendered 50x25mm Shelf Sticker Card */}
            <div className="bg-slate-100 dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">
                Shelf Location Label (50mm x 25mm)
              </div>

              <div className="bg-white text-slate-900 border-2 border-slate-900 p-4 rounded-xl space-y-1 w-full max-w-[260px] shadow-lg">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  LOCATION BIN
                </div>
                <div className="font-black text-base uppercase tracking-tight text-slate-950">
                  {printingBin.code}
                </div>
                <div className="text-[9px] font-mono font-bold text-slate-600 border-b border-slate-200 pb-1">
                  {printingBin.description} • {printingBin.warehouseCode}
                </div>

                {/* ISO/IEC 15417 Code 128 Shelf Barcode */}
                <div className="py-2 flex justify-center">
                  <BarcodeSvg
                    value={printingBin.code}
                    format="CODE128"
                    width={1.8}
                    height={44}
                    displayValue={false}
                    className="h-11 w-auto max-w-[220px]"
                  />
                </div>

                <div className="text-[11px] font-mono font-black tracking-widest text-slate-950">
                  {printingBin.code}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPrintingBin(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  showToast('success', 'Print Job Sent', `Printing shelf sticker for ${printingBin.code}`);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Sticker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Warehouse Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Warehouse Facility</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWarehouse} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Assembly Hub"
                  value={newWh.name}
                  onChange={(e) => setNewWh({ ...newWh, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Facility Code</label>
                <input
                  type="text"
                  placeholder="WH-SOUTH-03"
                  value={newWh.code}
                  onChange={(e) => setNewWh({ ...newWh, code: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="88 Logistics Blvd, Atlanta, GA"
                  value={newWh.address}
                  onChange={(e) => setNewWh({ ...newWh, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Warehouse Modal */}
      {editingWh && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Facility {editingWh.code}</h3>
              <button onClick={() => setEditingWh(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSaveWh} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  value={editingWh.name}
                  onChange={(e) => setEditingWh({ ...editingWh, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Address</label>
                <input
                  type="text"
                  value={editingWh.address}
                  onChange={(e) => setEditingWh({ ...editingWh, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingWh(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Update Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Storage Bin Modal */}
      {isAddBinOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Storage Bin Location</h3>
              <button onClick={() => setIsAddBinOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBinSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Bin Location Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rack - Shelf 1, BIN-A1-03, Rack B2..."
                  value={newBinCode}
                  onChange={(e) => setNewBinCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Warehouse Facility *</label>
                <select
                  value={newBinWhCode}
                  onChange={(e) => setNewBinWhCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.code}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Shelf / Zone Description</label>
                <input
                  type="text"
                  placeholder="e.g. Shelf A1 - Top Rack, Chemical Safety Box..."
                  value={newBinDesc}
                  onChange={(e) => setNewBinDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBinOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Save Bin Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
