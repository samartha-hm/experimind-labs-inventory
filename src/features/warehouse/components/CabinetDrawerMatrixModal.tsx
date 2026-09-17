import React, { useState, useMemo } from 'react';
import {
  Grid,
  Search,
  X,
  Printer,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { useToast } from '@/src/contexts/ToastContext';
import { renderResistorSvg, getPackageGlyph, normalizeElectronicValue } from '@/src/utils/electronicAlias';
import { ThermalPrinterService } from '@/src/services/ThermalPrinterService';

interface DrawerSlot {
  row: number; // 1..4
  col: number; // 1..6
  code: string; // e.g. "D-1-1"
  itemId?: string;
  ipn: string;
  name: string;
  mpn?: string;
  footprint?: string;
  quantity: number;
  safetyStock: number;
  isAllocatedToBatch?: boolean;
  isEsdSafe?: boolean;
  electronicValue?: string;
  subDividers?: 'NONE' | '2x5' | '3x3';
}

interface CabinetDrawerMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  cabinetName?: string;
  initialSearchQuery?: string;
}

export default function CabinetDrawerMatrixModal({
  isOpen,
  onClose,
  cabinetName = 'CAB-01 (SMT Lab Bench)',
  initialSearchQuery = ''
}: CabinetDrawerMatrixModalProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedDrawer, setSelectedDrawer] = useState<DrawerSlot | null>(null);
  const [selectedSubSlot, setSelectedSubSlot] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Default 4x6 Drawer Matrix for Lab Cabinet
  const [drawers, setDrawers] = useState<DrawerSlot[]>(() => {
    const initial: DrawerSlot[] = [];
    const sampleItems = [
      { ipn: 'RES-0603-10K', name: '10kΩ 0603 Resistor', val: '10k', footprint: '0603', qty: 2500, safe: 500, esd: false, div: '3x3' },
      { ipn: 'RES-0603-4K7', name: '4.7kΩ 0603 Resistor', val: '4.7k', footprint: '0603', qty: 1200, safe: 500, esd: false, div: '3x3' },
      { ipn: 'RES-0805-100R', name: '100Ω 0805 Resistor', val: '100', footprint: '0805', qty: 850, safe: 300, esd: false, div: 'NONE' },
      { ipn: 'CAP-0603-100N', name: '100nF 0603 Capacitor', val: '100nF', footprint: '0603', qty: 3400, safe: 1000, esd: false, div: '2x5' },
      { ipn: 'CAP-0805-10U', name: '10µF 0805 MLCC', val: '10uF', footprint: '0805', qty: 350, safe: 500, esd: false, div: '2x5' }, // Amber low
      { ipn: 'IC-MCU-ESP32', name: 'ESP32-WROOM-32E MCU', val: 'ESP32', footprint: 'MODULE', qty: 140, safe: 50, esd: true, div: 'NONE', alloc: true },
      { ipn: 'IC-DRV-8833', name: 'DRV8833 Motor Driver', val: 'DRV8833', footprint: 'TSSOP-16', qty: 0, safe: 40, esd: true, div: 'NONE' }, // Red out
      { ipn: 'HW-M3-008', name: 'M3x8 Brass Standoff', val: 'M3', footprint: 'THT', qty: 4500, safe: 1000, esd: false, div: 'NONE' }
    ];

    let idx = 0;
    for (let r = 1; r <= 4; r++) {
      for (let c = 1; c <= 6; c++) {
        const item = sampleItems[idx % sampleItems.length];
        const code = `D-${r}-${c}`;
        initial.push({
          row: r,
          col: c,
          code,
          ipn: idx < 16 ? item.ipn : `EMPTY-${code}`,
          name: idx < 16 ? item.name : `Empty Drawer ${code}`,
          mpn: idx < 16 ? item.ipn : undefined,
          footprint: idx < 16 ? item.footprint : undefined,
          quantity: idx < 16 ? item.qty : 0,
          safetyStock: idx < 16 ? item.safe : 100,
          isAllocatedToBatch: idx === 5,
          isEsdSafe: idx < 16 ? item.esd : false,
          electronicValue: idx < 16 ? item.val : undefined,
          subDividers: (item.div as any) || 'NONE'
        });
        idx++;
      }
    }
    return initial;
  });

  // Spotlight Find-My-Bin matching
  const matchingDrawerCodes = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase().trim();
    const matches = new Set<string>();
    for (const d of drawers) {
      if (
        d.code.toLowerCase().includes(q) ||
        d.ipn.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        (d.electronicValue && d.electronicValue.toLowerCase().includes(q))
      ) {
        matches.add(d.code);
      }
    }
    return matches;
  }, [searchQuery, drawers]);

  if (!isOpen) return null;

  const handlePrintLabel = async (d: DrawerSlot) => {
    setIsPrinting(true);
    try {
      const printer = new ThermalPrinterService();
      await printer.printBinLabel({
        ipn: d.ipn,
        name: d.name,
        value: d.electronicValue,
        bin: `${cabinetName} / ${d.code}`,
        isEsdSafe: d.isEsdSafe
      });
      showToast('success', 'Label Printed', `Dispensed 50x25mm TSPL label for ${d.ipn}`);
    } catch (err: any) {
      showToast('info', 'TSPL Generated', 'WebSerial dialog opened or markup logged.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                2D Component Cabinet & Drawer Matrix
                <span className="text-xs px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full font-mono">
                  {cabinetName}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Digital twin of 4×6 physical drawer organizer. Click any drawer to inspect micro-compartments.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Spotlight Find-My-Bin */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Find-My-Bin: search value (10k, 100nF), IPN, or drawer coordinate..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <span className="absolute right-3 top-2 text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                {matchingDrawerCodes.size} match{matchingDrawerCodes.size === 1 ? '' : 'es'}
              </span>
            )}
          </div>

          {/* Color Status Legend */}
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Healthy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Low Stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Stockout
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-pulse" /> In Active Batch
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_#00F0FF]" /> Find-My-Bin
            </span>
          </div>
        </div>

        {/* Content Body: Grid on Left (65%), Inspector on Right (35%) */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col lg:flex-row gap-4">
          {/* 4x6 Matrix Grid */}
          <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="grid grid-cols-6 gap-2.5">
              {drawers.map(d => {
                const isMatch = matchingDrawerCodes.has(d.code);
                const isSelected = selectedDrawer?.code === d.code;
                const isStockout = d.quantity === 0;
                const isLow = d.quantity > 0 && d.quantity <= d.safetyStock;

                let borderClass = 'border-slate-800 hover:border-slate-600 bg-slate-900/60';
                let indicatorColor = 'bg-emerald-500';

                if (isStockout) {
                  indicatorColor = 'bg-rose-500';
                  borderClass = 'border-rose-900/50 bg-rose-950/20';
                } else if (isLow) {
                  indicatorColor = 'bg-amber-500';
                  borderClass = 'border-amber-900/50 bg-amber-950/20';
                }

                if (d.isAllocatedToBatch) {
                  indicatorColor = 'bg-blue-500 animate-pulse';
                  borderClass = 'border-blue-700/60 bg-blue-950/20';
                }

                if (isMatch) {
                  borderClass = 'border-cyan-400 ring-2 ring-cyan-400/40 bg-cyan-950/30 animate-pulse';
                } else if (isSelected) {
                  borderClass = 'border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-950/40';
                }

                return (
                  <button
                    key={d.code}
                    onClick={() => {
                      setSelectedDrawer(d);
                      setSelectedSubSlot(null);
                    }}
                    className={`p-2 rounded-xl border text-left flex flex-col justify-between transition relative overflow-hidden min-h-[76px] ${borderClass}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-mono font-bold text-slate-400">{d.code}</span>
                      <div className="flex items-center gap-1">
                        {d.isEsdSafe && <span className="text-[9px] text-amber-400 font-bold" title="ESD Safe Drawer">⚡</span>}
                        <span className={`w-2 h-2 rounded-full ${indicatorColor}`} />
                      </div>
                    </div>

                    <div className="my-1 truncate">
                      <div className="text-[11px] font-bold text-white truncate">{d.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">{d.ipn}</div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{d.quantity.toLocaleString()} pcs</span>
                      {d.subDividers !== 'NONE' && (
                        <span className="text-[9px] text-indigo-300 bg-indigo-950/80 px-1 rounded">
                          {d.subDividers}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drawer Inspector Drawer */}
          <div className="w-full lg:w-80 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col">
            {selectedDrawer ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">Drawer Coordinate</span>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {selectedDrawer.code}
                      {selectedDrawer.isEsdSafe && (
                        <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800">
                          ESD Safe
                        </span>
                      )}
                    </h3>
                  </div>
                  <button
                    onClick={() => handlePrintLabel(selectedDrawer)}
                    disabled={isPrinting}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex items-center gap-1 text-[11px]"
                    title="Direct WebSerial Print Label"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                </div>

                {/* Part Specs */}
                <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">IPN:</span>
                    <span className="font-mono font-bold text-white">{selectedDrawer.ipn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name:</span>
                    <span className="text-white font-medium truncate max-w-[160px]">{selectedDrawer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quantity:</span>
                    <span className="font-mono font-bold text-emerald-400">{selectedDrawer.quantity} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Safety Stock:</span>
                    <span className="font-mono text-slate-300">{selectedDrawer.safetyStock} pcs</span>
                  </div>
                  {selectedDrawer.footprint && (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">Package:</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                        {selectedDrawer.footprint}
                      </span>
                    </div>
                  )}
                </div>

                {/* Resistor Color Band Visualizer if applicable */}
                {selectedDrawer.ipn.startsWith('RES') && (
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                      <span>EIA Resistor Color Bands</span>
                      <span className="text-[10px] font-mono text-indigo-400">4-Band Standard</span>
                    </div>
                    <div
                      className="flex items-center justify-center p-2 bg-slate-950 rounded-lg border border-slate-800"
                      dangerouslySetInnerHTML={{
                        __html: renderResistorSvg(10000, 5.0, 4, 160, 36)
                      }}
                    />
                  </div>
                )}

                {/* Sub-Bin Micro-Compartment Divider Grid */}
                {selectedDrawer.subDividers !== 'NONE' && (
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                      <span>Sub-Bin Dividers ({selectedDrawer.subDividers})</span>
                      <span className="text-[10px] text-slate-500">Click slot to target</span>
                    </div>
                    <div
                      className={`grid gap-1.5 p-2 bg-slate-950 rounded-lg border border-slate-800 ${
                        selectedDrawer.subDividers === '2x5' ? 'grid-cols-5' : 'grid-cols-3'
                      }`}
                    >
                      {Array.from({ length: selectedDrawer.subDividers === '2x5' ? 10 : 9 }).map((_, i) => {
                        const slotCode = `S-${i + 1}`;
                        const isSlotSelected = selectedSubSlot === slotCode;
                        return (
                          <button
                            key={slotCode}
                            onClick={() => setSelectedSubSlot(slotCode)}
                            className={`p-1.5 rounded text-center font-mono text-[10px] border transition ${
                              isSlotSelected
                                ? 'bg-indigo-600 text-white border-indigo-400'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {slotCode}
                          </button>
                        );
                      })}
                    </div>
                    {selectedSubSlot && (
                      <div className="text-[10px] text-indigo-300 font-mono text-center">
                        Active Sub-Compartment: <strong>{selectedDrawer.code}/{selectedSubSlot}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                <Grid className="w-8 h-8 text-slate-600" />
                <p className="text-xs">Select any drawer in the 4×6 cabinet grid to inspect specs, sub-compartments, or print labels.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
