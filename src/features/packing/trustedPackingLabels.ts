import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { inspectionFor, type TrustedPlan } from './trustedPackingTypes';
export function trustedPackageDestination(origin:string,id:string) {
  if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))throw Error('Invalid package');
  const url=new URL(origin);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid origin');
  return `${url.origin}/?trusted_packing_package=${id}`;
}
export async function trustedPackingPDF(plan:TrustedPlan,id:string,origin:string) {
  const p=plan.snapshot.packages.find(p=>p.id===id);if(!p)throw Error('Select a frozen package');
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:[110,85]});
  const qc=inspectionFor(plan,id);doc.setFontSize(9);
  const lines=[`${p.name} #${p.pack_number}`,`${plan.snapshot.project_name} / ${plan.snapshot.site_name}`,`${p.subject} ${p.grade} · v${p.version_number} · demand r${plan.demand_revision}`,`QC: ${qc?.decision??'pending'} · dispatch blocked`,p.code,`Parent: ${p.parent_id??'root'}`,`Inspector: ${qc?.actor_id??'pending'}`];
  lines.forEach((line,i)=>doc.text(String(doc.splitTextToSize(line,100)[0]),5,7+i*6));
  const {modules}=QRCode.create(trustedPackageDestination(origin,id),{errorCorrectionLevel:'M'}),size=30/(modules.size+8);
  doc.setFillColor('#000000');for(let y=0;y<modules.size;y++)for(let x=0;x<modules.size;x++)if(modules.get(y,x))doc.rect(75+(x+4)*size,50+(y+4)*size,size,size,'F');
  doc.setFontSize(7);p.materials.slice(0,6).forEach((m,i)=>doc.text(`${m.quantity} ${m.unit} ${m.name}`.slice(0,40),5,53+i*4));
  return doc;
}
