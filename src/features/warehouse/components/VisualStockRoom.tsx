import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  Box,
  MapPin,
  Plus,
  ArrowRight,
  Move,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Printer,
  Search,
  X,
  Edit2,
  Trash2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Tag,
  Package,
  Building2,
  Sliders,
  Sparkles,
  Check,
  Grid,
  Square,
  Settings2,
  FolderPlus
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { InventoryItem } from '@/src/types';
import BarcodeSvg from '@/src/shared/components/BarcodeSvg';

interface ShelfTier {
  id: string;
  name: string;
  levelNumber: number;
  bins: string[];
}

interface PhysicalRack {
  id: string;
  code: string;
  name: string;
  zone: string;
  type: 'steel_shelf' | 'plywood_grid';
  warehouseCode: string;
  shelves: ShelfTier[];
  gridConfig?: { rows: number; cols: number };
}

const STORAGE_KEY = 'experimind_custom_physical_racks_v1';

export default function VisualStockRoom() {
  const { inventory, warehouses, updateInventoryItem, logTransaction } = useData();
  const { showToast } = useToast();

  // Storage Type Mode & Active Rack
  const [selectedRackId, setSelectedRackId] = useState<string>('RACK_1');
  const [searchFilter, setSearchFilter] = useState('');

  // Initial Racks Definition with Steel Racks + Plywood Pigeonhole Matrix
  const initialRacks: PhysicalRack[] = useMemo(() => [
    {
      id: 'RACK_1',
      code: 'Rack 1',
      name: 'Rack 1 — Main Assembly & Science Lab Shelf',
      zone: 'Zone A (High Velocity)',
      type: 'steel_shelf',
      warehouseCode: warehouses[0]?.code || 'WH-MAIN-01',
      shelves: [
        { id: 'R1-S1', name: 'Shelf 1 (Top Tier)', levelNumber: 1, bins: ['Rack - Shelf 1', 'Rack 1, Shelf A', 'Rack 1, Shelf B', 'BIN-R1-S1-04'] },
        { id: 'R1-S2', name: 'Shelf 2 (Upper Middle)', levelNumber: 2, bins: ['Rack - Shelf 2', 'Rack 1, Shelf C', 'Rack 1, Shelf D', 'BIN-R1-S2-04'] },
        { id: 'R1-S3', name: 'Shelf 3 (Lower Middle)', levelNumber: 3, bins: ['Rack - Shelf 3', 'Rack 1, Shelf E', 'Rack 1, Shelf F', 'BIN-R1-S3-04'] },
        { id: 'R1-S4', name: 'Shelf 4 (Heavy Base Tier)', levelNumber: 4, bins: ['Rack - Shelf 4', 'Rack 1, Shelf G', 'Rack 1, Shelf H', 'BIN-R1-S4-04'] },
      ]
    },
    {
      id: 'PLYWOOD_GRID_1',
      code: 'Plywood Unit 1',
      name: '🪵 Plywood Pigeonhole Grid Organizer (Rectangular Boxes)',
      zone: 'Zone B (Small Parts & Hardware)',
      type: 'plywood_grid',
      warehouseCode: warehouses[0]?.code || 'WH-MAIN-01',
      gridConfig: { rows: 4, cols: 6 },
      shelves: [
        { id: 'PW-R1', name: 'Row A (Top Boxes)', levelNumber: 1, bins: ['PLY-A1', 'PLY-A2', 'PLY-A3', 'PLY-A4', 'PLY-A5', 'PLY-A6'] },
        { id: 'PW-R2', name: 'Row B (Upper Mid Boxes)', levelNumber: 2, bins: ['PLY-B1', 'PLY-B2', 'PLY-B3', 'PLY-B4', 'PLY-B5', 'PLY-B6'] },
        { id: 'PW-R3', name: 'Row C (Lower Mid Boxes)', levelNumber: 3, bins: ['PLY-C1', 'PLY-C2', 'PLY-C3', 'PLY-C4', 'PLY-C5', 'PLY-C6'] },
        { id: 'PW-R4', name: 'Row D (Base Deep Trays)', levelNumber: 4, bins: ['PLY-D1', 'PLY-D2', 'PLY-D3', 'PLY-D4', 'PLY-D5', 'PLY-D6'] },
      ]
    },
    {
      id: 'RACK_2',
      code: 'Rack 2',
      name: 'Rack 2 — Electronics & Sensor Cleanroom',
      zone: 'Zone C (ESD Cleanroom)',
      type: 'steel_shelf',
      warehouseCode: warehouses[0]?.code || 'WH-MAIN-01',
      shelves: [
        { id: 'R2-S1', name: 'Shelf 1 (Microcontrollers)', levelNumber: 1, bins: ['Bin A-01', 'Bin A-02', 'Bin A-03', 'Bin A-04'] },
        { id: 'R2-S2', name: 'Shelf 2 (ICs & Transistors)', levelNumber: 2, bins: ['Bin B-01', 'Bin B-02', 'Bin B-03', 'Bin B-04'] },
        { id: 'R2-S3', name: 'Shelf 3 (Displays & Modules)', levelNumber: 3, bins: ['Bin C-01', 'Bin C-02', 'Bin C-03', 'Bin C-04'] },
        { id: 'R2-S4', name: 'Shelf 4 (Power & Battery Packs)', levelNumber: 4, bins: ['Bin D-01', 'Bin D-02', 'Bin D-03', 'Bin D-04'] },
      ]
    },
    {
      id: 'RACK_3',
      code: 'Cabinet A',
      name: 'Chemical & Safety Storage Cabinet',
      zone: 'Zone D (Hazmat Containment)',
      type: 'steel_shelf',
      warehouseCode: warehouses[0]?.code || 'WH-MAIN-01',
      shelves: [
        { id: 'R3-S1', name: 'Tier 1 (Reagents & Salts)', levelNumber: 1, bins: ['Chemical Cabinet - 1', 'Chemical Cabinet - 2'] },
        { id: 'R3-S2', name: 'Tier 2 (Solvents & Acids)', levelNumber: 2, bins: ['Chemical Cabinet - 3', 'Chemical Cabinet - 4'] },
        { id: 'R3-S3', name: 'Tier 3 (Glassware & Pipettes)', levelNumber: 3, bins: ['Glassware Shelf 1', 'Glassware Shelf 2'] },
      ]
    },
  ], [warehouses]);

  // Load / Persist Custom Racks
  const [racks, setRacks] = useState<PhysicalRack[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return initialRacks;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(racks));
    } catch (_) {}
  }, [racks]);

  const activeRack = racks.find(r => r.id === selectedRackId) || racks[0];

  // Editing Tier Modal / Inline State
  const [editingTier, setEditingTier] = useState<{ shelfId: string; name: string; levelNumber: number } | null>(null);

  // Selected Bin Details Drawer
  const [activeBinCode, setActiveBinCode] = useState<string | null>(null);

  // Quick Allot Modal
  const [allottingSlot, setAllottingSlot] = useState<{ rackCode: string; shelfName: string; binCode: string } | null>(null);
  const [allotSearchTerm, setAllotSearchTerm] = useState('');

  // Drag and Drop State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverBinCode, setDragOverBinCode] = useState<string | null>(null);

  // Print Shelf Sticker Modal
  const [printingBinCode, setPrintingBinCode] = useState<string | null>(null);

  // Helper: Get items in a specific bin
  const getItemsForBin = (binCode: string): InventoryItem[] => {
    const clean = binCode.trim().toLowerCase();
    return inventory.filter(item => {
      const itemBin = (item.binLocation || '').trim().toLowerCase();
      return itemBin === clean || itemBin.includes(clean);
    });
  };

  // Helper: Get unallotted inventory items (no binLocation assigned)
  const unassignedItems = useMemo(() => {
    return inventory.filter(item => !item.binLocation || item.binLocation.trim() === '');
  }, [inventory]);

  // Handle Drag & Drop Allotment / Relocation
  const handleDropOnBin = async (targetBinCode: string) => {
    if (!draggedItemId) return;
    const item = inventory.find(i => i.id === draggedItemId);
    if (!item) return;

    const oldBin = item.binLocation;
    await updateInventoryItem(item.id, { binLocation: targetBinCode });

    if (logTransaction) {
      await logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Visual Storage Allotment: Moved "${item.name}" from [${oldBin || 'Unassigned'}] to Bin [${targetBinCode}]`,
        items: [{ componentId: item.id, componentName: item.name, qtyDiff: 0 }],
        diffs: [{ field: 'binLocation', oldValue: oldBin || null, newValue: targetBinCode }]
      });
    }

    showToast('success', 'Stock Slotted on Shelf', `Moved "${item.name}" to ${targetBinCode}`);
    setDraggedItemId(null);
    setDragOverBinCode(null);
  };

  // 1-Click Allot Item from Modal
  const handleAllotItemSubmit = async (item: InventoryItem, targetBinCode: string) => {
    const oldBin = item.binLocation;
    await updateInventoryItem(item.id, { binLocation: targetBinCode });

    if (logTransaction) {
      await logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Slotted "${item.name}" into Bin [${targetBinCode}]`,
        items: [{ componentId: item.id, componentName: item.name, qtyDiff: 0 }],
        diffs: [{ field: 'binLocation', oldValue: oldBin || null, newValue: targetBinCode }]
      });
    }

    showToast('success', 'Component Allotted to Shelf', `Slotted "${item.name}" into ${targetBinCode}`);
    setAllottingSlot(null);
  };

  // Remove item from bin
  const handleUnassignItem = async (item: InventoryItem) => {
    const oldBin = item.binLocation;
    await updateInventoryItem(item.id, { binLocation: undefined });

    if (logTransaction) {
      await logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Removed "${item.name}" from Bin [${oldBin}]`,
        items: [{ componentId: item.id, componentName: item.name, qtyDiff: 0 }],
        diffs: [{ field: 'binLocation', oldValue: oldBin || null, newValue: null }]
      });
    }

    showToast('info', 'Item Removed from Bin', `"${item.name}" is now in unassigned staging`);
  };

  // EDIT TIER ACTIONS
  const handleSaveTierEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;

    setRacks(prev => prev.map(rack => {
      if (rack.id !== selectedRackId) return rack;
      return {
        ...rack,
        shelves: rack.shelves.map(shelf => {
          if (shelf.id !== editingTier.shelfId) return shelf;
          return {
            ...shelf,
            name: editingTier.name.trim(),
            levelNumber: editingTier.levelNumber
          };
        })
      };
    }));

    showToast('success', 'Tier Updated', `Renamed tier to "${editingTier.name}"`);
    setEditingTier(null);
  };

  // ADD NEW SHELF TIER
  const handleAddShelfTier = () => {
    const nextLevel = activeRack.shelves.length + 1;
    const prefix = activeRack.type === 'plywood_grid' ? `PLY-${String.fromCharCode(64 + nextLevel)}` : `BIN-R${activeRack.code.replace(/\D/g, '') || '1'}-S${nextLevel}`;
    
    const newShelf: ShelfTier = {
      id: `${activeRack.id}-S${nextLevel}-${Date.now()}`,
      name: activeRack.type === 'plywood_grid' ? `Row ${String.fromCharCode(64 + nextLevel)} (Plywood Boxes)` : `Shelf ${nextLevel} (Tier ${nextLevel})`,
      levelNumber: nextLevel,
      bins: activeRack.type === 'plywood_grid' 
        ? [1, 2, 3, 4, 5, 6].map(c => `${prefix}${c}`)
        : [1, 2, 3, 4].map(c => `${prefix}-0${c}`)
    };

    setRacks(prev => prev.map(rack => {
      if (rack.id !== selectedRackId) return rack;
      return { ...rack, shelves: [...rack.shelves, newShelf] };
    }));

    showToast('success', 'New Tier Added', `Created ${newShelf.name}`);
  };

  // ADD BIN COMPARTMENT TO TIER
  const handleAddBinToTier = (shelfId: string) => {
    setRacks(prev => prev.map(rack => {
      if (rack.id !== selectedRackId) return rack;
      return {
        ...rack,
        shelves: rack.shelves.map(shelf => {
          if (shelf.id !== shelfId) return shelf;
          const nextIdx = shelf.bins.length + 1;
          const newBinCode = rack.type === 'plywood_grid'
            ? `PLY-${String.fromCharCode(64 + shelf.levelNumber)}${nextIdx}`
            : `${rack.code} - Shelf ${shelf.levelNumber} - Box ${nextIdx}`;
          return {
            ...shelf,
            bins: [...shelf.bins, newBinCode]
          };
        })
      };
    }));
    showToast('success', 'Bin Slot Added', 'Added new compartment box to shelf tier.');
  };

  // DELETE SHELF TIER
  const handleDeleteShelfTier = (shelfId: string) => {
    if (activeRack.shelves.length <= 1) return alert("A storage rack must have at least one shelf tier.");
    if (confirm("Are you sure you want to remove this shelf tier?")) {
      setRacks(prev => prev.map(rack => {
        if (rack.id !== selectedRackId) return rack;
        return {
          ...rack,
          shelves: rack.shelves.filter(s => s.id !== shelfId).map((s, idx) => ({ ...s, levelNumber: idx + 1 }))
        };
      }));
      showToast('info', 'Tier Removed', 'Shelf tier removed.');
    }
  };

  // Calculate Rack Occupancy
  const totalSlotsInRack = activeRack.shelves.reduce((sum, s) => sum + s.bins.length, 0);
  const occupiedSlotsInRack = activeRack.shelves.reduce((sum, s) => {
    return sum + s.bins.filter(b => getItemsForBin(b).length > 0).length;
  }, 0);
  const occupancyPct = Math.round((occupiedSlotsInRack / (totalSlotsInRack || 1)) * 100);

  return (
    <div className="space-y-6 w-full animate-fadeIn pb-12">
      {/* Visual Hub Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/40 uppercase flex items-center gap-1">
              <Building2 className="w-3 h-3 text-amber-400" /> DIGITAL WAREHOUSE REPLICA
            </span>
            <span className="text-slate-400 text-xs">• Steel Shelves & Plywood Grid Units</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Physical Shelving & Plywood Storage Matrix
          </h2>
          <p className="text-xs text-slate-300">
            Realistic physical shelving units & rectangular plywood box organizers. Edit tiers, customize compartments, and drag & drop parts.
          </p>
        </div>

        {/* Rack Occupancy Telemetry */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700 text-center font-mono">
            <div className="text-[9px] uppercase font-bold text-slate-400">Unit Occupancy</div>
            <div className="text-lg font-black text-amber-400">{occupancyPct}% Filled</div>
          </div>
          <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700 text-center font-mono">
            <div className="text-[9px] uppercase font-bold text-slate-400">Total Boxes / Slots</div>
            <div className="text-lg font-black text-indigo-400">{occupiedSlotsInRack} / {totalSlotsInRack} Slots</div>
          </div>
        </div>
      </div>

      {/* Rack Selector & Facility Switcher Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Rack Switcher Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar w-full md:w-auto">
            {racks.map((rack) => (
              <button
                key={rack.id}
                onClick={() => setSelectedRackId(rack.id)}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
                  selectedRackId === rack.id
                    ? rack.type === 'plywood_grid'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30'
                      : 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {rack.type === 'plywood_grid' ? <Grid className="w-4 h-4 text-amber-300" /> : <Layers className="w-4 h-4 text-amber-400" />}
                <span>{rack.code} — {rack.name.split('—')[1] || rack.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Highlight item in boxes..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <button
              onClick={handleAddShelfTier}
              className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Add a new level to this storage unit"
            >
              <Plus className="w-4 h-4" /> Add Tier / Row
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🪵 1. PLYWOOD PIGEONHOLE GRID ORGANIZER (RECTANGULAR WOODEN BOXES MATRIX) */}
      {/* ========================================================================= */}
      {activeRack.type === 'plywood_grid' && (
        <div className="bg-amber-950/90 p-6 md:p-8 rounded-3xl border-4 border-amber-900 shadow-2xl space-y-6 relative overflow-hidden text-amber-100">
          
          {/* Plywood Header Frame */}
          <div className="flex items-center justify-between text-xs font-mono text-amber-300/80 border-b border-amber-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
              <strong className="text-amber-100 text-sm font-black tracking-wide">{activeRack.name}</strong>
              <span className="px-2 py-0.5 rounded-md bg-amber-900/90 text-amber-200 text-[10px] border border-amber-700">
                Plywood Box Matrix ({activeRack.shelves.length} Rows × Multi-Column Cubbies)
              </span>
            </div>
            <div className="text-[11px] text-amber-300/70">
              Drag parts from staging into rectangular plywood boxes
            </div>
          </div>

          {/* Wooden Matrix Rows */}
          <div className="space-y-4">
            {activeRack.shelves.map((shelf, shelfIdx) => (
              <div key={shelf.id} className="relative group/tier bg-amber-900/40 p-3.5 rounded-2xl border-2 border-amber-800/80 shadow-inner">
                
                {/* Editable Row / Tier Header */}
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      {shelf.name}
                    </span>

                    {/* EDIT TIER BUTTON */}
                    <button
                      onClick={() => setEditingTier({ shelfId: shelf.id, name: shelf.name, levelNumber: shelf.levelNumber })}
                      className="p-1 text-amber-400 hover:text-white hover:bg-amber-800/60 rounded-md transition-colors cursor-pointer"
                      title="Rename this tier / row"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddBinToTier(shelf.id)}
                      className="px-2 py-0.5 bg-amber-800/80 hover:bg-amber-700 text-amber-200 rounded-md text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 border border-amber-700"
                    >
                      <Plus className="w-3 h-3" /> Add Box Slot
                    </button>

                    <button
                      onClick={() => handleDeleteShelfTier(shelf.id)}
                      className="p-1 text-amber-400/60 hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                      title="Remove this row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[10px] font-mono text-amber-300/60 ml-2">
                      Row {shelf.levelNumber} of {activeRack.shelves.length}
                    </span>
                  </div>
                </div>

                {/* Rectangular Plywood Boxes Grid (Woodgrain Box Cells) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {shelf.bins.map((binCode) => {
                    const items = getItemsForBin(binCode);
                    const isOccupied = items.length > 0;
                    const isDragOver = dragOverBinCode === binCode;
                    const primaryItem = items[0];
                    const isMatchSearch = searchFilter && items.some(i => i.name.toLowerCase().includes(searchFilter.toLowerCase()));

                    return (
                      <div
                        key={binCode}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverBinCode(binCode);
                        }}
                        onDragLeave={() => setDragOverBinCode(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnBin(binCode);
                        }}
                        onClick={() => {
                          if (isOccupied) {
                            setActiveBinCode(binCode);
                          } else {
                            setAllottingSlot({ rackCode: activeRack.code, shelfName: shelf.name, binCode });
                          }
                        }}
                        className={`relative min-h-[125px] rounded-xl border-2 transition-all p-2.5 flex flex-col justify-between cursor-pointer group select-none shadow-md ${
                          isDragOver
                            ? 'border-amber-300 bg-amber-600/60 scale-105 shadow-xl ring-4 ring-amber-400/50'
                            : isMatchSearch
                            ? 'border-yellow-300 bg-amber-800/90 ring-2 ring-yellow-400'
                            : isOccupied
                            ? 'border-amber-700 bg-amber-900/80 hover:border-amber-400 hover:bg-amber-900 shadow-inner'
                            : 'border-dashed border-amber-800/80 bg-amber-950/40 hover:border-amber-600 hover:bg-amber-900/40'
                        }`}
                      >
                        {/* Brass / Cream Label Placard on Plywood Front Face */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-amber-800/60">
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 font-mono text-[9px] font-black shadow-xs">
                            {binCode}
                          </span>

                          {isOccupied && (
                            <span className="px-1.5 py-0.2 rounded-full text-[8px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-700">
                              {items.reduce((s, i) => s + i.stockQty, 0)} pcs
                            </span>
                          )}
                        </div>

                        {/* Stored Component View inside Wooden Box */}
                        {isOccupied ? (
                          <div className="py-1.5 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-amber-950 border border-amber-700 flex items-center justify-center shrink-0 overflow-hidden text-amber-300">
                                {primaryItem.imageUrl ? (
                                  <img src={primaryItem.imageUrl} alt={primaryItem.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Box className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="truncate">
                                <h5 className="font-bold text-amber-100 text-[11px] truncate group-hover:text-amber-300">
                                  {primaryItem.name}
                                </h5>
                                <span className="text-[9px] font-mono text-amber-400/80 block truncate">
                                  {primaryItem.barcode || `EL-${primaryItem.id}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-2.5 flex flex-col items-center justify-center text-center space-y-0.5 text-amber-400/50 group-hover:text-amber-200">
                            <Plus className="w-4 h-4 text-amber-500" />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Empty Box</span>
                          </div>
                        )}

                        {/* Bottom Info Bar */}
                        <div className="pt-1 border-t border-amber-800/60 flex items-center justify-between text-[8px] font-mono text-amber-300/70">
                          <span>{isOccupied ? primaryItem.category : 'Available'}</span>
                          <span className="text-amber-300 group-hover:underline">Inspect →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🏗️ 2. STEEL INDUSTRIAL SHELVING UNIT REPLICA */}
      {/* ========================================================================= */}
      {activeRack.type === 'steel_shelf' && (
        <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 md:p-8 rounded-3xl border-4 border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
          
          {/* Steel Upright Header Frame */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <strong className="text-white text-sm">{activeRack.name}</strong>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">{activeRack.zone}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Drag parts from staging into shelf bins
            </div>
          </div>

          {/* Shelving Unit Steel Frame & Tiers */}
          <div className="space-y-6 relative py-2">
            {activeRack.shelves.map((shelf) => (
              <div key={shelf.id} className="relative group/tier">
                
                {/* Editable Shelf Beam Header Badge */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      {shelf.name}
                    </span>

                    {/* EDIT TIER BUTTON */}
                    <button
                      onClick={() => setEditingTier({ shelfId: shelf.id, name: shelf.name, levelNumber: shelf.levelNumber })}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                      title="Rename this tier"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddBinToTier(shelf.id)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-md text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 border border-slate-700"
                    >
                      <Plus className="w-3 h-3" /> Add Compartment
                    </button>

                    <button
                      onClick={() => handleDeleteShelfTier(shelf.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                      title="Remove this tier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[10px] font-mono text-slate-400 ml-2">
                      Tier {shelf.levelNumber} of {activeRack.shelves.length}
                    </span>
                  </div>
                </div>

                {/* Physical Storage Bins Row on Shelf Crossbeam */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                  {shelf.bins.map((binCode) => {
                    const items = getItemsForBin(binCode);
                    const isOccupied = items.length > 0;
                    const isDragOver = dragOverBinCode === binCode;
                    const primaryItem = items[0];
                    const isMatchSearch = searchFilter && items.some(i => i.name.toLowerCase().includes(searchFilter.toLowerCase()));

                    return (
                      <div
                        key={binCode}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverBinCode(binCode);
                        }}
                        onDragLeave={() => setDragOverBinCode(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnBin(binCode);
                        }}
                        onClick={() => {
                          if (isOccupied) {
                            setActiveBinCode(binCode);
                          } else {
                            setAllottingSlot({ rackCode: activeRack.code, shelfName: shelf.name, binCode });
                          }
                        }}
                        className={`relative min-h-[140px] rounded-2xl border-2 transition-all p-3.5 flex flex-col justify-between cursor-pointer group select-none ${
                          isDragOver
                            ? 'border-indigo-400 bg-indigo-950/70 scale-105 shadow-xl shadow-indigo-500/30 ring-4 ring-indigo-500/40'
                            : isMatchSearch
                            ? 'border-amber-400 bg-amber-950/40 shadow-lg shadow-amber-500/20'
                            : isOccupied
                            ? 'border-slate-700/80 bg-slate-900/90 hover:border-indigo-500 hover:bg-slate-850 shadow-md'
                            : 'border-dashed border-slate-800 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-900/50'
                        }`}
                      >
                        {/* Container Front Placard */}
                        <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 rounded-md bg-slate-800 text-indigo-400 font-mono text-[9px] font-bold">
                              BIN
                            </span>
                            <span className="font-mono text-xs font-black text-white truncate">{binCode}</span>
                          </div>

                          {isOccupied && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {items.reduce((s, i) => s + i.stockQty, 0)} pcs
                            </span>
                          )}
                        </div>

                        {/* Stored Content */}
                        {isOccupied ? (
                          <div className="py-2 space-y-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-indigo-400">
                                {primaryItem.imageUrl ? (
                                  <img src={primaryItem.imageUrl} alt={primaryItem.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Box className="w-4 h-4" />
                                )}
                              </div>
                              <div className="truncate">
                                <h5 className="font-bold text-white text-xs truncate group-hover:text-indigo-400 transition-colors">
                                  {primaryItem.name}
                                </h5>
                                <span className="text-[10px] font-mono text-slate-400 block truncate">
                                  {primaryItem.barcode || `EL-${primaryItem.id}`}
                                </span>
                              </div>
                            </div>

                            {items.length > 1 && (
                              <div className="text-[10px] text-indigo-300 font-bold">
                                + {items.length - 1} more part(s) in this bin
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-4 flex flex-col items-center justify-center text-center space-y-1 text-slate-600 group-hover:text-slate-400">
                            <Plus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Empty Bin Slot</span>
                            <span className="text-[9px]">Click or Drag to Allot</span>
                          </div>
                        )}

                        {/* Status Bar */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-400">
                          <span>{isOccupied ? primaryItem.category : 'Available'}</span>
                          <div className="flex items-center gap-1 text-indigo-400 group-hover:underline">
                            <span>{isOccupied ? 'Inspect Bin' : 'Slot Stock'}</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Heavy Duty Steel Crossbeam Bar with 3D Depth */}
                <div className="w-full h-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 rounded-sm shadow-md mt-1 border-t border-amber-400/40 flex items-center justify-around px-4">
                  {[...Array(12)].map((_, boltIdx) => (
                    <span key={boltIdx} className="w-1 h-1 rounded-full bg-amber-900/80 shadow-inner" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UNASSIGNED INVENTORY STAGING DOCK */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Unallotted Stock Staging Dock ({unassignedItems.length} items awaiting bin allocation)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            💡 Drag any part directly onto an empty shelf bin or plywood box above
          </span>
        </div>

        {unassignedItems.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
            ✓ All catalog components are currently allocated to storage units!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-1">
            {unassignedItems.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggedItemId(item.id)}
                onDragEnd={() => setDraggedItemId(null)}
                className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2.5 cursor-grab active:cursor-grabbing hover:border-indigo-500 transition-all group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
                    <Move className="w-3.5 h-3.5 group-hover:text-indigo-500" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Stock: {item.stockQty} {item.unit}</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-lg shrink-0 border border-amber-200 dark:border-amber-800">
                  Unallotted
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT TIER / ROW NAME MODAL */}
      {editingTier && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                Edit Shelf Tier / Row Name
              </h3>
              <button
                type="button"
                onClick={() => setEditingTier(null)}
                className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTierEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Tier / Row Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shelf 1 (Top Tier), Row A (Small Boxes)..."
                  value={editingTier.name}
                  onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Tier Level Number</label>
                <input
                  type="number"
                  min="1"
                  value={editingTier.levelNumber}
                  onChange={(e) => setEditingTier({ ...editingTier, levelNumber: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Save Tier Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: 1-CLICK ALLOT STOCK INTO BIN SLOT */}
      {allottingSlot && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Allot Stock to [{allottingSlot.binCode}]
                </h3>
                <p className="text-xs text-slate-400">{allottingSlot.rackCode} • {allottingSlot.shelfName}</p>
              </div>
              <button
                type="button"
                onClick={() => setAllottingSlot(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog components to store in this slot..."
                value={allotSearchTerm}
                onChange={(e) => setAllotSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1 custom-scrollbar">
              {inventory
                .filter(i => i.name.toLowerCase().includes(allotSearchTerm.toLowerCase()) || (i.barcode || '').toLowerCase().includes(allotSearchTerm.toLowerCase()))
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="truncate">
                      <span className="font-bold text-slate-900 dark:text-white block truncate">{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Current Location: <strong className="text-amber-500">{item.binLocation || 'Unassigned'}</strong> • Stock: {item.stockQty} {item.unit}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAllotItemSubmit(item, allottingSlot.binCode)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer shrink-0"
                    >
                      Slot Here
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: INSPECT & MANAGE OCCUPIED BIN */}
      {activeBinCode && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex justify-end z-[9999] animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full p-6 shadow-2xl border-l border-slate-200 dark:border-slate-800 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  STORAGE BOX INSPECTOR
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {activeBinCode}
                </h3>
              </div>
              <button
                onClick={() => setActiveBinCode(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shelf Sticker Barcode Preview */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                ISO/IEC Code-128 Shelf Barcode
              </div>
              <BarcodeSvg
                value={activeBinCode}
                format="CODE128"
                width={1.6}
                height={36}
                displayValue={false}
                className="h-9 w-auto max-w-[200px]"
              />
              <span className="text-xs font-mono font-black text-slate-900 dark:text-white">{activeBinCode}</span>
            </div>

            {/* Items Stored inside this physical box */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Components in this Box ({getItemsForBin(activeBinCode).length})
              </h4>

              <div className="space-y-2.5">
                {getItemsForBin(activeBinCode).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="truncate">
                        <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">{item.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{item.barcode || `EL-${item.id}`}</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs rounded-lg border border-emerald-200 dark:border-emerald-800">
                        {item.stockQty} {item.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleUnassignItem(item)}
                        className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[10px] font-bold rounded-lg transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
                      >
                        Unassign from Box
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setPrintingBinCode(activeBinCode);
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" /> Print Shelf Sticker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PHYSICAL STICKER MODAL */}
      {printingBinCode && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Print Shelf Barcode Sticker</h3>
              <button onClick={() => setPrintingBinCode(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white text-slate-900 border-2 border-slate-900 p-4 rounded-xl space-y-1 shadow-lg">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">SHELF LOCATION</div>
              <div className="font-black text-base uppercase tracking-tight text-slate-950">{printingBinCode}</div>
              <div className="py-2 flex justify-center">
                <BarcodeSvg value={printingBinCode} format="CODE128" width={1.8} height={40} displayValue={false} className="h-10 w-auto max-w-[200px]" />
              </div>
              <div className="text-[10px] font-mono font-black text-slate-950 tracking-widest">{printingBinCode}</div>
            </div>

            <button
              onClick={() => {
                window.print();
                showToast('success', 'Print Job Sent', `Printing shelf sticker for ${printingBinCode}`);
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Send to Printer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
