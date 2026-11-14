import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { defaultLabelTemplate, validateLabelTemplate, packageDestination, packingLabelPDF } from "../packingLabels";
import type { PackingOrder } from "../packingTypes";

describe("physical package labels",()=>{
  it("validates layouts and rejects unsafe destinations",()=>{
    expect(validateLabelTemplate(defaultLabelTemplate)).toEqual(defaultLabelTemplate);
    for(const t of [{...defaultLabelTemplate,width:NaN},{...defaultLabelTemplate,height:20},{...defaultLabelTemplate,fontSize:100},{...defaultLabelTemplate,materials:"yes"}])expect(()=>validateLabelTemplate(t as typeof defaultLabelTemplate)).toThrow();
    for(const origin of ["javascript:alert(1)","https://user:password@erp.example"])expect(()=>packageDestination(origin,randomUUID())).toThrow();
    expect(()=>packageDestination("https://erp.example","../other-tenant")).toThrow();
  });
  it("QR contains only application origin and stable package ID",async()=>{
    const id=randomUUID(),url=packageDestination("https://erp.example/private?token=secret#detail",id);
    expect(url).toBe(`https://erp.example/?packing_package=${id}`);
    expect(QRCode.create(url).modules.size).toBeGreaterThan(20);
    expect(await QRCode.toDataURL(url)).toMatch(/^data:image\/png;base64,/);
  });
  it("rejects duplicate or invented packages before export",async()=>{
    const id=randomUUID(),order={snapshot:{packages:[{id}]}} as PackingOrder;
    await expect(packingLabelPDF(order,[],"https://erp.example")).rejects.toThrow();
    await expect(packingLabelPDF(order,[id,id],"https://erp.example")).rejects.toThrow();
    await expect(packingLabelPDF(order,[randomUUID()],"https://erp.example")).rejects.toThrow();
  });
  it("prints each package QR as exact vector modules with its quiet zone and no snapshot writes",async()=>{
    const ids=[randomUUID(),randomUUID()];
    const order={number:"PACK-TEST",batch_code:"BATCH-TEST",status:"ready",demand_revision:1,
      snapshot:{project_name:"Project",site_name:"School",packages:ids.map(id=>({id,kind:"crate",name:"Science",
        pack_number:1,subject:"Science",grade:"8",version_number:1,code:`PK-${id}`,parent_id:null,
        version_id:randomUUID(),materials:[]}))},execution:{progress:{},changes:[]}} as unknown as PackingOrder;
    const before=JSON.stringify(order);
    const doc=await packingLabelPDF(order,ids,"https://erp.example/private?token=secret");
    expect(doc.getNumberOfPages()).toBe(2);
    expect(doc.output()).not.toContain("/Subtype /Image");
    const pages=(doc.internal as typeof doc.internal & {pages:string[][]}).pages;
    const scale=doc.internal.scaleFactor,height=doc.internal.pageSize.getHeight();
    for(const [index,id] of ids.entries()) {
      const matrix=QRCode.create(packageDestination("https://erp.example",id),{errorCorrectionLevel:"M"}).modules;
      const size=matrix.size+4,moduleSize=28/size;
      const rectangles=[...pages[index+1].join("\n").matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re\nf/g)]
        .map(m=>({x:Number(m[1])/scale,y:height-Number(m[2])/scale,w:Number(m[3])/scale,h:-Number(m[4])/scale}));
      expect(rectangles.length).toBeGreaterThan(0);
      const printed:boolean[]=[],expected:boolean[]=[];
      for(let row=0;row<size;row++)for(let column=0;column<size;column++) {
        const x=defaultLabelTemplate.width-33+(column+.5)*moduleSize,y=46+(row+.5)*moduleSize;
        printed.push(rectangles.some(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h));
        expected.push(row>=2&&row<size-2&&column>=2&&column<size-2&&!!matrix.get(row-2,column-2));
      }
      expect(printed).toEqual(expected);
    }
    expect(JSON.stringify(order)).toBe(before);
  });
});
