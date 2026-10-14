import jsPDF from "jspdf";
import QRCode from "qrcode";
import { actualMaterials, type PackingOrder } from "./packingTypes";

import { defaultLabelTemplate, validateLabelTemplate, type LabelTemplate } from "./packingLabelTemplate";
export { defaultLabelTemplate, validateLabelTemplate, type LabelTemplate } from "./packingLabelTemplate";
export function packageDestination(origin: string, id: string): string {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid package identity");
  const url=new URL(origin); if (!["https:","http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid application origin");
  return `${url.origin}/?packing_package=${id}`;
}
/** A read-only export: identities originate in the immutable packing snapshot. */
export async function packingLabelPDF(order:PackingOrder, ids:string[], origin:string, config:LabelTemplate=defaultLabelTemplate) {
  const t=validateLabelTemplate(config);
  if (!ids.length || new Set(ids).size!==ids.length || ids.some(id=>!order.snapshot.packages.some(p=>p.id===id))) throw new Error("Select existing, unique physical packages");
  const doc=new jsPDF({orientation:t.width>t.height?"landscape":"portrait",unit:"mm",format:[t.width,t.height]});
  for (const [index,id] of ids.entries()) {
    if(index)doc.addPage([t.width,t.height],t.width>t.height?"landscape":"portrait");
    const p=order.snapshot.packages.find(p=>p.id===id)!, progress=order.execution.progress[id];
    doc.setFontSize(t.fontSize);
    const line=(text:string,y:number,width=t.width-10)=>{const lines=doc.splitTextToSize(text,width);doc.text(String(lines[0]??"")+(lines.length>1?"…":""),5,y);};
    line(`${p.kind.replaceAll("_"," ")} · ${p.name} · #${p.pack_number}`,7);
    line(`${order.snapshot.project_name} / ${order.snapshot.site_name}`,13);
    line(`Batch ${order.batch_code} · ${order.number}`,19);
    line(`${p.subject} ${p.grade} · template v${p.version_number} · demand r${order.demand_revision??"manual"}`,25);
    doc.setFontSize(7);line(p.code,31);line(`Parent: ${p.parent_id??"root"}`,36);
    line(`Template: ${p.version_id}`,41);
    line(`QC: ${progress?.qc??"pending"} · ${order.status==="ready"?"Ready for Delivery":order.status}`,47,t.width-39);
    line(`Operator: ${progress?.packed_by??"unassigned"}`,52,t.width-39);
    line(`Inspector: ${progress?.checked_by??"pending"}`,57,t.width-39);
    if(t.materials){const materials=actualMaterials(order,id);const limit=Math.max(0,Math.floor((t.height-65)/4));materials.slice(0,limit).forEach((m,i)=>line(`${m.name}: ${m.quantity} ${m.unit}`,63+i*4,t.width-39));if(materials.length>limit)line("Full contents: scan QR",t.height-5,t.width-39);}
    doc.addImage(await QRCode.toDataURL(packageDestination(origin,id),{errorCorrectionLevel:"M",margin:2,width:360}),"PNG",t.width-33,46,28,28);
  }
  return doc;
}
