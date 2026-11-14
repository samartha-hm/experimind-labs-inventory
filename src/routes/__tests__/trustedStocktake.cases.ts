import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import type { DataSource } from 'typeorm';
import { InventoryItem } from '../../entity/InventoryItem';
import { User } from '../../entity/User';
import { StocktakeService } from '../../services/StocktakeService';
import { AuthService } from '../../services/AuthService';
import type { TrustedLedgerAuthority } from '../../security/TrustedLedgerAuthority';

export async function verifyTrustedStocktake(h: { db: DataSource; runtime: DataSource; identity: DataSource; admin: User; password: string }, authority: TrustedLedgerAuthority, token: string) {
  const service = new StocktakeService(h.runtime), org = h.admin.organization_id;
  const item = await h.db.getRepository(InventoryItem).save({organization_id:org,name:'SIMULATED restricted stocktake',unit:'pcs',sku:randomUUID(),base_price:0,quantity:987,threshold:0});
  async function approved(quantity: string) {
    let s = await service.create(org,h.admin.id,'SIMULATED authority count','',[{item_id:item.id,locations:['Synthetic shelf'],complete_coverage:true}]);
    s = await service.count(org,s.id,h.admin.id,s.revision,item.id,'Synthetic shelf',quantity,'pcs');
    s = await service.transition(org,s.id,h.admin.id,s.revision,'review','SIMULATED test evidence');
    return service.transition(org,s.id,h.admin.id,s.revision,'approve','');
  }
  const source = await approved('12');
  // This is the production-role regression: the runtime path must stay unable to post.
  await expect(service.transition(org,source.id,h.admin.id,source.revision,'post','')).rejects.toThrow(/permission denied/);
  expect((await service.view(org,source.id)).session.status).toBe('approved');
  expect(await service.ledger(org,item.id)).toEqual([]);
  await expect(authority.postStocktakeForSession(token,source.id,source.revision-1)).rejects.toThrow(/changed/);
  const results = await Promise.all([1,2].map(() => authority.postStocktakeForSession(token,source.id,source.revision)));
  expect(results[0]).toEqual(results[1]);
  const ledger = await service.ledger(org,item.id);
  expect(ledger).toHaveLength(1);
  expect(ledger[0]).toMatchObject({actor_id:h.admin.id,stocktake_id:source.id,qty_delta:'12.0000',running_balance:'12.0000'});
  expect((await service.history(org,source.id))[0]).toMatchObject({actor_id:h.admin.id,snapshot:{status:'posted'}});
  expect((await h.db.getRepository(InventoryItem).findOneByOrFail({id:item.id})).quantity).toBe(987);
  await authority.postStocktakeForSession(token,source.id,source.revision);
  expect(await service.ledger(org,item.id)).toEqual(ledger);
  // Two reviewed counts cannot both overwrite the same physical sequence.
  const a = await approved('13'), b = await approved('14');
  await authority.postStocktakeForSession(token,a.id,a.revision);
  await expect(authority.postStocktakeForSession(token,b.id,b.revision)).rejects.toThrow(/Stock changed/);
  expect((await service.view(org,b.id)).session.status).toBe('approved');
  const unchanged = await service.ledger(org,item.id);
  await h.identity.getRepository(User).update(h.admin.id,{role:'viewer'});
  try { await expect(authority.postStocktakeForSession(token,source.id,source.revision)).rejects.toThrow(/administrator/); }
  finally { await h.identity.getRepository(User).update(h.admin.id,{role:'admin'}); }
  // Managers retain the stocktake-only permission; general ledger capabilities remain admin-only.
  await h.identity.getRepository(User).update(h.admin.id,{role:'manager'});
  try {
    const managerToken = (await new AuthService(h.identity).login(h.admin.email,h.password)).token!;
    expect((await authority.postStocktakeForSession(managerToken,source.id,source.revision)).status).toBe('posted');
    await expect(authority.issue(managerToken,{action:'createAccount',key:randomUUID(),input:{} as never})).rejects.toThrow(/administrator/);
  } finally { await h.identity.getRepository(User).update(h.admin.id,{role:'admin'}); }
  const revoked = await new AuthService(h.identity).login(h.admin.email,h.password);
  await new AuthService(h.identity).revokeRefreshToken(revoked.refreshToken!);
  await expect(authority.postStocktakeForSession(revoked.token!,source.id,source.revision)).rejects.toThrow();
  expect(await service.ledger(org,item.id)).toEqual(unchanged);
}
