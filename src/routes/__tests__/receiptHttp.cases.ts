import express from "express";
import type { ReceiptResult } from "../../services/ReceiptCommitmentService";
import type { Server } from "node:http";
import type { DataSource } from "typeorm";
import { expect, vi } from "vitest";
import { AppDataSource } from "../../db";
import { authenticateJwt } from "../../middleware/auth";
import purchaseOrderRouter from "../v1/purchase-order";
import { supplyPlanningRouter } from "../v1/supply-planning";
import type { TrustedLedgerAuthority, LedgerRequest } from "../../security/TrustedLedgerAuthority";

type ReceiptRequest=Extract<LedgerRequest,{action:"receipt"}>;
export async function withPurchasingHttp<T>(db:DataSource,authority:TrustedLedgerAuthority,access:string,
  run:(send:(request:Extract<LedgerRequest,{action:"purchaseRequest"|"purchaseOrder"}>,status?:number,body?:unknown)=>Promise<any>,read:()=>Promise<any>)=>Promise<T>) {
  const app=express();app.use(express.json());app.use(supplyPlanningRouter(db,authority));
  const server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
  try {
    const address=server.address();if(!address||typeof address==="string")throw Error("Missing port");
    const base=`http://127.0.0.1:${address.port}`,headers={Authorization:`Bearer ${access}`,"Content-Type":"application/json"};
    return await run(async(r,status,body)=>{
      const response=await fetch(`${base}/operator/${r.action==="purchaseRequest"?"requests":"orders"}/${r.input.id}/${r.input.transition}`,{
        method:"POST",headers:{...headers,"Idempotency-Key":r.key},body:JSON.stringify(body??r.input)});
      const result=await response.json();expect(response.status,JSON.stringify(result)).toBe(status??(r.input.transition==="create"?201:200));return result;
    },async()=>{const response=await fetch(`${base}/trusted-purchasing`,{headers});const result=await response.json();expect(response.status,JSON.stringify(result)).toBe(200);return result;});
  } finally {server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
export async function withReceiptHttp<T>(db:DataSource,authority:TrustedLedgerAuthority,access:string,
  run:(send:(request:ReceiptRequest,capability:string,options?:{access?:string;body?:unknown;path?:string;status?:number;closed?:boolean;legacy?:boolean;operator?:boolean})=>Promise<ReceiptResult>,readCoverage:()=>Promise<any>)=>Promise<T>) {
  const app=express();app.use(express.json());app.use("/api/v1/supply-planning",supplyPlanningRouter(db,authority));
  app.use("/closed",supplyPlanningRouter(db));
  app.use("/legacy",authenticateJwt,purchaseOrderRouter);
  const server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
  try {
    const address=server.address();if(!address||typeof address==="string")throw Error("Missing HTTP port");
    return await run(async(request,capability,options={})=>{
      const i=request.input,path=(options.operator?"/operator":"")+(i.transition==="receive"?`/orders/${i.order}/receipts`:`/receipts/${i.id}/${i.transition}`);
      const repository=options.legacy?vi.spyOn(AppDataSource,"getRepository").mockImplementation(db.getRepository.bind(db)):undefined;
      try {
      const response=await fetch(`http://127.0.0.1:${address.port}${options.legacy?"/legacy":options.closed?"/closed":"/api/v1/supply-planning"}${options.legacy?`/${i.order}/receive`:options.path??path}`,{
        method:"POST",headers:{Authorization:`Bearer ${options.access??access}`,"Content-Type":"application/json",
          "Idempotency-Key":request.key,"X-Ledger-Capability":capability},body:JSON.stringify(options.body??i)});
      const body=await response.json();expect(response.status,JSON.stringify(body)).toBe(options.status??(i.transition==="receive"?201:200));return body;
      } finally {repository?.mockRestore();}
    },async()=>{
      const response=await fetch(`http://127.0.0.1:${address.port}/api/v1/supply-planning/trusted-receipts`,{headers:{Authorization:`Bearer ${access}`}});
      expect(response.status).toBe(200);return response.json();
    });
  } finally {server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
