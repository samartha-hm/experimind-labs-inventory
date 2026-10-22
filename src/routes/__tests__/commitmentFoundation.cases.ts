import { AddLedgerCapabilities1792540800017 } from "../../migration/1792540800017-AddLedgerCapabilities";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import type { DataSource } from "typeorm";
import { AddCommitmentLedger1792540800015 } from "../../migration/1792540800015-AddCommitmentLedger";
import { HardenCommitmentEventEvidence1792540800016 } from "../../migration/1792540800016-HardenCommitmentEventEvidence";
import { CommitmentLedgerService, planningStock, planningUnits, replayCommitments } from "../../services/CommitmentLedgerService";
import type { LedgerContext, LedgerOperation, LedgerSource } from "../../services/CommitmentLedgerService";
import { CommitmentShadowService } from "../../services/CommitmentShadowService";
import { planningFixture } from "../../features/projects/__tests__/planningFixture";
import { trustedLedgerBoundaryTests } from "./trustedLedgerBoundary.cases";

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
      const hardening = new HardenCommitmentEventEvidence1792540800016();
      await hardening.up(runner); await hardening.down(runner); await hardening.up(runner);
      expect((await runner.query("SELECT count(*)::int n FROM commitment_events"))[0].n).toBe(0);
      get().evidence.commitment_empty_migration = { empty_prerequisite_schema: true, up_down_up: "PASS", cleanup: "transaction rollback" };
    } finally { await runner.rollbackTransaction(); await runner.release(); }
  });
  it("13M-D1 migrates populated synthetic schema and removes only an entirely empty ledger", async () => {
    before = await get().fingerprint();
    const runner = get().db.createQueryRunner(); await runner.connect(); await runner.startTransaction();
    try {
      const m = new AddCommitmentLedger1792540800015(); await m.up(runner); await m.down(runner); await m.up(runner);
      const hardening = new HardenCommitmentEventEvidence1792540800016();
      await hardening.up(runner); await hardening.down(runner); await hardening.up(runner);
      await new AddLedgerCapabilities1792540800017().up(runner);
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
  it("13M-D1R refuses discarded conflicting events without orphaning projections", async () => {
    const h = get(), f = await fixture(), claim = randomUUID(), key = randomUUID();
    await f.run({ kind: "open", payload: { claim, quantity: "1", source: source() } }, key);
    const previous = await replay(f.account);
    await expect(h.db.transaction(async m => {
      await m.query(`INSERT INTO commitment_events(organization_id,account_id,entitlement_id,actor_id,key,kind,payload,reason)
        VALUES($1,$2,$3,$4,$5,'consume',$6,'conflicting SQL retry') ON CONFLICT DO NOTHING`,
      [ctx().organization, f.account, f.entitlement, ctx().actor, key, JSON.stringify({ claim, quantity: "0.5" })]);
    })).rejects.toThrow();
    expect(await replay(f.account)).toEqual(previous);
  });
  it("13M-D1R rejects invalid quantities and serializes competing consume/release and parent operations", async () => {
    const f = await fixture(), claim = randomUUID();
    for (const quantity of ["-1", "0", "2.400001", "1000000001", "0.1234567"])
      await expect(f.run({ kind: "open", payload: { claim: randomUUID(), quantity, source: source() } })).rejects.toThrow();
    await f.run({ kind: "open", payload: { claim, quantity: "1", source: source() } });
    const outcomes = await Promise.allSettled([
      f.run({ kind: "consume", payload: { claim, quantity: "0.7" } }),
      f.run({ kind: "release", payload: { claim, quantity: "0.7", untouched: true, unencumbered: true, evidence: "Synthetic untouched remainder" } }),
    ]);
    expect(outcomes.filter(o => o.status === "fulfilled")).toHaveLength(1);
    await replay(f.account);
    const parent = randomUUID();
    await f.run({ kind: "open", payload: { claim: parent, quantity: "1", source: source() } });
    const parentOutcomes = await Promise.allSettled([
      f.run({ kind: "consume", payload: { claim: parent, quantity: "0.1" } }),
      f.run({ kind: "split", payload: { claim: parent, children: [
        { claim: randomUUID(), quantity: "0.5", source: source() },
        { claim: randomUUID(), quantity: "0.5", source: source() },
      ] } }),
    ]);
    expect(parentOutcomes.filter(o => o.status === "fulfilled")).toHaveLength(1);
    await replay(f.account);
  });
  it("13M-D1R characterizes restricted SQL role guards and caller-identity trust", async () => {
    const h = get(), f = await fixture(), role = `commitment_review_${randomUUID().replaceAll("-", "")}`;
    const runner = h.db.createQueryRunner();
    await runner.connect(); await runner.startTransaction();
    try {
      const [{ current_schema: schema }] = await runner.query("SELECT current_schema()");
      if (!/^requirement_test_[a-f0-9]+$/.test(schema)) throw new Error("Isolated test schema required");
      await runner.query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
      await runner.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
      await runner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${role}`);
      // The intentionally unsafe positive control must not depend on PUBLIC defaults
      // revoked by D1T provisioning in earlier runs of this isolated database.
      await runner.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ${schema} TO ${role}`);
      await runner.query(`SET LOCAL ROLE ${role}`);
      for (const sql of ["UPDATE commitment_balances SET approved=999", "DELETE FROM commitment_events", "CREATE TABLE commitment_unauthorized(id int)",
        "ALTER TABLE commitment_balances DISABLE TRIGGER ALL",
        "CREATE TRIGGER commitment_unauthorized BEFORE INSERT ON commitment_claims FOR EACH ROW EXECUTE FUNCTION commitment_projection_guard()"] ) {
        await runner.query("SAVEPOINT denied");
        await expect(runner.query(sql)).rejects.toThrow();
        await runner.query("ROLLBACK TO SAVEPOINT denied");
      }
      // Broad table DML trusts the supplied active administrator UUID; it is not authentication.
      const rows = await runner.query(`INSERT INTO commitment_events(organization_id,account_id,entitlement_id,actor_id,key,kind,payload,reason)
        VALUES($1,$2,$3,$4,$5,'open',$6,'Restricted role characterization') RETURNING id`,
      [ctx().organization, f.account, f.entitlement, ctx().actor, randomUUID(), JSON.stringify({ claim: randomUUID(), quantity: "0.1", source: source() })]);
      expect(rows).toHaveLength(1);
      await runner.query(`CREATE TEMP TABLE commitment_balances (LIKE ${schema}.commitment_balances) ON COMMIT DROP`);
      await runner.query(`INSERT INTO pg_temp.commitment_balances SELECT * FROM ${schema}.commitment_balances`);
      await runner.query("UPDATE pg_temp.commitment_balances SET approved=999");
      await runner.query("SAVEPOINT shadow");
      await expect(runner.query(`INSERT INTO ${schema}.commitment_events(organization_id,account_id,entitlement_id,actor_id,key,kind,payload,reason)
        VALUES($1,$2,$3,$4,$5,'open',$6,'Temporary table shadow attempt')`,
      [ctx().organization, f.account, f.entitlement, ctx().actor, randomUUID(), JSON.stringify({ claim: randomUUID(), quantity: "3", source: source() })])).rejects.toThrow();
      await runner.query("ROLLBACK TO SAVEPOINT shadow");
      await runner.query(`CREATE TEMP TABLE commitment_events (LIKE ${schema}.commitment_events) ON COMMIT DROP`);
      await runner.query("SET CONSTRAINTS ALL IMMEDIATE");
      h.evidence.commitment_role = { role: "NOLOGIN NOSUPERUSER, schema USAGE, table DML only", projection_tamper: "REFUSED", event_delete: "REFUSED", schema_create: "REFUSED", temporary_balance_shadow: "OVER-CAP REFUSED", temporary_event_shadow: "REAL WITNESS VERIFIED", supplied_admin_identity: "TRUSTED; integration prerequisite", cleanup: "transaction rollback" };
    } finally { await runner.rollbackTransaction(); await runner.release(); }
  });
  it("13M-D1R rolls back serialization and deadlock victims and permits caller retry with the same key", async () => {
    const h = get(), f = await fixture(), key = randomUUID();
    const op: LedgerOperation = { kind: "open", payload: { claim: randomUUID(), quantity: "0.1", source: source() } };
    const stale = h.db.createQueryRunner(); await stale.connect(); await stale.startTransaction("SERIALIZABLE");
    try {
      await stale.query("SELECT * FROM commitment_balances WHERE account_id=$1", [f.account]);
      await f.run({ kind: "open", payload: { claim: randomUUID(), quantity: "0.1", source: source() } });
      await expect(service().executeInTransaction(stale.manager, ctx(), f.account, f.entitlement, key, "Synthetic conservation verification", op)).rejects.toMatchObject({ driverError: { code: "40001" } });
    } finally { await stale.rollbackTransaction(); await stale.release(); }
    await f.run(op, key); await replay(f.account);
    const a = await fixture(), b = await fixture();
    const runners = [h.db.createQueryRunner(), h.db.createQueryRunner()];
    const fixtures = [a, b], keys = [randomUUID(), randomUUID()];
    const operations: LedgerOperation[] = fixtures.map(() => ({ kind: "open", payload: { claim: randomUUID(), quantity: "0.1", source: source() } }));
    const locks = [randomUUID(), randomUUID()];
    try {
      for (let i = 0; i < 2; i++) {
        await runners[i].connect(); await runners[i].startTransaction();
        await runners[i].query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [locks[i]]);
        await service().executeInTransaction(runners[i].manager, ctx(), fixtures[i].account, fixtures[i].entitlement, keys[i], "Synthetic conservation verification", operations[i]);
      }
      const outcomes = await Promise.allSettled(runners.map(async (r, i) => {
        await r.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [locks[1-i]]);
        await r.commitTransaction();
      }));
      expect(outcomes.filter(o => o.status === "fulfilled")).toHaveLength(1);
      for (let i = 0; i < 2; i++) if (outcomes[i].status === "rejected") {
        expect((outcomes[i] as PromiseRejectedResult).reason).toMatchObject({ driverError: { code: "40P01" } });
        await runners[i].rollbackTransaction();
        await fixtures[i].run(operations[i], keys[i]);
      }
      await replay(a.account); await replay(b.account);
      h.evidence.commitment_recovery = { serialization: "40001 rollback + caller same-key retry PASS", deadlock: "40P01 victim rollback + caller same-key retry PASS", automatic_retry: false };
    } finally {
      for (const r of runners) { if (r.isTransactionActive) await r.rollbackTransaction(); await r.release(); }
    }
  });
  it("13M-D1R refuses hardening over existing drift and refuses removing populated protection", async () => {
    const h = get(), f = await fixture(), runner = h.db.createQueryRunner();
    await runner.connect(); await runner.startTransaction();
    try {
      await expect(new HardenCommitmentEventEvidence1792540800016().down(runner)).rejects.toThrow("Preserve commitment evidence");
      // Owner-only fault injection is rolled back; runtime DML cannot disable these triggers.
      await runner.query("ALTER TABLE commitment_balances DISABLE TRIGGER ALL");
      await runner.query("UPDATE commitment_balances SET sequence=sequence+1 WHERE account_id=$1", [f.account]);
      await expect(new HardenCommitmentEventEvidence1792540800016().up(runner)).rejects.toThrow("Existing commitment evidence drift");
    } finally { await runner.rollbackTransaction(); await runner.release(); }
    await replay(f.account);
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
  it("13M-D1R serializes a revised lower cap against a competing new hold", async () => {
    const h = get(), f = await fixture(), content = structuredClone(f.content);
    content.sites[0].selections[0].context.complete_sets[Object.keys(content.sites[0].selections[0].context.complete_sets)[0]] = 0;
    const [hold, revision] = await Promise.allSettled([
      f.run({ kind: "open", payload: { claim: randomUUID(), quantity: "2", source: source() } }),
      h.save(f.project.id, { revision: 1, ...content }),
    ]);
    expect(revision.status).toBe("fulfilled");
    const approval = await h.approve(f.project.id, 2);
    const [demand] = await h.db.query(`SELECT sum((l->>'quantity')::numeric)::text cap,jsonb_agg(l ORDER BY l::text) proof
      FROM requirement_approvals a,LATERAL jsonb_array_elements(a.snapshot->'lines') l
      WHERE a.id=$1 AND l->>'site_id'=$2 AND l ? 'material_id'`, [approval.id, f.site]);
    expect(demand.cap).toBe("1.8");
    const entitlement = await service().entitlement(ctx(), f.account, approval.id, 2, demand.cap, demand.proof);
    const authorize = service().execute(ctx(), f.account, entitlement, randomUUID(), "Concurrent revised total", { kind: "authorize", payload: {} });
    if (hold.status === "fulfilled") await expect(authorize).rejects.toThrow();
    else await authorize;
    const balance = await replay(f.account);
    expect(planningUnits(balance.approved) - planningUnits(balance.fulfilled) - planningUnits(balance.held)).toBeGreaterThanOrEqual(0n);
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
  trustedLedgerBoundaryTests(get, fixture, async()=>{
    const custom=planningFixture(get().wire.id);
    custom.subjects.splice(1);custom.subjects[0].grades.splice(1);custom.subjects[0].crates=[];
    for(const site of custom.content.sites) {
      site.selections[0].context.grade_quantities={[custom.gradeIds[0]]:2};
      site.selections[0].context.complete_sets={};
    }
    return fixture(custom);
  });
}
