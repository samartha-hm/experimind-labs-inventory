import { verifyPurchaseOrderCommitments } from "./purchaseOrderCommitment.cases";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { expect } from "vitest";
import { env } from "../../config/env";
import { AddPurchaseRequestCommitments1792627200019 } from "../../migration/1792627200019-AddPurchaseRequestCommitments";
import { TrustedLedgerAuthority, type LedgerRequest } from "../../security/TrustedLedgerAuthority";
import { configureDatabaseBoundary, assertDatabaseBoundary } from "../../security/databaseBoundary";
import { CommitmentLedgerService, planningUnits, replayCommitments } from "../../services/CommitmentLedgerService";
import type { PurchaseRequestMutation, PurchaseRequestResult } from "../../services/PurchaseRequestCommitmentService";
import type { verifyReservationCommitments } from "./reservationCommitment.cases";
import { reservationHttpChecks } from "./reservationHttp.cases";
import { planningFixture } from "../../features/projects/__tests__/planningFixture";

export async function verifyPurchaseRequestCommitments(h:Parameters<typeof verifyReservationCommitments>[0]) {
  const f=await h.fixture(), runner=h.db.createQueryRunner();
  await runner.connect();await runner.startTransaction();
  try {await new AddPurchaseRequestCommitments1792627200019().up(runner);await runner.commitTransaction();}
  catch(e){await runner.rollbackTransaction();throw e;}finally{await runner.release();}
  await h.db.transaction(m=>configureDatabaseBoundary(m,h.schema,h.roles));
  for(const [pool,kind] of [[h.runtime,"runtime"],[h.identity,"identity"],[h.writer,"ledger"]] as const)
    await assertDatabaseBoundary(pool,kind,h.schema);
  const authority=await TrustedLedgerAuthority.create(h.writer,env.jwtSecret,h.schema);
  const login=await h.auth.login(h.admin.email,h.password),access=login.token!;
  const [account]:{item_key:string;unit:string}[]=await h.writer.query("SELECT * FROM commitment_accounts WHERE id=$1",[f.account]);
  const demand={project:f.project.id,site:f.site,item:account.item_key,unit:account.unit,approval:f.approval.id,demandRevision:1};
  const request=(input:PurchaseRequestMutation,key=randomUUID()):Extract<LedgerRequest,{action:"purchaseRequest"}>=>({action:"purchaseRequest",key,input});
  const create=(quantity="0.1",id:string=randomUUID(),line:string=randomUUID())=>request({...demand,id,line,quantity,basis:"manual",transition:"create",reason:"Synthetic PR integration"});
  const perform=async(r:LedgerRequest)=>authority.perform(await authority.issue(access,r),r) as Promise<PurchaseRequestResult>;
  const snapshot=()=>h.writer.query(["purchase_requests","commitment_pr_lines","commitment_accounts","commitment_entitlements","commitment_balances",
    "commitment_claims","commitment_sources","commitment_events","commitment_authorizations","supply_events","requirement_execution_bindings"]
    .map(t=>`SELECT '${t}' object,count(*)::int n,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${t} t`).join(" UNION ALL "));
  const reject=async(work:()=>Promise<unknown>)=>{const before=await snapshot();await expect(work()).rejects.toThrow();expect(await snapshot()).toEqual(before);};
  const before=await h.fingerprint();
  // A verified positive physical balance limits purchase sizing, but supplies no demand entitlement.
  await reject(()=>perform(request({...demand,id:randomUUID(),line:randomUUID(),quantity:"0.1",basis:"shortage",transition:"create",reason:"Stock covers this demand"})));
  const shortageFixture=planningFixture(account.item_key);
  shortageFixture.subjects[0].grades[0].activities[0].materials[0].quantity=100;
  const sf=await h.fixture(shortageFixture);
  const shortage=await perform(request({...demand,project:sf.project.id,site:sf.site,approval:sf.approval.id,
    id:randomUUID(),line:randomUUID(),quantity:"0.1",basis:"shortage",transition:"create",reason:"Verified uncovered shortage"}));
  expect(shortage.lines[0].site_id).toBe(sf.site);
  const original=create(),capability=await authority.issue(access,original);
  const saved=await authority.perform(capability,original) as PurchaseRequestResult;
  expect(saved.status).toBe("draft");expect(saved.lines[0].requirement_approval_id).toBe(demand.approval);
  await reservationHttpChecks(authority,access,capability,original,saved,snapshot);
  // Lost response: same capability returns the immutable receipt; a new bearer cannot substitute.
  expect(await authority.perform(capability,original)).toEqual(saved);
  await reject(()=>perform(original));
  await reject(()=>perform({...original,key:randomUUID()}));
  await reject(()=>perform(create("0.1",randomUUID(),original.input.transition==="create"?original.input.line:"")));
  await reject(()=>authority.perform(capability,{...original,input:{...original.input,quantity:"0.2"} as PurchaseRequestMutation}));
  for(const change of [{site:randomUUID()},{project:randomUUID()},{approval:randomUUID()},{demandRevision:2},{unit:"forged"},{item:randomUUID()}])
    await reject(()=>perform({...create(),input:{...create().input,...change}}));
  for(const quantity of ["0","0.00001","100000000","-1","1e-4"])
    await reject(()=>perform(create(quantity)));
  const edit=(quantity:string,revision:number)=>request({...demand,id:saved.id,quantity,revision,transition:"adjust",reason:"Draft delta"});
  const increased=await perform(edit("0.2",1));expect(increased.lines[0].id).toBe(saved.lines[0].id);
  await reject(()=>perform(edit("0.3",1)));
  await perform(edit("0.0001",2));
  const races=[edit("0.2",3),request({...demand,id:saved.id,revision:3,transition:"cancel",reason:"Concurrent cancellation"})];
  const results=await Promise.allSettled(races.map(perform));expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  const [current]:PurchaseRequestResult[]=await h.writer.query("SELECT * FROM purchase_requests WHERE id=$1",[saved.id]);
  if(current.status!=="cancelled")await perform(request({...demand,id:saved.id,revision:current.revision,transition:"cancel",reason:"Close race fixture"}));
  // Fill all but 0.1, then race two real isolated transactions for the last capacity.
  const ledger=new CommitmentLedgerService(h.writer),context={actor:h.admin.id,organization:h.admin.organization_id};
  const remaining=planningUnits(f.demand.cap)-100000n;
  await ledger.execute(context,f.account,f.entitlement,randomUUID(),"PR last capacity setup",{kind:"open",payload:{claim:randomUUID(),
    quantity:`${remaining/1000000n}.${String(remaining%1000000n).padStart(6,"0")}`,source:{kind:"synthetic:test",id:randomUUID(),slice:"pr_race"}}});
  const requests=[create(),create()],raced=await Promise.allSettled(requests.map(perform));
  expect(raced.filter(r=>r.status==="fulfilled"),JSON.stringify(raced)).toHaveLength(1);
  const win=requests[raced.findIndex(r=>r.status==="fulfilled")];
  await reject(()=>perform(create()));
  // School A is exhausted; school B retains its own independent approved cap.
  const [school]:{id:string}[]=await h.writer.query("SELECT id FROM planning_sites WHERE project_id=$1 AND id<>$2",[demand.project,demand.site]);
  const schoolRequest=await perform(request({...demand,site:school.id,id:randomUUID(),line:randomUUID(),quantity:"0.1",basis:"manual",transition:"create",reason:"Independent school capacity"}));
  await reject(()=>perform(request({...demand,site:school.id,id:schoolRequest.id,revision:1,quantity:"1",transition:"adjust",reason:"Cannot borrow School A capacity"})));
  const reservation:LedgerRequest={action:"reservation",key:randomUUID(),input:{...demand,id:randomUUID(),transition:"create",quantity:"0.0001",reason:"No duplicate reservation coverage"}};
  await reject(()=>perform(reservation));
  await perform(request({...demand,id:win.input.id,revision:1,transition:"review",reason:"Review only"}));
  await perform(request({...demand,id:win.input.id,revision:2,transition:"approve",reason:"PR approval grants no PO authority"}));
  await reject(()=>perform(request({...demand,id:win.input.id,revision:3,transition:"adjust",quantity:"0.05",reason:"Approved edits blocked"})));
  const [claim]:{id:string}[]=await h.writer.query("SELECT id FROM commitment_claims WHERE source_kind='purchase_request_line' AND held>0 AND account_id=$1",[f.account]);
  for(const operation of [{kind:"consume",payload:{claim:claim.id,quantity:"0.0001"}},
    {kind:"release",payload:{claim:claim.id,quantity:"0.0001",untouched:true,unencumbered:true,evidence:"Forged release"}}] as const)
    await reject(()=>ledger.execute(context,f.account,f.entitlement,randomUUID(),"Unpaired PR mutation",operation));
  for(const table of ["purchase_requests","commitment_pr_lines","commitment_sources","commitment_events","commitment_balances","commitment_authorizations"])
    await expect(h.runtime.query(`INSERT INTO ${table} DEFAULT VALUES`)).rejects.toMatchObject({code:"42501"});
  await expect(h.runtime.query("SELECT commitment_pr_check($1)",[win.input.id])).rejects.toMatchObject({code:"42501"});
  await reject(()=>h.db.query("UPDATE purchase_requests SET status='cancelled' WHERE id=$1",[win.input.id]));
  await reject(()=>h.db.query("UPDATE purchase_requests SET lines=jsonb_set(lines,'{0,site_id}',to_jsonb($2::text)) WHERE id=$1",[win.input.id,randomUUID()]));
  const gateBefore=await snapshot();
  await expect(h.db.query(`INSERT INTO purchase_orders(organization_id,po_number,status,purchase_request_id,planning_lines)
    SELECT organization_id,$2,'draft',id,lines FROM purchase_requests WHERE id=$1`,[win.input.id,randomUUID()])).rejects.toThrow("downstream execution is not integrated");
  expect(await snapshot()).toEqual(gateBefore);
  await expect(h.db.query(`INSERT INTO purchase_orders(organization_id,po_number,status,purchase_request_id,planning_lines)
    SELECT organization_id,$2,'draft',id,'[]'::jsonb FROM purchase_requests WHERE id=$1`,[win.input.id,randomUUID()])).rejects.toThrow("downstream execution is not integrated");
  expect(await snapshot()).toEqual(gateBefore);
  // Owner-only corruption fixture, entirely rolled back: missing PO planning lines
  // must neither permit a receipt nor let the PR witness certify a release.
  const probe=h.db.createQueryRunner();await probe.connect();await probe.startTransaction();
  try {
    const vendor=randomUUID(),po=randomUUID();
    await probe.query("ALTER TABLE purchase_orders DISABLE TRIGGER a_d2_reservation_gate");
    await probe.query("INSERT INTO vendors(id,organization_id,vendor_code,name) VALUES($1::uuid,$2,$1::text,'Synthetic rollback probe')",[vendor,h.admin.organization_id]);
    await probe.query(`INSERT INTO purchase_orders(id,organization_id,po_number,vendor_id,order_date,purchase_request_id,planning_lines)
      VALUES($1::uuid,$2,$1::text,$3,CURRENT_DATE,$4,'[]')`,[po,h.admin.organization_id,vendor,win.input.id]);
    await probe.query("ALTER TABLE purchase_orders ENABLE TRIGGER a_d2_reservation_gate; SAVEPOINT receipt_probe");
    await expect(probe.query("INSERT INTO purchase_goods_receipts(organization_id,po_id) VALUES($1,$2)",[h.admin.organization_id,po])).rejects.toThrow("downstream execution is not integrated");
    await probe.query("ROLLBACK TO SAVEPOINT receipt_probe");
    await expect(probe.query("SELECT commitment_pr_check($1)",[win.input.id])).rejects.toThrow("downstream lineage requires reconciliation");
  } finally {await probe.rollbackTransaction();await probe.release();}
  expect(await snapshot()).toEqual(gateBefore);
  await h.db.query("UPDATE planning_projects SET revision=2 WHERE id=$1",[demand.project]);
  await reject(()=>authority.perform(capability,original));
  await reject(()=>perform(create()));
  await h.db.query("UPDATE planning_projects SET revision=1 WHERE id=$1",[demand.project]);
  // Deferred audit failure must roll back operational, claim, event and authorization effects.
  await h.db.query(`CREATE FUNCTION fail_pr_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='request' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_pr_audit BEFORE INSERT ON supply_events FOR EACH ROW EXECUTE FUNCTION fail_pr_audit()`);
  await reject(()=>perform(request({...demand,id:win.input.id,revision:3,transition:"cancel",reason:"Rollback probe"})));
  await h.db.query("DROP TRIGGER fail_pr_audit ON supply_events; DROP FUNCTION fail_pr_audit()");
  const pending=create(),bearer=await authority.issue(access,pending);
  await h.auth.revokeRefreshToken(login.refreshToken!);await reject(()=>authority.perform(bearer,pending));
  const login2=await h.auth.login(h.admin.email,h.password),bearer2=await authority.issue(login2.token!,pending);
  await h.identity.query("UPDATE users SET role='viewer' WHERE id=$1",[h.admin.id]);
  await reject(()=>authority.perform(bearer2,pending));await h.identity.query("UPDATE users SET role='admin' WHERE id=$1",[h.admin.id]);
  const other=await h.auth.login(h.other.email,h.password);
  await reject(async()=>{const r=create();return authority.perform(await authority.issue(other.token!,r),r);});
  const forged=jwt.sign({sub:h.admin.id,orgId:h.other.organization_id,role:"admin",sid:"a".repeat(64)},env.jwtSecret,
    {issuer:"experimind-auth",audience:"experimind-api",expiresIn:60});
  await reject(()=>authority.issue(forged,create()));
  const [projection]=await h.writer.query("SELECT * FROM commitment_balances WHERE account_id=$1",[f.account]);
  const events=await h.writer.query("SELECT * FROM commitment_events WHERE account_id=$1 ORDER BY sequence",[f.account]);
  const entitlements=await h.writer.query("SELECT * FROM commitment_entitlements WHERE account_id=$1",[f.account]);
  const replay=replayCommitments(events,entitlements);
  expect(replay.held).toBe(planningUnits(projection.held));expect(replay.fulfilled).toBe(0n);
  const after=await h.fingerprint();
  const protectedEffects=(value:unknown)=>Object.fromEntries(Object.entries(value as Record<string,unknown>).filter(([table])=>!["purchase_requests","supply_events"].includes(table)));
  expect(protectedEffects(after)).toEqual(protectedEffects(before));
  h.evidence.purchase_request_commitments={schema:h.schema,acceptance:"CONDITIONAL PASS",scope:"single canonical school/material line",
    before,after,projection:await snapshot(),capacity_race:"one winner",replay:"PASS",stock_and_reservations_unchanged:true};
  await verifyPurchaseOrderCommitments(h);
}
