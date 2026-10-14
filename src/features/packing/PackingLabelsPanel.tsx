import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { apiFetch } from "../../utils/api";
import { defaultLabelTemplate, packingLabelPDF, validateLabelTemplate, type LabelTemplate } from "./packingLabels";
import type { PackingOrder, PackingPackageView } from "./packingTypes";

export function PackingLabelsPanel({order,ids}:{order:PackingOrder;ids:string[]}) {
  const {currentUser}=useAuth(), key=`packing-label-template:${currentUser?.organization_id??currentUser?.id}`;
  const [template,setTemplate]=useState<LabelTemplate>(()=>{try{return validateLabelTemplate(JSON.parse(localStorage.getItem(key)??"null"));}catch{return defaultLabelTemplate;}});
  const [url,setURL]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  useEffect(()=>{setURL("");},[order.id,order.revision,JSON.stringify(ids),JSON.stringify(template)]);
  async function preview(){setBusy(true);setError("");try{const config=validateLabelTemplate(template);localStorage.setItem(key,JSON.stringify(config));const fresh: {order:PackingOrder}=await apiFetch(`/api/v1/packing/orders/${order.id}`);const doc=await packingLabelPDF(fresh.order,ids,window.location.origin,config);setURL(URL.createObjectURL(doc.output("blob")));}catch(e){setError(e instanceof Error?e.message:"Label generation failed");}finally{setBusy(false);}}
  return <fieldset className="space-y-3 rounded-xl border p-3"><legend>Physical package labels</legend><p className="text-sm">Layout saved for this browser. Reprinting retains package IDs and does not change stock. Scan QR after signing in to inspect current QC.</p><div className="flex flex-wrap gap-3">{(["width","height","fontSize"] as const).map(field=><label key={field}>{field} {field==="fontSize"?"pt":"mm"}<input className="w-20 rounded border p-2" type="number" value={template[field]} onChange={e=>setTemplate({...template,[field]:Number(e.target.value)})}/></label>)}<label><input type="checkbox" checked={template.materials} onChange={e=>setTemplate({...template,materials:e.target.checked})}/> Contents</label><button className="rounded-xl border px-4 py-3" disabled={busy||!ids.length} onClick={()=>void preview()}>Preview / reprint selected labels</button></div>{error&&<p role="alert" className="text-red-600">{error}</p>}{url&&<><a href={url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl border p-3">Open PDF to print</a> <a href={url} download={`${order.number}-labels.pdf`}>Download labels</a><iframe title="Packing label preview" src={url} className="h-96 w-full rounded border"/></>}</fieldset>;
}
export function PackingPackageLookup(){
  const id=new URLSearchParams(window.location.search).get("packing_package"),[data,setData]=useState<PackingPackageView>(),[error,setError]=useState("");
  useEffect(()=>{if(!id)return;let live=true;void apiFetch(`/api/v1/packing/packages/${encodeURIComponent(id)}`).then(d=>{if(live)setData(d);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[id]);
  if(!id)return null;
  return <section className="m-4 space-y-2 rounded-xl border p-4"><h2 className="text-xl font-bold">Physical package lookup</h2>{error&&<p role="alert">{error}</p>}{data?<><p>{data.package.code} · {data.package.name} · {data.package.kind}</p><p>{data.project} / {data.school} · {data.batch_code} · demand revision {data.requirement_revision??"manual"}</p><p>Template {data.package.version_id} v{data.package.version_number} · Parent {data.package.parent_id??"root"}</p><p>{data.status==="ready"?"Ready for Delivery":data.status} · QC {data.progress.qc} · Operator {data.progress.packed_by??"unassigned"} · Inspector {data.progress.checked_by??"pending"}</p>{data.custody?.map(e=><p key={e.id}>Delivery {e.order_id} · {e.state} · {e.location} · {new Date(e.created_at).toLocaleString()} · {e.notes}</p>)}{data.actual_materials.map((m:{item_id:string;name:string;quantity:string;unit:string},i:number)=><p key={i}>{m.name}: {m.quantity} {m.unit}</p>)}</>:!error&&<p>Loading package…</p>}</section>;
}
