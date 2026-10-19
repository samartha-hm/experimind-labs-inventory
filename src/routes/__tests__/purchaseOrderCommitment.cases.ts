import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { expect } from "vitest";
import { env } from "../../config/env";
import { AddPurchaseOrderCommitments1792713600020 } from "../../migration/1792713600020-AddPurchaseOrderCommitments";
import { AddReceiptCommitments1792800000021 } from "../../migration/1792800000021-AddReceiptCommitments";
import { TrustedLedgerAuthority, type LedgerRequest } from "../../security/TrustedLedgerAuthority";
import { configureDatabaseBoundary, assertDatabaseBoundary } from "../../security/databaseBoundary";
import type { PurchaseRequestMutation, PurchaseRequestResult } from "../../services/PurchaseRequestCommitmentService";
import type { PurchaseOrderMutation, PurchaseOrderResult } from "../../services/PurchaseOrderCommitmentService";
import type { verifyReservationCommitments } from "./reservationCommitment.cases";
import { reservationHttpChecks } from "./reservationHttp.cases";
import { SupplyPlanningService } from "../../services/SupplyPlanningService";
import { planningStock } from "../../services/CommitmentLedgerService";
import { AddPhysicalStocktake1791504000003 } from "../../migration/1791504000003-AddPhysicalStocktake";
import { StocktakeService } from "../../services/StocktakeService";
import { InventoryItem } from "../../entity/InventoryItem";
import { PurchaseOrderService } from "../../services/PurchaseOrderService";
import { StockLedgerService } from "../../services/StockLedgerService";
import { postVerifiedSupplyMovement } from "../../services/SupplyStockService";
import { withReceiptHttp } from "./receiptHttp.cases";

export async function verifyPurchaseOrderCommitments(h:Parameters<typeof verifyReservationCommitments>[0]) {
  const f=await h.fixture(),runner=h.db.createQueryRunner();
  await runner.connect();await runner.startTransaction();
  try {await new AddPurchaseOrderCommitments1792713600020().up(runner);
    await new AddReceiptCommitments1792800000021().up(runner);await runner.commitTransaction();}
  catch(e){await runner.rollbackTransaction();throw e;}finally{await runner.release();}
  await h.db.transaction(m=>configureDatabaseBoundary(m,h.schema,h.roles));
  const stockItem=await h.db.getRepository(InventoryItem).save({organization_id:h.admin.organization_id,name:"Synthetic receipt scope item",sku:`RECEIPT-${randomUUID()}`,unit:"m",quantity:0,base_price:0,threshold:0});
  const stocktake=new StocktakeService(h.db),session=await stocktake.create(h.admin.organization_id,h.admin.id,"Synthetic receipt scope","Isolated D2B2-B fixture",[{item_id:stockItem.id,locations:["Shelf A"],complete_coverage:true}]);
  let counted=await stocktake.count(h.admin.organization_id,session.id,h.admin.id,session.revision,stockItem.id,"Shelf A","0",stockItem.unit);
  counted=await stocktake.transition(h.admin.organization_id,session.id,h.admin.id,counted.revision,"review","Synthetic scope review");
  counted=await stocktake.transition(h.admin.organization_id,session.id,h.admin.id,counted.revision,"approve","Synthetic scope approval");
  await stocktake.transition(h.admin.organization_id,session.id,h.admin.id,counted.revision,"post","Synthetic scope posting");
  for(const [pool,kind] of [[h.runtime,"runtime"],[h.identity,"identity"],[h.writer,"ledger"]] as const)
    await assertDatabaseBoundary(pool,kind,h.schema);
  const boundaryRoles=await Promise.all([h.runtime,h.identity,h.writer].map(pool=>pool.query(
    "SELECT current_user,session_user,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user")));
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
  const snapshot=()=>h.writer.query(["purchase_goods_receipts","commitment_receipts","commitment_receipt_decisions","stock_ledger","purchase_orders","commitment_po_lines","commitment_po_coverage","purchase_requests","commitment_pr_lines","project_stock_reservations",
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
  // Independent D2B2-A-R: retries must preserve the complete committed snapshot.
  const retryBefore=await snapshot();
  const retries=await Promise.all([authority.perform(capability,initial),authority.perform(capability,initial)]);
  expect(retries).toEqual([po,po]);
  expect(await snapshot()).toEqual(retryBefore);
  await reject(()=>perform(initial));
  for (const substitution of [{project:randomUUID()},{item:randomUUID()},{unit:"forged"},
    {approval:randomUUID()},{demandRevision:2},{line:randomUUID()},{request:randomUUID()}])
    await reject(()=>perform(request({...base,...substitution,id:randomUUID(),transition:"create",vendor,sources:source("0.001")})));
  await reject(()=>perform(request({...base,id:randomUUID(),transition:"create",vendor,sources:[]})));
  await reject(()=>perform(request({...base,id:randomUUID(),transition:"create",vendor,sources:[...source("0.001"),...source("0.001")]})));
  // Inject at progressively later writes, including AFTER the immutable retry receipt.
  const faultStages=["purchase_orders","commitment_po_lines","commitment_po_coverage","supply_events","commitment_authorizations"];
  for (const table of faultStages) {
    await h.db.query(`CREATE FUNCTION review_po_fault() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Independent synthetic PO write failure'; END $$;
      CREATE TRIGGER review_po_fault AFTER INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION review_po_fault()`);
    const operation=create("0.001"),bearer=await authority.issue(access,operation);
    try { await reject(()=>authority.perform(bearer,operation)); }
    finally { await h.db.query(`DROP TRIGGER review_po_fault ON ${table}; DROP FUNCTION review_po_fault()`); }
  }
  const adjustmentRace=await Promise.allSettled([
    perform(prRequest({...demand,id:pr.id,revision:pr.revision,transition:"adjust",quantity:"0.19",reason:"Independent encumbered PR race"})),
    perform(create("0.001"))]);
  expect(adjustmentRace.map(r=>r.status)).toEqual(["rejected","fulfilled"]);
  for (const sql of ["DELETE FROM commitment_po_coverage","DELETE FROM commitment_po_lines",
    "UPDATE commitment_claims SET held=held+1","DELETE FROM commitment_events",
    `SELECT commitment_po_check('${po.id}'::uuid)`])
    await reject(()=>h.runtime.query(sql));
  h.evidence.purchase_order_independent_review={concurrent_same_bearer_retry:"PASS",lineage_substitutions:7,
    missing_and_duplicate_sources:"REJECTED",rollback_after_insert:faultStages,
    pr_adjustment_po_creation:adjustmentRace.map(r=>r.status),runtime_sql_denials:5,boundary_roles:boundaryRoles,
    missing_empty_duplicate_planning_lines:"REJECTED"};
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
  for (const expression of ["NULL","'[]'::jsonb","planning_lines || planning_lines"])
    await reject(()=>h.writer.query(`UPDATE purchase_orders SET planning_lines=${expression} WHERE id=$1`,[po.id]));
  await reject(()=>h.writer.query("UPDATE commitment_po_coverage SET end_quantity=end_quantity+1 WHERE order_id=$1",[po.id]));
  await reject(()=>h.db.query(`INSERT INTO commitment_po_coverage(id,order_id,claim_id,source_slice,start_quantity,end_quantity,operation_key)
    SELECT $1,order_id,claim_id,source_slice,start_quantity,end_quantity,'Overlap probe' FROM commitment_po_coverage WHERE order_id=$2 LIMIT 1`,[randomUUID(),po.id]));
  const receiptId=randomUUID(),coverageRows:{id:string;start_quantity:string;end_quantity:string}[]=await h.writer.query(
    "SELECT id,start_quantity::text,end_quantity::text FROM commitment_po_coverage WHERE order_id=$1 ORDER BY end_quantity-start_quantity DESC LIMIT 1",[po.id]);
  expect(coverageRows).toHaveLength(1);
  const receiptInput=(transition:"receive"|"accept"|"reject"|"quarantine",revision=1):Extract<LedgerRequest,{action:"receipt"}>=>{
    const common={...demand,id:receiptId,order:po.id,orderRevision:po.planning_revision,line:po.planning_lines[0].id,reason:`Synthetic ${transition}`};
    return transition==="receive"
      ? {action:"receipt",key:`receipt-${randomUUID()}`,input:{...common,transition,coverage:coverageRows[0].id,quantity:"0.001",location:"Shelf A"}}
      : {action:"receipt",key:`receipt-${randomUUID()}`,input:{...common,transition,revision}};
  };
  const demandBefore=await h.writer.query("SELECT approved,fulfilled,held FROM commitment_balances WHERE account_id=$1",[f.account]);
  const receiveRequest=receiptInput("receive"),receiveToken=await authority.issue(access,receiveRequest);
  await withReceiptHttp(h.runtime,authority,access,async send=>{
  const before=await h.db.query("SELECT id FROM purchase_goods_receipts ORDER BY id");
  await send(receiveRequest,"",{status:403});
  await send(receiveRequest,access,{status:409});
  await send(receiveRequest,receiveToken,{body:{...receiveRequest.input,actor_id:h.admin.id},status:400});
  await send(receiveRequest,receiveToken,{body:{...receiveRequest.input,quantity:"0.002"},status:409});
  await send(receiveRequest,receiveToken,{path:`/orders/${randomUUID()}/receipts`,status:400});
  expect(await h.db.query("SELECT id FROM purchase_goods_receipts ORDER BY id")).toEqual(before);
  const deny=async(request:Extract<LedgerRequest,{action:"receipt"}>,capability:string,options:Parameters<typeof send>[2]={status:409})=>{
    const before=await snapshot();await send(request,capability,options);expect(await snapshot()).toEqual(before);
  };
  await deny(receiveRequest,receiveToken,{closed:true,status:503});
  await deny(receiveRequest,receiveToken,{legacy:true,status:503});
  for(const planning of [null,[],{},[{...po.planning_lines[0],id:randomUUID()}]]) {
    const historical=randomUUID();
    await reject(()=>h.db.query(`INSERT INTO purchase_orders SELECT (jsonb_populate_record(NULL::purchase_orders,
      (to_jsonb(p)-'planning_lines')||jsonb_build_object('id',$1::uuid,'po_number',$1::text,'purchase_request_id',null,
        'planning_revision',null)||CASE WHEN $2::jsonb IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('planning_lines',$2::jsonb) END)).* FROM purchase_orders p WHERE id=$3`,
      [historical,planning===null?null:JSON.stringify(planning),po.id]));
    const request={...receiveRequest,key:randomUUID(),input:{...receiveRequest.input,order:historical}};
    await deny(request,await authority.issue(access,request));
    await deny(request,receiveToken,{legacy:true,status:503});
  }
  await reject(()=>new SupplyPlanningService(h.runtime).receive(h.admin.organization_id,h.admin.id,randomUUID(),po.id,po.planning_revision,po.planning_lines[0].id,"0.001","m","Shelf A"));
  await reject(()=>new SupplyPlanningService(h.writer).inspect(h.admin.organization_id,h.admin.id,randomUUID(),receiptId,1,"accept","Legacy"));
  await reject(()=>new PurchaseOrderService().receiveItems(po.id,[],h.admin.organization_id,h.admin.id));
  await reject(()=>StockLedgerService.postEntry({organizationId:h.admin.organization_id,itemId:stockItem.id,qtyDelta:1,transactionType:"PO_RECEIPT"}));
  await reject(()=>h.db.transaction(m=>postVerifiedSupplyMovement(m,h.admin.organization_id,stockItem,"Shelf A",10n,h.admin.id,{receipt:randomUUID(),ledger_id:randomUUID()})));
  for(const change of [{project:randomUUID()},{site:randomUUID()},{approval:randomUUID()},{line:randomUUID()},
    {order:randomUUID()},{order:otherOrder.id},{orderRevision:1},{demandRevision:99},{quantity:"999"},{coverage:randomUUID()}]) {
    const request={...receiveRequest,key:randomUUID(),input:{...receiveRequest.input,...change}} as typeof receiveRequest;
    await deny(request,await authority.issue(access,request));
  }
  for(const body of [{},{...receiveRequest.input,planning_lines:[]},{...receiveRequest.input,planning_lines:{}},{...receiveRequest.input,line:"malformed"}])
    await deny(receiveRequest,receiveToken,{body,status:400});
  const decodedReceipt=jwt.decode(receiveToken) as jwt.JwtPayload,now=Math.floor(Date.now()/1000);
  for(const change of [{scope:"ledger:read"},{iat:now-61,exp:now-1},{sub:h.other.id}])
    await deny(receiveRequest,jwt.sign({...decodedReceipt,...change},env.jwtSecret));
  const foreignLogin=await h.auth.login(h.other.email,h.password);
  await deny(receiveRequest,receiveToken,{access:foreignLogin.token!,status:409});
  await h.identity.query("UPDATE users SET role='viewer' WHERE id=$1",[h.admin.id]);
  try {await deny(receiveRequest,receiveToken,{status:403});}
  finally {await h.identity.query("UPDATE users SET role='admin' WHERE id=$1",[h.admin.id]);}
  const received=await send(receiveRequest,receiveToken);
  expect(await send(receiveRequest,receiveToken)).toEqual(received);
  await reject(()=>perform(receiptInput("receive")));
  const [receiptCoverage]:{start_quantity:string;end_quantity:string}[]=await h.writer.query(
    "SELECT start_quantity::text,end_quantity::text FROM commitment_receipts WHERE receipt_id=$1",[receiptId]);
  expect(Number(receiptCoverage.end_quantity)-Number(receiptCoverage.start_quantity)).toBe(0.001);
  const partials=[0,1,2].map(()=>({...receiptInput("receive"),input:{...receiveRequest.input,id:randomUUID()}}));
  const tokens=await Promise.all(partials.map(r=>authority.issue(access,r)));
  const concurrent=await Promise.all(partials.map((r,i)=>send(r,tokens[i])));
  expect(new Set(concurrent.map(r=>r.id)).size).toBe(3);
  expect(await h.writer.query("SELECT id FROM stock_ledger WHERE goods_receipt_id=ANY($1::uuid[])",[concurrent.map(r=>r.id)])).toHaveLength(0);
  const rejected={...receiptInput("reject"),input:{...receiptInput("reject").input,id:concurrent[0].id}};
  await send(rejected,await authority.issue(access,rejected));
  expect(await h.writer.query("SELECT id FROM stock_ledger WHERE goods_receipt_id=$1",[concurrent[0].id])).toHaveLength(0);
  const quarantine=receiptInput("quarantine"),quarantined=await send(quarantine,await authority.issue(access,quarantine));
  expect((quarantined as {status:string}).status).toBe("quarantined");
  const accept=receiptInput("accept",2),acceptToken=await authority.issue(access,accept);
  const secondLogin=await h.auth.login(h.admin.email,h.password);
  await send(accept,acceptToken,{access:secondLogin.token!,status:409});
  const rollbackBefore=await snapshot();
  await h.db.query(`CREATE FUNCTION fail_receipt_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic receipt audit failure'; END $$;
    CREATE TRIGGER fail_receipt_audit BEFORE INSERT ON supply_events FOR EACH ROW WHEN (NEW.kind='receipt') EXECUTE FUNCTION fail_receipt_audit()`);
  try {await send(accept,acceptToken,{status:409});expect(await snapshot()).toEqual(rollbackBefore);}
  finally {await h.db.query("DROP TRIGGER fail_receipt_audit ON supply_events; DROP FUNCTION fail_receipt_audit()");}
  const [accepted,retry]=await Promise.all([send(accept,acceptToken),send(accept,acceptToken)]);
  expect(retry).toEqual(accepted);
  expect((accepted as {status:string;ledger_id:string}).status).toBe("accepted");
  expect(await send(accept,acceptToken)).toEqual(accepted);
  await deny({...accept,key:randomUUID()},await authority.issue(access,{...accept,key:"different-key-replay"}));
  const replay={...accept,key:randomUUID()};await deny(replay,await authority.issue(access,replay));
  await deny(accept,acceptToken,{body:{...accept.input,reason:"changed"},status:409});
  const stale=receiptInput("reject",2);await send(stale,await authority.issue(access,stale),{status:409});
  const beforeRevocation=await snapshot(),sid=(jwt.decode(access) as jwt.JwtPayload).sid;
  await h.db.query("UPDATE refresh_tokens SET is_revoked=true WHERE user_id=$1 AND token_hash=$2",[h.admin.id,sid]);
  try {await send(accept,acceptToken,{status:409});expect(await snapshot()).toEqual(beforeRevocation);}
  finally {await h.db.query("UPDATE refresh_tokens SET is_revoked=false WHERE user_id=$1 AND token_hash=$2",[h.admin.id,sid]);}
  expect(await h.writer.query("SELECT id FROM stock_ledger WHERE goods_receipt_id=$1",[receiptId])).toHaveLength(1);
  for(const db of [h.writer,h.db])await reject(()=>db.query(`INSERT INTO stock_ledger
    SELECT (jsonb_populate_record(NULL::stock_ledger,to_jsonb(s)||jsonb_build_object('id',$1::uuid,
      'goods_receipt_id',null,'verification_entry_id',$1::uuid,'physical_sequence',physical_sequence+100))).*
    FROM stock_ledger s WHERE goods_receipt_id=$2`,[randomUUID(),receiptId]));
  expect(await h.writer.query("SELECT approved,fulfilled,held FROM commitment_balances WHERE account_id=$1",[f.account])).toEqual(demandBefore);
  expect(await h.writer.query("SELECT id FROM supply_events WHERE kind='receipt' AND record_id=$1",[receiptId])).toHaveLength(3);
  h.evidence.receipt_qc={receipt_id:receiptId,source_coverage:receiptCoverage,statuses:["pending","quarantined","accepted"],
    production_router_http:true,legacy_router_denied:true,legacy_services_denied:true,stock_helpers_denied:true,
    privileged_unmapped_stock_denied:true,concurrent_partials:3,concurrent_accept_retry:"PASS",retry_same_capability:"PASS",audit_failure_atomic_rollback:"PASS",session_binding_and_revoked_retry:"PASS",stock_movements:1,demand_balances_unchanged:true};
  });
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
  const unchanged=(value:unknown)=>Object.fromEntries(Object.entries(value as Record<string,unknown>).filter(([t])=>!["purchase_orders","supply_events","purchase_goods_receipts","stock_ledger"].includes(t)));
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
