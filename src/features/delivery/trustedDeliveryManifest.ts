import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { trustedPackageDestination } from '../packing/trustedPackingLabels';
import type { TrustedDispatch } from './trustedDeliveryTypes';

/** One root assembly per page; descendants are contents, never additional fulfillment. */
export async function trustedDeliveryManifest(dispatch:TrustedDispatch,origin:string) {
  const doc=new jsPDF();
  for(const [index,id] of dispatch.roots.entries()) {
    if(index)doc.addPage();
    const root=dispatch.snapshot.packages.find(p=>p.id===id);if(!root)throw Error('Frozen dispatch package missing');
    const received=dispatch.receipts.find(r=>r.roots.includes(id));
    const contents=dispatch.snapshot.packages.filter(p=>{let node:typeof p|undefined=p;const seen=new Set<string>();while(node){if(seen.has(node.id))throw Error('Cyclic frozen package ancestry');seen.add(node.id);if(node.id===id)return true;node=dispatch.snapshot.packages.find(x=>x.id===node!.parent_id);}return false;});
    doc.setFontSize(11);
    const lines=['Dispatch manifest',dispatch.snapshot.project_name,`School: ${dispatch.snapshot.site_name}`,`Dispatch: ${dispatch.id}`,`Demand r${dispatch.demand_revision} / approval ${dispatch.approval_id}`,`${root.name} #${root.pack_number} / version ${root.version_number}`,root.code,`Carrier: ${dispatch.transport.carrier} / ${dispatch.transport.vehicle}`,`Planned: ${dispatch.transport.planned_date}`,`Receipt: ${received?`${received.recipient} at ${received.acknowledged_at}`:'Awaiting school acknowledgment'}`];
    let y=15;for(const line of lines)for(const wrapped of doc.splitTextToSize(line,180)){if(y>270){doc.addPage();y=15;}doc.text(wrapped,15,y);y+=6;}
    if(y+58>280){doc.addPage();y=15;}
    const {modules}=QRCode.create(trustedPackageDestination(origin,id),{errorCorrectionLevel:'M'}),size=35/(modules.size+8);
    doc.setFillColor('#000000');for(let row=0;row<modules.size;row++)for(let col=0;col<modules.size;col++)if(modules.get(row,col))doc.rect(15+(col+4)*size,y+(row+4)*size,size,size,'F');
    y+=44;doc.text('Contents (one delivered assembly):',15,y);y+=7;
    for(const p of contents){const wrapped=doc.splitTextToSize(`${p.kind}: ${p.name} #${p.pack_number} / ${p.code}`,180);if(y+wrapped.length*5>280){doc.addPage();y=15;}doc.text(wrapped,15,y);y+=wrapped.length*5+2;}
  }
  return doc;
}
