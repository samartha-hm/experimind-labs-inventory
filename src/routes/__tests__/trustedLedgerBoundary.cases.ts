import { randomBytes, randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { DataSource } from "typeorm";
import { expect, it } from "vitest";
import { env } from "../../config/env";
import { User } from "../../entity/User";
import { AuthService } from "../../services/AuthService";
import { CommitmentLedgerService, replayCommitments } from "../../services/CommitmentLedgerService";
import { TrustedLedgerAuthority } from "../../security/TrustedLedgerAuthority";
import { independentIdentityReview } from "./trustedLedgerIndependentReview.cases";
import { verifyD1W } from "./trustedLedgerD1W.cases";
import { verifyReservationCommitments } from "./reservationCommitment.cases";
import { assertDatabaseBoundary, configureDatabaseBoundary, ledgerTables, sqlIdentifier } from "../../security/databaseBoundary";

interface Harness {
  db: DataSource; admin: User; maker: User; other: User;
  fingerprint: () => Promise<unknown>; evidence: Record<string, unknown>;
}
export interface Fixture { account: string; entitlement: string; project: { id: string; sites: { id: string }[] }; site: string;
  approval: { id: string }; demand: { cap: string; proof: unknown } }

export function trustedLedgerBoundaryTests(get: () => Harness, fixture: () => Promise<Fixture>, workOrderFixture: () => Promise<Fixture>) {
  it("13M-D1T denies actual runtime LOGIN impersonation and authenticates isolated ledger authority", async () => {
    const h = get(), f = await fixture();
    const before = await h.fingerprint();
    const [{ current_schema: schema }] = await h.db.query("SELECT current_schema()");
    if (!/^requirement_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Synthetic schema required");
    const suffix = randomBytes(8).toString("hex");
    const roles = { runtime: `rt_${suffix}`, identity: `id_${suffix}`, ledger: `lg_${suffix}` };
    const pools: DataSource[] = [];
    let close: (() => Promise<void>) | undefined;
    try {
      for (const role of Object.values(roles)) {
        const password = randomBytes(32).toString("hex");
        // Synthetic random hex only; never log queries/credentials.
        await h.db.query(`CREATE ROLE ${sqlIdentifier(role)} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
        const connection = new URL(process.env.KIT_BUILDER_TEST_DATABASE_URL!);
        connection.username = role; connection.password = password;
        pools.push(new DataSource({ ...h.db.options as Extract<import("typeorm").DataSourceOptions, { type: "postgres" }>,
          url: connection.toString(), logging: false,
          extra: { max: role === roles.runtime ? 1 : 4, options: `-c search_path=pg_catalog,${schema},pg_temp` } }));
      }
      await h.db.transaction(m => configureDatabaseBoundary(m, schema, roles));
      for (const pool of pools) await pool.initialize();
      const [runtime, identity, writer] = pools;
      await expect(assertDatabaseBoundary(runtime,"identity",schema)).rejects.toThrow();
      await h.db.query(`GRANT UPDATE(password_hash) ON ${sqlIdentifier(schema)}.users TO ${sqlIdentifier(roles.runtime)}`);
      await expect(assertDatabaseBoundary(runtime,"runtime",schema)).rejects.toThrow();
      await h.db.query(`REVOKE UPDATE(password_hash) ON ${sqlIdentifier(schema)}.users FROM ${sqlIdentifier(roles.runtime)}`);
      await assertDatabaseBoundary(runtime, "runtime", schema);
      await assertDatabaseBoundary(identity, "identity", schema);
      await expect(assertDatabaseBoundary(h.db, "runtime", schema)).rejects.toThrow("Unsafe");
      const authority = await TrustedLedgerAuthority.create(writer, env.jwtSecret, schema);
      const denied: string[] = [];
      async function deny(name: string, sql: string, params: unknown[] = []) {
        await expect(runtime.query(sql, params), name).rejects.toMatchObject({ code: "42501" }); denied.push(name);
      }
      const s = sqlIdentifier(schema);
      const insert = `INSERT INTO ${s}.commitment_events(organization_id,account_id,entitlement_id,actor_id,key,kind,payload,reason)
        VALUES($1,$2,$3,$4,$5,'open',$6,'Impersonation attack')`;
      const params = (u: User) => [u.organization_id, f.account, f.entitlement, u.id, randomUUID(),
        JSON.stringify({ claim: randomUUID(), quantity: "0.1", source: { kind: "synthetic:test", id: randomUUID(), slice: "whole" } })];
      await deny("known administrator UUID", insert, params(h.admin));
      await deny("cross-tenant administrator UUID", insert, params(h.other));
      for (const table of ledgerTables) {
        await deny(`${table} INSERT`, `INSERT INTO ${s}.${table} DEFAULT VALUES`);
        await deny(`${table} UPDATE`, `UPDATE ${s}.${table} SET organization_id=organization_id`);
        await deny(`${table} DELETE`, `DELETE FROM ${s}.${table}`);
        await deny(`${table} TRUNCATE`, `TRUNCATE ${s}.${table}`);
      }
      for (const sql of [`UPDATE ${s}.users SET role='admin' WHERE id=$1`,
        `UPDATE ${s}.users SET password_hash='forged' WHERE id=$1`,
        `UPDATE ${s}.users SET organization_id='${h.admin.organization_id}' WHERE id=$1`])
        await deny("identity escalation", sql, [h.maker.id]);
      const functions: { signature: string }[] = await h.db.query(`SELECT p.oid::regprocedure::text signature FROM pg_proc p
        JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1 AND p.proname LIKE 'commitment_%'`, [schema]);
      for (const func of functions) {
        expect((await runtime.query("SELECT has_function_privilege($1,'EXECUTE') allowed", [func.signature]))[0].allowed).toBe(false);
      }
      await deny("direct privileged function invocation", `SELECT ${s}.commitment_apply()`);
      await runtime.query("SELECT set_config('app.actor_id',$1,false),set_config('app.organization_id',$2,false),set_config('app.role','admin',false)", [h.admin.id,h.admin.organization_id]);
      await deny("forged session variables", insert, params(h.admin));
      await runtime.query(`CREATE TEMP TABLE users(id uuid,organization_id uuid,role text,is_active boolean);
        CREATE TEMP TABLE commitment_events(id uuid); SET search_path TO pg_temp,${s},public`);
      await runtime.query("INSERT INTO pg_temp.users VALUES($1,$2,'admin',true)", [h.maker.id,h.admin.organization_id]);
      await deny("temporary table and search path", insert, params(h.admin));
      await deny("schema creation", `CREATE TABLE ${s}.forged(id int)`);
      await deny("role escalation", `SET ROLE ${sqlIdentifier(roles.ledger)}`);
      await deny("unauthorized grant", `GRANT ${sqlIdentifier(roles.ledger)} TO ${sqlIdentifier(roles.runtime)}`);
      // PostgreSQL can emit only a warning when GRANT conveys no privileges.
      await runtime.query(`GRANT UPDATE ON ${s}.commitment_events TO PUBLIC`);
      expect((await runtime.query("SELECT has_table_privilege($1,'UPDATE') allowed",[`${s}.commitment_events`]))[0].allowed).toBe(false);
      denied.push("grant option escalation (no privilege conveyed)");
      await deny("trigger removal", `ALTER TABLE ${s}.commitment_events DISABLE TRIGGER ALL`);
      // A normal runtime service, including its actor check, has no ledger write authority.
      await expect(new CommitmentLedgerService(runtime).execute({ actor: h.admin.id, organization: h.admin.organization_id },
        f.account,f.entitlement,randomUUID(),"Forged actor",{kind:"authorize",payload:{}})).rejects.toThrow();

      const auth = new AuthService(identity), password = randomBytes(24).toString("hex") + "Aa1!";
      await identity.getRepository(User).update(h.admin.id, { email: h.admin.email.toLowerCase(), password_hash: await auth.hashPassword(password) });
      const app = express(); app.use(express.json());
      app.post("/login", async (req,res) => { try { const r=await auth.login(req.body.email,req.body.password);res.json({token:r.token}); }
        catch {res.sendStatus(401);} });
      app.post("/ledger", async (req,res) => { try { res.json(await authority.execute(req.headers.authorization?.replace(/^Bearer /,"") ?? "",
        f.account,f.entitlement,req.body.key,"Authenticated synthetic event",req.body.operation)); } catch (e) {res.status(403).json({error:(e as Error).message});} });
      const server = app.listen(0,"127.0.0.1");
      await new Promise<void>(resolve => server.once("listening",resolve));
      close=()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
      const address=server.address(); if (!address || typeof address==="string") throw new Error("Missing port");
      const base=`http://127.0.0.1:${address.port}`;
      const login=await fetch(base+"/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:h.admin.email,password})});
      expect(login.status).toBe(200); const {token}=await login.json();
      const [original] = await writer.query("SELECT item_key FROM commitment_accounts WHERE id=$1", [f.account]);
      const site = f.project.sites[1].id;
      const accountRequest = {action:"createAccount" as const,key:randomUUID(),input:{project:f.project.id,site,obligation:"trusted wire",
        dimension:"material" as const,item:original.item_key,unit:"m",selector:{item:original.item_key}}};
      const account = await authority.createAccount(await authority.issue(token,accountRequest),accountRequest.input,accountRequest.key);
      const [demand] = await writer.query(`SELECT sum((l->>'quantity')::numeric)::text cap,jsonb_agg(l ORDER BY l::text) proof
        FROM requirement_approvals a,LATERAL jsonb_array_elements(a.snapshot->'lines') l
        WHERE a.id=$1 AND l->>'site_id'=$2 AND l->>'inventory_item_id'=$3 AND l ? 'material_id'`,[f.approval.id,site,original.item_key]);
      const entitlementRequest = {action:"entitlement" as const,key:randomUUID(),account,approval:f.approval.id,revision:1,cap:demand.cap,provenance:demand.proof};
      const entitlement = await authority.entitlement(await authority.issue(token,entitlementRequest),account,f.approval.id,1,demand.cap,demand.proof,entitlementRequest.key);
      const authorize = {action:"execute" as const,key:randomUUID(),account,entitlement,reason:"Trusted authorization",operation:{kind:"authorize" as const,payload:{}}};
      expect((await authority.perform(await authority.issue(token,authorize),authorize) as {actor_id:string}).actor_id).toBe(h.admin.id);
      const key=randomUUID(), claim=randomUUID(), operation={kind:"open",payload:{claim,quantity:"0.2",source:{kind:"synthetic:test",id:randomUUID(),slice:"whole"}}};
      async function invoke(bearer:string,op=operation,k=key) {
        return fetch(base+"/ledger",{method:"POST",headers:{Authorization:`Bearer ${bearer}`,"Content-Type":"application/json"},body:JSON.stringify({key:k,operation:op})});
      }
      const capability=await authority.issue(token,{action:"execute",account:f.account,entitlement:f.entitlement,key,reason:"Authenticated synthetic event",operation:operation as import("../../services/CommitmentLedgerService").LedgerOperation});
      const result=await invoke(capability);const event=await result.json();expect(result.status,JSON.stringify(event)).toBe(200);expect(event.actor_id).toBe(h.admin.id);
      const retry=await invoke(capability);expect(retry.status).toBe(200);expect((await retry.json()).id).toBe(event.id);
      const signed=(u:User,overrides={})=>jwt.sign({sub:u.id,orgId:u.organization_id,role:u.role,...overrides},env.jwtSecret,{expiresIn:"5m"});
      for (const bad of ["",signed(h.maker),signed(h.other),signed(h.maker,{role:"admin",orgId:h.admin.organization_id}),
        jwt.sign({sub:h.admin.id,orgId:h.admin.organization_id,role:"admin"},"attacker"),
        jwt.sign({sub:h.admin.id,orgId:h.admin.organization_id,role:"admin"},env.jwtSecret),
        signed(h.admin,{type:"mfa_challenge"}), jwt.sign({sub:h.admin.id,orgId:h.admin.organization_id,role:"admin",exp:1},env.jwtSecret)])
        expect((await invoke(bad)).status).toBe(403);
      await identity.getRepository(User).update(h.admin.id,{role:"viewer"});
      expect((await invoke(capability)).status).toBe(403);
      await identity.getRepository(User).update(h.admin.id,{role:"admin",is_active:false});
      expect((await invoke(capability)).status).toBe(403);
      await identity.getRepository(User).update(h.admin.id,{is_active:true});
      await independentIdentityReview({runtime,identity,writer,auth,authority,admin:h.admin,token,
        account:f.account,entitlement:f.entitlement,password,evidence:h.evidence,resourceRequests:[accountRequest,entitlementRequest]});
      await verifyD1W({writer,identity,auth,authority,admin:h.admin,password,account:f.account,
        entitlement:f.entitlement,schema,evidence:h.evidence});
      // Single-connection pools retain attacker session state only in the runtime pool.
      expect((await runtime.query("SELECT current_setting('app.actor_id') actor"))[0].actor).toBe(h.admin.id);
      expect((await writer.query("SELECT current_setting('app.actor_id',true) actor"))[0].actor).toBeNull();
      const events=await writer.query("SELECT * FROM commitment_events WHERE account_id=$1 ORDER BY sequence",[f.account]);
      const entitlements=await writer.query("SELECT * FROM commitment_entitlements WHERE account_id=$1",[f.account]);
      expect(events.filter((e:any)=>e.key===key)).toHaveLength(1);
      const replay=replayCommitments(events,entitlements);expect(replay.approved-replay.fulfilled-replay.held).toBeGreaterThanOrEqual(0n);
      expect(await h.fingerprint()).toEqual(before);
      h.evidence.trusted_boundary={actual_login:true,denied,functions_denied:functions.length,authenticated_http:"PASS",retry:"same immutable event",
        actor:event.actor_id,pool_identity_isolated:true,operational_tables_unchanged:true,role_cleanup:"DROP OWNED / DROP ROLE"};
      await verifyReservationCommitments({...h,runtime,writer,identity,schema,roles,auth,password,fixture});
      await verifyExecutionBoundary({...h,runtime,writer,identity,schema,roles});
      await verifyRecipePublication({...h,runtime,writer,identity,schema,roles,password});
      await verifyWorkOrderAuthority({...h,runtime,writer,identity,schema,roles,password,fixture:workOrderFixture});
    } finally {
      if(close) await close();
      for(const pool of pools) if(pool.isInitialized) await pool.destroy();
      for(const role of Object.values(roles)) {
        await h.db.query(`DROP OWNED BY ${sqlIdentifier(role)}; DROP ROLE IF EXISTS ${sqlIdentifier(role)}`);
      }
    }
  },120000);
}
import { verifyExecutionBoundary } from "./executionBoundary.cases";
import { verifyRecipePublication } from "./recipePublication.cases";
import { verifyWorkOrderAuthority } from "./workOrderAuthority.cases";
