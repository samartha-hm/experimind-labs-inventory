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
  ZoomIn,
  FileSpreadsheet
} from 'lucide-react';
import { InventoryItem, KitBOM, TransactionRecord } from '@/src/types';
import { analyzeKitting } from '@/src/utils/kitting';
import { downloadStandardPrastutiTemplateXlsx } from '@/src/utils/prastutiTemplateEngine';
import ItemImage from '@/src/shared/components/ItemImage';
import ImagePreviewModal from '@/src/shared/components/ImagePreviewModal';

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

  const [zoomItem, setZoomItem] = useState<{
    imageUrl?: string;
    title: string;
    category?: string;
    stockQty?: number;
    unit?: string;
    binLocation?: string;
  } | null>(null);

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
    <div className="space-y-6 w-full animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-100 dark:border-purple-900/50">
              <Package className="w-5 h-5" />
            </div>
            Composite Items & Assembly Kitting (BOM)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage Bill of Materials (BOM), calculate assembly capacity, and execute 1-click work orders with full owner control.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => downloadStandardPrastutiTemplateXlsx()}
            className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-bold px-4 py-2.5 rounded-2xl text-xs active:scale-95 transition-all flex items-center gap-2 cursor-pointer touch-target shadow-sm"
            title="Download official 6-column standard Excel template (8th, 9th, 10th grades)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Standard Template (.xlsx)</span>
          </button>

          {onCreateKitClick && (
            <button
              onClick={onCreateKitClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer touch-target"
            >
              <Plus className="w-4 h-4" />
              <span>Create Composite Kit</span>
            </button>
          )}
        </div>
      </div>

      {/* Kit Selector Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {kits.map((kit) => (
            <button
              key={kit.id}
              onClick={() => setSelectedKitId(kit.id)}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 touch-target ${
                selectedKitId === kit.id
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Package className="w-4 h-4" /> {kit.name}
            </button>
          ))}
        </div>

        {currentKit && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSelectedKitId(currentKit.id);
                if (onConfigureKitClick) onConfigureKitClick();
              }}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 touch-target"
            >
              <Edit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Edit BOM
            </button>
            {onDeleteKit && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete kit "${currentKit.name}"?`)) {
                    onDeleteKit(currentKit.id);
                  }
                }}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-bold rounded-xl text-xs transition-all cursor-pointer touch-target"
                title="Delete Kit"
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
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm lg:col-span-8 space-y-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 cursor-pointer relative group"
                onClick={() => {
                  setZoomItem({
                    imageUrl: currentKit.imageUrl,
                    title: currentKit.name,
                    category: 'Composite Kit Profile'
                  });
                }}
                title="Click to zoom kit image"
              >
                <ItemImage
                  src={currentKit.imageUrl}
                  alt={currentKit.name}
                  category="Composite Kit Profile"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <ZoomIn className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{currentKit.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currentKit.description || 'Standard assembly Bill of Materials'}</p>
              </div>
            </div>

            {/* Bill of Materials Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Bill of Materials Picking Checklist ({currentKit.items.length} raw parts)
              </h4>

              <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3 w-10 text-center">Pick</th>
                      <th className="p-3 w-14 text-center">Photo</th>
                      <th className="p-3">Component Name</th>
                      <th className="p-3">Required / Kit</th>
                      <th className="p-3">Available Stock</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentKit.items.map((req) => {
                      const item = inventory.find((i) => i.id === req.componentId);
                      const available = item ? item.stockQty : 0;
                      const isSufficient = available >= req.qty;
                      const isChecked = checkedItems[req.componentId] || false;
                      const itemName = item ? item.name : `Component #${req.componentId}`;

                      return (
                        <tr
                          key={req.componentId}
                          onClick={() => toggleCheck(req.componentId)}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                            isChecked ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mx-auto" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                            )}
                          </td>
                          <td className="p-2 text-center" onClick={(e) => {
                            e.stopPropagation();
                            setZoomItem({
                              imageUrl: item?.imageUrl,
                              title: itemName,
                              category: item?.category,
                              stockQty: available,
                              unit: item?.unit || 'pcs',
                              binLocation: item?.binLocation
                            });
                          }}>
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden mx-auto relative group">
                              <ItemImage
                                src={item?.imageUrl}
                                alt={itemName}
                                category={item?.category}
                                className="w-full h-full object-contain p-0.5"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <ZoomIn className="w-3 h-3" />
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            <div>
                              <span>{itemName}</span>
                              {item?.binLocation && (
                                <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-mono font-normal">
                                  Bin: {item.binLocation}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300 tabular-num">{req.qty} pcs</td>
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white tabular-num">{available} pcs</td>
                          <td className="p-3">
                            {isSufficient ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Stock Ready
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
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
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm lg:col-span-4 space-y-6 flex flex-col justify-start">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Build Kits (Pack)
              </h3>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Max Assemblable Kits</div>
                <div className="text-3xl font-black text-slate-900 dark:text-white tabular-num">{kittingAnalysis.maxKitsPossible} kits</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Based on lowest component stock availability.</p>
              </div>

              {kittingAnalysis.maxKitsPossible > 0 && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Kits to Pack & Credit:</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={kittingAnalysis.maxKitsPossible}
                      value={packQtyToExecute}
                      onChange={(e) => setPackQtyToExecute(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 tabular-num"
                    />
                    <button
                      onClick={() => onPackKits(currentKit.id, packQtyToExecute)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0 flex items-center gap-2 touch-target"
                    >
                      <Plus className="w-3.5 h-3.5" /> Build & Pack
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reduce / Unpack Kits */}
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Reduce / Unpack Kits
              </h3>

              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-100/60 dark:border-amber-900/50 space-y-2">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Assembled Kits in Stock</div>
                <div className="text-3xl font-black text-slate-900 dark:text-white tabular-num">{assembledKitItem ? assembledKitItem.stockQty : 0} kits</div>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">Disassembling will return components back to raw inventory.</p>
              </div>

              {assembledKitItem && assembledKitItem.stockQty > 0 && onUnpackKits && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-amber-700/80 dark:text-amber-400 uppercase">Kits to Reduce/Disassemble:</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={assembledKitItem.stockQty}
                      value={unpackQtyToExecute}
                      onChange={(e) => setUnpackQtyToExecute(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/60 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 tabular-num"
                    />
                    <button
                      onClick={() => onUnpackKits(currentKit.id, unpackQtyToExecute)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0 flex items-center gap-2 touch-target"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Reduce Kit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No STEM Kits available yet.</p>
          <p className="text-xs text-slate-400">Click &ldquo;Create New Kit&rdquo; above to configure a bill of materials with auto-suggestions.</p>
        </div>
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
