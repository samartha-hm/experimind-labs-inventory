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
});
