import React, { useState, useMemo } from 'react';
import {
  Package,
  Layers,
  Play,
  Plus,
  Settings,
  ClipboardList,
  CheckSquare,
  Square,
  AlertTriangle,
  History,
  CheckCircle2,
  Boxes,
  ArrowRight,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { InventoryItem, KitBOM, TransactionRecord } from '@/src/types';
import { analyzeKitting } from '@/src/utils/kitting';

interface KittingTabProps {
  inventory: InventoryItem[];
  kits: KitBOM[];
  selectedKitId: string;
  setSelectedKitId: (id: string) => void;
  onPackKits: (kitId: string, qty: number) => void;
  onUnpackKits?: (kitId: string, qty: number) => void;
  transactions: TransactionRecord[];
  onCreateKitClick?: () => void;
  onConfigureKitClick?: () => void;
  onDeleteKit?: (kitId: string) => void;
  onUpdateKitBOM?: (kitId: string, name: string, description: string) => void;
}

export default function KittingTab({
  inventory,
  kits,
  selectedKitId,
  setSelectedKitId,
  onPackKits,
  onUnpackKits,
  transactions,
  onCreateKitClick,
  onConfigureKitClick,
  onDeleteKit,
  onUpdateKitBOM,
}: KittingTabProps) {
  const [targetQty, setTargetQty] = useState(25);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [packQtyToExecute, setPackQtyToExecute] = useState(1);
  const [unpackQtyToExecute, setUnpackQtyToExecute] = useState(1);


  const currentKit = useMemo(() => {
    if (kits.length === 0) return null;
    return kits.find((k) => k.id === selectedKitId) || kits[0];
  }, [kits, selectedKitId]);

  const assembledKitItem = useMemo(() => {
    if (!currentKit) return null;
    return inventory.find(i => i.assignedKitName === currentKit.name) || null;
  }, [currentKit, inventory]);

  const kittingAnalysis = useMemo(() => {
    if (!currentKit) return { maxKitsPossible: 0, bottlenecks: [], missingComponents: [] };
    return analyzeKitting(inventory, currentKit, targetQty);
  }, [inventory, currentKit, targetQty]);

  React.useEffect(() => {
    if (packQtyToExecute > kittingAnalysis.maxKitsPossible && kittingAnalysis.maxKitsPossible > 0) {
      setPackQtyToExecute(kittingAnalysis.maxKitsPossible);
    }
  }, [kittingAnalysis.maxKitsPossible, packQtyToExecute]);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };



  return (
    <div className="space-y-6 w-full">
      {/* Top Banner */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-indigo-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100/80">
              <Package className="w-5 h-5" />
            </div>
            Composite Items & Assembly Kitting (BOM)
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage Bill of Materials (BOM), calculate assembly capacity, and execute 1-click work orders with full owner control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onCreateKitClick && (
            <button
              onClick={onCreateKitClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Composite Kit</span>
            </button>
          )}
        </div>
      </div>

      {/* Kit Selector Bar */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {kits.map((kit) => (
            <button
              key={kit.id}
              onClick={() => setSelectedKitId(kit.id)}
              className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                selectedKitId === kit.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Package className="w-4 h-4" /> {kit.name}
            </button>
          ))}
        </div>

        {currentKit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedKitId(currentKit.id);
                if (onConfigureKitClick) onConfigureKitClick();
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Edit2 className="w-4 h-4 text-indigo-600" /> Edit BOM
            </button>
            {onDeleteKit && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete kit "${currentKit.name}"?`)) {
                    onDeleteKit(currentKit.id);
                  }
                }}
                className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Kitting Workspace */}
      {currentKit ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: BOM Requirements & Picking List */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-indigo-500/5 lg:col-span-8 space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">{currentKit.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{currentKit.description}</p>
            </div>

            {/* Bill of Materials Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" /> Bill of Materials Picking Checklist ({currentKit.items.length} raw parts)
              </h4>

              <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3 w-10 text-center">Pick</th>
                      <th className="p-3">Component Name</th>
                      <th className="p-3">Required / Kit</th>
                      <th className="p-3">Available Stock</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentKit.items.map((req) => {
                      const item = inventory.find((i) => i.id === req.componentId);
                      const available = item ? item.stockQty : 0;
                      const isSufficient = available >= req.qty;
                      const isChecked = checkedItems[req.componentId] || false;

                      return (
                        <tr
                          key={req.componentId}
                          onClick={() => toggleCheck(req.componentId)}
                          className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                            isChecked ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 mx-auto" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 mx-auto" />
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {item ? item.name : `Component #${req.componentId}`}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-700">{req.qty} pcs</td>
                          <td className="p-3 font-mono font-bold text-slate-900">{available} pcs</td>
                          <td className="p-3">
                            {isSufficient ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                Stock Ready
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                                Shortage
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Execution Work Order */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-indigo-500/5 lg:col-span-4 space-y-6 flex flex-col justify-start">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-600" /> Build Kits (Pack)
              </h3>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">Max Assemblable Kits</div>
                <div className="text-3xl font-black text-slate-900">{kittingAnalysis.maxKitsPossible} kits</div>
                <p className="text-[11px] text-slate-500">Based on lowest component stock availability.</p>
              </div>

              {kittingAnalysis.maxKitsPossible > 0 && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Kits to Pack & Credit:</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={kittingAnalysis.maxKitsPossible}
                      value={packQtyToExecute}
                      onChange={(e) => setPackQtyToExecute(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
                    />
                    <button
                      onClick={() => onPackKits(currentKit.id, packQtyToExecute)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer shrink-0 flex items-center gap-2"
                    >
                      <Plus className="w-3 h-3" /> Build & Pack
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reduce / Unpack Kits */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" /> Reduce / Unpack Kits
              </h3>

              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/60 space-y-2">
                <div className="text-xs font-bold text-amber-600 uppercase">Assembled Kits in Stock</div>
                <div className="text-3xl font-black text-slate-900">{assembledKitItem ? assembledKitItem.stockQty : 0} kits</div>
                <p className="text-[11px] text-amber-700/70">Disassembling will return components back to raw inventory.</p>
              </div>

              {assembledKitItem && assembledKitItem.stockQty > 0 && onUnpackKits && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-amber-700/70 uppercase">Kits to Reduce/Disassemble:</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={assembledKitItem.stockQty}
                      value={unpackQtyToExecute}
                      onChange={(e) => setUnpackQtyToExecute(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
                    />
                    <button
                      onClick={() => onUnpackKits(currentKit.id, unpackQtyToExecute)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer shrink-0 flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" /> Reduce Kit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
          No composite kits defined. Click "Create Composite Kit" to build a new Bill of Materials.
        </div>
      )}


    </div>
  );
}
