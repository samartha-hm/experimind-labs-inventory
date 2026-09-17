import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Cpu,
  Layers,
  Search,
  Filter,
  Plus,
  Minus,
  Scissors,
  Printer,
  Clock,
  Flame,
  FileText,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Package,
  Boxes,
  Zap,
  Tag,
  ArrowDownUp,
  RefreshCw,
  SlidersHorizontal,
  Grid,
  GitFork,
} from "lucide-react";
import { apiFetch } from "../../utils/api.ts";
import { useToast } from "../../contexts/ToastContext.tsx";
import { ZplPrintService } from "../../services/ZplPrintService.ts";
import SmartSelect from "@/src/shared/components/SmartSelect";
import CabinetDrawerMatrixModal from "../warehouse/components/CabinetDrawerMatrixModal.tsx";
import TraceabilityModal from "../warehouse/components/TraceabilityModal.tsx";

interface HardwareComponent {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  mpn?: string;
  manufacturer?: string;
  package_footprint?: string;
  mounting_type?: string;
  msl_rating?: string;
  parametric_specs?: Record<string, any>;
  datasheet_url?: string;
  pinout_diagram_url?: string;
  quantity: number;
  threshold: number;
  base_price: number;
  bin_location?: string;
  activeReelCount?: number;
  lots?: Array<{
    id: string;
    lot_number: string;
    package_type: string;
    current_quantity: number;
    floor_life_seconds_remaining?: number;
    msl_open_timestamp?: string;
    feeder_slot?: string;
    tape_width?: string;
    reel_diameter?: string;
  }>;
}

export default function HardwareWorkbenchTab() {
  const { showToast } = useToast();
  const [components, setComponents] = useState<HardwareComponent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFootprint, setSelectedFootprint] = useState<string>("ALL");
  const [selectedMounting, setSelectedMounting] = useState<string>("ALL");
  const [selectedMsl, setSelectedMsl] = useState<string>("ALL");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Modals & Drawers
  const [selectedComponent, setSelectedComponent] = useState<HardwareComponent | null>(null);
  const [splitLotModalOpen, setSplitLotModalOpen] = useState<boolean>(false);
  const [selectedLotForSplit, setSelectedLotForSplit] = useState<any>(null);
  const [splitQty, setSplitQty] = useState<number>(50);
  const [targetPackageType, setTargetPackageType] = useState<string>("CUT_TAPE");
  const [targetFeederSlot, setTargetFeederSlot] = useState<string>("");
  const [isSplitting, setIsSplitting] = useState<boolean>(false);

  // MSL Bake Modal
  const [mslModalOpen, setMslModalOpen] = useState<boolean>(false);
  const [selectedLotForMsl, setSelectedLotForMsl] = useState<any>(null);
  const [bakeTemp, setBakeTemp] = useState<number>(125);
  const [bakeHours, setBakeHours] = useState<number>(24);

  // Top 1% Innovation Modals
  const [cabinetModalOpen, setCabinetModalOpen] = useState<boolean>(false);
  const [traceabilityModalOpen, setTraceabilityModalOpen] = useState<boolean>(false);

  const footprints = ["ALL", "0402", "0603", "0805", "1206", "QFN-32", "SOIC-8", "SOT-23", "DIP-8", "MODULE"];

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedFootprint !== "ALL") params.append("footprint", selectedFootprint);
      if (selectedMounting !== "ALL") params.append("mountingType", selectedMounting);
      if (selectedMsl !== "ALL") params.append("mslRating", selectedMsl);
      if (inStockOnly) params.append("inStockOnly", "true");

      const res = await apiFetch(`/api/v1/hardware/workbench?${params.toString()}`);
      if (res && res.success) {
        setComponents(res.data || []);
        if (res.data && res.data.length > 0 && !selectedComponent) {
          setSelectedComponent(res.data[0]);
        }
      }
    } catch (err: any) {
      showToast("error", "Failed to fetch hardware components: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedFootprint, selectedMounting, selectedMsl, inStockOnly, showToast]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  // Keyboard navigation hotkeys (J / K / Space / P / S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(components.length - 1, prev + 1);
          setSelectedComponent(components[next] || null);
          return next;
        });
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(0, prev - 1);
          setSelectedComponent(components[next] || null);
          return next;
        });
      } else if (e.key === "p" && selectedComponent) {
        e.preventDefault();
        handlePrintLabel(selectedComponent);
      } else if (e.key === "s" && selectedComponent && selectedComponent.lots && selectedComponent.lots.length > 0) {
        e.preventDefault();
        const reelLot = selectedComponent.lots.find((l) => l.package_type === "FULL_REEL") || selectedComponent.lots[0];
        if (reelLot) {
          setSelectedLotForSplit(reelLot);
          setSplitLotModalOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [components, selectedComponent]);

  const handlePrintLabel = (comp: HardwareComponent) => {
    try {
      const zpl = ZplPrintService.generateItemLabelZpl({
        itemName: comp.name,
        sku: comp.sku,
        binLocation: comp.bin_location || "BENCH-01",
        barcodeValue: comp.mpn || comp.sku,
      });

      const blob = new Blob([zpl], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${comp.sku}_ZPL_Label.zpl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast("success", `Generated Zebra ZPL-II label for ${comp.sku}`);
    } catch (err: any) {
      showToast("error", "Failed to print ZPL label: " + err.message);
    }
  };

  const handleExecuteReelSplit = async () => {
    if (!selectedLotForSplit) return;
    setIsSplitting(true);
    try {
      const res = await apiFetch(`/api/v1/hardware/lots/${selectedLotForSplit.id}/split`, {
        method: "POST",
        body: JSON.stringify({
          splitQuantity: splitQty,
          targetPackageType,
          targetFeederSlot: targetFeederSlot || undefined,
        }),
      });

      if (res && res.success) {
        showToast("success", `Split ${splitQty} pcs into ${res.data.childLot.lot_number}`);
        setSplitLotModalOpen(false);
        fetchComponents();
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to split reel.");
    } finally {
      setIsSplitting(false);
    }
  };

  const handleMslAction = async (lotId: string, action: "OPEN" | "SEAL" | "BAKE") => {
    try {
      const body: any = { action };
      if (action === "BAKE") {
        body.bakeTempC = bakeTemp;
        body.bakeHours = bakeHours;
      }

      const res = await apiFetch(`/api/v1/hardware/lots/${lotId}/msl-action`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res && res.success) {
        showToast("success", `MSL action [${action}] applied successfully.`);
        setMslModalOpen(false);
        fetchComponents();
      }
    } catch (err: any) {
      showToast("error", err.message || "MSL operation failed.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Hotkey Guide */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 shadow-xl shadow-indigo-950/10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Cpu className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Hardware & Electronics Workbench</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                High-Density Grid
              </span>
            </div>
            <p className="text-sm text-slate-400">
              SMD reels, cut-tape fractionation, MSL floor life countdowns & ECAD parametric search.
            </p>
          </div>
        </div>

        {/* Hotkey Chips & Innovation Action Triggers */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCabinetModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
          >
            <Grid className="w-3.5 h-3.5 text-indigo-400" />
            2D Cabinet Matrix
          </button>
          <button
            onClick={() => setTraceabilityModalOpen(true)}
            className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
          >
            <GitFork className="w-3.5 h-3.5 text-cyan-400" />
            Recall Traceability
          </button>
          <span className="text-xs text-slate-500 font-medium mx-1">|</span>
          <span className="text-xs text-slate-400 font-medium mr-1">Hotkeys:</span>
          <kbd className="px-2 py-1 text-xs font-mono bg-slate-800 border border-slate-700 rounded text-slate-300 shadow">
            J / K (Nav)
          </kbd>
          <kbd className="px-2 py-1 text-xs font-mono bg-slate-800 border border-slate-700 rounded text-slate-300 shadow">
            P (Print ZPL)
          </kbd>
          <kbd className="px-2 py-1 text-xs font-mono bg-slate-800 border border-slate-700 rounded text-slate-300 shadow">
            S (Split Reel)
          </kbd>
        </div>
      </div>

      {/* Parametric Filters & Search */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search MPN (e.g. ESP32, 0603, CH340, STM32)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <div className="w-44">
              <SmartSelect
                value={selectedMounting}
                onChange={setSelectedMounting}
                size="sm"
                options={[
                  { value: 'ALL', label: 'All Mounting' },
                  { value: 'SMD', label: 'Surface Mount (SMD)' },
                  { value: 'THT', label: 'Through-Hole (THT)' },
                  { value: 'CHASSIS', label: 'Chassis / Panel' },
                ]}
                placeholder="Mounting Type"
                aria-label="Mounting type filter"
              />
            </div>

            <div className="w-44">
              <SmartSelect
                value={selectedMsl}
                onChange={setSelectedMsl}
                size="sm"
                options={[
                  { value: 'ALL', label: 'All MSL Ratings' },
                  { value: 'MSL 1', label: 'MSL 1 (Unlimited)' },
                  { value: 'MSL 2', label: 'MSL 2 (1 Year)' },
                  { value: 'MSL 2a', label: 'MSL 2a (4 Weeks)' },
                  { value: 'MSL 3', label: 'MSL 3 (168 Hours)' },
                  { value: 'MSL 4', label: 'MSL 4 (72 Hours)' },
                  { value: 'MSL 5', label: 'MSL 5 (48 Hours)' },
                  { value: 'MSL 5a', label: 'MSL 5a (24 Hours)' },
                  { value: 'MSL 6', label: 'MSL 6 (Bake Before Use)' },
                ]}
                placeholder="MSL Rating"
                aria-label="Moisture sensitivity level filter"
              />
            </div>

            <button
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                inStockOnly
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-700 hover:text-white"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              In Stock Only
            </button>

            <button
              onClick={() => fetchComponents()}
              title="Refresh inventory components list"
              className="p-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Footprint Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mr-2">Footprint:</span>
          {footprints.map((fp) => (
            <button
              key={fp}
              onClick={() => setSelectedFootprint(fp)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition ${
                selectedFootprint === fp
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {fp}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid & Quick Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: High-Density Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">Component Catalog</span>
              <span className="px-2 py-0.5 text-xs font-mono bg-slate-800 text-slate-300 rounded-full">
                {components.length} parts
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[640px] overflow-y-auto divide-y divide-slate-800/60">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md text-slate-400 font-semibold border-b border-slate-800 z-10">
                <tr>
                  <th className="py-3 px-4">MPN / Name</th>
                  <th className="py-3 px-3">Footprint</th>
                  <th className="py-3 px-3">Mounting</th>
                  <th className="py-3 px-3">MSL</th>
                  <th className="py-3 px-3 text-right">Stock</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                      Loading hardware electronics workbench...
                    </td>
                  </tr>
                ) : components.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No electronic components found matching criteria.
                    </td>
                  </tr>
                ) : (
                  components.map((comp, idx) => {
                    const isSelected = selectedComponent?.id === comp.id;
                    const isLowStock = comp.quantity <= (comp.threshold || 5);
                    const isOutOfStock = comp.quantity <= 0;

                    return (
                      <tr
                        key={comp.id}
                        onClick={() => {
                          setSelectedComponent(comp);
                          setSelectedIndex(idx);
                        }}
                        className={`cursor-pointer transition hover:bg-indigo-950/30 ${
                          isSelected ? "bg-indigo-950/50 border-l-4 border-indigo-500" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-sans font-semibold text-white truncate max-w-[200px]">
                            {comp.mpn || comp.sku}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[220px] font-sans">
                            {comp.name}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700/60">
                            {comp.package_footprint || "OTHER"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              comp.mounting_type === "SMD"
                                ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                                : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            }`}
                          >
                            {comp.mounting_type || "SMD"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              comp.msl_rating === "MSL 1"
                                ? "bg-emerald-500/10 text-emerald-300"
                                : comp.msl_rating?.startsWith("MSL 2")
                                ? "bg-blue-500/10 text-blue-300"
                                : "bg-rose-500/10 text-rose-300"
                            }`}
                          >
                            {comp.msl_rating || "MSL 1"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`font-bold ${
                              isOutOfStock
                                ? "text-rose-400"
                                : isLowStock
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {comp.quantity.toLocaleString()} {comp.unit || "pcs"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handlePrintLabel(comp)}
                              title="Print Zebra ZPL label (P)"
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {comp.lots && comp.lots.length > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedLotForSplit(comp.lots![0]);
                                  setSplitLotModalOpen(true);
                                }}
                                title="Split Reel into Cut-Tape (S)"
                                className="p-1.5 hover:bg-indigo-900/50 text-indigo-400 hover:text-indigo-300 rounded-lg transition"
                              >
                                <Scissors className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Component Inspector & MSL Tracker */}
        <div className="space-y-6">
          {selectedComponent ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold font-mono text-indigo-400">{selectedComponent.sku}</span>
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedComponent.mpn || selectedComponent.name}</h3>
                  <p className="text-xs text-slate-400">{selectedComponent.manufacturer || "Generic Manufacturer"}</p>
                </div>
                <button
                  onClick={() => handlePrintLabel(selectedComponent)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Label
                </button>
              </div>

              {/* Parametric Specs Tag Cloud */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parametric Specs</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-mono">
                    FP: {selectedComponent.package_footprint || "0603"}
                  </span>
                  <span className="px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-mono">
                    Mount: {selectedComponent.mounting_type || "SMD"}
                  </span>
                  <span className="px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-mono">
                    MSL: {selectedComponent.msl_rating || "MSL 1"}
                  </span>
                  {selectedComponent.parametric_specs &&
                    Object.entries(selectedComponent.parametric_specs).map(([key, val]) => (
                      <span key={key} className="px-2 py-1 text-xs bg-indigo-950/60 border border-indigo-800/40 rounded-lg text-indigo-300 font-mono">
                        {key}: {String(val)}
                      </span>
                    ))}
                </div>
              </div>

              {/* Active Lots & Reel Pedigree */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Lots & Reels</span>
                  <span className="text-xs text-slate-500">{(selectedComponent.lots || []).length} lots</span>
                </div>

                {(!selectedComponent.lots || selectedComponent.lots.length === 0) ? (
                  <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl text-center text-xs text-slate-500">
                    No active reel lots provisioned for this component.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {selectedComponent.lots.map((lot) => {
                      const isReel = lot.package_type === "FULL_REEL";
                      return (
                        <div
                          key={lot.id}
                          className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white">{lot.lot_number}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  isReel ? "bg-purple-500/20 text-purple-300" : "bg-cyan-500/20 text-cyan-300"
                                }`}
                              >
                                {lot.package_type}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              Qty: <strong className="text-emerald-400">{lot.current_quantity} pcs</strong>
                              {lot.feeder_slot && ` • Feeder: ${lot.feeder_slot}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isReel && (
                              <button
                                onClick={() => {
                                  setSelectedLotForSplit(lot);
                                  setSplitLotModalOpen(true);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition"
                              >
                                Split
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedLotForMsl(lot);
                                setMslModalOpen(true);
                              }}
                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded-lg transition"
                              title="MSL Lifecycle"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Datasheet Links */}
              {selectedComponent.datasheet_url && (
                <a
                  href={selectedComponent.datasheet_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Technical Datasheet PDF
                </a>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              Select a component to inspect technical specs, active reels, and MSL floor life.
            </div>
          )}
        </div>
      </div>

      {/* Reel Fractionation Modal */}
      {splitLotModalOpen && selectedLotForSplit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reel Fractionation</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedLotForSplit.lot_number}</p>
                </div>
              </div>
              <button
                onClick={() => setSplitLotModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Available Reel Quantity:</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {selectedLotForSplit.current_quantity} pcs
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Split Cut-Tape Quantity (pcs)</label>
                <input
                  type="number"
                  min={1}
                  max={selectedLotForSplit.current_quantity}
                  value={splitQty}
                  onChange={(e) => setSplitQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Target Package Format</label>
                <SmartSelect
                  value={targetPackageType}
                  onChange={setTargetPackageType}
                  options={[
                    { value: 'CUT_TAPE', label: 'Cut-Tape Strip' },
                    { value: 'SAMPLE_BOX', label: 'Lab Sample Box / Tube' },
                    { value: 'TRAY', label: 'Matrix JEDEC Tray' },
                    { value: 'BULK_BAG', label: 'ESD Bulk Bag' },
                  ]}
                  placeholder="Select format..."
                  aria-label="Target Package Format"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Target Feeder Slot (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. F-04B"
                  value={targetFeederSlot}
                  onChange={(e) => setTargetFeederSlot(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSplitLotModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReelSplit}
                disabled={isSplitting || splitQty <= 0 || splitQty > selectedLotForSplit.current_quantity}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                {isSplitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                Confirm Fractionation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MSL Floor Life / Bake Cycle Modal */}
      {mslModalOpen && selectedLotForMsl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">MSL Moisture Control</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedLotForMsl.lot_number}</p>
                </div>
              </div>
              <button onClick={() => setMslModalOpen(false)} className="text-slate-400 hover:text-white text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleMslAction(selectedLotForMsl.id, "OPEN")}
                className="p-3 bg-slate-950 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition space-y-1"
              >
                <div className="text-xs font-bold text-amber-300">Open Moisture Bag</div>
                <div className="text-[11px] text-slate-400">Start exposure countdown timer</div>
              </button>

              <button
                onClick={() => handleMslAction(selectedLotForMsl.id, "SEAL")}
                className="p-3 bg-slate-950 hover:bg-cyan-950/30 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition space-y-1"
              >
                <div className="text-xs font-bold text-cyan-300">Reseal into MBB</div>
                <div className="text-[11px] text-slate-400">Pause exposure timer with desiccant</div>
              </button>
            </div>

            {/* JEDEC Bake Parameters */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                <Flame className="w-4 h-4 text-rose-400" />
                Execute J-STD-033D Bake Cycle
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Temperature (°C)</label>
                  <input
                    type="number"
                    value={bakeTemp}
                    onChange={(e) => setBakeTemp(parseInt(e.target.value, 10) || 125)}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Duration (Hours)</label>
                  <input
                    type="number"
                    value={bakeHours}
                    onChange={(e) => setBakeHours(parseInt(e.target.value, 10) || 24)}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              <button
                onClick={() => handleMslAction(selectedLotForMsl.id, "BAKE")}
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow"
              >
                <Flame className="w-3.5 h-3.5" />
                Execute Bake & Reset Floor Life
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2D Cabinet & Drawer Matrix Visualizer Modal */}
      <CabinetDrawerMatrixModal
        isOpen={cabinetModalOpen}
        onClose={() => setCabinetModalOpen(false)}
        cabinetName="CAB-01 (SMT Lab Bench)"
        initialSearchQuery={selectedComponent?.mpn || selectedComponent?.sku || ""}
      />

      {/* Bidirectional Component Traceability & Instant Recall Modal */}
      <TraceabilityModal
        isOpen={traceabilityModalOpen}
        onClose={() => setTraceabilityModalOpen(false)}
        initialQuery={selectedComponent?.mpn || "LOT-LCSC-2026-ESP32"}
      />
    </div>
  );
}
