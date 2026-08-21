import React, { useState, useMemo } from 'react';
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
  Building2,
  Package,
  Printer
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import BarcodeSvg from '@/src/shared/components/BarcodeSvg';

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
  const { inventory, bins, warehouses } = useData();
  const [selectedRack, setSelectedRack] = useState<string>('RACK_1');
  const [selectedBin, setSelectedBin] = useState<BinSlot | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Racks layout definitions
  const RACKS = [
    { id: 'RACK_1', name: 'Rack 1 — Main Assembly & Science Lab Shelf', zone: 'Zone A (High Velocity)', prefix: 'Rack 1' },
    { id: 'RACK_2', name: 'Rack 2 — Electronics & Sensor Cleanroom', zone: 'Zone B (ESD Safe)', prefix: 'Bin' },
    { id: 'RACK_3', name: 'Cabinet A — Chemical & Safety Storage', zone: 'Zone C (Hazmat Light)', prefix: 'Chemical' },
    { id: 'RACK_4', name: 'Rack 3 — STEM Kitting Packages', zone: 'Zone D (Finished Assembly)', prefix: 'Kits' },
  ];

  // Map real inventory to bin slots
  const binsList: BinSlot[] = useMemo(() => {
    const list: BinSlot[] = [];

    // Group 1: Rack 1 (4 shelves x 4 bins)
    for (let s = 1; s <= 4; s++) {
      const shelfCodes = [
        `Rack - Shelf ${s}`,
        `Rack 1, Shelf ${String.fromCharCode(64 + (s * 2 - 1))}`,
        `Rack 1, Shelf ${String.fromCharCode(64 + (s * 2))}`,
        `BIN-R1-S${s}-04`
      ];

      shelfCodes.forEach((code, idx) => {
        const clean = code.trim().toLowerCase();
        const items = inventory.filter(item => {
          const itemBin = (item.binLocation || '').trim().toLowerCase();
          return itemBin === clean || itemBin.includes(clean);
        });

        list.push({
          code,
          rack: 'RACK_1',
          shelf: `Shelf Level ${s}`,
          bin: `Compartment ${idx + 1}`,
          itemCount: items.length,
          capacity: 500,
          skus: items.map(i => ({ id: i.id, name: i.name, qty: i.stockQty, category: i.category || 'General' })),
        });
      });
    }

    // Group 2: Rack 2 Electronics (4 shelves x 4 bins: Bin A-01..Bin D-04)
    const tiers = ['A', 'B', 'C', 'D'];
    tiers.forEach((tierLetter, tierIdx) => {
      for (let b = 1; b <= 4; b++) {
        const code = `Bin ${tierLetter}-0${b}`;
        const clean = code.trim().toLowerCase();
        const items = inventory.filter(item => {
          const itemBin = (item.binLocation || '').trim().toLowerCase();
          return itemBin === clean || itemBin.includes(clean);
        });

        list.push({
          code,
          rack: 'RACK_2',
          shelf: `Shelf Level ${tierIdx + 1} (${tierLetter})`,
          bin: `Slot ${b}`,
          itemCount: items.length,
          capacity: 300,
          skus: items.map(i => ({ id: i.id, name: i.name, qty: i.stockQty, category: i.category || 'Electronics' })),
        });
      }
    });

    // Group 3: Cabinet A (3 tiers x 2 compartments)
    for (let s = 1; s <= 3; s++) {
      const codes = [`Chemical Cabinet - ${s * 2 - 1}`, `Chemical Cabinet - ${s * 2}`];
      codes.forEach((code, idx) => {
        const clean = code.trim().toLowerCase();
        const items = inventory.filter(item => {
          const itemBin = (item.binLocation || '').trim().toLowerCase();
          return itemBin === clean || itemBin.includes(clean);
        });

        list.push({
          code,
          rack: 'RACK_3',
          shelf: `Shelf Tier ${s}`,
          bin: `Cabinet Box ${idx + 1}`,
          itemCount: items.length,
          capacity: 200,
          skus: items.map(i => ({ id: i.id, name: i.name, qty: i.stockQty, category: i.category || 'Chemicals' })),
        });
      });
    }

    // Group 4: Rack 3 Kitting (3 tiers x 3 compartments)
    for (let s = 1; s <= 3; s++) {
      const codes = [`Kits Bin ${s * 3 - 2}`, `Kits Bin ${s * 3 - 1}`, `Kits Bin ${s * 3}`];
      codes.forEach((code, idx) => {
        const clean = code.trim().toLowerCase();
        const items = inventory.filter(item => {
          const itemBin = (item.binLocation || '').trim().toLowerCase();
          return itemBin === clean || itemBin.includes(clean);
        });

        list.push({
          code,
          rack: 'RACK_4',
          shelf: `Kitting Tier ${s}`,
          bin: `Tote ${idx + 1}`,
          itemCount: items.length,
          capacity: 400,
          skus: items.map(i => ({ id: i.id, name: i.name, qty: i.stockQty, category: i.category || 'kits' })),
        });
      });
    }

    return list;
  }, [inventory]);

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
    if (totalQty > 200) return 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300';
    if (totalQty > 50) return 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300';
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
            <div className="text-[9px] uppercase font-bold text-slate-400">Total Bins</div>
            <div className="text-lg font-black text-indigo-400">{binsList.length} Slots</div>
          </div>
          <div className="bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700 text-center font-mono">
            <div className="text-[9px] uppercase font-bold text-slate-400">Occupied</div>
            <div className="text-lg font-black text-emerald-400">{binsList.filter(b => b.itemCount > 0).length} Filled</div>
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
              placeholder="Search bin code or SKU (e.g. Rack - Shelf 1, ESP32)..."
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
        {/* Left Side: 2D Spatial Grid */}
        <div className="lg:col-span-2 space-y-4">
          {Array.from(new Set(activeRackBins.map(b => b.shelf))).map((shelfName) => {
            const shelfBins = filteredBins.filter((b) => b.shelf === shelfName);
            if (shelfBins.length === 0) return null;

            return (
              <div key={shelfName} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-indigo-500" /> {shelfName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{shelfBins.length} Compartments</span>
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
                          <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">
                            {bin.skus[0]?.name || 'Empty Slot'}
                          </div>
                          {bin.skus.length > 1 && (
                            <div className="text-[9px] font-medium text-slate-400">
                              +{bin.skus.length - 1} more parts
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[9px] font-mono font-bold">
                          <span>{totalUnits} Units</span>
                          <span className="text-indigo-600 dark:text-indigo-400">Inspect →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side: Selected Bin Inspector & Barcode Card */}
        <div className="space-y-4">
          {selectedBin ? (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                    BIN TELEMETRY
                  </span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {selectedBin.code}
                  </h4>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                  {selectedBin.shelf}
                </span>
              </div>

              {/* Barcode Preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                <div className="text-[9px] font-mono text-slate-400 uppercase">ISO/IEC Code-128 Shelf Barcode</div>
                <div className="flex justify-center">
                  <BarcodeSvg
                    value={selectedBin.code}
                    format="CODE128"
                    width={1.6}
                    height={36}
                    displayValue={false}
                    className="h-9 w-auto max-w-[200px]"
                  />
                </div>
                <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">{selectedBin.code}</div>
              </div>

              {/* Items Stored in Bin */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Stored Components ({selectedBin.skus.length})
                </h5>

                {selectedBin.skus.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No components currently assigned to this bin slot.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedBin.skus.map((sku) => (
                      <div
                        key={sku.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">{sku.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">SKU-{sku.id.substring(0, 6)}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs shrink-0 border border-emerald-200 dark:border-emerald-800">
                          {sku.qty} pcs
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center text-slate-400 text-xs space-y-2">
              <Box className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold">Select any bin slot in the 2D grid to inspect stored inventory and view its shelf barcode.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
