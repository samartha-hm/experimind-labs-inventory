import { useState } from "react";
import { apiFetch } from "../../../utils/api";

interface Order {
  id: string; so_number: string; status: string;
  lines: {id: string; qty_ordered: number; qty_shipped: number; inventory_item: {sku:string; name:string}}[];
}
export function StorefrontQueue() {
  const [orders,setOrders] = useState<Order[]>([]);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
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
  return <details className="rounded-xl border p-4" onToggle={e=>{if(e.currentTarget.open) void refresh();}}>
    <summary>Storefront pick, pack and dispatch</summary>
    <button disabled={busy} onClick={()=>refresh()}>Refresh queue</button>
    {error && <p role="alert">{error}</p>}{!orders.length && !busy && !error && <p>No open storefront orders</p>}
    {orders.map(o=><article key={o.id} className="my-2 border-t py-2"><strong>{o.so_number}</strong>
      {o.lines.map(l=><div key={l.id}>{l.inventory_item.sku} · {l.inventory_item.name} × {l.qty_ordered-l.qty_shipped}</div>)}
      <button disabled={busy} onClick={()=>refresh(o)}>{{confirmed:"Start picking",picking:"Confirm packed",packed:"Dispatch"}[o.status]}</button></article>)}
  </details>;
}
