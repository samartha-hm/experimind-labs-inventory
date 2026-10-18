import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { expect } from "vitest";
import type { DataSource } from "typeorm";
import type { User } from "../../entity/User";
import type { AuthService } from "../../services/AuthService";
import { env } from "../../config/env";
import { AddReservationCommitments1792540800018 } from "../../migration/1792540800018-AddReservationCommitments";
import { TrustedLedgerAuthority, type LedgerRequest } from "../../security/TrustedLedgerAuthority";
import { assertDatabaseBoundary, configureDatabaseBoundary, sqlIdentifier } from "../../security/databaseBoundary";
import { CommitmentLedgerService, planningUnits, replayCommitments } from "../../services/CommitmentLedgerService";
import type { ReservationMutation, ReservationResult } from "../../services/ReservationCommitmentService";
import { SupplyPlanningService } from "../../services/SupplyPlanningService";
import { reservationHttpChecks } from "./reservationHttp.cases";

interface Fixture {account:string;entitlement:string;site:string;approval:{id:string};project:{id:string};demand:{cap:string}}
/** Runs last: activating D2 deliberately disables the legacy reservation writer in this schema. */
export async function verifyReservationCommitments(h: {
  db:DataSource;runtime:DataSource;writer:DataSource;identity:DataSource;schema:string;
  roles:{runtime:string;identity:string;ledger:string};auth:AuthService;admin:User;other:User;password:string;
  fixture:()=>Promise<Fixture>;fingerprint:()=>Promise<unknown>;evidence:Record<string,unknown>;
}) {
  const f=await h.fixture(), runner=h.db.createQueryRunner(), migration=new AddReservationCommitments1792540800018();
  const historical=await h.fixture();
  const [historicalAccount]=await h.db.query("SELECT item_key,unit FROM commitment_accounts WHERE id=$1",[historical.account]);
  const legacy=await new SupplyPlanningService(h.db).reserve(h.admin.organization_id,h.admin.id,randomUUID(),
    {project_id:historical.project.id,site_id:historical.site,item_id:historicalAccount.item_key,quantity:"0.01",unit:historicalAccount.unit});
  await runner.connect(); await runner.startTransaction();
  try { await migration.up(runner); await migration.down(runner); await migration.up(runner); await runner.commitTransaction(); }
  catch(e) { await runner.rollbackTransaction(); throw e; } finally { await runner.release(); }
  await h.db.transaction(m=>configureDatabaseBoundary(m,h.schema,h.roles));
  // The preceding impersonation test deliberately changes this pooled connection's path.
  await h.runtime.query(`SET search_path TO pg_catalog,${sqlIdentifier(h.schema)},pg_temp`);
  for(const [pool,kind] of [[h.runtime,"runtime"],[h.identity,"identity"],[h.writer,"ledger"]] as const)
    await assertDatabaseBoundary(pool,kind,h.schema);
  const authority=await TrustedLedgerAuthority.create(h.writer,env.jwtSecret,h.schema);
  const login=await h.auth.login(h.admin.email,h.password), token=login.token!;
  const [account]: {item_key:string;unit:string}[]=await h.writer.query("SELECT item_key,unit FROM commitment_accounts WHERE id=$1",[f.account]);
  const context={organization:h.admin.organization_id,actor:h.admin.id};
  const demand={project:f.project.id,site:f.site,item:account.item_key,unit:account.unit,approval:f.approval.id,demandRevision:1};
  const request=(input:ReservationMutation,key=randomUUID()):Extract<LedgerRequest,{action:"reservation"}>=>({action:"reservation",key,input});
  const create=(quantity="0.1",id=randomUUID())=>request({...demand,id,reason:"D2 synthetic reservation",transition:"create",quantity});
  const perform=async(r:LedgerRequest)=>authority.perform(await authority.issue(token,r),r) as Promise<ReservationResult>;
  const snapshot=()=>h.writer.query(["commitment_reservations","commitment_accounts","commitment_entitlements","commitment_balances",
    "commitment_claims","commitment_sources","commitment_events","commitment_authorizations","project_stock_reservations","supply_events","requirement_execution_bindings"]
    .map(t=>`SELECT '${t}' object,count(*)::int n,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${t} t`).join(" UNION ALL "));
  async function reject(work:()=>Promise<unknown>) { const before=await snapshot();await expect(work()).rejects.toThrow();expect(await snapshot()).toEqual(before); }
  const before=await h.fingerprint();
  await reject(()=>perform(request({project:historical.project.id,site:historical.site,item:historicalAccount.item_key,
    unit:historicalAccount.unit,approval:historical.approval.id,demandRevision:1,id:legacy.id,transition:"release",revision:1,reason:"Historical lineage unknown"})));
  const cap=planningUnits(f.demand.cap), remaining=200000n;
  if(cap<=remaining) throw new Error("Fixture requires at least 0.2 approved material units");
  const q=cap-remaining;
  await new CommitmentLedgerService(h.writer).execute(context,f.account,f.entitlement,randomUUID(),"Synthetic last-cap race setup",
    {kind:"open",payload:{claim:randomUUID(),quantity:`${q/1000000n}.${String(q%1000000n).padStart(6,"0")}`,
      source:{kind:"synthetic:test",id:randomUUID(),slice:"d2_capacity"}}});
  const race=[create("0.2"),create("0.2")];
  const raced=await Promise.allSettled(race.map(perform));
  expect(raced.filter(r=>r.status==="fulfilled"),raced.map(r=>r.status==="rejected"?String(r.reason):"success").join("; ")).toHaveLength(1);
  const winner=raced.findIndex(r=>r.status==="fulfilled"), r=race[winner];
  const [row]: ReservationResult[]=await h.writer.query("SELECT * FROM project_stock_reservations WHERE id=$1",[r.input.id]);
  const release=request({...demand,id:row.id,reason:"Untouched remainder",transition:"release",revision:1});
  await perform(release);
  const fresh=create(), capability=await authority.issue(token,fresh);
  const saved=await authority.perform(capability,fresh) as ReservationResult;
  const committed=await snapshot();
  expect(await authority.perform(capability,JSON.parse(JSON.stringify(fresh)))).toEqual(saved);
  expect(await snapshot()).toEqual(committed);
  await reject(()=>authority.perform(token,fresh));
  const expired=jwt.sign({...jwt.decode(capability) as object,iat:1,exp:2},env.jwtSecret,{algorithm:"HS256"});
  await reject(()=>authority.perform(expired,fresh));
  await reject(()=>h.db.query("UPDATE project_stock_reservations SET quantity=0.09 WHERE id=$1",[saved.id]));
  await reject(()=>new SupplyPlanningService(h.runtime).reserve(context.organization,context.actor,randomUUID(),
    {project_id:demand.project,site_id:demand.site,item_id:demand.item,quantity:"0.01",unit:demand.unit}));
  await reservationHttpChecks(authority,token,capability,fresh,saved,snapshot);
  await h.identity.query("UPDATE users SET password_hash=$2,email=lower(email) WHERE id=$1",[h.other.id,await h.auth.hashPassword(h.password)]);
  const foreignLogin=await h.auth.login(h.other.email,h.password);
  const foreignRequest=create();
  await reject(async()=>authority.perform(await authority.issue(foreignLogin.token!,foreignRequest),foreignRequest));
  await reject(()=>authority.perform(capability,{...fresh,input:{...fresh.input,reason:"conflicting payload"}}));
  await reject(async()=>authority.perform(await authority.issue(token,fresh),fresh));
  await reject(()=>perform({...fresh,key:randomUUID()}));
  await reject(()=>perform(create("0.00001")));
  await reject(()=>perform({...create(),input:{...fresh.input,id:randomUUID(),unit:"kg"}}));
  await reject(()=>perform({...create(),input:{...fresh.input,id:randomUUID(),site:randomUUID()}}));
  await reject(()=>perform({...create(),input:{...fresh.input,id:randomUUID(),demandRevision:2}}));
  await reject(()=>perform(request({...demand,id:saved.id,transition:"adjust",revision:2,quantity:"0.2",reason:"Stale revision"})));
  await reject(()=>perform(request({...demand,id:saved.id,transition:"fulfill",revision:1,reason:"Unknown downstream consumption"})));
  const increase=request({...demand,id:saved.id,transition:"adjust",revision:1,quantity:"0.2",reason:"Delta increase"});
  await perform(increase);
  const decrease=request({...demand,id:saved.id,transition:"adjust",revision:2,quantity:"0.1",reason:"Delta decrease"});
  await perform(decrease);
  const mutations=[request({...demand,id:saved.id,transition:"adjust",revision:3,quantity:"0.15",reason:"Adjustment race"}),
    request({...demand,id:saved.id,transition:"cancel",revision:3,reason:"Cancellation race"})];
  const mutationRace=await Promise.allSettled(mutations.map(perform));
  expect(mutationRace.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  const [current]:ReservationResult[]=await h.writer.query("SELECT * FROM project_stock_reservations WHERE id=$1",[saved.id]);
  if(current.status==="active") await perform(request({...demand,id:saved.id,transition:"cancel",revision:current.revision,reason:"Final untouched cancellation"}));
  const contested=await perform(create());
  const terminalRace=await Promise.allSettled([
    perform(request({...demand,id:contested.id,transition:"fulfill",revision:1,reason:"Consumption not proven"})),
    perform(request({...demand,id:contested.id,transition:"release",revision:1,reason:"Untouched release"}))]);
  expect(terminalRace.map(r=>r.status)).toEqual(["rejected","fulfilled"]);
  await h.db.query("UPDATE planning_projects SET revision=revision+1 WHERE id=$1",[demand.project]);
  try { await reject(()=>authority.perform(capability,fresh));await reject(()=>perform(create())); }
  finally { await h.db.query("UPDATE planning_projects SET revision=revision-1 WHERE id=$1",[demand.project]); }
  const another=create(), pending=await authority.issue(token,another);
  await h.auth.revokeRefreshToken(login.refreshToken!);
  await reject(()=>authority.perform(pending,another));
  await reject(()=>authority.perform(capability,fresh));
  const login2=await h.auth.login(h.admin.email,h.password);
  const pending2=await authority.issue(login2.token!,another);
  await h.identity.query("UPDATE users SET role='viewer' WHERE id=$1",[h.admin.id]);
  await reject(()=>authority.perform(pending2,another));
  await h.identity.query("UPDATE users SET role='admin' WHERE id=$1",[h.admin.id]);
  const s=sqlIdentifier(h.schema);
  for(const sql of [`UPDATE ${s}.project_stock_reservations SET quantity=999 WHERE id=$1`,
    `UPDATE ${s}.commitment_balances SET held=0 WHERE account_id=$1`,
    `INSERT INTO ${s}.commitment_reservations SELECT * FROM ${s}.commitment_reservations WHERE reservation_id=$1`])
    await expect(h.runtime.query(sql,[saved.id])).rejects.toMatchObject({code:"42501"});
  // Even the owner cannot commit an unpaired operational change; deferred witness rolls it back.
  await reject(()=>h.db.query("UPDATE project_stock_reservations SET quantity=0.01 WHERE id=$1",[saved.id]));
  await reject(()=>h.db.query(`INSERT INTO purchase_requests(organization_id,pr_number,created_by,lines)
    VALUES($1,$2,$3,$4::jsonb)`,[context.organization,randomUUID(),context.actor,JSON.stringify([{project_id:demand.project}])]));
  const recoveryRunner=h.db.createQueryRunner();await recoveryRunner.connect();await recoveryRunner.startTransaction();
  try { await expect(migration.down(recoveryRunner)).rejects.toThrow("Nonempty");await recoveryRunner.rollbackTransaction(); }
  finally {await recoveryRunner.release();}
  const peer=new (h.writer.constructor as typeof DataSource)({...h.writer.options,logging:false});
  await peer.initialize();
  try {
    const recoveryLogin=await h.auth.login(h.admin.email,h.password), recoveryRequest=create();
    const recoveryCapability=await authority.issue(recoveryLogin.token!,recoveryRequest);
    const recoveryResult=await authority.perform(recoveryCapability,recoveryRequest), stable=await snapshot();
    const recovered=await TrustedLedgerAuthority.create(peer,env.jwtSecret,h.schema);
    expect(await recovered.perform(recoveryCapability,recoveryRequest)).toEqual(recoveryResult);
    expect(await snapshot()).toEqual(stable);
    const events=await peer.query("SELECT * FROM commitment_events WHERE account_id=$1 ORDER BY sequence",[f.account]);
    const entitlements=await peer.query("SELECT * FROM commitment_entitlements WHERE account_id=$1",[f.account]);
    const result=replayCommitments(events,entitlements);
    const [balance]=await peer.query("SELECT * FROM commitment_balances WHERE account_id=$1",[f.account]);
    expect(result).toEqual({approved:planningUnits(balance.approved),fulfilled:planningUnits(balance.fulfilled),held:planningUnits(balance.held)});
    expect(result.approved-result.fulfilled-result.held).toBeGreaterThanOrEqual(0n);
  } finally { await peer.destroy(); }
  const after=await h.fingerprint();
  const unrelated=(value:unknown)=>Object.fromEntries(Object.entries(value as Record<string,unknown>).filter(([table])=>
    !["project_stock_reservations","supply_events"].includes(table)));
  expect(unrelated(after)).toEqual(unrelated(before));
  h.evidence.reservation_commitments={schema:h.schema,acceptance:"CONDITIONAL PASS",race:"one winner",retry:"same capability and immutable result",
    adjustment:"delta only",release:"untouched only",fulfillment:"BLOCKED: downstream lineage",recovery:"nonempty rollback refused; independent replay through new connection",
    before,after,projection:await snapshot()};
}
