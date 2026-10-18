import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import type { DataSource } from "typeorm";
import { AddCommitmentLedger1792540800015 } from "../../migration/1792540800015-AddCommitmentLedger";
import { CommitmentLedgerService, planningStock, planningUnits, replayCommitments } from "../../services/CommitmentLedgerService";
import type { LedgerContext, LedgerOperation, LedgerSource } from "../../services/CommitmentLedgerService";
import { CommitmentShadowService } from "../../services/CommitmentShadowService";
import { planningFixture } from "../../features/projects/__tests__/planningFixture";

interface Harness {
  db: DataSource; admin: any; maker: any; other: any; wire: any;
  newProject: (...args: any[]) => Promise<any>; approve: (id: string, revision?: number) => Promise<any>;
  save: (id: string, body: unknown) => Promise<any>;
  fingerprint: () => Promise<unknown>; evidence: Record<string, unknown>;
}
/** Runs after the unchanged approval/packing scenarios, against their populated isolated schema. */
export function commitmentFoundationTests(get: () => Harness) {
  let before: unknown;
  const ctx = (u = get().admin): LedgerContext => ({ organization: u.organization_id, actor: u.id });
  const service = () => new CommitmentLedgerService(get().db);
  const source = (id = randomUUID(), slice = "whole"): LedgerSource => ({ kind: "synthetic:stage", id, slice });
  async function fixture(custom?: ReturnType<typeof planningFixture>) {
    const h = get(), f = await h.newProject(h.maker, custom ?? planningFixture(h.wire.id));
    const approval = await h.approve(f.project.id);
    const site = f.project.sites[0].id;
    const account = await service().createAccount(ctx(), { project: f.project.id, site, obligation: "wire", dimension: "material", item: h.wire.id, unit: "m", selector: { item: h.wire.id } });
    const [demand] = await h.db.query(`SELECT sum((l->>'quantity')::numeric)::text cap,jsonb_agg(l ORDER BY l::text) proof
      FROM requirement_approvals a,LATERAL jsonb_array_elements(a.snapshot->'lines') l
      WHERE a.id=$1 AND l->>'site_id'=$2 AND l->>'inventory_item_id'=$3 AND l ? 'material_id'`, [approval.id, site, h.wire.id]);
    const entitlement = await service().entitlement(ctx(), account, approval.id, 1, demand.cap, demand.proof);
    const run = (op: LedgerOperation, key = randomUUID(), context = ctx()) => service().execute(context, account, entitlement, key, "Synthetic conservation verification", op);
    await run({ kind: "authorize", payload: {} });
    return { ...f, approval, site, account, entitlement, demand, run };
  }
  async function replay(account: string) {
    const events = await get().db.query("SELECT * FROM commitment_events WHERE account_id=$1 ORDER BY sequence", [account]);
    const entitlements = await get().db.query("SELECT * FROM commitment_entitlements WHERE account_id=$1", [account]);
    const result = replayCommitments(events, entitlements);
    if (events.length) expect(() => replayCommitments([{...events[0],approved_after:"999"},...events.slice(1)],entitlements)).toThrow();
    const [b] = await get().db.query("SELECT * FROM commitment_balances WHERE account_id=$1", [account]);
    expect(result).toEqual({ approved: planningUnits(b.approved), fulfilled: planningUnits(b.fulfilled), held: planningUnits(b.held) });
    const [claims] = await get().db.query("SELECT coalesce(sum(held),0)::text h,coalesce(sum(fulfilled),0)::text f FROM commitment_claims WHERE account_id=$1", [account]);
    expect(planningUnits(claims.h)).toBe(result.held); expect(planningUnits(claims.f)).toBe(result.fulfilled);
    return { events: events.length, approved: b.approved, fulfilled: b.fulfilled, held: b.held };
  }
  it("13M-D1 migrates an empty prerequisite schema without operational rows", async () => {
    const runner = get().db.createQueryRunner(), schema = `commitment_empty_${randomUUID().replaceAll("-", "")}`;
    await runner.connect(); await runner.startTransaction();
    try {
      await runner.query(`CREATE SCHEMA ${schema}`);
      for (const table of ["planning_projects", "planning_sites", "requirement_approvals", "users"])
        await runner.query(`CREATE TABLE ${schema}.${table} (LIKE ${table} INCLUDING ALL)`);
      await runner.query(`SET LOCAL search_path TO ${schema},public`);
      const migration = new AddCommitmentLedger1792540800015();
      await migration.up(runner); await migration.down(runner); await migration.up(runner);
      expect((await runner.query("SELECT count(*)::int n FROM commitment_events"))[0].n).toBe(0);
      get().evidence.commitment_empty_migration = { empty_prerequisite_schema: true, up_down_up: "PASS", cleanup: "transaction rollback" };
    } finally { await runner.rollbackTransaction(); await runner.release(); }
  });
  it("13M-D1 migrates populated synthetic schema and removes only an entirely empty ledger", async () => {
    before = await get().fingerprint();
    const runner = get().db.createQueryRunner(); await runner.connect(); await runner.startTransaction();
    try {
      const m = new AddCommitmentLedger1792540800015(); await m.up(runner); await m.down(runner); await m.up(runner);
      await runner.commitTransaction();
    } catch (e) { await runner.rollbackTransaction(); throw e; } finally { await runner.release(); }
    expect(await get().fingerprint()).toEqual(before);
    get().evidence.commitment_migration = { populated_operational_schema: true, empty_ledger_up_down_up: "PASS", before };
  });
  it("13M-D1 conserves holds across stages, consumption, cancellation and retained-source reuse", async () => {
    const f = await fixture(), claim = randomUUID(), original = source();
    await f.run({ kind: "open", payload: { claim, quantity: "2.4", source: original } });
    await expect(f.run({ kind: "open", payload: { claim: randomUUID(), quantity: "0.0001", source: source() } })).rejects.toThrow();
    await f.run({ kind: "transfer", payload: { claim, source: source() } });
    expect((await replay(f.account)).held).toBe("2.4");
    await f.run({ kind: "consume", payload: { claim, quantity: "1.2" } });
    await expect(f.run({ kind: "release", payload: { claim, quantity: "2.4", untouched: true, unencumbered: true, evidence: "incorrect whole cancellation" } })).rejects.toThrow();
    await f.run({ kind: "release", payload: { claim, quantity: "1.2", untouched: true, unencumbered: true, evidence: "synthetic unencumbered remainder verified" } });
    await expect(f.run({ kind: "open", payload: { claim: randomUUID(), quantity: "0.1", source: original } })).rejects.toThrow();
    get().evidence.commitment_conservation = await replay(f.account);
    expect(await replay(f.account)).toMatchObject({ fulfilled: "1.2", held: "0.0" });
  });
  it("13M-D1 serializes capacity races and same-key retries; rejects conflicting payloads", async () => {
    const f = await fixture(), attempt = () => f.run({ kind: "open", payload: { claim: randomUUID(), quantity: "1.5", source: source() } });
    const results = await Promise.allSettled([attempt(), attempt()]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const op: LedgerOperation = { kind: "open", payload: { claim: randomUUID(), quantity: "0.2", source: source() } }, key = randomUUID();
    const retries = await Promise.all([f.run(op, key), f.run(op, key)]);
    expect(retries[0].id).toBe(retries[1].id);
    await expect(f.run({ ...op, payload: { ...op.payload, quantity: "0.3" } }, key)).rejects.toThrow("conflicts");
    const duplicateSource = source();
    const duplicates = await Promise.allSettled([1, 2].map(() => f.run({kind:"open",payload:{claim:randomUUID(),quantity:"0.1",source:duplicateSource}})));
    expect(duplicates.filter(r => r.status === "fulfilled")).toHaveLength(1);
    get().evidence.commitment_concurrency = { capacity_successes: 1, same_key_event: retries[0].id, duplicate_source_successes: 1, projection: await replay(f.account) };
  });
  it("13M-D1 partitions an untouched slice and explicit remainder without minting capacity", async () => {
    const f = await fixture(), parent = randomUUID(), child = randomUUID();
    await f.run({ kind: "open", payload: { claim: parent, quantity: "2", source: source() } });
    await expect(f.run({ kind: "split", payload: { claim: parent, children: [{ claim: randomUUID(), quantity: "0.5", source: source() }, { claim: randomUUID(), quantity: "0.5", source: source() }] } })).rejects.toThrow();
    await f.run({ kind: "split", payload: { claim: parent, children: [{ claim: child, quantity: "0.5", source: source() }, { claim: randomUUID(), quantity: "1.5", source: source() }] } });
    await expect(f.run({ kind: "consume", payload: { claim: parent, quantity: "0.1" } })).rejects.toThrow();
    await f.run({ kind: "consume", payload: { claim: child, quantity: "0.2" } });
    await expect(f.run({ kind: "split", payload: { claim: child, children: [] } })).rejects.toThrow();
    expect(await replay(f.account)).toMatchObject({ fulfilled: "0.2", held: "1.8" });
  });
  it("13M-D1 enforces tenant, actor, approval identity, exact stock precision and SQL immutability", async () => {
    const h = get(), f = await fixture(), claim = randomUUID();
    const op: LedgerOperation = { kind: "open", payload: { claim, quantity: "0.100001", source: source() } };
    await expect(f.run(op, randomUUID(), ctx(h.other))).rejects.toThrow();
    await expect(f.run(op, randomUUID(), ctx(h.maker))).rejects.toThrow();
    await expect(service().entitlement(ctx(), f.account, f.approval.id, 2, "2.4", f.demand.proof)).rejects.toThrow();
    await expect(service().entitlement(ctx(), f.account, f.approval.id, 1, "9", {})).rejects.toThrow();
    await f.run(op);
    await expect(f.run({ kind: "consume", payload: { claim, quantity: "0.000001" } })).rejects.toThrow();
    expect(planningStock("0.100000")).toBe("0.1000");
    for (const q of ["0.000001", "100000000", "1e2", "-1", "0.1234567"]) expect(() => planningStock(q)).toThrow();
    const [event] = await h.db.query("SELECT * FROM commitment_events WHERE account_id=$1 ORDER BY sequence LIMIT 1", [f.account]);
    for (const sql of [
      `UPDATE commitment_events SET reason='tampered' WHERE id='${event.id}'`,
      `DELETE FROM commitment_events WHERE id='${event.id}'`,
      `UPDATE commitment_balances SET approved=999 WHERE account_id='${f.account}'`,
      `DELETE FROM commitment_claims WHERE id='${claim}'`,
      `UPDATE commitment_entitlements SET cap=9 WHERE id='${f.entitlement}'`,
      `UPDATE commitment_accounts SET site_id='${randomUUID()}' WHERE id='${f.account}'`,
      "TRUNCATE commitment_events", "TRUNCATE commitment_claims CASCADE",
    ]) await expect(h.db.query(sql)).rejects.toThrow();
    await expect(h.db.query(`INSERT INTO commitment_events(organization_id,account_id,entitlement_id,actor_id,key,kind,payload,reason)
      VALUES($1,$2,$3,$4,$5,'release',$6,'forged release')`, [ctx().organization,f.account,f.entitlement,ctx().actor,randomUUID(),JSON.stringify({claim,quantity:"0.1"})])).rejects.toThrow();
    await expect(f.run({kind:"open",payload:{claim:randomUUID(),quantity:"1e-2",source:source()}})).rejects.toThrow();
    await replay(f.account);
  });
  it("13M-D1 rolls back event, source history, claim and balance on injected transaction failure", async () => {
    const h=get(),f=await fixture(),claim=randomUUID(),key=randomUUID(),op:LedgerOperation={kind:"open",payload:{claim,quantity:"1",source:source()}};
    const previous=await replay(f.account);
    await expect(h.db.transaction(async m=>{await service().executeInTransaction(m,ctx(),f.account,f.entitlement,key,"Synthetic conservation verification",op);throw new Error("injected failure");})).rejects.toThrow("injected failure");
    expect(await replay(f.account)).toEqual(previous);
    expect(await h.db.query("SELECT * FROM commitment_claims WHERE id=$1",[claim])).toHaveLength(0);
    await f.run(op,key);await replay(f.account);
  });
  it("13M-D1 preserves F/H under total-to-date revisions and rejects stale retries and underfunded caps", async () => {
    const h=get(),f=await fixture(),claim=randomUUID(),key=randomUUID(),op:LedgerOperation={kind:"open",payload:{claim,quantity:"2",source:source()}};
    await f.run(op,key);await f.run({kind:"consume",payload:{claim,quantity:"1"}});
    const content=structuredClone(f.content);content.sites[0].selections[0].context.complete_sets[Object.keys(content.sites[0].selections[0].context.complete_sets)[0]]=0;
    await h.save(f.project.id,{revision:1,...content});const a2=await h.approve(f.project.id,2);
    await expect(f.run(op,key)).rejects.toThrow();
    const [d]=await h.db.query(`SELECT sum((l->>'quantity')::numeric)::text cap,jsonb_agg(l ORDER BY l::text) proof FROM requirement_approvals a,LATERAL jsonb_array_elements(a.snapshot->'lines') l WHERE a.id=$1 AND l->>'site_id'=$2 AND l ? 'material_id'`,[a2.id,f.site]);
    expect(d.cap).toBe("1.8");
    const e2=await service().entitlement(ctx(),f.account,a2.id,2,d.cap,d.proof);
    await expect(service().execute(ctx(),f.account,e2,randomUUID(),"Underfunded revised total",{kind:"authorize",payload:{}})).rejects.toThrow();
    // Increase a later total to 3.3: retained F=1,H=1 leaves only 1.3, never a fresh 3.3.
    content.sites[0].selections[0].context.grade_quantities=Object.fromEntries(Object.keys(content.sites[0].selections[0].context.grade_quantities).map((k,i)=>[k,i===0?5:3]));
    await h.save(f.project.id,{revision:2,...content});const a3=await h.approve(f.project.id,3);
    const [d3]=await h.db.query(`SELECT sum((l->>'quantity')::numeric)::text cap,jsonb_agg(l ORDER BY l::text) proof FROM requirement_approvals a,LATERAL jsonb_array_elements(a.snapshot->'lines') l WHERE a.id=$1 AND l->>'site_id'=$2 AND l ? 'material_id'`,[a3.id,f.site]);
    const e3=await service().entitlement(ctx(),f.account,a3.id,3,d3.cap,d3.proof);
    await service().execute(ctx(),f.account,e3,randomUUID(),"Revised total cap",{kind:"authorize",payload:{}});
    expect(await replay(f.account)).toMatchObject({fulfilled:"1",held:"1"});
    get().evidence.commitment_revision={rejected_cap:d.cap,accepted_cap:d3.cap,projection:await replay(f.account)};
  });
  it("13M-D1 derives separate school, grade/common/universal and independent Maths entitlements", async () => {
    const h=get(),custom=planningFixture(h.wire.id);custom.content.sites[0].selections[0].context.grade_quantities[custom.mathGradeId]=1;
    const f=await fixture(custom);expect(f.demand.cap).toBe("2.8");
    const site=f.project.sites[0],selection=site.selections[0];
    for(const selector of [{selection:selection.id,grade:custom.gradeIds[0]},{selection:selection.id,grade:custom.mathGradeId},{selection:selection.id,crate:custom.universalId},{selection:selection.id,crate:custom.subjects[0].crates![0].id}]) {
      const account=await service().createAccount(ctx(),{project:f.project.id,site:site.id,obligation:JSON.stringify(selector),dimension:"slot",item:"",unit:"slots",selector});
      const proof="grade" in selector?f.approval.snapshot.content.sites[0].selections[0]:f.approval.snapshot.lines.find((l:any)=>l.site_id===site.id&&l.selection_id===selection.id&&l.owner_id===selector.crate&&!l.material_id&&l.source==="crate");
      const cap="grade" in selector?String(selection.context.grade_quantities[selector.grade!]):String(proof.quantity);
      const entitlement=await service().entitlement(ctx(),account,f.approval.id,1,cap,proof);
      await service().execute(ctx(),account,entitlement,randomUUID(),"Slot total",{kind:"authorize",payload:{}});
      await expect(service().execute(ctx(),account,entitlement,randomUUID(),"Fractional slots",{kind:"open",payload:{claim:randomUUID(),quantity:"0.5",source:source()}})).rejects.toThrow();
      await replay(account);
    }
    await expect(service().createAccount(ctx(),{project:f.project.id,site:site.id,obligation:"duplicate wire",dimension:"material",item:h.wire.id,unit:"m",selector:{item:h.wire.id}})).rejects.toThrow();
    const accountB=await service().createAccount(ctx(),{project:f.project.id,site:f.project.sites[1].id,obligation:"wire",dimension:"material",item:h.wire.id,unit:"m",selector:{item:h.wire.id}});
    await expect(service().entitlement(ctx(),accountB,f.approval.id,1,"2.8",f.demand.proof)).rejects.toThrow();
  });
  it("13M-D1 shadow comparison is diagnostic, tenant-scoped and preserves all operational fingerprints", async () => {
    const h=get(),shadow=new CommitmentShadowService(h.db),result=await shadow.inspect(ctx());
    expect(result.label).toContain("DIAGNOSTIC ONLY");expect(result.recordCount).toBeGreaterThan(0);
    expect(result.diagnostics.some(d=>d.code==="missing_source_lineage")).toBe(true);
    expect((await shadow.inspect(ctx())).evidenceHash).toBe(result.evidenceHash);
    const [reservation] = await h.db.query("SELECT id FROM project_stock_reservations WHERE organization_id=$1 ORDER BY id LIMIT 1", [ctx().organization]);
    const link = { kind: "project_stock_reservations", source: reservation.id, claim: randomUUID() };
    expect((await shadow.inspect(ctx(), [link])).diagnostics.some(d=>d.code==="unproven_or_mismatched_lineage")).toBe(true);
    expect((await shadow.inspect(ctx(), [link,link])).diagnostics.some(d=>d.code==="potential_duplicate_commitment")).toBe(true);
    expect((await shadow.inspect(ctx(h.other))).recordCount).toBe(0);
    await expect(shadow.inspect(ctx(h.maker))).rejects.toThrow();
    const after=await h.fingerprint();expect(after).toEqual(before);
    h.evidence.commitment_shadow={...result,before,after,operational_tables_unchanged:true};
    const runner=h.db.createQueryRunner();await runner.connect();await runner.startTransaction();
    try{await expect(new AddCommitmentLedger1792540800015().down(runner)).rejects.toThrow("Preserve commitment evidence");await runner.rollbackTransaction();}finally{await runner.release();}
    h.evidence.commitment_rollback={populated_ledger_downgrade:"REFUSED",events_preserved:true};
  });
}
