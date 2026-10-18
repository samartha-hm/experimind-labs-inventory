import express from "express";
import type { Server } from "node:http";
import { expect } from "vitest";
import { TrustedLedgerAuthority, type LedgerRequest } from "../../security/TrustedLedgerAuthority";

/** Disposable server adapter exercises the public input boundary without mounting a production route. */
export async function reservationHttpChecks(authority:TrustedLedgerAuthority,access:string,capability:string,request:LedgerRequest,
  saved:unknown,snapshot:()=>Promise<unknown>) {
  const app=express();app.use(express.json());
  app.post("/reservation",async(req,res)=>{
    try {res.json(await authority.perform(req.headers.authorization?.replace(/^Bearer /,"")??"",req.body));}
    catch {res.status(403).json({error:"Reservation authority required"});}
  });
  const server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
  try {
    const address=server.address();if(!address||typeof address==="string")throw Error("Missing HTTP port");
    const before=await snapshot();
    for(const bearer of ["",access,"forged-administrator"]) {
      const response=await fetch(`http://127.0.0.1:${address.port}/reservation`,{method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${bearer}`},
        body:JSON.stringify({...request,actor_id:"caller-controlled",organization_id:"caller-controlled",role:"admin"})});
      expect(response.status).toBe(403);await response.text();
    }
    const success=await fetch(`http://127.0.0.1:${address.port}/reservation`,{method:"POST",
      headers:{"Content-Type":"application/json",Authorization:`Bearer ${capability}`},body:JSON.stringify(request)});
    expect(success.status).toBe(200);expect(await success.json()).toEqual(saved);
    expect(await snapshot()).toEqual(before);
  } finally {await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
