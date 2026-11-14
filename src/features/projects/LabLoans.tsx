import { useState } from "react";
import { apiFetch } from "../../utils/api";

interface Loan {
  id: string; asset_tag: string; name: string; borrower: string; department: string; due_date: string;
  overdue: boolean; returned_at?: string; return_condition?: string; cleared_at?: string;
}
export function LabLoans({ inventory }: { inventory: { id: string; name: string }[] }) {
  const [rows, setRows] = useState<Loan[]>([]);
  const [error, setError] = useState("");
  async function refresh(path = "", body?: object) {
    try {
      if (body) await apiFetch("/lab-loans" + path, {method:"POST", body:JSON.stringify(body)});
      setRows(await apiFetch("/lab-loans"));
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Loan request failed"); }
  }
  return <details className="rounded-xl border border-slate-700 p-4" onToggle={e => { if (e.currentTarget.open) void refresh(); }}>
    <summary>R&amp;D FabLab tool and prototype loans</summary>
    <form className="flex flex-wrap gap-2 my-3" onSubmit={e => {
      e.preventDefault(); void refresh("", Object.fromEntries(new FormData(e.currentTarget)));
    }}>
      <select name="itemId" aria-label="Catalog item" required defaultValue=""><option value="">Catalog item</option>{inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
      {["assetTag","borrower","department"].map((field,i) => <label key={field}>{["Asset tag","Borrower","Department"][i]} <input className="bg-slate-900" name={field} required maxLength={160}/></label>)}
      <label>Due date <input type="date" name="dueDate" required /></label><button>Check out</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {rows.map(row => <div key={row.id} className="flex flex-wrap items-center gap-3 border-t py-2">
      <strong>{row.asset_tag} · {row.name}</strong><span>{row.borrower} · {row.department} · Due {row.due_date}</span>
      {row.overdue && <b className="text-red-400">Overdue</b>}
      {row.returned_at ? <><span>{row.return_condition}</span>{row.return_condition !== "GOOD" && !row.cleared_at && <button onClick={() => refresh("/"+row.id+"/clear",{})}>Clear after inspection</button>}</>
      : <form onSubmit={e => {e.preventDefault(); void refresh("/"+row.id+"/return", Object.fromEntries(new FormData(e.currentTarget)));}}>
        <select aria-label="Return condition" name="condition" required defaultValue=""><option value="">Return condition</option>{["GOOD","DAMAGED","CALIBRATION_REQUIRED"].map(c=><option key={c}>{c}</option>)}</select><button>Check in</button>
      </form>}
    </div>)}
  </details>;
}
