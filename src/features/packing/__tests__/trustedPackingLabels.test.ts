import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { trustedPackageDestination, trustedPackingPDF } from '../trustedPackingLabels';
import type { TrustedPlan } from '../trustedPackingTypes';

it('prints the trusted package QR with exact modules and four-module quiet zone',async()=>{
  const id=randomUUID(),origin='https://erp.example/private?token=secret#fragment';
  const destination=trustedPackageDestination(origin,id);
  expect(destination).toBe(`https://erp.example/?trusted_packing_package=${id}`);
  for(const unsafe of ['javascript:alert(1)','https://user:password@erp.example'])expect(()=>trustedPackageDestination(unsafe,id)).toThrow();
  expect(()=>trustedPackageDestination(origin,'../package')).toThrow();
  const plan={demand_revision:1,inspections:[],snapshot:{project_name:'Synthetic project',site_name:'School A',packages:[{id,parent_id:null,name:'Science pouch',pack_number:1,subject:'Science',grade:'8',version_number:1,code:`PK-${id}`,materials:[]}]}} as unknown as TrustedPlan;
  const before=JSON.stringify(plan),doc=await trustedPackingPDF(plan,id,origin);
  expect(doc.getNumberOfPages()).toBe(1);
  expect(doc.output()).not.toContain('/Subtype /Image');
  expect(doc.output()).toContain('dispatch blocked');
  const matrix=QRCode.create(destination,{errorCorrectionLevel:'M'}).modules,size=30/(matrix.size+8);
  const pages=(doc.internal as typeof doc.internal&{pages:string[][]}).pages;
  const scale=doc.internal.scaleFactor,height=doc.internal.pageSize.getHeight();
  const rectangles=[...pages[1].join('\n').matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re\nf/g)].map(m=>({x:Number(m[1])/scale,y:height-Number(m[2])/scale,w:Number(m[3])/scale,h:-Number(m[4])/scale}));
  for(let y=0;y<matrix.size+8;y++)for(let x=0;x<matrix.size+8;x++){
    const cx=75+(x+.5)*size,cy=50+(y+.5)*size;
    expect(rectangles.some(r=>cx>r.x&&cx<r.x+r.w&&cy>r.y&&cy<r.y+r.h)).toBe(x>=4&&y>=4&&x<matrix.size+4&&y<matrix.size+4&&!!matrix.get(y-4,x-4));
  }
  expect(JSON.stringify(plan)).toBe(before);
  await expect(trustedPackingPDF(plan,randomUUID(),origin)).rejects.toThrow();
});
