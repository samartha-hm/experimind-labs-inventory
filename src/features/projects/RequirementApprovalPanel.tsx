import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { apiFetch } from "../../utils/api";

interface Approval { id: string; revision: number; approved_by: string; approved_at: string; snapshot_hash: string }
interface Pending { project: string; revision: number; key: string }
const button = "min-h-11 rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-40";

export default function RequirementApprovalPanel({ project, revision, reviewed, onApproved }: {
  project: string; revision: number; reviewed: boolean; onApproved: () => void;
}) {
  const { currentUser } = useAuth();
  const writer = ["admin", "super_admin"].includes(currentUser?.role ?? "");
  const storageKey = `requirements.pending.${currentUser?.id}`;
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [storageError, setStorageError] = useState(false);
  const [reconciled, setReconciled] = useState(false);
  async function refresh() { setApprovals(await apiFetch(`/api/v1/planning-projects/${project}/requirement-approvals`)); }
  useEffect(() => {
    setApprovals([]); setPending(null); setConfirmed(false); setReconciled(false); setStorageError(false); setError("");
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const value = JSON.parse(raw) as Pending;
        if (!value.project || !Number.isSafeInteger(value.revision) || value.revision < 1 || !value.key) throw Error();
        setPending(value);
      }
    } catch { setStorageError(true); setError("Saved approval request cannot be read. Reconcile approval history before restoring browser storage."); }
    void refresh().catch(e => setError(e instanceof Error ? e.message : "Approval evidence unavailable"));
  }, [project, revision, storageKey]);
  async function submit(operation: Pending) {
    setBusy(true); setError(""); setReconciled(false); setConfirmed(false);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(operation)); setPending(operation);
      await apiFetch(`/api/v1/planning-projects/${operation.project}/requirement-approvals`, {
        method: "POST", body: JSON.stringify({ revision: operation.revision, key: operation.key }),
      });
      sessionStorage.removeItem(storageKey); setPending(null); setConfirmed(false);
      await refresh(); onApproved();
    } catch (e) { setError(`${e instanceof Error ? e.message : "Approval failed"}. Retry the saved request unchanged or reconcile approval history.`); }
    finally { setBusy(false); }
  }
  const approved = approvals.find(a => a.revision === revision);
  return <section aria-label="School requirement approval" className="space-y-3 rounded-xl border border-slate-300 p-4">
    <h2 className="text-lg font-semibold">School requirement approval · revision {revision}</h2>
    <p>Review the calculated material and crate quantities for every school. Approval freezes this saved revision; it does not receive stock, issue materials or fulfill delivery.</p>
    {error && <p role="alert">{error}</p>}
    {approved && <p role="status" className="break-all">Approved {approved.id} by {approved.approved_by} at {approved.approved_at}. Snapshot {approved.snapshot_hash}.</p>}
    <button className={button} disabled={busy} onClick={() => { setBusy(true); setConfirmed(false); setReconciled(false); void refresh().then(() => setReconciled(true)).catch(e => setError(e.message)).finally(() => setBusy(false)); }}>Refresh requirement approvals</button>
    {pending && <div className="space-y-3">
      <p className="break-all">Saved approval: project {pending.project}, revision {pending.revision}.</p>
      <button className={button} disabled={busy || !writer || storageError} onClick={() => void submit(pending)}>Retry saved requirement approval</button>
      <label className="block"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I refreshed and reconciled this approval request and its history.</label>
      <button className={button} disabled={busy || !reconciled || !confirmed || pending.project !== project} onClick={() => {
        try { sessionStorage.removeItem(storageKey); setPending(null); setConfirmed(false); } catch { setError("Cannot clear saved approval request."); }
      }}>Clear reconciled requirement approval</button>
    </div>}
    {!writer && <p>Only an active tenant administrator can approve school requirements.</p>}
    {!pending && !approved && <>
      <label className="block"><input type="checkbox" disabled={busy || !writer || !reviewed || storageError} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I reviewed the saved quantities and calculated demand for every school.</label>
      <button className={button} disabled={busy || !writer || !reviewed || !confirmed || storageError} onClick={() => void submit({ project, revision, key: crypto.randomUUID() })}>Approve saved school requirements</button>
      {!reviewed && <p>Save changes and calculate this revision before approval.</p>}
    </>}
  </section>;
}
