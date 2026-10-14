import { afterAll,beforeAll,describe,expect,it,vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.ts";
vi.mock("../tenant.ts",()=>({requireTenant:(req:express.Request,res:express.Response,next:express.NextFunction)=>{
  if(!req.user?.orgId || req.user.orgId==="00000000-0000-0000-0000-000000000000")return res.status(403).json({error:"Explicit organization required"});next();
}}));
import { advancedOperationsGate } from "../advancedOperationsGate";
describe("advanced mutation pilot boundary",()=>{
  let server:Server,base:string,calls=0;
  beforeAll(async()=>{const app=express();app.use(["/api/v1/qms","/api/v1/e-signature"],advancedOperationsGate);app.use((_req,res)=>{calls++;res.json({history:true});});
    server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;});
  afterAll(async()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())));
  it.each(["/api/v1/qms/rmas/synthetic/disposition","/api/v1/qms/inspections/synthetic/results","/api/v1/e-signature/verify"])("blocks unauthenticated and authenticated mutations at %s",async path=>{
    const before=calls;expect((await fetch(base+path,{method:"POST"})).status).toBe(401);
    const token=jwt.sign({sub:"22222222-2222-4222-8222-222222222222",role:"admin",orgId:"11111111-1111-4111-8111-111111111111"},env.jwtSecret,{expiresIn:"1m"});
    for(const method of ["POST","PATCH","DELETE"]){const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`}});expect(r.status).toBe(503);expect(await r.json()).toHaveProperty("code","ADVANCED_OPERATIONS_DISABLED");}
    expect(calls).toBe(before);
  });
  it("allows existing read routes to perform their own tenant authentication",async()=>{expect((await fetch(base+"/api/v1/qms/inspections")).status).toBe(200);});
});
