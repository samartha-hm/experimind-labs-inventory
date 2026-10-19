import express from 'express';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { expect } from 'vitest';
import type { DataSource } from 'typeorm';
import type { User } from '../../entity/User';
import { env } from '../../config/env';
import { blockedExecutionTables, BlockUnintegratedExecution1792886400022 } from '../../migration/1792886400022-BlockUnintegratedExecution';
import { configureDatabaseBoundary, assertDatabaseBoundary } from '../../security/databaseBoundary';
import { PackingService } from '../../services/PackingService';
import { ProductionPlanningService } from '../../services/ProductionPlanningService';
import { ProjectCompletionService } from '../../services/ProjectCompletionService';
import { executionBlocker } from '../../services/ExecutionReadinessService';
import { packingRouter } from '../v1/packing';
import { productionPlanningRouter } from '../v1/production-planning';

/** Last synthetic activation: no legacy writer may bypass absent commitment adapters. */
export async function verifyExecutionBoundary(h: {db:DataSource;runtime:DataSource;writer:DataSource;identity:DataSource;
  admin:User;other:User;schema:string;roles:{runtime:string;identity:string;ledger:string};evidence:Record<string,unknown>}) {
  const tables=[...blockedExecutionTables,'stock_ledger','supply_operations','supply_events','requirement_execution_bindings',
    'commitment_claims','commitment_events','commitment_balances','commitment_sources'];
  const fingerprint=async()=>Object.fromEntries(await Promise.all(tables.map(async t=>[t,(await h.db.query(
    `SELECT count(*)::int count,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${t} t`))[0]])));
  const before=await fingerprint(), runner=h.db.createQueryRunner();
  await runner.connect();await runner.startTransaction();
  try { await new BlockUnintegratedExecution1792886400022().up(runner);await runner.commitTransaction(); }
  catch(e){await runner.rollbackTransaction();throw e;}finally{await runner.release();}
  await h.db.transaction(m=>configureDatabaseBoundary(m,h.schema,h.roles));
  for(const [pool,kind] of [[h.runtime,'runtime'],[h.identity,'identity'],[h.writer,'ledger']] as const)
    await assertDatabaseBoundary(pool,kind,h.schema);
  for(const table of blockedExecutionTables) {
    const [{attname}]=await h.db.query('SELECT attname FROM pg_attribute WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum LIMIT 1',[table]);
    const column='"'+attname.replaceAll('"','""')+'"';
    for(const sql of [`INSERT INTO ${table} DEFAULT VALUES`,`UPDATE ${table} SET ${column}=${column}`,`DELETE FROM ${table}`,`TRUNCATE ${table} CASCADE`]) {
      await expect(h.db.query(sql)).rejects.toMatchObject({code:'23514'});
      for(const pool of [h.runtime,h.identity,h.writer]) await expect(pool.query(sql)).rejects.toMatchObject({code:'42501'});
    }
  }
  await expect(h.db.query("INSERT INTO stock_ledger(transaction_type) VALUES('KIT_PRODUCTION')")).rejects.toMatchObject({code:'23514'});
  await expect(new PackingService(h.db).create(h.admin.organization_id,h.admin.id,randomUUID(),{batch_code:'BYPASS',manual:{name:'Detached',materials:[]}})).rejects.toThrow(executionBlocker);
  await expect(new ProductionPlanningService(h.db).create(h.admin.organization_id,h.admin.id,randomUUID(),{quantity:'1',unit:'ea'})).rejects.toThrow(executionBlocker);
  await expect(new ProjectCompletionService(h.db).completeProject(h.admin.organization_id,h.admin.id,randomUUID(),randomUUID(),
    {revision:1,project_revision:1,action:'close',notes:'Detached bypass'})).rejects.toThrow(executionBlocker);
  const app=express();app.use(express.json());app.use('/packing',packingRouter(h.runtime));app.use('/production',productionPlanningRouter(h.runtime));
  const server=await new Promise<Server>(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  try {
    const address=server.address();if(!address||typeof address==='string')throw Error('Missing HTTP port');
    const token=(u:User)=>jwt.sign({sub:u.id,orgId:u.organization_id,role:u.role},env.jwtSecret,{expiresIn:'5m'});
    const send=(path:string,method='GET',user:User=h.admin,body?:unknown)=>fetch(`http://127.0.0.1:${address.port}${path}`,{
      method,headers:{Authorization:`Bearer ${token(user)}`,'Content-Type':'application/json','Idempotency-Key':'d3-blocked-retry'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    for(const area of ['packing','production']) {
      const response=await send(`/${area}/execution-readiness`);expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toContain('no-store');
      expect(await response.json()).toEqual({execution_enabled:false,blocker:executionBlocker});
      expect((await send(`/${area}`)).status).toBe(200);
    }
    const requests=await Promise.all(Array.from({length:4},()=>send('/packing/orders','POST',h.admin,{batch_code:'BYPASS',manual:{name:'Detached',materials:[{item_id:randomUUID(),quantity:'1',unit:'ea'}]}})));
    for(const response of requests){expect(response.status).toBe(409);expect((await response.json()).error).toBe(executionBlocker);}
    const [order]=await h.db.query('SELECT id FROM packing_orders WHERE organization_id=$1 LIMIT 1',[h.admin.organization_id]);
    expect(order).toBeDefined();
    expect((await send(`/packing/orders/${order.id}`,'GET',h.other)).status).toBe(404);
    expect((await send(`/packing/orders/${order.id}`)).status).toBe(200);
    const unauthorized=await fetch(`http://127.0.0.1:${address.port}/packing/execution-readiness`);expect(unauthorized.status).toBe(401);
  } finally {server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
  expect(await fingerprint()).toEqual(before);
  h.evidence.d3_execution_boundary={verdict:'BLOCKED',schema_guard:'explicit synthetic activation',restricted_logins:3,
    tables:blockedExecutionTables,concurrent_retries:'409; no side effects',operational_fingerprints:before,
    legacy_and_detached_bypass:'REFUSED',read_only_http:'PASS',physical_output_without_custody:'REFUSED'};
}
