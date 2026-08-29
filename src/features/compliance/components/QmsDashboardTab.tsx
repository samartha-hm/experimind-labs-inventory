import React, { useState, useEffect } from "react";
import {
  FileCheck,
  AlertTriangle,
  ClipboardList,
  GitBranch,
  RotateCcw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
} from "lucide-react";
import { ElectronicSignatureModal } from "../../../shared/components/ElectronicSignatureModal.tsx";

export const QmsDashboardTab: React.FC = () => {
  const [subTab, setSubTab] = useState<"inspections" | "deviations" | "capas" | "ecos" | "rmas">("inspections");
  const [inspections, setInspections] = useState<any[]>([]);
  const [deviations, setDeviations] = useState<any[]>([]);
  const [capas, setCapas] = useState<any[]>([]);
  const [ecos, setEcos] = useState<any[]>([]);
  const [rmas, setRmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // E-Signature Modal state
  const [eSignTarget, setESignTarget] = useState<{
    isOpen: boolean;
    entityType: string;
    entityId: string;
    recordTitle: string;
  }>({
    isOpen: false,
    entityType: "",
    entityId: "",
    recordTitle: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("auth_token") || "";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (subTab === "inspections") {
        const res = await fetch("/api/v1/qms/inspections", { headers });
        setInspections(await res.json());
      } else if (subTab === "deviations") {
        const res = await fetch("/api/v1/qms/deviations", { headers });
        setDeviations(await res.json());
      } else if (subTab === "capas") {
        const res = await fetch("/api/v1/qms/capas", { headers });
        setCapas(await res.json());
      } else if (subTab === "ecos") {
        const res = await fetch("/api/v1/qms/ecos", { headers });
        setEcos(await res.json());
      } else if (subTab === "rmas") {
        const res = await fetch("/api/v1/qms/rmas", { headers });
        setRmas(await res.json());
      }
    } catch (err) {
      console.error("Failed to load QMS records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subTab]);

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-emerald-400" />
            Quality Management System (QMS) & Compliance
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ISO 9001 / ISO 13485 Quality Assurance, Inbound Inspection, NCR Deviations, CAPA & Engineering Change Control
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setSubTab("inspections")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${subTab === "inspections" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            <FileCheck className="w-3.5 h-3.5" /> Inspections
          </button>
          <button
            onClick={() => setSubTab("deviations")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${subTab === "deviations" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Deviations (NCR)
          </button>
          <button
            onClick={() => setSubTab("capas")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${subTab === "capas" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            <ClipboardList className="w-3.5 h-3.5" /> CAPA Plans
          </button>
          <button
            onClick={() => setSubTab("ecos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${subTab === "ecos" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            <GitBranch className="w-3.5 h-3.5" /> Change Orders (ECO)
          </button>
          <button
            onClick={() => setSubTab("rmas")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${subTab === "rmas" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            <RotateCcw className="w-3.5 h-3.5" /> RMA Returns
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        {subTab === "inspections" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">Inbound Quality Inspections & Lot Releases</h3>
            </div>
            {inspections.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No quality inspections recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Inspection #</th>
                      <th className="p-3">Item / Material</th>
                      <th className="p-3">Batch Qty</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Inspector</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {inspections.map((insp) => (
                      <tr key={insp.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-emerald-400 font-bold">{insp.inspection_number}</td>
                        <td className="p-3 font-medium text-slate-200">{insp.item?.name || insp.item_id}</td>
                        <td className="p-3">{insp.batch_quantity}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${insp.status === "PASSED" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : insp.status === "FAILED" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                            {insp.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{insp.inspector_name || "Unassigned"}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              setESignTarget({
                                isOpen: true,
                                entityType: "QualityInspection",
                                entityId: insp.id,
                                recordTitle: `Inspection ${insp.inspection_number} (${insp.item?.name || "Item"})`,
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
                          >
                            Sign & Release
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {subTab === "deviations" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Non-Conformance Reports (NCR) & Material Deviations</h3>
            {deviations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No active deviations or NCRs.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">NCR #</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Disposition</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {deviations.map((dev) => (
                      <tr key={dev.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-amber-400 font-bold">{dev.deviation_number}</td>
                        <td className="p-3 font-medium text-slate-200">{dev.title}</td>
                        <td className="p-3 font-semibold text-rose-400">{dev.severity}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                            {dev.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">{dev.disposition}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              setESignTarget({
                                isOpen: true,
                                entityType: "Deviation",
                                entityId: dev.id,
                                recordTitle: `NCR ${dev.deviation_number}: ${dev.title}`,
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
                          >
                            Approve Disposition
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {subTab === "capas" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Corrective and Preventive Action (CAPA) Logs</h3>
            {capas.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No active CAPA cases.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">CAPA #</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Investigator</th>
                      <th className="p-3">Effective?</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {capas.map((capa) => (
                      <tr key={capa.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-cyan-400 font-bold">{capa.capa_number}</td>
                        <td className="p-3 font-medium text-slate-200">{capa.title}</td>
                        <td className="p-3 font-semibold text-slate-300">{capa.status}</td>
                        <td className="p-3 text-slate-400">{capa.lead_investigator_name}</td>
                        <td className="p-3">
                          {capa.is_effective ? (
                            <span className="text-emerald-400 font-bold">YES</span>
                          ) : (
                            <span className="text-slate-500">PENDING</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              setESignTarget({
                                isOpen: true,
                                entityType: "Capa",
                                entityId: capa.id,
                                recordTitle: `CAPA ${capa.capa_number}: ${capa.title}`,
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
                          >
                            Sign Closure
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {subTab === "ecos" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Engineering Change Orders (ECO) & BOM Change Control</h3>
            {ecos.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No active Engineering Change Orders.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">ECO #</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Initiator</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {ecos.map((eco) => (
                      <tr key={eco.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-purple-400 font-bold">{eco.eco_number}</td>
                        <td className="p-3 font-medium text-slate-200">{eco.title}</td>
                        <td className="p-3 text-slate-400">{eco.change_type}</td>
                        <td className="p-3 font-semibold text-slate-300">{eco.status}</td>
                        <td className="p-3 text-slate-400">{eco.initiator_name}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              setESignTarget({
                                isOpen: true,
                                entityType: "ChangeRequest",
                                entityId: eco.id,
                                recordTitle: `ECO ${eco.eco_number}: ${eco.title}`,
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
                          >
                            CCB Sign-off
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {subTab === "rmas" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Return Merchandise Authorizations (RMA)</h3>
            {rmas.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No active RMA records.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">RMA #</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Items Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {rmas.map((rma) => (
                      <tr key={rma.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-emerald-400 font-bold">{rma.rma_number}</td>
                        <td className="p-3 font-medium text-slate-200">{rma.customer_name || "Direct Customer"}</td>
                        <td className="p-3 font-semibold text-slate-300">{rma.status}</td>
                        <td className="p-3 text-slate-400">{rma.reason_for_return}</td>
                        <td className="p-3 text-slate-400">{rma.lines?.length || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Electronic Signature Re-Authentication Modal */}
      <ElectronicSignatureModal
        isOpen={eSignTarget.isOpen}
        onClose={() => setESignTarget({ ...eSignTarget, isOpen: false })}
        entityType={eSignTarget.entityType}
        entityId={eSignTarget.entityId}
        recordTitle={eSignTarget.recordTitle}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
};
