import { randomUUID } from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import { expect } from 'vitest';
import type { DataSource } from 'typeorm';
import type { User } from '../../entity/User';
import { User as UserEntity } from '../../entity/User';
import { InventoryItem } from '../../entity/InventoryItem';
import { OperationalEvidenceService } from '../../services/OperationalEvidenceService';
import { StocktakeService } from '../../services/StocktakeService';
import { AuthService } from '../../services/AuthService';
import type { TrustedLedgerAuthority } from '../../security/TrustedLedgerAuthority';
import type { OperationalCommand } from '../../features/inventory/operationalEvidenceTypes';
import { stocktakeRouter } from '../v1/stocktakes';

export async function verifyOperationalEvidence(h: {db: DataSource; runtime: DataSource; writer: DataSource; identity: DataSource; admin: User; other: User; password: string; evidence: Record<string,unknown>}, authority: TrustedLedgerAuthority, token: string) {
  const org = h.admin.organization_id, service = new OperationalEvidenceService(h.runtime);
  const refs = [{identifier:'synthetic:operator-exercise',provenance:'SYNTHETIC TEST EVIDENCE',sha256:'a'.repeat(64)}];
  const password_hash = await bcrypt.hash(h.password,10);
  const counters = await Promise.all([1,2].map(n => h.db.getRepository(UserEntity).save({organization_id:org,name:`SYNTHETIC counter ${n}`,email:`${randomUUID()}@test.invalid`,role:'staff',password_hash,is_active:true})));
  const tokens = await Promise.all(counters.map(u => new AuthService(h.identity).login(u.email,h.password)));
  const app = express(); app.use(express.json()); app.use('/stock',stocktakeRouter(h.runtime,authority));
  const server = app.listen(0,'127.0.0.1'); await new Promise<void>(resolve => server.once('listening',resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw Error('Missing test port');
  async function post(command: OperationalCommand, access=token, key=randomUUID(), status=201) {
    const r = await fetch(`http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/stock/operational-evidence`,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(command)});
    const result = await r.json(); expect(r.status,JSON.stringify(result)).toBe(status); return result;
  }
  const evidence:OperationalCommand = {stream:randomUUID(),revision:0,action:'submit',data:{site:'WAREHOUSE',gate:'scanner',source:'external',record_identity:'SIMULATED scanner exercise',observed_at:new Date().toISOString(),classification:'SYNTHETIC TEST EVIDENCE',references:refs,notes:'SYNTHETIC TEST EVIDENCE'}};
  const physicalBefore = await h.db.query('SELECT count(*)::int n FROM stock_ledger');
  try {
    const key=randomUUID(), a=await post(evidence,token,key);
    expect(await post(evidence,token,key)).toEqual(a);
    await post({...evidence,data:{...evidence.data,gate:'printer'}},token,key,409);
    await post({...evidence,revision:1,action:'review',data:{decision:'REVIEWED',notes:'SYNTHETIC TEST EVIDENCE',references:refs}},token,randomUUID(),403);
    const reviewer = await h.db.getRepository(UserEntity).save({organization_id:org,email:`${randomUUID()}@test.invalid`,name:'SYNTHETIC reviewer',role:'manager',password_hash,is_active:true});
    const reviewToken=(await new AuthService(h.identity).login(reviewer.email,h.password)).token!;
    const review:OperationalCommand={...evidence,revision:1,action:'review',data:{decision:'MORE_EVIDENCE',notes:'SYNTHETIC TEST EVIDENCE',references:refs}};
    await post({...review,data:{...review.data,decision:'VERIFIED'}},reviewToken,randomUUID(),400);
    const race=await Promise.allSettled([1,2].map(()=>authority.performOperationalForSession(reviewToken,randomUUID(),review)));
    expect(race.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect((await service.list(org,h.admin.id,evidence.stream)).map(r=>r.revision)).toEqual([1,2]);
    expect(await service.list(h.other.organization_id,h.other.id,evidence.stream)).toEqual([]);
    await post({...evidence,stream:randomUUID(),data:{...evidence.data,site:h.other.id}},token,randomUUID(),404);
    for (const pool of [h.runtime,h.identity]) for (const sql of ['INSERT INTO operational_evidence_events DEFAULT VALUES','UPDATE operational_evidence_events SET revision=revision','DELETE FROM operational_evidence_events','TRUNCATE operational_evidence_events']) await expect(pool.query(sql)).rejects.toMatchObject({code:'42501'});
    await expect(h.writer.query('UPDATE operational_evidence_events SET revision=revision')).rejects.toMatchObject({code:'42501'});
    await expect(h.db.query('DELETE FROM operational_evidence_events')).rejects.toThrow(/append only/);
    const item=await h.db.getRepository(InventoryItem).save({organization_id:org,name:'SYNTHETIC blind count',unit:'pcs',sku:randomUUID(),quantity:876,base_price:0,threshold:0});
    const stock=new StocktakeService(h.runtime);
    const session=await stock.create(org,h.admin.id,'SYNTHETIC TEST EVIDENCE','',[{item_id:item.id,locations:['SYNTHETIC shelf'],complete_coverage:true}]);
    const scope=await post({stream:randomUUID(),revision:0,action:'assign',data:{stocktake_id:session.id,stocktake_revision:session.revision,item_id:item.id,location:'SYNTHETIC shelf',first_counter:counters[0].id,recount_counter:counters[1].id,classification:'SYNTHETIC TEST EVIDENCE',notes:'SYNTHETIC TEST EVIDENCE'}});
    const count=(revision:number,quantity:string|null):OperationalCommand=>({stream:scope.stream_id,revision,action:'count',data:{quantity,unit:'pcs',observed_at:new Date().toISOString(),references:refs,notes:'SYNTHETIC TEST EVIDENCE'}});
    expect(scope.snapshot.quantity).toBeNull();
    await post(count(1,'7'),tokens[1].token!,randomUUID(),403);
    const first=count(1,'7'),firstKey=randomUUID(); await post(first,tokens[0].token!,firstKey);
    const hidden=(await service.list(org,counters[1].id,scope.stream_id)).at(-1)!;
    expect(hidden.snapshot.observations).toEqual([]); expect(hidden.snapshot.quantity).toBeNull();
    await post(count(2,'8'),tokens[1].token!);
    expect((await service.list(org,h.admin.id,scope.stream_id)).at(-1)!.snapshot).toMatchObject({status:'DISPUTED',quantity:null});
    const reviewCount=(revision:number,action:'recount'|'reviewCount'):OperationalCommand=>({stream:scope.stream_id,revision,action,data:{references:refs,notes:'SYNTHETIC TEST EVIDENCE'}});
    await post(reviewCount(3,'reviewCount'),token,randomUUID(),409);
    await post(reviewCount(3,'recount')); await post(count(4,'8'),tokens[0].token!);
    await post(reviewCount(5,'reviewCount'));
    const summary=(await service.list(org,h.admin.id,scope.stream_id)).at(-1)!;
    expect(summary.snapshot).toMatchObject({status:'REVIEWED',quantity:'8.0000',classification:'SYNTHETIC TEST EVIDENCE'});
    expect(summary.snapshot.observations).toHaveLength(3);
    expect(await post(first,tokens[0].token!,firstKey)).toMatchObject({revision:2});
    // Reload through a new service instance; persisted observations never modify the stock ledger.
    expect(await new OperationalEvidenceService(h.runtime).list(org,h.admin.id,scope.stream_id)).toEqual(await service.list(org,h.admin.id,scope.stream_id));
    const revoked=await new AuthService(h.identity).login(counters[0].email,h.password);
    await new AuthService(h.identity).revokeRefreshToken(revoked.refreshToken!);
    await post(first,revoked.token!,firstKey,403);
    await stock.edit(org,session.id,h.admin.id,session.revision,session.name,'scope revised',session.targets);
    await post(reviewCount(6,'recount'),token,randomUUID(),409);
    expect(await h.db.query('SELECT count(*)::int n FROM stock_ledger')).toEqual(physicalBefore);
    h.evidence.operational_evidence={classification:'SYNTHETIC TEST EVIDENCE',http:'PASS',retry:'exact immutable result',review_concurrency:'one winner',blind_passes:3,physical_posting:'none',pilot:'NO-GO',retry_command:evidence,retry_key:key,retry_result:a,actor:h.admin.id};
  } finally {server.closeAllConnections(); await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
