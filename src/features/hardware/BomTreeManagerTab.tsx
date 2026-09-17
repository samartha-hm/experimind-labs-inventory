import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Cpu,
  Plus,
  Trash2,
  Edit2,
  FileCode,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Boxes,
  Zap,
  Tag,
  Percent,
  RefreshCw,
  Calculator,
  ExternalLink,
  Download,
  ShoppingCart,
} from "lucide-react";
import { apiFetch } from "../../utils/api.ts";
import { useToast } from "../../contexts/ToastContext.tsx";
import SmartSelect from "@/src/shared/components/SmartSelect";

interface AssemblyItem {
  id: string;
  sku: string;
  name: string;
  mpn?: string;
  category?: string;
  quantity: number;
}

interface TreeNode {
  id: string;
  bomNodeId?: string;
  itemId: string;
  sku: string;
  name: string;
  mpn?: string;
  packageFootprint?: string;
  mountingType?: string;
  mslRating?: string;
  unitCost: number;
  quantityPerAssembly: number;
  scrapPercentage: number;
  effectiveQuantity: number;
  referenceDesignators: string[];
  assemblyPhase: string;
  doNotPopulate: boolean;
  notes?: string;
  level: number;
  path: string[];
  currentStock: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  extendedCost: number;
  alternates: Array<{
    id: string;
    alternateItemId: string;
    sku: string;
    name: string;
    mpn?: string;
    currentStock: number;
    preferenceRank: number;
    approvalStatus: string;
  }>;
  children: TreeNode[];
}

export default function BomTreeManagerTab() {
  const { showToast } = useToast();
  const [assemblies, setAssemblies] = useState<AssemblyItem[]>([]);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string>("");
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [rootItem, setRootItem] = useState<any>(null);
  const [totalAssemblyCost, setTotalAssemblyCost] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  // CAD Ingestion Modal
  const [cadModalOpen, setCadModalOpen] = useState<boolean>(false);
  const [cadCsvInput, setCadCsvInput] = useState<string>("");
  const [parsedCadResult, setParsedCadResult] = useState<any>(null);
  const [isParsingCad, setIsParsingCad] = useState<boolean>(false);
  const [isCommittingCad, setIsCommittingCad] = useState<boolean>(false);

  // Shortage Simulator
  const [batchQuantity, setBatchQuantity] = useState<number>(100);
  const [shortageResult, setShortageResult] = useState<any>(null);
  const [isAnalyzingShortage, setIsAnalyzingShortage] = useState<boolean>(false);

  // Fetch all parent assemblies (items marked as subassembly, composite kit, or PCBA)
  useEffect(() => {
    const fetchAssemblies = async () => {
      try {
        const res = await apiFetch("/api/v1/inventory?limit=500");
        if (res) {
          const list = Array.isArray(res) ? res : res.data || [];
          setAssemblies(list);
          if (list.length > 0 && !selectedAssemblyId) {
            setSelectedAssemblyId(list[0].id);
          }
        }
      } catch (err: any) {
        showToast("error", "Failed to fetch inventory assemblies: " + err.message);
      }
    };
    fetchAssemblies();
  }, []);

  // Fetch Tree for selected assembly
  const fetchTree = async (assemblyId: string) => {
    if (!assemblyId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/bom/tree/${assemblyId}`);
      if (res && res.success) {
        setTreeData(res.data.tree || []);
        setRootItem(res.data.rootItem || null);
        setTotalAssemblyCost(res.data.totalAssemblyCost || 0);

        // Auto-expand top level nodes
        const initialExpanded = new Set<string>();
        const traverse = (nodes: TreeNode[]) => {
          nodes.forEach((n) => {
            initialExpanded.add(n.id);
            if (n.children) traverse(n.children);
          });
        };
        traverse(res.data.tree || []);
        setExpandedNodeIds(initialExpanded);
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to resolve BOM tree.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAssemblyId) {
      fetchTree(selectedAssemblyId);
      runShortageAnalysis(selectedAssemblyId, batchQuantity);
    }
  }, [selectedAssemblyId]);

  const toggleExpand = (nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleParseCad = async () => {
    if (!cadCsvInput.trim()) return;
    setIsParsingCad(true);
    try {
      const res = await apiFetch("/api/v1/bom/ingest-cad", {
        method: "POST",
        body: JSON.stringify({
          csvContent: cadCsvInput,
          parentItemId: selectedAssemblyId,
        }),
      });

      if (res && res.success) {
        setParsedCadResult(res.data);
        showToast("success", `Parsed ${res.data.totalComponents} components (${res.data.format} format)`);
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to parse CAD CSV.");
    } finally {
      setIsParsingCad(false);
    }
  };

  const handleCommitCad = async () => {
    if (!parsedCadResult || !selectedAssemblyId) return;
    setIsCommittingCad(true);
    try {
      const res = await apiFetch("/api/v1/bom/commit-cad", {
        method: "POST",
        body: JSON.stringify({
          parentItemId: selectedAssemblyId,
          rows: parsedCadResult.rows,
          createMissingItems: true,
        }),
      });

      if (res && res.success) {
        showToast("success", res.message || "BOM successfully committed from CAD!");
        setCadModalOpen(false);
        setCadCsvInput("");
        setParsedCadResult(null);
        fetchTree(selectedAssemblyId);
        runShortageAnalysis(selectedAssemblyId, batchQuantity);
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to commit CAD BOM.");
    } finally {
      setIsCommittingCad(false);
    }
  };

  const runShortageAnalysis = async (assemblyId: string, qty: number) => {
    if (!assemblyId) return;
    setIsAnalyzingShortage(true);
    try {
      const res = await apiFetch(`/api/v1/bom/shortage-analysis/${assemblyId}?quantity=${qty}`);
      if (res && res.success) {
        setShortageResult(res.data);
      }
    } catch (err: any) {
      // Non-blocking
    } finally {
      setIsAnalyzingShortage(false);
    }
  };

  const handleExportVendorPo = async (vendor: "LCSC" | "ROBU" | "MOUSER") => {
    if (!shortageResult || !shortageResult.shortages || shortageResult.shortages.length === 0) {
      showToast("error", "No component shortages to export.");
      return;
    }
    try {
      const res = await apiFetch("/api/v1/bom/vendor-po-export", {
        method: "POST",
        body: JSON.stringify({
          shortages: shortageResult.shortages,
          vendor,
          itemId: selectedAssemblyId,
          quantity: batchQuantity,
        }),
      });

      if (res && res.success && res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.filename || `PO_${vendor}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("success", `Downloaded ${vendor} Purchase Order CSV (${res.count} items).`);
      } else {
        showToast("error", "Failed to generate vendor PO: " + (res?.error || "Empty result"));
      }
    } catch (err: any) {
      showToast("error", "Export failed: " + err.message);
    }
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TreeNode) => {
    const isExpanded = expandedNodeIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-center justify-between p-3 rounded-xl border transition ${
            node.doNotPopulate
              ? "bg-slate-950/40 border-slate-800 text-slate-500 opacity-60"
              : "bg-slate-900 border-slate-800/80 hover:border-slate-700 text-slate-200"
          }`}
          style={{ marginLeft: `${(node.level - 1) * 24}px` }}
        >
          {/* Left: Node Information */}
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(node.id)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-6" />
            )}

            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
              <Cpu className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{node.mpn || node.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700/60">
                  {node.packageFootprint || "0603"}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-300">
                  {node.assemblyPhase}
                </span>
                {node.doNotPopulate && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                    DNP
                  </span>
                )}
              </div>

              {/* Reference Designators */}
              {node.referenceDesignators && node.referenceDesignators.length > 0 && (
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Ref: <span className="text-indigo-300">{node.referenceDesignators.join(", ")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Quantity, Scrap, Cost & Stock Status */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <div className="text-slate-200">
                <strong>{node.quantityPerAssembly}</strong> pcs
                {node.scrapPercentage > 0 && (
                  <span className="text-amber-400 text-[11px] ml-1.5">(+{node.scrapPercentage}% scrap)</span>
                )}
              </div>
              <div className="text-slate-500 text-[10px]">₹{node.unitCost.toFixed(2)}/ea</div>
            </div>

            {/* Stock Badge */}
            <div className="w-28 text-right">
              {node.stockStatus === "IN_STOCK" ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {node.currentStock} in stock
                </span>
              ) : node.stockStatus === "LOW_STOCK" ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {node.currentStock} low
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  0 out of stock
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Children Render */}
        {isExpanded && hasChildren && (
          <div className="space-y-1">{node.children.map((child) => renderTreeNode(child))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Recursive PCBA BOM & CAD Engine</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                Multi-Level Tree
              </span>
            </div>
            <p className="text-sm text-slate-400">
              PostgreSQL Recursive CTE resolution, Altium / KiCad CSV ingestion, scrap compounding & production feasibility.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCadModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <UploadCloud className="w-4 h-4" />
            Ingest CAD BOM (CSV)
          </button>
        </div>
      </div>

      {/* Assembly Selector & Cost Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Assembly / PCBA</label>
          <SmartSelect
            value={selectedAssemblyId}
            onChange={setSelectedAssemblyId}
            options={assemblies.map((item) => ({
              value: item.id,
              label: `${item.sku} — ${item.name}`,
            }))}
            placeholder="Choose Assembly..."
            aria-label="Select Assembly / PCBA"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Rolled-Up Unit Cost</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">₹{totalAssemblyCost.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">BOM Line Items</div>
            <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">{treeData.length} lines</div>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Boxes className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tree Explorer & Shortage Simulator Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Hierarchical Tree */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">Hierarchical Assembly Tree</span>
            </div>
            <button
              onClick={() => fetchTree(selectedAssemblyId)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Tree
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto overflow-x-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                Resolving recursive PostgreSQL CTE assembly tree...
              </div>
            ) : treeData.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No BOM components mapped to this assembly. Click "Ingest CAD BOM" above to import from KiCad or Altium.
              </div>
            ) : (
              treeData.map((node) => renderTreeNode(node))
            )}
          </div>
        </div>

        {/* Right 1 Col: Production Shortage Feasibility Simulator */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Production Feasibility</span>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono bg-slate-800 text-slate-300 rounded-full">
              Simulator
            </span>
          </div>

          {/* Batch Size Input */}
          <div className="space-y-2 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Target Production Batch:</span>
              <span className="font-mono font-bold text-white">{batchQuantity} units</span>
            </div>
            <input
              type="range"
              min={10}
              max={1000}
              step={10}
              value={batchQuantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setBatchQuantity(val);
                runShortageAnalysis(selectedAssemblyId, val);
              }}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Feasibility Summary */}
          {shortageResult && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  !shortageResult.hasShortage
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : shortageResult.criticalShortageCount === 0
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {!shortageResult.hasShortage ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                )}
                <div className="text-xs">
                  <div className="font-bold">
                    {!shortageResult.hasShortage
                      ? "100% Ready for Production"
                      : `${shortageResult.shortages.length} Component Shortages Detected`}
                  </div>
                  <div className="text-[11px] opacity-80">
                    {shortageResult.criticalShortageCount > 0
                      ? `${shortageResult.criticalShortageCount} critical parts without available alternates.`
                      : "All shortages can be covered by approved drop-in alternates."}
                  </div>
                </div>
              </div>

              {/* Shortage List */}
              {shortageResult.shortages.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {shortageResult.shortages.map((s: any) => (
                    <div
                      key={s.itemId}
                      className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate max-w-[160px]">{s.mpn || s.name}</span>
                        <span className="text-rose-400 font-mono font-bold">-{s.missingQuantity} pcs</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Need: {s.requiredQuantity}</span>
                        <span>Stock: {s.currentStock}</span>
                      </div>
                      {s.suggestedAlternate && (
                        <div className="p-1.5 bg-indigo-950/40 border border-indigo-800/30 rounded text-[10px] text-indigo-300">
                          Alternate: <strong>{s.suggestedAlternate.name}</strong> ({s.suggestedAlternate.currentStock} in stock)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 1-Click Sourcing PO Generator */}
              {shortageResult.shortages.length > 0 && (
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-indigo-400" />
                      1-Click Sourcing PO Export
                    </span>
                    <span className="text-[10px] text-slate-400">Vendor CSVs</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleExportVendorPo("LCSC")}
                      className="px-2 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition"
                      title="Generate LCSC PO CSV with MPN, Package & Shortage Qty"
                    >
                      <Download className="w-3 h-3" />
                      LCSC PO
                    </button>
                    <button
                      onClick={() => handleExportVendorPo("ROBU")}
                      className="px-2 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition"
                      title="Generate Robu.in CSV with SKU, Product & Shortage Qty"
                    >
                      <Download className="w-3 h-3" />
                      Robu.in PO
                    </button>
                    <button
                      onClick={() => handleExportVendorPo("MOUSER")}
                      className="px-2 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition"
                      title="Generate Mouser India CSV with MPN & Shortage Qty"
                    >
                      <Download className="w-3 h-3" />
                      Mouser PO
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CAD BOM Ingestion Modal */}
      {cadModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ingest CAD Bill of Materials (BOM)</h3>
                  <p className="text-xs text-slate-400">KiCad, Altium Designer, EasyEDA & CSV with Designator Expansion</p>
                </div>
              </div>
              <button onClick={() => setCadModalOpen(false)} className="text-slate-400 hover:text-white text-lg font-bold">
                ✕
              </button>
            </div>

            {/* Paste CSV Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Paste CAD CSV / TSV Content</label>
              <textarea
                rows={6}
                value={cadCsvInput}
                onChange={(e) => setCadCsvInput(e.target.value)}
                placeholder={`"Designator","Package","Quantity","Designation","Supplier and ref"\n"R1-R4","0603","4","10k 1%","RC0603FR-0710KL"\n"C1, C2","0805","2","100nF 50V","CL21B104KBCNNNC"\n"U1","SOIC-8","1","AT24C256C","AT24C256C-SSHL-T"`}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleParseCad}
                  disabled={isParsingCad || !cadCsvInput.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isParsingCad ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Parse & Expand Designators
                </button>
              </div>
            </div>

            {/* Parsed Preview Table */}
            {parsedCadResult && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Format Detected:</span>
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 rounded">
                      {parsedCadResult.format}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({parsedCadResult.totalComponents} total parts, {parsedCadResult.totalUniqueLines} unique lines)
                    </span>
                  </div>
                </div>

                <div className="max-h-56 overflow-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Designators</th>
                        <th className="py-2.5 px-2">Qty</th>
                        <th className="py-2.5 px-3">MPN / Value</th>
                        <th className="py-2.5 px-2">Footprint</th>
                        <th className="py-2.5 px-3">Catalog Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                      {parsedCadResult.rows.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-950/40">
                          <td className="py-2 px-3 text-indigo-300 font-bold">{r.designators.join(", ")}</td>
                          <td className="py-2 px-2">{r.quantity}</td>
                          <td className="py-2 px-3 text-white">{r.mpn || r.value}</td>
                          <td className="py-2 px-2 text-slate-400">{r.footprint}</td>
                          <td className="py-2 px-3">
                            {r.matchedItemId ? (
                              <span className="text-emerald-400 font-bold">✓ {r.matchedItemSku}</span>
                            ) : (
                              <span className="text-amber-400">Will Auto-Create</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setCadModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCommitCad}
                    disabled={isCommittingCad}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow disabled:opacity-50"
                  >
                    {isCommittingCad ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Commit to Assembly BOM
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
