import { createHash, randomUUID } from "node:crypto";
import { DataSource, EntityManager } from "typeorm";
import { User } from "../entity/User";
import { PlanningProject, PlanningSchoolSite } from "../entity/PlanningProject";
import { SupplyEvent, SupplyOperation } from "../entity/SupplyPlanning";
import { DraftKitError } from "./ProductTemplateService";
import type { PackingOrder } from "../features/packing/packingTypes";
import type { DeliveryOrder, DeliveryState, CustodyEvent } from "../features/delivery/deliveryTypes";
import { assertExecutionSupported } from "./ExecutionReadinessService";
const fail = (status: number, message: string): never => { throw new DraftKitError(status, message); };
export class DeliveryService {
  constructor(protected readonly db: DataSource | EntityManager) {}
  protected async operation<T>(org: string, actor: string, key: string, input: unknown, run: (m: EntityManager) => Promise<T>): Promise<T> {
    if (!key || key.length > 100) fail(400, "Idempotency key required");
    const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    return this.db.transaction(async m => {
      await assertExecutionSupported(m);
      await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [org + ":" + key]);
      const old = await m.findOneBy(SupplyOperation, { organization_id: org, key });
      if (old) { if (old.actor_id !== actor || old.fingerprint !== fingerprint) fail(409, "Idempotency key already used"); return old.result as T; }
      const result = await run(m);
      await m.insert(SupplyOperation, { organization_id: org, actor_id: actor, key, fingerprint, result: JSON.parse(JSON.stringify(result)) as unknown });
      return result;
    });
  }
  protected async approve(m: EntityManager, org: string, actor: string) {
    const u = await m.findOneBy(User, { id: actor, organization_id: org, is_active: true });
    if (!u || !["admin", "super_admin", "manager"].includes(u.role)) fail(403, "Authorized delivery approval required");
  }
  protected async employee(m: EntityManager, org: string, id?: string) {
    if (id && !await m.findOneBy(User, { id, organization_id: org, is_active: true })) fail(404, "Assigned employee not found");
  }
  private async order(m: EntityManager, org: string, id: string, revision?: number): Promise<DeliveryOrder> {
    const rows: DeliveryOrder[] = await m.query(`SELECT * FROM delivery_orders WHERE id=$1 AND organization_id=$2 ${revision === undefined ? "" : "FOR UPDATE"}`, [id, org]);
    if (!rows[0]) fail(404, "Delivery order not found");
    if (revision !== undefined && rows[0].revision !== revision) fail(409, "Delivery changed; refresh before retrying");
    return rows[0];
  }
  private async audit(m: EntityManager, org: string, actor: string, o: DeliveryOrder) {
    await m.insert(SupplyEvent, { organization_id: org, actor_id: actor, kind: "delivery", record_id: o.id, revision: o.revision, snapshot: o });
  }
  private async save(m: EntityManager, org: string, actor: string, o: DeliveryOrder) {
    const [rows]: [DeliveryOrder[], number] = await m.query("UPDATE delivery_orders SET status=$3,execution=$4,transport=$5,revision=revision+1,updated_by=$6,updated_at=now() WHERE id=$1 AND organization_id=$2 RETURNING *", [o.id, org, o.status, JSON.stringify(o.execution), JSON.stringify(o.transport), actor]);
    await this.audit(m, org, actor, rows[0]); return rows[0];
  }
  private async custody(m: EntityManager, org: string, actor: string, o: DeliveryOrder, ids: string[], state: string, notes: string) {
    const ledger = (await m.query("SELECT COALESCE(jsonb_agg(ledger_id ORDER BY ledger_id),'[]'::jsonb) ids FROM packing_picks WHERE order_id=$1 AND organization_id=$2", [o.packing_order_id, org]))[0].ids as string[];
    for (const id of ids) await m.query("INSERT INTO package_custody_events(organization_id,order_id,package_id,revision,actor_id,state,location,notes,pick_ledger_ids) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)", [org, o.id, id, o.revision, actor, state, state === "returned" ? "Return quarantine" : state === "planned" ? "Packed staging" : state === "delivered" ? o.destination.school_name : o.transport.carrier, notes, JSON.stringify(ledger)]);
  }
  private selected(o: DeliveryOrder, ids: string[]) {
    if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !o.manifest.some(p => p.id === id))) fail(400, "Select unique manifest packages");
  }
  async list(org: string, project?: string) {
    return this.db.query("SELECT * FROM delivery_orders WHERE organization_id=$1 AND ($2::uuid IS NULL OR project_id=$2) ORDER BY created_at DESC LIMIT 200", [org, project ?? null]);
  }
  async detail(org: string, id: string) {
    return this.db.transaction("REPEATABLE READ", async m => ({ order: await this.order(m, org, id), custody: await m.query("SELECT * FROM package_custody_events WHERE organization_id=$1 AND order_id=$2 ORDER BY created_at,id", [org, id]), history: await m.find(SupplyEvent, { where: { organization_id: org, kind: "delivery", record_id: id }, order: { revision: "ASC" } }) }));
  }
  async create(org: string, actor: string, key: string, input: { packing_order_id: string; package_ids: string[]; transport: DeliveryOrder["transport"] }) {
    return this.operation(org, actor, key, ["delivery.create", input], async m => {
      await this.approve(m, org, actor); await this.employee(m, org, input.transport.employee_id);
      if (!input.transport.carrier.trim()) fail(400, "Transport carrier required");
      const rows: PackingOrder[] = await m.query("SELECT * FROM packing_orders WHERE id=$1 AND organization_id=$2 FOR UPDATE", [input.packing_order_id, org]);
      const p = rows[0]; if (!p) fail(404, "Packing allocation not found");
      if (p.status !== "ready" || !p.project_id || !p.site_id) fail(409, "QC Ready school packing allocation required");
      if (!input.package_ids.length || new Set(input.package_ids).size !== input.package_ids.length) fail(400, "Select unique package roots");
      const selected = new Set(input.package_ids), all = p.snapshot.packages;
      if (input.package_ids.some(id => !all.some(q => q.id === id))) fail(400, "Unknown package root");
      // Include every descendant, so a pouch cannot be dispatched separately from its claimed box.
      for (const q of all) { let parent = q.parent_id; while (parent) { if (selected.has(parent)) { selected.add(q.id); break; } parent = all.find(v => v.id === parent)?.parent_id ?? null; } }
      const manifest = all.filter(q => selected.has(q.id));
      const project = await m.findOneBy(PlanningProject, { id: p.project_id, organization_id: org });
      const site = await m.findOneBy(PlanningSchoolSite, { id: p.site_id, project_id: p.project_id, organization_id: org });
      if (!project || project.archived_at || !site) fail(409, "Active project and school required");
      const orders: DeliveryOrder[] = await m.query("INSERT INTO delivery_orders(organization_id,project_id,site_id,packing_order_id,number,manifest,transport,destination,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *", [org, p.project_id, p.site_id, p.id, `DEL-${randomUUID()}`, JSON.stringify(manifest), JSON.stringify(input.transport), JSON.stringify({ project_name: p.snapshot.project_name, school_name: p.snapshot.site_name, address: site.content.address }), actor]);
      const o = orders[0];
      for (const q of manifest) await m.query("INSERT INTO delivery_package_claims(organization_id,package_id,order_id,packing_order_id) VALUES($1,$2,$3,$4)", [org, q.id, o.id, p.id]);
      await this.audit(m, org, actor, o); await this.custody(m, org, actor, o, manifest.map(q => q.id), "planned", "QC approved package allocation"); return o;
    });
  }
  async transition(org: string, actor: string, key: string, id: string, revision: number, action: "dispatch" | "transit" | "fail" | "return" | "retry", reason: string) {
    return this.operation(org, actor, key, ["delivery.transition", id, revision, action, reason], async m => {
      const o = await this.order(m, org, id, revision); await this.approve(m, org, actor);
      const allowed: Record<typeof action, DeliveryState[]> = { dispatch: ["planned"], transit: ["dispatched"], fail: ["dispatched", "in_transit", "partially_delivered"], return: ["failed"], retry: ["failed", "returned"] };
      if (!allowed[action].includes(o.status)) fail(409, "Invalid delivery transition");
      if (["fail", "return", "retry"].includes(action) && !reason.trim()) fail(400, "Record a delivery reason");
      if (action === "retry" && o.execution.issues.some(i => !i.corrected_by)) fail(409, "Correct delivery issues before retrying");
      o.status = ({ dispatch: "dispatched", transit: "in_transit", fail: "failed", return: "returned", retry: "dispatched" } as const)[action];
      const saved = await this.save(m, org, actor, o);
      const received = new Set(o.execution.proofs.flatMap(p => p.package_ids));
      await this.custody(m, org, actor, saved, o.manifest.filter(p => !received.has(p.id)).map(p => p.id), saved.status, reason); return saved;
    });
  }
  async receive(org: string, actor: string, key: string, id: string, input: { revision: number; package_ids: string[]; recipient: string; acknowledged_at: string; acknowledgement: string }) {
    return this.operation(org, actor, key, ["delivery.receive", id, input], async m => {
      const o = await this.order(m, org, id, input.revision);
      if (!["dispatched", "in_transit", "partially_delivered"].includes(o.status)) fail(409, "Active dispatched delivery required");
      this.selected(o, input.package_ids);
      if (!input.recipient.trim() || !input.acknowledgement.trim() || !Number.isFinite(Date.parse(input.acknowledged_at)) || Date.parse(input.acknowledged_at) > Date.now() + 300000) fail(400, "Recipient, valid receipt time and acknowledgement required");
      const received = new Set(o.execution.proofs.flatMap(p => p.package_ids));
      if (input.package_ids.some(p => received.has(p))) fail(409, "Package already received");
      if (o.execution.issues.some(i => !i.corrected_by && input.package_ids.includes(i.package_id))) fail(409, "Correct package issues before confirming receipt");
      o.execution.proofs.push({ id: randomUUID(), package_ids: input.package_ids, recipient: input.recipient, acknowledged_at: input.acknowledged_at, acknowledgement: input.acknowledgement, recorded_by: actor, recorded_at: new Date().toISOString() });
      input.package_ids.forEach(p => received.add(p)); o.status = received.size === o.manifest.length ? "delivered" : "partially_delivered";
      const saved = await this.save(m, org, actor, o); await this.custody(m, org, actor, saved, input.package_ids, "delivered", input.acknowledgement); return saved;
    });
  }
  async issue(org: string, actor: string, key: string, id: string, input: { revision: number; package_id: string; kind: "shortage" | "damaged" | "missing" | "return"; notes: string; issue_id?: string }) {
    return this.operation(org, actor, key, ["delivery.issue", id, input], async m => {
      const o = await this.order(m, org, id, input.revision); this.selected(o, [input.package_id]);
      if (!input.notes.trim()) fail(400, "Issue or correction notes required");
      if (o.status === "planned" || o.status === "cancelled") fail(409, "Dispatch before recording delivery issues");
      if (input.issue_id) {
        await this.approve(m, org, actor);
        const issue = o.execution.issues.find(i => i.id === input.issue_id && i.package_id === input.package_id);
        if (!issue) fail(404, "Delivery issue not found"); if (issue.corrected_by) fail(409, "Issue already corrected");
        issue.corrected_by = actor; issue.corrected_at = new Date().toISOString(); issue.correction = input.notes;
      } else {
        o.execution.issues.push({ id: randomUUID(), package_id: input.package_id, kind: input.kind, notes: input.notes, reported_by: actor, reported_at: new Date().toISOString() });
      }
      return this.save(m, org, actor, o);
    });
  }
  async packageTrace(org: string, id: string): Promise<CustodyEvent[]> {
    return this.db.query("SELECT * FROM package_custody_events WHERE organization_id=$1 AND package_id=$2 ORDER BY created_at,id", [org, id]);
  }
}
