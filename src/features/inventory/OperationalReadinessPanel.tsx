import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import type { OperationalPreparationService } from "../../services/OperationalPreparationService";
type Readiness = Awaited<ReturnType<OperationalPreparationService["readiness"]>>;
export function downloadPreparation(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type: "application/json"}));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function OperationalReadinessPanel() {
  const [data, setData] = useState<Readiness>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setError(""); setData(undefined);
    try { setData(await apiFetch("/api/v1/stocktakes/operational-readiness")); }
    catch { setError("Readiness unavailable. Sign in and reconnect; no offline acceptance is supported."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, []);
  return <section className="space-y-4 rounded-2xl border border-slate-300 p-4" aria-labelledby="operational-readiness-title" aria-busy={busy}>
    <h2 id="operational-readiness-title" className="text-xl font-semibold">Operational pilot preparation — NO-GO</h2>
    <p>Physical stock and valuation remain UNKNOWN. This screen prepares unsigned evidence; it cannot accept sign-offs, authorize balances or activate operations.</p>
    <button className="min-h-11 rounded-xl border px-4" disabled={busy} onClick={() => void load()}>Refresh readiness</button>
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Loading readiness…</p>}
    {data && <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.gates.map(gate => <article key={gate.id} className="min-w-0 rounded-xl border p-3">
        <h3 className="font-semibold">{gate.label}</h3><p>{gate.status}</p><p className="text-sm">{gate.next_action}</p>
      </article>)}</div>
      <details><summary className="min-h-11 cursor-pointer">Printer and scanner practical acceptance</summary>
        <ol className="list-decimal space-y-2 pl-6">{data.hardware.map(test => <li key={test.scenario}>{test.status}: {test.scenario}</li>)}</ol>
        <p>Actual device records must identify operator, device, date, sample, result and independent reviewer. Record NOT TESTED, TEST IN PROGRESS, FAILED or VERIFIED externally with evidence; this screen cannot confer VERIFIED.</p>
      </details>
      <details><summary className="min-h-11 cursor-pointer">Staff training and supervisor responsibilities</summary>
        <div className="grid gap-3 md:grid-cols-2">{data.staff.map(test => <article key={test.workflow} className="rounded-xl border p-3">
          <h3 className="font-semibold">{test.workflow} — {test.status}</h3><p>Existing role: {test.role}</p>
          <p>{test.training}</p><p>{test.scenario}</p><p>Required evidence: {test.evidence}</p><p>Blocker: {test.blocker}</p>
        </article>)}</div>
      </details>
      <button className="min-h-11 rounded-xl border px-4" onClick={() => downloadPreparation({...data, kind: "UNSIGNED PREPARATION PACK", evidence_class: "NO PHYSICAL ACCEPTANCE", submission: {operator_id: null, supervisor_id: null, observed_at: null, evidence_reference: null, sha256: null, result: null, remaining_blocker: null}}, "d6-unsigned-preparation.json")}>Export unsigned preparation pack</button>
    </>}
  </section>;
}
