import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiFetch } from "../../../utils/api";

interface Order {
  id: string; so_number: string; status: string;
  lines: {id: string; qty_ordered: number; qty_shipped: number; inventory_item: {sku:string; name:string}}[];
}
export function StorefrontQueue() {
  const [orders,setOrders] = useState<Order[]>([]);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(true);
  async function refresh(order?: Order) {
    setBusy(true);
    try {
      if (order) {
        const dispatch = order.status === "packed";
        const body = dispatch ? {shipments:order.lines.filter(l=>l.qty_ordered > l.qty_shipped)
          .map(l=>({lineId:l.id,quantityShipped:l.qty_ordered-l.qty_shipped}))} : {status:order.status === "confirmed" ? "picking" : "packed"};
        await apiFetch("/sales-order/"+order.id+(dispatch ? "/ship" : "/advance"), {method:"POST",body:JSON.stringify(body)});
      }
      const result:Order[] = await apiFetch("/sales-order");
      setOrders(result.filter(o=>o.so_number.startsWith("WEB-") && ["confirmed","picking","packed"].includes(o.status)));
      setError("");
    } catch(e) { setError(e instanceof Error ? e.message : "Queue unavailable"); }
    finally {setBusy(false);}
  }
  useEffect(() => { void refresh(); }, []);
  const stages = [
    { status: "confirmed", label: "Confirmed", description: "Ready to pick", color: "bg-indigo-600 hover:bg-indigo-500", action: "Start picking" },
    { status: "picking", label: "Picking", description: "Picking in progress", color: "bg-blue-700 hover:bg-blue-600", action: "Confirm packed" },
    { status: "packed", label: "Packed", description: "Ready for dispatch", color: "bg-emerald-700 hover:bg-emerald-600", action: "Dispatch" },
  ];
  return <section aria-label="Storefront pick, pack and dispatch" className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold">Storefront Pick, Pack &amp; Dispatch Pipeline {!busy && !error && <span className="rounded-full bg-indigo-950 px-2.5 py-1 align-middle text-xs text-indigo-200">{orders.length} open</span>}</h2>
      <button disabled={busy} onClick={() => refresh()} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"><RefreshCw size={15} aria-hidden="true" />Refresh queue</button>
    </header>
    <dl className="grid grid-cols-3 gap-2">{stages.map(stage =>
      <div key={stage.status} className="rounded-xl border border-slate-700 bg-slate-900 p-3">
        <dt className="text-xs text-slate-300">{stage.description}</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{busy || error ? "—" : orders.filter(order => order.status === stage.status).length}</dd>
      </div>)}</dl>
    {busy && <p role="status" className="text-sm text-slate-300">Updating queue…</p>}
    {error && <p role="alert" className="rounded-lg bg-rose-950 p-3 text-rose-200">{error}</p>}
    {!orders.length && !busy && !error && <p className="rounded-lg border border-slate-800 p-4 text-sm text-slate-300">No open storefront orders</p>}
    <div className="grid gap-4 xl:grid-cols-2">{orders.map(order => {
      const current = stages.findIndex(stage => stage.status === order.status);
      return <article key={order.id} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <header className="flex items-center justify-between"><h3 className="font-mono font-bold text-indigo-300">{order.so_number}</h3><span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs">{stages[current].label}</span></header>
        <ol aria-label="Order progress" className="grid grid-cols-3 gap-2">{stages.map((stage, index) =>
          <li key={stage.status} aria-current={index === current ? "step" : undefined} className={"border-t-4 pt-1.5 text-xs font-semibold " + (index <= current ? "border-indigo-400 text-indigo-200" : "border-slate-700 text-slate-400")}>{stage.label}</li>)}</ol>
        <ul className="divide-y divide-slate-800">{order.lines.map(line => <li key={line.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
          <span className="rounded bg-slate-800 px-2 py-1 font-mono text-xs">{line.inventory_item.sku}</span>{line.inventory_item.name}
          <span className="ml-auto rounded bg-indigo-950 px-2 py-1 font-mono text-xs text-indigo-200">× {line.qty_ordered - line.qty_shipped}</span>
        </li>)}</ul>
        <button disabled={busy} onClick={() => refresh(order)} className={"rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 " + stages[current].color}>{stages[current].action}</button>
      </article>;
    })}</div>
  </section>;
}
