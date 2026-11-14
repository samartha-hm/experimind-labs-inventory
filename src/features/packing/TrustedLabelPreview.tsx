import QRCode from 'qrcode';
import { inspectionFor, type TrustedPlan } from './trustedPackingTypes';
import { trustedPackageDestination } from './trustedPackingLabels';
import type { TrustedDispatch } from '../delivery/trustedDeliveryTypes';

function PackageQR({id}:{id:string}) {
  const destination=trustedPackageDestination(location.origin,id);
  const {modules}=QRCode.create(destination,{errorCorrectionLevel:'M'});
  const cells:string[]=[];
  for(let y=0;y<modules.size;y++)for(let x=0;x<modules.size;x++)if(modules.get(y,x))cells.push(`M${x+4} ${y+4}h1v1h-1z`);
  return <><svg role="img" aria-label="Package lookup QR code" viewBox={`0 0 ${modules.size+8} ${modules.size+8}`} className="h-40 w-40" shapeRendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d={cells.join('')} fill="black"/></svg><a className="underline" href={destination}>Open package lookup</a></>;
}

export function TrustedLabelPreview({plan,packageId}:{plan:TrustedPlan;packageId:string}) {
  const pack=plan.snapshot.packages.find(p=>p.id===packageId);
  if(!pack)return null;
  const qc=inspectionFor(plan,packageId);
  return <section aria-label="Package label preview" className="rounded-xl border p-4 space-y-2 break-words">
    <h4>{pack.name} #{pack.pack_number}</h4><p>{plan.snapshot.project_name} / {plan.snapshot.site_name}</p>
    <p>{pack.subject} {pack.grade} · v{pack.version_number} · demand r{plan.demand_revision}</p>
    <p>QC: {qc?.decision??'pending'} · verify dispatch custody</p><p className="break-all">{pack.code}</p>
    <p className="break-all">Parent: {pack.parent_id??'root'} · Inspector: {qc?.actor_id??'pending'}</p>
    <ul>{pack.materials.map(m=><li key={m.line_id}>{m.quantity} {m.unit} {m.name}</li>)}</ul>
    <PackageQR id={packageId}/><p>Content preview. Download the PDF for the print layout.</p>
  </section>;
}

export function TrustedManifestPreview({dispatch}:{dispatch:TrustedDispatch}) {
  return <section aria-label="Dispatch manifest preview" className="rounded-xl border p-4 space-y-2 break-words">
    <h4>Dispatch manifest</h4><p>{dispatch.snapshot.project_name} / {dispatch.snapshot.site_name}</p>
    <p className="break-all">Dispatch: {dispatch.id}</p><p>Demand r{dispatch.demand_revision}</p>
    <p>{dispatch.transport.carrier} / {dispatch.transport.vehicle} · {dispatch.transport.planned_date}</p>
    {dispatch.roots.map(id=>{const pack=dispatch.snapshot.packages.find(p=>p.id===id),receipt=dispatch.receipts.find(r=>r.roots.includes(id));return <article key={id} className="border-t pt-3">
      <p>{pack?.name} #{pack?.pack_number}</p><p className="break-all">{pack?.code}</p>
      <p>{receipt?`Received by ${receipt.recipient} at ${receipt.acknowledged_at}`:'Awaiting school acknowledgment'}</p><PackageQR id={id}/>
    </article>;})}<p>Content preview. Download the PDF for the complete print manifest and contents.</p>
  </section>;
}
