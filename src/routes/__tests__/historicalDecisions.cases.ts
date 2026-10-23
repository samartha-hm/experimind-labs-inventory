import express from "express";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { InventoryItem } from "../../entity/InventoryItem";
import { expect } from "vitest";
import { stocktakeRouter } from "../v1/stocktakes";
import type { verifyWorkOrderAuthority } from "./workOrderAuthority.cases";
import type { TrustedLedgerAuthority } from "../../security/TrustedLedgerAuthority";
import { historicalDecisionStates, reconciliationSources, type HistoricalDecisionInput, type HistoricalDecisionRecord, type ReconciliationPreview } from "../../features/inventory/reconciliationTypes";

export async function verifyHistoricalDecisions(h: Parameters<typeof verifyWorkOrderAuthority>[0], authority: TrustedLedgerAuthority, token: string) {
  const app=express(); app.use(express.json()); app.use("/review",stocktakeRouter(h.runtime,authority));
  const server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
  const address=server.address(); if(!address||typeof address==="string")throw Error("Missing port");
  const base=`http://127.0.0.1:${address.port}/review/reconciliation`;
  const submit=async(input:unknown,key:string,expected=201,credential=token):Promise<HistoricalDecisionRecord>=>{
    const r=await fetch(`${base}/decisions`,{method:"POST",headers:{Authorization:`Bearer ${credential}`,"Content-Type":"application/json","Idempotency-Key":key},body:JSON.stringify(input)});
    const body=await r.json(); expect(r.status,JSON.stringify(body)).toBe(expected); return body;
  };
  const tables=[...reconciliationSources,"stock_ledger","commitment_balances","commitment_claims","commitment_events","production_output_custody","trusted_packing_allocations","trusted_delivery_receipts","site_installations","project_completions"];
  const fingerprint=async()=>Object.fromEntries(await Promise.all(tables.map(async t=>[t,(await h.db.query(`SELECT count(*)::int count,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${t} t`))[0]])));
  try {
    const before=await fingerprint();
    const preview:ReconciliationPreview=await (await fetch(`${base}?source=inventory_items`,{headers:{Authorization:`Bearer ${token}`}})).json();
    expect(preview.decisionsEnabled).toBe(true); const record=preview.records[0]; expect(record).toBeDefined();
    const input:HistoricalDecisionInput={source:"inventory_items",record_id:record.id,revision:0,evidence_hash:record.evidenceHash,decision:"accepted_for_review",reason:"Synthetic provenance reviewed; no operational authorization",evidence_refs:[{identifier:`synthetic:${record.id}`,provenance:"Isolated D5 fixture export; review only",sha256:record.evidenceHash}]};
    const key=randomUUID(); const pair=await Promise.all([submit(input,key),submit(input,key)]);
    expect(pair[0]).toEqual(pair[1]); expect(pair[0].actor_id).toBe(h.admin.id);
    await submit({...input,reason:"Altered replay"},key,409);
    await submit(input,randomUUID(),409);
    await submit({...input,revision:1,evidence_hash:"0".repeat(64)},randomUUID(),409);
    await submit({...input,actor_id:h.other.id},randomUUID(),400);
    await submit({...input,evidence_refs:[]},randomUUID(),400);
    await submit({...input,record_id:randomUUID()},randomUUID(),404);
    await submit(input,randomUUID(),401,token.slice(0,-8)+"forgedxx");
    const expired=jwt.sign({sub:h.admin.id,orgId:h.admin.organization_id,role:"admin"},env.jwtSecret,{expiresIn:-1});
    await submit(input,randomUUID(),401,expired);
    const viewer=jwt.sign({sub:h.admin.id,orgId:h.admin.organization_id,role:"viewer"},env.jwtSecret,{expiresIn:"1m"});
    await submit(input,randomUUID(),403,viewer);
    const foreign=await h.db.getRepository(InventoryItem).findOneByOrFail({organization_id:h.other.organization_id});
    await submit({...input,record_id:foreign.id},randomUUID(),404);
    let previous=pair[0]; const requests=[{key,input,result:previous}];
    for(const decision of historicalDecisionStates.slice(1)) {
      const next={...input,revision:previous.revision,decision}; const nextKey=randomUUID();
      const result=await submit(next,nextKey); expect(result.previous_id).toBe(previous.id); expect(result.revision).toBe(previous.revision+1);
      requests.push({key:nextKey,input:next,result}); previous=result;
    }
    const competing={...input,revision:previous.revision,decision:"disputed" as const};
    const race=await Promise.all([randomUUID(),randomUUID()].map(async key=>fetch(`${base}/decisions`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json","Idempotency-Key":key},body:JSON.stringify(competing)})));
    expect(race.map(r=>r.status).sort()).toEqual([201,409]);
    for(const sql of ["UPDATE trusted_historical_decisions SET reason='rewrite'","DELETE FROM trusted_historical_decisions","TRUNCATE trusted_historical_decisions","UPDATE audit_logs SET action='rewrite' WHERE entity_type='historical_review'"])
      await expect(h.db.query(sql)).rejects.toMatchObject({code:"23514"});
    await expect(h.runtime.query("INSERT INTO trusted_historical_decisions DEFAULT VALUES")).rejects.toMatchObject({code:"42501"});
    await expect(h.writer.query("UPDATE trusted_historical_decisions SET reason='rewrite'")).rejects.toMatchObject({code:"42501"});
    expect(await fingerprint()).toEqual(before);
    const after:ReconciliationPreview=await (await fetch(`${base}?source=inventory_items`,{headers:{Authorization:`Bearer ${token}`}})).json();
    expect(after.records.find(r=>r.id===record.id)?.decisions).toHaveLength(6);
    expect(after.records.find(r=>r.id===record.id)?.verifiedQuantity).toBeNull();
    h.evidence.historical_decisions={http:"PASS",states:historicalDecisionStates,concurrency:"one winner; exact duplicate returns same receipt",operational_before:before,operational_after:await fingerprint(),requests};
  } finally {server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
