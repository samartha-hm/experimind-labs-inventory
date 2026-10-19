import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { expect } from "vitest";
import { env } from "../../config/env";
import { AddPurchaseOrderCommitments1792713600020 } from "../../migration/1792713600020-AddPurchaseOrderCommitments";
import { TrustedLedgerAuthority, type LedgerRequest } from "../../security/TrustedLedgerAuthority";
import { configureDatabaseBoundary, assertDatabaseBoundary } from "../../security/databaseBoundary";
import type { PurchaseRequestMutation, PurchaseRequestResult } from "../../services/PurchaseRequestCommitmentService";
import type { PurchaseOrderMutation, PurchaseOrderResult } from "../../services/PurchaseOrderCommitmentService";
import type { verifyReservationCommitments } from "./reservationCommitment.cases";
import { reservationHttpChecks } from "./reservationHttp.cases";
import { SupplyPlanningService } from "../../services/SupplyPlanningService";
import { planningStock } from "../../services/CommitmentLedgerService";

export async function verifyPurchaseOrderCommitments(h:Parameters<typeof verifyReservationCommitments>[0]) {
  const f=await h.fixture(),runner=h.db.createQueryRunner();
  await runner.connect();await runner.startTransaction();
  try {await new AddPurchaseOrderCommitments1792713600020().up(runner);await runner.commitTransaction();}
  catch(e){await runner.rollbackTransaction();throw e;}finally{await runner.release();}
  await h.db.transaction(m=>configureDatabaseBoundary(m,h.schema,h.roles));
  for(const [pool,kind] of [[h.runtime,"runtime"],[h.identity,"identity"],[h.writer,"ledger"]] as const)
    await assertDatabaseBoundary(pool,kind,h.schema);
  const authority=await TrustedLedgerAuthority.create(h.writer,env.jwtSecret,h.schema);
  const login=await h.auth.login(h.admin.email,h.password),access=login.token!;
  const perform=async(r:LedgerRequest)=>authority.perform(await authority.issue(access,r),r);
  const [account]:{item_key:string;unit:string}[]=await h.writer.query("SELECT * FROM commitment_accounts WHERE id=$1",[f.account]);
  const demand={project:f.project.id,site:f.site,item:account.item_key,unit:account.unit,approval:f.approval.id,demandRevision:1};
  const prRequest=(input:PurchaseRequestMutation):LedgerRequest=>({action:"purchaseRequest",key:randomUUID(),input});
  let pr=await perform(prRequest({...demand,id:randomUUID(),line:randomUUID(),quantity:"0.2",basis:"manual",transition:"create",reason:"Synthetic PO source"})) as PurchaseRequestResult;
  pr=await perform(prRequest({...demand,id:pr.id,revision:pr.revision,transition:"review",reason:"Synthetic review"})) as PurchaseRequestResult;
  pr=await perform(prRequest({...demand,id:pr.id,revision:pr.revision,transition:"approve",reason:"Synthetic approval"})) as PurchaseRequestResult;
  const vendor=randomUUID();await h.db.query("INSERT INTO vendors(id,organization_id,vendor_code,name) VALUES($1,$2,$3,'Synthetic supplier')",[vendor,h.admin.organization_id,`S-${vendor}`]);
  const [claim]:{id:string;source_slice:string}[]=await h.writer.query("SELECT * FROM commitment_claims WHERE source_id=$1 AND held>0",[pr.lines[0].id]);
  const base={...demand,request:pr.id,requestRevision:pr.revision,line:pr.lines[0].id,reason:"Synthetic PO integration"};
  const request=(input:PurchaseOrderMutation,key=randomUUID()):Extract<LedgerRequest,{action:"purchaseOrder"}>=>({action:"purchaseOrder",key,input});
  const source=(quantity:string)=>[{claim:claim.id,slice:claim.source_slice,quantity}];
  const create=(quantity="0.05")=>request({...base,id:randomUUID(),transition:"create",vendor,sources:source(quantity)});
  const snapshot=()=>h.writer.query(["purchase_orders","commitment_po_lines","commitment_po_coverage","purchase_requests","commitment_pr_lines","project_stock_reservations",
    "commitment_balances","commitment_claims","commitment_sources","commitment_events","commitment_authorizations","supply_events","requirement_execution_bindings"]
    .map(t=>`SELECT '${t}' object,count(*)::int n,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${t} t`).join(" UNION ALL "));
  const reject=async(work:()=>Promise<unknown>)=>{const before=await snapshot();await expect(work()).rejects.toThrow();expect(await snapshot()).toEqual(before);};
  const ledger=()=>h.writer.query(["commitment_accounts","commitment_entitlements","commitment_balances","commitment_claims","commitment_sources","commitment_events"]
    .map(t=>`SELECT '${t}' object,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${t} t`).join(" UNION ALL "));
  await perform({action:"reservation",key:randomUUID(),input:{...demand,id:randomUUID(),transition:"create",quantity:"0.01",reason:"Shared approved cap"}});
  await reject(()=>perform({action:"reservation",key:randomUUID(),input:{...demand,id:randomUUID(),transition:"create",quantity:planningStock(f.demand.cap),reason:"Cumulative over-cap probe"}}));
  await reject(()=>perform(prRequest({...demand,id:randomUUID(),line:randomUUID(),quantity:planningStock(f.demand.cap),basis:"manual",transition:"create",reason:"Cumulative PR over-cap probe"})));
  const [sharedBalance]=await h.writer.query("SELECT approved::text,fulfilled::text,held::text,(approved-fulfilled-held)::text uncommitted FROM commitment_balances WHERE account_id=$1",[f.account]);
  expect(Number(sharedBalance.held)).toBe(0.21);
  const before=await h.fingerprint(),heldBefore=await ledger();
  const initial=create(),capability=await authority.issue(access,initial);
  let po=await authority.perform(capability,initial) as PurchaseOrderResult;
  await reservationHttpChecks(authority,access,capability,initial,po,snapshot);
  await reject(()=>authority.perform(capability,{...initial,input:{...initial.input,reason:"Forged"}}));
  await reject(()=>authority.perform(capability,{...initial,key:randomUUID()}));
  const decoded=jwt.decode(capability) as jwt.JwtPayload;
  for(const change of [{aud:"experimind-api"},{scope:"ledger:read"},{sub:h.other.id,orgId:h.admin.organization_id,role:"admin"}])
    await reject(()=>authority.perform(jwt.sign({...decoded,...change},env.jwtSecret),initial));
  await reject(()=>perform(initial)); // New token with the same operation key is a conflict.
  await reject(()=>perform(request({...base,id:po.id,revision:1,transition:"approve"})));
  await reject(()=>perform(request({...base,id:randomUUID(),transition:"create",vendor,sources:[{claim:claim.id,slice:"999",quantity:"0.01"}]})));
  await reject(()=>perform(request({...base,id:randomUUID(),transition:"create",vendor,sources:[{claim:randomUUID(),slice:claim.source_slice,quantity:"0.01"}]})));
  await reject(()=>perform(request({...base,site:randomUUID(),id:randomUUID(),transition:"create",vendor,sources:source("0.01")})));
  await reject(()=>perform(request({...base,requestRevision:1,id:randomUUID(),transition:"create",vendor,sources:source("0.01")})));
  await reject(()=>perform(request({...base,id:randomUUID(),transition:"create",vendor:randomUUID(),sources:source("0.01")})));
  await reject(()=>perform(request({...base,id:randomUUID(),transition:"create",vendor,sources:source("0.00001")})));
  const race=await Promise.allSettled([perform(create("0.1")),perform(create("0.1"))]);
  expect(race.filter(r=>r.status==="fulfilled"),race.map(r=>r.status==="rejected"?String(r.reason):"ok").join("; ")).toHaveLength(1);
  expect(race.filter(r=>r.status==="rejected")).toHaveLength(1);
  const otherOrder=(race.find(r=>r.status==="fulfilled") as PromiseFulfilledResult<PurchaseOrderResult>).value;
  const amendCancel=await Promise.allSettled([
    perform(request({...base,id:otherOrder.id,revision:1,transition:"increase",sources:source("0.001")})),
    perform(request({...base,id:otherOrder.id,revision:1,transition:"cancel"}))]);
  expect(amendCancel.map(r=>r.status)).toEqual(["fulfilled","rejected"]);
  po=await perform(request({...base,id:po.id,revision:1,transition:"increase",sources:source("0.025")})) as PurchaseOrderResult;
  expect(po.planning_lines[0].quantity).toBe("0.0750");
  await reject(()=>perform(request({...base,id:po.id,revision:1,transition:"review"})));
  const concurrent=await Promise.allSettled([
    perform(request({...base,id:po.id,revision:2,transition:"increase",sources:source("0.005")})),
    perform(request({...base,id:po.id,revision:2,transition:"review"}))]);
  expect(concurrent.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  po=(concurrent.find(r=>r.status==="fulfilled") as PromiseFulfilledResult<PurchaseOrderResult>).value;
  if (!po.reviewed_by) po=await perform(request({...base,id:po.id,revision:po.planning_revision,transition:"review"})) as PurchaseOrderResult;
  await reject(()=>perform(request({...base,id:po.id,revision:po.planning_revision,transition:"increase",sources:source("0.001")})));
  po=await perform(request({...base,id:po.id,revision:po.planning_revision,transition:"approve"})) as PurchaseOrderResult;
  expect(po.status).toBe("approved");
  for(const transition of ["cancel","decrease"] as const)
    await reject(()=>perform(request({...base,id:po.id,revision:po.planning_revision,transition})));
  await reject(()=>perform(prRequest({...demand,id:pr.id,revision:pr.revision,transition:"cancel",reason:"Cannot release encumbered PR"})));
  await reject(()=>new SupplyPlanningService(h.db).order(h.admin.organization_id,h.admin.id,randomUUID(),pr.id,pr.revision,vendor));
  await reject(()=>h.runtime.query("UPDATE purchase_orders SET status='cancelled' WHERE id=$1",[po.id]));
  await reject(()=>h.writer.query("UPDATE purchase_orders SET status='cancelled' WHERE id=$1",[po.id]));
  await reject(()=>h.writer.query("UPDATE purchase_orders SET planning_lines=jsonb_set(planning_lines,'{0,unit}','\"forged\"') WHERE id=$1",[po.id]));
  await reject(()=>h.writer.query("UPDATE commitment_po_coverage SET end_quantity=end_quantity+1 WHERE order_id=$1",[po.id]));
  await reject(()=>h.db.query(`INSERT INTO commitment_po_coverage(id,order_id,claim_id,source_slice,start_quantity,end_quantity,operation_key)
    SELECT $1,order_id,claim_id,source_slice,start_quantity,end_quantity,'Overlap probe' FROM commitment_po_coverage WHERE order_id=$2 LIMIT 1`,[randomUUID(),po.id]));
  await reject(()=>h.db.query(`INSERT INTO purchase_goods_receipts(id,organization_id,po_id,line_id,item_id,quantity,unit,location,source,received_by)
    VALUES($1,$2,$3,$4,$5,0.01,$6,'Synthetic','{}',$7)`,[randomUUID(),h.admin.organization_id,po.id,base.line,demand.item,demand.unit,h.admin.id]));
  await h.db.query(`CREATE FUNCTION fail_po_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='order' THEN RAISE EXCEPTION 'Synthetic PO audit failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_po_audit BEFORE INSERT ON supply_events FOR EACH ROW EXECUTE FUNCTION fail_po_audit()`);
  await reject(()=>perform(create("0.001")));
  await h.db.query("DROP TRIGGER fail_po_audit ON supply_events; DROP FUNCTION fail_po_audit()");
  const revisionRequest=create("0.001"),revisionToken=await authority.issue(access,revisionRequest);
  const revisionRace=await Promise.allSettled([
    authority.perform(revisionToken,revisionRequest),
    h.db.transaction(async m=>{
      await m.query("SELECT requirement_assert($1,$2,$3,$4,$5)",[h.admin.organization_id,demand.project,demand.site,demand.demandRevision,demand.approval]);
      await m.query("UPDATE planning_projects SET revision=revision+1 WHERE id=$1",[demand.project]);
    })]);
  expect(revisionRace[1].status).toBe("fulfilled");
  await reject(()=>authority.perform(revisionToken,revisionRequest));
  await reject(()=>authority.perform(capability,initial));
  await h.db.query("UPDATE planning_projects SET revision=revision-1 WHERE id=$1",[demand.project]);
  const foreign=await h.auth.login(h.other.email,h.password),foreignRequest=create("0.001");
  await reject(async()=>authority.perform(await authority.issue(foreign.token!,foreignRequest),foreignRequest));
  const pending=create("0.001"),token=await authority.issue(access,pending);
  await h.identity.query("UPDATE users SET role='viewer' WHERE id=$1",[h.admin.id]);
  await reject(()=>authority.perform(token,pending));
  await h.identity.query("UPDATE users SET role='admin' WHERE id=$1",[h.admin.id]);
  await h.auth.revokeRefreshToken(login.refreshToken!);
  await reject(()=>authority.perform(token,pending));
  expect(await ledger()).toEqual(heldBefore);
  const after=await h.fingerprint();
  const unchanged=(value:unknown)=>Object.fromEntries(Object.entries(value as Record<string,unknown>).filter(([t])=>!["purchase_orders","supply_events"].includes(t)));
  expect(unchanged(after)).toEqual(unchanged(before));
  await h.db.query("SELECT commitment_pr_check($1)",[pr.id]);
  await h.db.query("SELECT commitment_po_check(order_id) FROM commitment_po_lines");
  const reconciliation=await h.db.query(`SELECT c.id,c.held::text,coalesce(sum(x.end_quantity-x.start_quantity),0)::text ordered,
    (c.held-coalesce(sum(x.end_quantity-x.start_quantity),0))::text unordered FROM commitment_claims c
    LEFT JOIN commitment_po_coverage x ON x.claim_id=c.id WHERE c.source_id=$1 GROUP BY c.id`,[base.line]);
  expect(reconciliation.every((c:{held:string;ordered:string;unordered:string})=>Number(c.ordered)<=Number(c.held)&&Number(c.unordered)>=0)).toBe(true);
  h.evidence.purchase_order_commitments={schema:h.schema,acceptance:"CONDITIONAL PASS",before,after,
    ledger_unchanged:heldBefore,shared_balance:sharedBalance,capacity_race:race.map(r=>r.status),amend_review_race:concurrent.map(r=>r.status),
    amend_cancel_race:amendCancel.map(r=>r.status),approval_revision_race:revisionRace.map(r=>r.status),
    reconciliation,coverage:await h.db.query("SELECT * FROM commitment_po_coverage ORDER BY claim_id,start_quantity"),
    snapshot:await snapshot(),blocked:["decrease","cancel","return-to-PR","receipt","QC","stock","production","packing","delivery"]};
}
