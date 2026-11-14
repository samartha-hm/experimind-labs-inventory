import { useEffect, useState } from "react";
import { PlusCircle, RefreshCw, Wrench } from "lucide-react";
import { apiFetch } from "../../utils/api";

interface Loan {
  id: string; asset_tag: string; name: string; borrower: string; department: string;
  checked_out_at: string; due_date: string; overdue: boolean;
  returned_at?: string; return_condition?: string; cleared_at?: string;
}
const field = "mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500";
const button = "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-50";
const filters = ["All", "Active", "Overdue", "Needs Clearance", "Returned"] as const;
const needsClearance = (row: Loan) => !!row.returned_at && row.return_condition !== "GOOD" && !row.cleared_at;

export function LabLoans({ inventory, role }: { inventory: { id: string; name: string }[]; role?: string }) {
  const [rows, setRows] = useState<Loan[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<typeof filters[number]>("All");
  const canClear = role === "manager" || role === "admin";
  const canEdit = canClear || role === "staff";

  async function refresh(path = "", body?: object) {
    setBusy(true);
    setError("");
    try {
      if (body) await apiFetch("/lab-loans" + path, { method: "POST", body: JSON.stringify(body) });
      setRows(await apiFetch("/lab-loans"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Loan request failed");
    } finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const groups = {
    All: rows, Active: rows.filter(row => !row.returned_at), Overdue: rows.filter(row => row.overdue),
    "Needs Clearance": rows.filter(needsClearance), Returned: rows.filter(row => row.returned_at),
  };
  const visible = groups[filter].filter(row => [row.asset_tag, row.borrower, row.name].some(value =>
    value.toLowerCase().includes(search.trim().toLowerCase())));
  const metrics = [
    ["Active Loans", groups.Active.length, "text-indigo-300"],
    ["Overdue", groups.Overdue.length, groups.Overdue.length ? "text-rose-300" : "text-slate-100"],
    ["Awaiting Clearance", groups["Needs Clearance"].length, "text-amber-300"],
    ["Returned Good", groups.Returned.filter(row => row.return_condition === "GOOD").length, "text-emerald-300"],
  ] as const;

  return <section aria-label="R&D FabLab tool and prototype loans" className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-100 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 text-xl font-bold"><Wrench className="shrink-0 text-indigo-400" />R&amp;D FabLab Tool &amp; Prototype Custody Desk</h2>
      <button className={button + " bg-slate-800 hover:bg-slate-700"} disabled={busy} onClick={() => refresh()}><RefreshCw size={16}/>Refresh</button>
    </header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(([label, count, color]) =>
      <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-xs text-slate-400">{label}</p>
        <p className={"mt-1 text-2xl font-bold tabular-nums " + color}>{busy || error ? "—" : count}</p></div>)}</div>
    {canEdit && <form className="grid items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-xs text-slate-300 sm:grid-cols-2 xl:grid-cols-3" onSubmit={e => {
      e.preventDefault(); void refresh("", Object.fromEntries(new FormData(e.currentTarget)));
    }}>
      <label>Catalog item<select className={field} name="itemId" aria-label="Catalog item" required defaultValue=""><option value="">Catalog item</option>{inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
      {([["assetTag","Asset tag","e.g. FAB-OSC-01"],["borrower","Borrower","Intern / Engineer name"],["department","Department","Robotics / Electronics / Mechanical"]] as const).map(([name,label,hint]) =>
        <label key={name}>{label}<input className={field} name={name} placeholder={hint} required maxLength={160}/></label>)}
      <label>Due date<input className={field} type="date" name="dueDate" required /></label>
      <button className={button + " bg-indigo-600 hover:bg-indigo-500"} disabled={busy}><PlusCircle size={16}/>Check out</button>
    </form>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1">{filters.map(label => <button key={label} aria-pressed={filter === label} onClick={() => setFilter(label)}
        className={"rounded-full px-3 py-1.5 text-xs font-semibold " + (filter === label ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700")}>{label}</button>)}</div>
      <input type="search" aria-label="Search custody records" placeholder="Search asset, borrower or tool" value={search} onChange={e => setSearch(e.target.value)} className={field + " sm:max-w-xs"}/>
    </div>
    {error && <p role="alert" className="rounded-lg bg-rose-950 p-3 text-rose-200">{error}</p>}
    {busy && <p role="status" className="text-sm text-slate-400">Loading custody records…</p>}
    {!busy && !error && !visible.length && <p className="rounded-xl border border-slate-800 p-4 text-sm text-slate-400">No matching custody records.</p>}
    {!!visible.length && <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="w-full text-left text-sm">
      <thead className="bg-slate-900 text-xs uppercase text-slate-400"><tr>{["Asset / tool", "Borrower / department", "Checked out / due", "Status", "Custody action"].map(h => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-800">{visible.map(row => {
        const status = row.return_condition || (row.overdue ? "Overdue" : "Active");
        const colors: Record<string,string> = {GOOD:"bg-emerald-950 text-emerald-300", DAMAGED:"bg-rose-950 text-rose-300", CALIBRATION_REQUIRED:"bg-amber-950 text-amber-300", Overdue:"motion-safe:animate-pulse bg-rose-950 text-rose-300", Active:"bg-indigo-950 text-indigo-300"};
        return <tr key={row.id} className="hover:bg-slate-900/60">
          <td className="px-4 py-3"><code className="rounded bg-slate-800 px-2.5 py-1">{row.asset_tag}</code><div className="mt-1">{row.name}</div></td>
          <td className="px-4 py-3">{row.borrower}<div className="text-xs text-slate-400">{row.department}</div></td>
          <td className="whitespace-nowrap px-4 py-3">{row.checked_out_at.slice(0,10)}<div className="text-xs text-slate-400">Due {row.due_date.slice(0,10)}</div></td>
          <td className="px-4 py-3"><span className={"rounded-full px-2 py-1 text-xs font-bold " + colors[status]}>{status}</span>{row.cleared_at && <div className="mt-2 text-xs text-emerald-300">Inspection cleared</div>}</td>
          <td className="px-4 py-3">{!row.returned_at && canEdit && <form className="flex items-center gap-2" onSubmit={e => {
            e.preventDefault(); void refresh("/" + row.id + "/return", Object.fromEntries(new FormData(e.currentTarget)));
          }}><select className={field} aria-label="Return condition" name="condition" required defaultValue=""><option value="">Return condition</option>{["GOOD","DAMAGED","CALIBRATION_REQUIRED"].map(c => <option key={c}>{c}</option>)}</select>
            <button disabled={busy} className={button + " whitespace-nowrap bg-emerald-700 hover:bg-emerald-600"}>Check in</button></form>}
            {needsClearance(row) && canClear && <button disabled={busy} className={button + " bg-amber-800 hover:bg-amber-700"} onClick={() => refresh("/" + row.id + "/clear", {})}>Clear after inspection</button>}</td>
        </tr>;
      })}</tbody></table></div>}
  </section>;
}
