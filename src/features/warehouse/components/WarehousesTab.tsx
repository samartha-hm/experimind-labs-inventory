import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Sliders,
  AlertCircle,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { InventoryItem } from '@/src/types';
import BarcodeSvg from '@/src/shared/components/BarcodeSvg';
import ItemImage from '@/src/shared/components/ItemImage';
import ImagePreviewModal from '@/src/shared/components/ImagePreviewModal';
import VisualStockRoom from './VisualStockRoom';
import FloorPlanDesignerTab from './FloorPlanDesignerTab';
import SmartSelect from '@/src/shared/components/SmartSelect';

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

  // Primary Tab Modes: 'topology' (Facilities & Bins) | 'slotting' (Item Allocation Hub) | 'visual_shelf' (Custom Racks) | 'floor_plan' (2D Blueprint)
  const [activeViewMode, setActiveViewMode] = useState<'topology' | 'slotting' | 'visual_shelf' | 'floor_plan'>('topology');

  // Search & Filter for Facilities / Bins
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('ALL');

  // Search & Filter for Item Slotting Hub
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [slottingFilter, setSlottingFilter] = useState<'all' | 'unassigned' | 'slotted'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newWh, setNewWh] = useState({ code: '', name: '', address: '' });
  const [editingWh, setEditingWh] = useState<any | null>(null);

  // New Bin State
  const [newBinCode, setNewBinCode] = useState('');
  const [newBinDesc, setNewBinDesc] = useState('');
  const [newBinWhCode, setNewBinWhCode] = useState('');
  const [isAddBinOpen, setIsAddBinOpen] = useState(false);

  // Quick Assign Items to Bin Modal (From Bin side)
  const [assigningBin, setAssigningBin] = useState<any | null>(null);
  const [assignItemSearch, setAssignItemSearch] = useState('');

  // Quick Slot Single Item Modal (From Item side)
  const [slottingItem, setSlottingItem] = useState<InventoryItem | null>(null);
  const [targetBinInput, setTargetBinInput] = useState('');

  // Print Shelf Sticker Modal
  const [printingBin, setPrintingBin] = useState<any | null>(null);

  // Zoom Lightbox Modal
  const [zoomItem, setZoomItem] = useState<{
    imageUrl?: string;
    title: string;
    category?: string;
    stockQty?: number;
    unit?: string;
    binLocation?: string;
  } | null>(null);

  // Expanded Bins accordion state
  const [expandedBinIds, setExpandedBinIds] = useState<Record<string, boolean>>({});

  const toggleBinExpanded = (binId: string) => {
    setExpandedBinIds(prev => ({ ...prev, [binId]: !prev[binId] }));
  };

  // Map inventory items to bins (exact match)
  const getItemsInBin = (binCode: string): InventoryItem[] => {
    const cleanBin = binCode.trim().toLowerCase();
    return inventory.filter(item => {
      const itemBin = (item.binLocation || '').trim().toLowerCase();
      return itemBin === cleanBin;
    });
  };

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWh.name) return;

    const created = {
      code: newWh.code.trim() || `WH-DC-0${warehouses.length + 1}`,
      name: newWh.name.trim(),
      address: newWh.address ? { city: newWh.address } : { city: 'Bengaluru, Karnataka' },
      isDefault: warehouses.length === 0,
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
    if (!newBinCode.trim()) return;
    const whCode = newBinWhCode || warehouses[0]?.code || 'WH-MAIN-01';
    await addBin({
      code: newBinCode.trim(),
      description: newBinDesc.trim() || 'General Storage Rack',
      warehouseCode: whCode,
    });
    setNewBinCode('');
    setNewBinDesc('');
    setIsAddBinOpen(false);
    showToast('success', 'Bin Created', `Storage bin "${newBinCode.trim()}" created under facility ${whCode}`);
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

  // Quick slot item from Item Slotting Hub
  const handleDirectSlotItem = async (item: InventoryItem, targetBin: string | null) => {
    const oldBin = item.binLocation;
    await updateInventoryItem(item.id, { binLocation: targetBin || undefined });

    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'adjust',
      description: targetBin ? `Slotted "${item.name}" to Bin [${targetBin}]` : `Cleared placement for "${item.name}"`,
      items: [{ componentId: item.id, componentName: item.name, qtyDiff: 0 }],
      diffs: [{ field: 'binLocation', oldValue: oldBin || null, newValue: targetBin || null }]
    });

    showToast('success', targetBin ? 'Item Slotted' : 'Placement Cleared', targetBin ? `"${item.name}" slotted to ${targetBin}` : `"${item.name}" marked unassigned`);
    setSlottingItem(null);
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

  // Unique categories for filtering
  const categories = useMemo(() => {
    const cats = new Set<string>();
    inventory.forEach(i => { if (i.category) cats.add(i.category); });
    return Array.from(cats);
  }, [inventory]);

  // Filtered Items for Item Slotting Hub
  const filteredSlottingItems = useMemo(() => {
    return inventory.filter(item => {
      const isSlotted = !!item.binLocation && item.binLocation.trim().length > 0;
      if (slottingFilter === 'unassigned' && isSlotted) return false;
      if (slottingFilter === 'slotted' && !isSlotted) return false;

      if (selectedCategoryFilter !== 'ALL' && item.category !== selectedCategoryFilter) return false;

      if (itemSearchQuery.trim()) {
        const q = itemSearchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesSku = (item.barcode || item.sku || '').toLowerCase().includes(q);
        const matchesBin = (item.binLocation || '').toLowerCase().includes(q);
        const matchesCat = (item.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesBin && !matchesCat) return false;
      }

      return true;
    });
  }, [inventory, slottingFilter, selectedCategoryFilter, itemSearchQuery]);

  // Overall Warehouse Stats
  const totalBinsCount = bins.length;
  const occupiedBinsCount = bins.filter(b => getItemsInBin(b.code).length > 0).length;
  const slottedItemsCount = inventory.filter(i => !!i.binLocation && i.binLocation.trim().length > 0).length;
  const unassignedItemsCount = inventory.length - slottedItemsCount;

  return (
    <div className="space-y-6 w-full animate-fadeIn pb-12">
      
      {/* Top Navigation Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          
          <button
            onClick={() => setActiveViewMode('topology')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeViewMode === 'topology'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Warehouse className="w-4 h-4 text-indigo-300" />
            <span>Facilities & Storage Bins</span>
          </button>

          <button
            onClick={() => setActiveViewMode('slotting')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeViewMode === 'slotting'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Item Location & Slotting Hub</span>
            {unassignedItemsCount > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-md text-[10px] font-mono font-bold">
                {unassignedItemsCount} unslotted
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveViewMode('visual_shelf')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeViewMode === 'visual_shelf'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Custom Shelf & Rack Units</span>
          </button>

          <button
            onClick={() => setActiveViewMode('floor_plan')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeViewMode === 'floor_plan'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4 text-rose-400" />
            <span>2D Floor Plan Blueprint</span>
          </button>

        </div>

        <span className="text-xs text-slate-500 font-medium px-3 hidden xl:inline font-mono">
          {activeViewMode === 'topology' ? 'Real Facilities & Bin Database' : activeViewMode === 'slotting' ? 'Fast SKU Bin Allocation' : activeViewMode === 'visual_shelf' ? 'Physical Storage Units' : 'Top-Down Spatial Blueprint'}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: FACILITIES & STORAGE BINS (PRIMARY OPERATIONAL HUB) */}
      {/* ========================================================================= */}
      {activeViewMode === 'topology' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Header Banner */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100/80 dark:border-indigo-800">
                  <Warehouse className="w-5 h-5" />
                </div>
                Warehouse Facilities & Storage Bins
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Manage physical buildings, storage bins, shelf locations, and accurate component allocations.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsAddBinOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-2xl text-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Add Storage Bin</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Warehouse className="w-4 h-4" />
                <span>Add Facility</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Facilities</span>
              <strong className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{warehouses.length} Active Hubs</strong>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Configured Bins</span>
              <strong className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">{totalBinsCount} Slots</strong>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Slotted in Bins</span>
              <strong className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{slottedItemsCount} SKUs</strong>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Pending Slotting</span>
              <button
                type="button"
                onClick={() => {
                  setSlottingFilter('unassigned');
                  setActiveViewMode('slotting');
                }}
                className="text-xl font-black text-amber-500 hover:text-amber-600 mt-1 block text-left cursor-pointer transition-colors"
              >
                {unassignedItemsCount} Unassigned →
              </button>
            </div>
          </div>

          {/* Warehouse Facilities Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {warehouses.map((wh) => {
              const whBins = bins.filter(b => b.warehouseCode === wh.code);
              const whItemCount = inventory.filter(i => (i.binLocation && whBins.some(b => (i.binLocation || '').toLowerCase().includes(b.code.toLowerCase())))).length;
              const formattedAddress = typeof wh.address === 'object' ? (wh.address?.street ? `${wh.address.street}, ${wh.address.city}` : wh.address?.city || 'Technical Facility') : (wh.address || 'Technical Facility');

              return (
                <div
                  key={wh.id || wh.code}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-lg transition-all space-y-3 relative group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">{wh.code}</span>
                        {wh.isDefault && (
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-200/60 dark:border-emerald-800">
                            Primary Facility
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-slate-900 dark:text-white text-base mt-0.5">{wh.name}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingWh(wh)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="Edit Facility"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWh(wh.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="Delete Facility"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{formattedAddress}</span>
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Bins</span>
                      <strong className="text-slate-900 dark:text-white font-mono text-sm">{whBins.length} Bins</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">SKUs Slotted</span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">{whItemCount} Parts</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Storage Bins Directory & Management */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-5">
            
            {/* Search, Filter & Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Storage Bins & Shelf Locations ({filteredBins.length})
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

                <div className="w-full sm:w-56 shrink-0">
                  <SmartSelect
                    value={selectedWarehouseFilter}
                    onChange={setSelectedWarehouseFilter}
                    size="sm"
                    options={[
                      { value: 'ALL', label: `All Facilities (${warehouses.length})` },
                      ...warehouses.map(w => ({ value: w.code, label: `${w.name} (${w.code})` })),
                    ]}
                    placeholder="All Facilities"
                    aria-label="Filter by facility"
                  />
                </div>
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
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs">{bin.description || 'Storage Location'}</h4>
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
                            No components assigned to this bin yet. Click <strong>"Assign Parts"</strong> to slot items here.
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
                                  <span className="text-[10px] font-mono text-slate-400">{item.barcode || item.sku || `SKU-${item.id}`}</span>
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
                  No storage bins configured yet. Click <strong>"Add Storage Bin"</strong> above to create your first shelf or compartment.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: ITEM LOCATION & SLOTTING HUB (DEDICATED ALLOCATION MANAGER) */}
      {/* ========================================================================= */}
      {activeViewMode === 'slotting' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Header Banner */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100/80 dark:border-emerald-800">
                  <Package className="w-5 h-5" />
                </div>
                Item Location & Bin Allocation Hub
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Review and assign physical warehouse bin locations across all {inventory.length} catalog items with 1-click slotting.
              </p>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setSlottingFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  slottingFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All Items ({inventory.length})
              </button>

              <button
                type="button"
                onClick={() => setSlottingFilter('unassigned')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  slottingFilter === 'unassigned'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-600 dark:text-amber-400 hover:text-amber-500'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Pending Slotting ({unassignedItemsCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setSlottingFilter('slotted')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  slottingFilter === 'slotted'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Slotted in Bins ({slottedItemsCount})</span>
              </button>
            </div>
          </div>

          {/* Search and Category Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by item name, SKU, current bin location, or barcode..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="w-full sm:w-56 shrink-0">
              <SmartSelect
                value={selectedCategoryFilter}
                onChange={setSelectedCategoryFilter}
                size="sm"
                options={[
                  { value: 'ALL', label: `All Categories (${categories.length})` },
                  ...categories.map(c => ({ value: c, label: c })),
                ]}
                placeholder="All Categories"
                aria-label="Filter items by category"
              />
            </div>
          </div>

          {/* Inventory Items Placement Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Stock Qty</th>
                    <th className="py-3 px-4">Assigned Warehouse Bin</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSlottingItems.map((item) => {
                    const isSlotted = !!item.binLocation && item.binLocation.trim().length > 0;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Item Details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => {
                                setZoomItem({
                                  imageUrl: item.imageUrl,
                                  title: item.name,
                                  category: item.category,
                                  stockQty: item.stockQty,
                                  unit: item.unit,
                                  binLocation: item.binLocation || '-'
                                });
                              }}
                              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-500/40 hover:scale-105 transition-all"
                              title="Click to zoom high-res photo"
                            >
                              {item.imageUrl ? (
                                <ItemImage src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <Box className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="max-w-[280px] truncate">
                              <span className="font-bold text-slate-900 dark:text-white block truncate">{item.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">{item.barcode || item.sku || `EL-${item.id}`}</span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                          {item.category || 'General'}
                        </td>

                        {/* Stock */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {item.stockQty} {item.unit}
                        </td>

                        {/* Bin Location Status */}
                        <td className="py-3 px-4">
                          {isSlotted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs rounded-xl border border-emerald-200/80 dark:border-emerald-800">
                              <Check className="w-3.5 h-3.5" />
                              <span>{item.binLocation}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium text-xs rounded-xl border border-amber-200/80 dark:border-amber-800">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Unassigned</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSlottingItem(item);
                                setTargetBinInput(item.binLocation || '');
                              }}
                              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{isSlotted ? 'Change Bin' : 'Slot to Bin'}</span>
                            </button>

                            {isSlotted && (
                              <button
                                type="button"
                                onClick={() => handleDirectSlotItem(item, null)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                                title="Clear placement location"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredSlottingItems.length === 0 && (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No components found matching your search and filter criteria.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: CUSTOM SHELF & RACK UNITS */}
      {/* ========================================================================= */}
      {activeViewMode === 'visual_shelf' && (
        <VisualStockRoom />
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: 2D FLOOR PLAN BLUEPRINT */}
      {/* ========================================================================= */}
      {activeViewMode === 'floor_plan' && (
        <FloorPlanDesignerTab />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD FACILITY */}
      {/* ========================================================================= */}
      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-indigo-600" />
                Add Warehouse Facility
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWarehouse} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Assembly Facility"
                  value={newWh.name}
                  onChange={(e) => setNewWh({ ...newWh, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Facility Code</label>
                <input
                  type="text"
                  placeholder="e.g. WH-BLR-02"
                  value={newWh.code}
                  onChange={(e) => setNewWh({ ...newWh, code: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Physical Address / City</label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru, Karnataka"
                  value={newWh.address}
                  onChange={(e) => setNewWh({ ...newWh, address: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Create Facility
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT FACILITY */}
      {/* ========================================================================= */}
      {editingWh && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                Edit Facility: {editingWh.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingWh(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSaveWh} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={editingWh.name}
                  onChange={(e) => setEditingWh({ ...editingWh, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Facility Code</label>
                <input
                  type="text"
                  required
                  value={editingWh.code}
                  onChange={(e) => setEditingWh({ ...editingWh, code: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Address / Location</label>
                <input
                  type="text"
                  value={typeof editingWh.address === 'object' ? editingWh.address?.city || '' : editingWh.address || ''}
                  onChange={(e) => setEditingWh({ ...editingWh, address: { city: e.target.value } })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingWh(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD STORAGE BIN */}
      {/* ========================================================================= */}
      {isAddBinOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Add New Storage Bin Location
              </h3>
              <button
                type="button"
                onClick={() => setIsAddBinOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBinSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Target Facility</label>
                <SmartSelect
                  value={newBinWhCode || warehouses[0]?.code || 'WH-MAIN-01'}
                  onChange={setNewBinWhCode}
                  options={warehouses.map(w => ({
                    value: w.code,
                    label: `${w.name} (${w.code})`,
                  }))}
                  placeholder="Select facility..."
                  aria-label="Target Facility"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Bin Location Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shelf 1, Rack A - Box 4, or BIN-01"
                  value={newBinCode}
                  onChange={(e) => setNewBinCode(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Description / Zone Note</label>
                <input
                  type="text"
                  placeholder="e.g. Zone A High Velocity Sensors"
                  value={newBinDesc}
                  onChange={(e) => setNewBinDesc(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddBinOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Create Bin
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SLOTTING MODAL (1-Click Slot Single Item) */}
      {/* ========================================================================= */}
      {slottingItem && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Slot Item into Warehouse Bin
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{slottingItem.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSlottingItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Current Location</span>
                  <strong className="text-slate-900 dark:text-white font-mono text-xs">{slottingItem.binLocation || '⚠️ Unassigned'}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Available Stock</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">{slottingItem.stockQty} {slottingItem.unit}</strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Target Bin / Shelf Location</label>
                <input
                  type="text"
                  required
                  placeholder="Enter or select a bin (e.g. Shelf 1, Rack A - Box 2)"
                  value={targetBinInput}
                  onChange={(e) => setTargetBinInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              {/* Quick Select from Existing Bins */}
              {bins.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quick Pick Configured Bins:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
                    {bins.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setTargetBinInput(b.code)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                          targetBinInput === b.code
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-500'
                        }`}
                      >
                        {b.code}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSlottingItem(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectSlotItem(slottingItem, targetBinInput.trim())}
                  disabled={!targetBinInput.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Assign to {targetBinInput.trim() || 'Bin'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ASSIGN PARTS TO BIN MODAL (From Bin side) */}
      {/* ========================================================================= */}
      {assigningBin && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Assign Components to Storage Bin [{assigningBin.code}]
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
                .filter(item => item.name.toLowerCase().includes(assignItemSearch.toLowerCase()) || (item.barcode || item.sku || '').toLowerCase().includes(assignItemSearch.toLowerCase()))
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
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PRINT SHELF BARCODE STICKER */}
      {/* ========================================================================= */}
      {printingBin && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-5">
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
                  showToast('success', 'Print Sent', `Sticker print dispatched for ${printingBin.code}`);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Label
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {zoomItem && (
        <ImagePreviewModal
          isOpen={!!zoomItem}
          onClose={() => setZoomItem(null)}
          imageUrl={zoomItem.imageUrl}
          title={zoomItem.title}
          category={zoomItem.category}
          stockQty={zoomItem.stockQty}
          unit={zoomItem.unit}
          binLocation={zoomItem.binLocation}
        />
      )}

    </div>
  );
}
