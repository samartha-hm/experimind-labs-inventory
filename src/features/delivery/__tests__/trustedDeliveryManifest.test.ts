import { expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { trustedDeliveryManifest } from '../trustedDeliveryManifest';
import { trustedPackageDestination } from '../../packing/trustedPackingLabels';
import type { TrustedDispatch } from '../trustedDeliveryTypes';
import { dispatchAssembly } from '../trustedDeliveryContract';

it('prints frozen school evidence and vector QR without multiplying assembly entitlement',async()=>{
  const root=randomUUID(),child=randomUUID(),dispatch={id:randomUUID(),roots:[root],demand_revision:1,approval_id:randomUUID(),transport:{carrier:'Synthetic carrier',vehicle:'TEST',planned_date:'2026-10-22'},receipts:[{roots:[root],recipient:'Synthetic recipient',acknowledged_at:'2026-10-22T10:00:00Z'}],snapshot:{project_name:'Synthetic project',site_name:'School A',packages:[{id:root,parent_id:null,kind:'kit',name:'Science set',pack_number:1,version_number:2,code:`PK-${root}`},{id:child,parent_id:root,kind:'pouch',name:'Child contents',pack_number:1,code:`PK-${child}`} ]}} as unknown as TrustedDispatch;
  const before=JSON.stringify(dispatch),pdf=await trustedDeliveryManifest(dispatch,'https://erp.example/private?token=secret'),output=pdf.output();
  expect(pdf.getNumberOfPages()).toBe(1);
  for(const text of ['School A','Synthetic recipient','Synthetic carrier','Child contents','version 2',root,child])expect(output).toContain(text);
  expect(output).not.toContain('/Subtype /Image');expect(output).not.toContain('token=secret');
  const matrix=QRCode.create(trustedPackageDestination('https://erp.example',root),{errorCorrectionLevel:'M'}).modules;
  const pixels=[...output.matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re\nf/g)];
  expect(pixels.length).toBe(Array.from({length:matrix.size},(_,y)=>Array.from({length:matrix.size},(_,x)=>Number(matrix.get(y,x))).reduce((a,b)=>a+b,0)).reduce((a,b)=>a+b,0));
  expect(JSON.stringify(dispatch)).toBe(before);
  expect(()=>dispatchAssembly(dispatch.snapshot,[root,child])).toThrow();
  await expect(trustedDeliveryManifest({...dispatch,roots:[randomUUID()]},'https://erp.example')).rejects.toThrow();
});
