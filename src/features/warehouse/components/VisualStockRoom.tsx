import React, { useState, useMemo } from 'react';
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
  Check
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
  warehouseCode: string;
  shelves: ShelfTier[];
}

export default function VisualStockRoom() {
  const { inventory, warehouses, bins, updateInventoryItem, logTransaction } = useData();
  const { showToast } = useToast();

  // Selected Warehouse Facility & Selected Physical Rack
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(warehouses[0]?.code || 'WH-MAIN-01');
  const [selectedRackId, setSelectedRackId] = useState<string>('RACK_1');
  const [searchFilter, setSearchFilter] = useState('');

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

  // Physical Racks Model (Dynamic & Built from Bins/Warehouses with Default Racks)
  const defaultRacks: PhysicalRack[] = useMemo(() => [
    {
      id: 'RACK_1',
      code: 'Rack 1',
      name: 'Rack 1 — Main Assembly & Science Lab Shelf',
      zone: 'Zone A (High Velocity)',
      warehouseCode: warehouses[0]?.code || 'WH-MAIN-01',
      shelves: [
        { id: 'R1-S1', name: 'Shelf 1 (Top Tier)', levelNumber: 1, bins: ['Rack - Shelf 1', 'Rack 1, Shelf A', 'Rack 1, Shelf B', 'BIN-R1-S1-04'] },
        { id: 'R1-S2', name: 'Shelf 2 (Upper Middle)', levelNumber: 2, bins: ['Rack - Shelf 2', 'Rack 1, Shelf C', 'Rack 1, Shelf D', 'BIN-R1-S2-04'] },
        { id: 'R1-S3', name: 'Shelf 3 (Lower Middle)', levelNumber: 3, bins: ['Rack - Shelf 3', 'Rack 1, Shelf E', 'Rack 1, Shelf F', 'BIN-R1-S3-04'] },
        { id: 'R1-S4', name: 'Shelf 4 (Heavy Base Tier)', levelNumber: 4, bins: ['Rack - Shelf 4', 'Rack 1, Shelf G', 'Rack 1, Shelf H', 'BIN-R1-S4-04'] },
      ]
    },
    {
      id: 'RACK_2',
      code: 'Rack 2',
      name: 'Rack 2 — Electronics & Sensor Micro-Components',
      zone: 'Zone B (ESD Protected Cleanroom)',
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
      zone: 'Zone C (Hazmat / Spill Containment)',
      warehouseCode: warehouses[0]?.code || 'WH-MAIN-01',
      shelves: [
        { id: 'R3-S1', name: 'Tier 1 (Reagents & Salts)', levelNumber: 1, bins: ['Chemical Cabinet - 1', 'Chemical Cabinet - 2'] },
        { id: 'R3-S2', name: 'Tier 2 (Solvents & Acids)', levelNumber: 2, bins: ['Chemical Cabinet - 3', 'Chemical Cabinet - 4'] },
        { id: 'R3-S3', name: 'Tier 3 (Glassware & Pipettes)', levelNumber: 3, bins: ['Glassware Shelf 1', 'Glassware Shelf 2'] },
      ]
    },
    {
      id: 'RACK_4',
      code: 'Rack 3',
      name: 'Rack 3 — Composite STEM Kitting & Bundles',
      zone: 'Zone D (Finished Assembly Packaging)',
      warehouseCode: warehouses[1]?.code || 'WH-MAIN-01',
      shelves: [
        { id: 'R4-S1', name: 'Tier 1 (Prastuti Science Kits)', levelNumber: 1, bins: ['Kits Bin 1', 'Kits Bin 2', 'Kits Bin 3'] },
        { id: 'R4-S2', name: 'Tier 2 (Prastuti Maths Kits)', levelNumber: 2, bins: ['Kits Bin 4', 'Kits Bin 5', 'Kits Bin 6'] },
        { id: 'R4-S3', name: 'Tier 3 (Anubhav Learning Boxes)', levelNumber: 3, bins: ['Kits Bin 7', 'Kits Bin 8', 'Kits Bin 9'] },
      ]
    }
  ], [warehouses]);

  const activeRack = defaultRacks.find(r => r.id === selectedRackId) || defaultRacks[0];

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
        description: `Visual Shelf Allotment: Moved "${item.name}" from [${oldBin || 'Unassigned'}] to Bin [${targetBinCode}]`,
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
            <span className="text-slate-400 text-xs">• Physical Storage Racks</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Interactive Shelving Units & Bin Allotment Hub
          </h2>
          <p className="text-xs text-slate-300">
            Realistic physical shelving units. Drag & drop parts onto shelves, view live storage boxes, and print rack labels.
          </p>
        </div>

        {/* Rack Occupancy Telemetry */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700 text-center font-mono">
            <div className="text-[9px] uppercase font-bold text-slate-400">Rack Occupancy</div>
            <div className="text-lg font-black text-amber-400">{occupancyPct}% Filled</div>
          </div>
          <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700 text-center font-mono">
            <div className="text-[9px] uppercase font-bold text-slate-400">Slots on Rack</div>
            <div className="text-lg font-black text-indigo-400">{occupiedSlotsInRack} / {totalSlotsInRack} Bins</div>
          </div>
        </div>
      </div>

      {/* Rack Selector & Facility Switcher Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Rack Switcher Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar w-full md:w-auto">
            {defaultRacks.map((rack) => (
              <button
                key={rack.id}
                onClick={() => setSelectedRackId(rack.id)}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
                  selectedRackId === rack.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>{rack.code} — {rack.name.split('—')[1] || rack.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Highlight item on shelf..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN PHYSICAL SHELVING UNIT REPLICA */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 md:p-8 rounded-3xl border-4 border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Steel Upright Support Columns Visual */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <strong className="text-white text-sm">{activeRack.name}</strong>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">{activeRack.zone}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Drag items from the staging dock below to drop into any bin slot
          </div>
        </div>

        {/* Shelving Unit Steel Frame & Tiers */}
        <div className="space-y-6 relative py-2">
          {activeRack.shelves.map((shelf, shelfIdx) => (
            <div key={shelf.id} className="relative group/tier">
              
              {/* Shelf Beam Header Badge */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  {shelf.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Tier {shelf.levelNumber} of {activeRack.shelves.length}
                </span>
              </div>

              {/* Physical Storage Bins Row on Shelf Crossbeam */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                {shelf.bins.map((binCode, binIdx) => {
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
                      {/* Physical Bin Label Placard on Container Front */}
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

                      {/* Stored Content View */}
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

                      {/* Bin Bottom Status Bar */}
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
            💡 Drag any part directly onto an empty shelf bin above to allot storage location
          </span>
        </div>

        {unassignedItems.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
            ✓ All catalog components are currently allocated to physical warehouse bins!
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

      {/* MODAL: 1-CLICK ALLOT STOCK INTO BIN SLOT */}
      {allottingSlot && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Allot Stock to Bin [{allottingSlot.binCode}]
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
                  STORAGE BIN INSPECTOR
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

            {/* Items Stored inside this physical bin */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Components in this Bin ({getItemsForBin(activeBinCode).length})
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
                        Unassign from Bin
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
                <Printer className="w-4 h-4 text-amber-400" /> Print Physical Shelf Sticker
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
