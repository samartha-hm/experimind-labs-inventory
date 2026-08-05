import React, { useState } from 'react';
import {
  MapPin,
  Box,
  Layers,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Info,
  Navigation,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { useData } from '@/src/DataContext';

interface BinSlot {
  code: string;
  rack: string;
  shelf: string;
  bin: string;
  itemCount: number;
  capacity: number;
  skus: { id: string; name: string; qty: number; category: string }[];
}

export default function WarehouseHeatmapTab() {
  const { inventory } = useData();
  const [selectedRack, setSelectedRack] = useState<string>('RACK_A');
  const [selectedBin, setSelectedBin] = useState<BinSlot | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Racks layout data
  const RACKS = [
    { id: 'RACK_A', name: 'Rack A — Electronics & Microcontrollers', zone: 'Zone 1 (ESD Safe)', shelves: 4 },
    { id: 'RACK_B', name: 'Rack B — Science Lab Glassware & Reagents', zone: 'Zone 2 (Hazmat Light)', shelves: 4 },
    { id: 'RACK_C', name: 'Rack C — STEM Kitting & Assembly Units', zone: 'Zone 3 (High Velocity)', shelves: 4 },
    { id: 'RACK_D', name: 'Rack D — Mathematics & IQ Learning Aids', zone: 'Zone 4 (General Storage)', shelves: 4 },
  ];

  // Map inventory items to virtual bins dynamically
  const binsList: BinSlot[] = [];
  const itemsPerBin = Math.max(1, Math.ceil(inventory.length / 16));

  for (let r = 0; r < 4; r++) {
    const rackId = RACKS[r].id;
    for (let s = 1; s <= 4; s++) {
      for (let b = 1; b <= 4; b++) {
        const binIndex = (r * 16) + ((s - 1) * 4) + (b - 1);
        const startIndex = (binIndex * itemsPerBin) % inventory.length;
        const binItems = inventory.slice(startIndex, startIndex + itemsPerBin).map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.stockQty,
          category: item.category || 'General',
        }));

        const totalQty = binItems.reduce((acc, curr) => acc + curr.qty, 0);
        binsList.push({
          code: `R${r + 1}-S${s}-B${b}`,
          rack: rackId,
          shelf: `Shelf ${s}`,
          bin: `Bin ${b}`,
          itemCount: binItems.length,
          capacity: 500,
          skus: binItems,
        });
      }
    }
  }

  const activeRackBins = binsList.filter((b) => b.rack === selectedRack);

  // Filter bins if search term is active
  const filteredBins = activeRackBins.filter((bin) => {
    if (!searchTerm) return true;
    return (
      bin.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bin.skus.some((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const getHeatmapColor = (itemCount: number, totalQty: number) => {
    if (itemCount === 0) return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400';
    if (totalQty > 300) return 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300';
    if (totalQty > 100) return 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300';
    return 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300';
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/40 uppercase flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-400" /> WAREHOUSE 2D HEATMAP
            </span>
            <span className="text-slate-400 text-xs">• Real-Time Storage Telemetry</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Visual Bin & Rack Capacity Map</h2>
          <p className="text-xs text-slate-300">
            Interactive 2D spatial layout of warehouse racks, bin occupancy levels, capacity utilization, and pick-route efficiency.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700 text-center font-mono">
            <div className="text-[9px] uppercase font-bold text-slate-400">Pick Efficiency</div>
            <div className="text-lg font-black text-emerald-400">94.8%</div>
          </div>
          <div className="bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700 text-center font-mono">
            <div className="text-[9px] uppercase font-bold text-slate-400">Total Bins</div>
            <div className="text-lg font-black text-indigo-400">64 Slots</div>
          </div>
        </div>
      </div>

      {/* Warehouse Selector & Controls Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Rack Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar w-full md:w-auto">
            {RACKS.map((rack) => (
              <button
                key={rack.id}
                onClick={() => setSelectedRack(rack.id)}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
                  selectedRack === rack.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>{rack.name.split('—')[0].trim()}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search bin code or SKU (e.g. R1-S2-B3, ESP32)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Selected Rack Info Header */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Active Section: <strong className="text-slate-900 dark:text-slate-100">{RACKS.find(r => r.id === selectedRack)?.name}</strong></span>
          </div>
          <span className="font-mono text-slate-400 text-[11px]">{RACKS.find(r => r.id === selectedRack)?.zone}</span>
        </div>
      </div>

      {/* 2D Grid Layout of Shelves & Bins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: 2D Spatial Grid (4 Shelves x 4 Bins) */}
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3, 4].map((shelfNum) => {
            const shelfBins = filteredBins.filter((b) => b.shelf === `Shelf ${shelfNum}`);
            return (
              <div key={shelfNum} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-indigo-500" /> Shelf Level {shelfNum}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">4 Bin Compartments</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {shelfBins.map((bin) => {
                    const totalUnits = bin.skus.reduce((sum, item) => sum + item.qty, 0);
                    const colorClass = getHeatmapColor(bin.itemCount, totalUnits);
                    const isSelected = selectedBin?.code === bin.code;

                    return (
                      <div
                        key={bin.code}
                        onClick={() => setSelectedBin(bin)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden group ${colorClass} ${
                          isSelected ? 'ring-2 ring-indigo-500 shadow-md scale-[1.03]' : 'hover:scale-[1.02]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black tracking-tight">{bin.code}</span>
                          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-white/50 dark:bg-slate-900/50">
                            {bin.itemCount} SKUs
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[10px] font-extrabold truncate text-slate-800 dark:text-slate-200">
                            {bin.skus[0]?.name || 'Empty Slot'}
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 dark:text-slate-400">
                            <span>Units: {totalUnits}</span>
                            <span>{Math.round((totalUnits / bin.capacity) * 100)}%</span>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 dark:bg-indigo-400 h-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (totalUnits / bin.capacity) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side: Selected Bin Detail Drawer */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Box className="w-4 h-4 text-indigo-500" /> Bin Slot Telemetry
              </h3>
              {selectedBin && (
                <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg">
                  {selectedBin.code}
                </span>
              )}
            </div>

            {selectedBin ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-2 font-mono bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                  <div>Shelf Level: <strong className="text-slate-900 dark:text-slate-100">{selectedBin.shelf}</strong></div>
                  <div>Compartment: <strong className="text-slate-900 dark:text-slate-100">{selectedBin.bin}</strong></div>
                  <div>Stored Items: <strong className="text-slate-900 dark:text-slate-100">{selectedBin.itemCount} SKUs</strong></div>
                  <div>Total Stock: <strong className="text-emerald-600 dark:text-emerald-400">{selectedBin.skus.reduce((s, i) => s + i.qty, 0)} units</strong></div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    Stored SKU Breakdown ({selectedBin.skus.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {selectedBin.skus.map((sku) => (
                      <div key={sku.id} className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate">{sku.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">SKU: {sku.id} • {sku.category}</div>
                        </div>
                        <div className="font-black text-xs font-mono text-indigo-600 dark:text-indigo-400 shrink-0">
                          {sku.qty} pcs
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center space-y-2 text-slate-400">
                <MapPin className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-medium">Click any 2D bin slot on the left to inspect stored SKUs and stock levels.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
