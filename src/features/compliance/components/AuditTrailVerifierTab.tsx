import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, AlertOctagon, Hash, Filter, Eye } from "lucide-react";

export const AuditTrailVerifierTab: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch("/api/v1/audit-events?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Failed to fetch audit events:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch("/api/v1/audit-events/verify-chain", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (e) {
      console.error("Verification failed:", e);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    handleVerifyChain();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & Verification Summary Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl border ${verificationResult?.isValid ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
            {verificationResult?.isValid ? (
              <ShieldCheck className="w-8 h-8" />
            ) : (
              <ShieldAlert className="w-8 h-8" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Immutable Cryptographic Audit Trail</h2>
              {verificationResult?.isValid && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> SHA-256 Merkle Chain Verified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              FDA 21 CFR Part 11 & ALCOA+ Compliant Append-Only Hash-Chained Event Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-2 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Trail
          </button>
          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
          >
            <Hash className="w-4 h-4" />
            {verifying ? "Verifying Mathematical Hashes..." : "Verify Chain Integrity"}
          </button>
        </div>
      </div>

      {/* Verification Details Box */}
      {verificationResult && (
        <div className={`p-4 rounded-xl border ${verificationResult.isValid ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300" : "bg-rose-950/20 border-rose-500/30 text-rose-300"} text-xs flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {verificationResult.isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>
              {verificationResult.isValid
                ? `All ${verificationResult.totalEventsChecked} audit events verified intact. Zero tampering, record deletions, or hash mismatches detected.`
                : `INTEGRITY ALERT: Tampering detected! ${verificationResult.reason}`}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Last check: {new Date(verificationResult.verifiedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Event Stream Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="font-semibold text-slate-200">Historical Event Ledger ({total} total entries)</div>
          <div>Showing most recent entries</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Seq #</th>
                <th className="p-3.5">Timestamp (UTC)</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5">Event Hash (SHA-256)</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-mono text-emerald-400 font-bold">#{ev.sequence_number}</td>
                  <td className="p-3.5 text-slate-400">{new Date(ev.created_at).toLocaleString()}</td>
                  <td className="p-3.5">
                    <span className="font-medium text-slate-200">{ev.actor_name}</span>
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-slate-800 rounded text-slate-400">{ev.actor_role}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {ev.action}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {ev.entity_type} <span className="text-slate-600">({String(ev.entity_id).slice(0, 8)}...)</span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-400">
                    <span title={ev.event_hash}>{ev.event_hash?.slice(0, 16)}...</span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setSelectedEvent(ev)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      title="Inspect Event Payload & Hashes"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Details Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-400" />
                Audit Event #{selectedEvent.sequence_number} Inspection
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 bg-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 block mb-1">Previous Hash Link</span>
                <span className="font-mono text-emerald-400 break-all text-[11px]">{selectedEvent.previous_hash}</span>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 block mb-1">Current Event Hash</span>
                <span className="font-mono text-cyan-400 break-all text-[11px]">{selectedEvent.event_hash}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1.5">Recorded State Delta (Before vs After)</span>
              <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60">
                {JSON.stringify({
                  actor: { id: selectedEvent.actor_id, name: selectedEvent.actor_name, role: selectedEvent.actor_role },
                  ip: selectedEvent.ip_address,
                  before: selectedEvent.before_state,
                  after: selectedEvent.after_state,
                  delta: selectedEvent.delta,
                  reason: selectedEvent.reason_code,
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
