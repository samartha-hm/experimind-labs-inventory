import { randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import { canonicalRequirementJSON } from "./RequirementApprovalService";
import { stockText, stockUnits } from "../features/inventory/physicalQuantity";

export interface LedgerContext { organization: string; actor: string }
export interface LedgerSource { kind: `synthetic:${string}`; id: string; slice: string }
export type LedgerOperation =
  | { kind: "authorize"; payload: Record<string, never> }
  | { kind: "open"; payload: { claim: string; quantity: string; source: LedgerSource } }
  | { kind: "transfer"; payload: { claim: string; source: LedgerSource } }
  | { kind: "consume"; payload: { claim: string; quantity: string } }
  | { kind: "release"; payload: { claim: string; quantity: string; untouched: true; unencumbered: true; evidence: string } }
  | { kind: "split"; payload: { claim: string; children: { claim: string; quantity: string; source: LedgerSource }[] } };
export interface LedgerEvent {
  id: string; organization_id: string; account_id: string; entitlement_id: string; actor_id: string;
  key: string; kind: LedgerOperation["kind"]; payload: LedgerOperation["payload"]; reason: string;
  sequence: string; approved_after: string; fulfilled_after: string; held_after: string;
}
export interface LedgerAccountInput {
  project: string; site: string; obligation: string; dimension: "material" | "slot";
  item: string; unit: string; selector: Record<string, string>;
}
/** Six-place planning to four-place stock, without floating point or rounding. */
export function planningStock(text: string): string {
  const q = planningUnits(text);
  if (q % 100n) throw new Error("Planning quantity is inexact in stock units");
  const result = stockText(q / 100n);
  stockUnits(result);
  return result;
}
export function planningUnits(text: string): bigint {
  if (!/^\d{1,10}(\.\d{1,6})?$/.test(text)) throw new Error("Exact nonnegative six-place decimal required");
  const [whole, fraction = ""] = text.split(".");
  const q = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (q > 1_000_000_000_000_000n) throw new Error("Planning range exceeded");
  return q;
}

/** Internal synthetic foundation. Never mounted on an HTTP router or used by operational writers. */
export class CommitmentLedgerService {
  constructor(private readonly db: DataSource) {}
  private async actor(m: EntityManager, context: LedgerContext): Promise<void> {
    if (!(await m.query(`SELECT id FROM users WHERE id=$1 AND organization_id=$2 AND is_active
      AND role IN ('admin','super_admin') FOR SHARE`, [context.actor, context.organization])).length)
      throw new Error("Active tenant administrator required");
  }
  async createAccount(context: LedgerContext, input: LedgerAccountInput): Promise<string> {
    return this.db.transaction(async m => {
      await this.actor(m, context);
      const [account] = await m.query(`INSERT INTO commitment_accounts(organization_id,project_id,site_id,obligation,dimension,item_key,unit,selector)
        VALUES($1,$2,$3,$4,$5,CASE WHEN $5='slot' THEN $8::jsonb::text ELSE $6 END,$7,$8::jsonb) RETURNING id`,
      [context.organization, input.project, input.site, input.obligation, input.dimension,
        input.item, input.unit, JSON.stringify(input.selector)]);
      return account.id as string;
    });
  }
  async entitlement(context: LedgerContext, account: string, approval: string, revision: number, cap: string, provenance: unknown): Promise<string> {
    planningUnits(cap);
    return this.db.transaction(async m => {
      await this.actor(m, context);
      const [row] = await m.query(`INSERT INTO commitment_entitlements(organization_id,account_id,approval_id,revision,cap,provenance)
        VALUES($1,$2,$3,$4,$5,$6::jsonb) RETURNING id`, [context.organization, account, approval, revision, cap, JSON.stringify(provenance)]);
      return row.id as string;
    });
  }
  async execute(context: LedgerContext, account: string, entitlement: string, key: string, reason: string,
    operation: LedgerOperation): Promise<LedgerEvent> {
    return this.db.transaction(m => this.executeInTransaction(m, context, account, entitlement, key, reason, operation));
  }
  async executeInTransaction(m: EntityManager, context: LedgerContext, account: string, entitlement: string,
    key: string, reason: string, operation: LedgerOperation): Promise<LedgerEvent> {
    await this.actor(m, context);
    if (!key.trim() || key.length > 100 || !reason.trim()) throw new Error("Event key and reason required");
    await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`commitment:${context.organization}:${context.actor}:${key}`]);
    const [previous]: LedgerEvent[] = await m.query(`SELECT * FROM commitment_events WHERE organization_id=$1 AND actor_id=$2 AND key=$3`,
      [context.organization, context.actor, key]);
    if (previous) {
      await m.query(`SELECT requirement_assert(a.organization_id,a.project_id,a.site_id,e.revision,e.approval_id)
        FROM commitment_accounts a JOIN commitment_entitlements e ON e.account_id=a.id
        WHERE a.id=$1 AND e.id=$2 AND a.organization_id=$3`, [account, entitlement, context.organization]);
      if (previous.account_id !== account || previous.entitlement_id !== entitlement || previous.kind !== operation.kind ||
        previous.reason !== reason || canonicalRequirementJSON(previous.payload) !== canonicalRequirementJSON(operation.payload))
        throw new Error("Idempotency key conflicts with retained event");
      return previous;
    }
    const [event]: LedgerEvent[] = await m.query(`INSERT INTO commitment_events(organization_id,account_id,entitlement_id,actor_id,key,kind,payload,reason)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8) RETURNING *`,
    [context.organization, account, entitlement, context.actor, key, operation.kind, JSON.stringify(operation.payload), reason]);
    return event;
  }
  newClaim(): string { return randomUUID(); }
}

/** Independent replay derives deltas, and checks every retained after-state. */
export function replayCommitments(events: LedgerEvent[], entitlements: { id: string; account_id: string; cap: string }[]): { approved: bigint; fulfilled: bigint; held: bigint } {
  let approved = 0n, fulfilled = 0n, held = 0n, sequence = 0n;
  let account: string | undefined;
  const claims = new Map<string, { held: bigint; fulfilled: bigint; released: bigint; retired: boolean }>();
  for (const event of events) {
    account ??= event.account_id;
    if (event.account_id !== account) throw new Error("Replay requires one account");
    if (BigInt(event.sequence) !== ++sequence) throw new Error("Event sequence gap");
    const p = event.payload as { claim?: string; quantity?: string; children?: { claim: string; quantity: string }[] };
    if (event.kind === "authorize") {
      const entitlement = entitlements.find(e => e.id === event.entitlement_id && e.account_id === account);
      if (!entitlement) throw new Error("Missing immutable replay entitlement");
      approved = planningUnits(entitlement.cap);
    }
    else if (event.kind === "open") {
      const q = planningUnits(p.quantity!);
      if (claims.has(p.claim!)) throw new Error("Duplicate replay claim");
      claims.set(p.claim!, { held: q, fulfilled: 0n, released: 0n, retired: false }); held += q;
    } else {
      const c = claims.get(p.claim!);
      if (!c || c.retired) throw new Error("Missing or retired replay claim");
      if (event.kind === "split") {
        let sum = 0n;
        for (const child of p.children!) {
          const q = planningUnits(child.quantity);
          if (claims.has(child.claim)) throw new Error("Duplicate replay child");
          claims.set(child.claim, { held: q, fulfilled: 0n, released: 0n, retired: false }); sum += q;
        }
        if (sum !== c.held || c.fulfilled || c.released) throw new Error("Invalid replay partition");
        c.held = 0n; c.retired = true;
      } else if (event.kind !== "transfer") {
        const q = planningUnits(p.quantity!);
        if (q <= 0n || q > c.held) throw new Error("Replay slice exceeded");
        c.held -= q; held -= q;
        if (event.kind === "consume") { c.fulfilled += q; fulfilled += q; } else c.released += q;
      }
    }
    if (fulfilled + held > approved || planningUnits(event.approved_after) !== approved ||
      planningUnits(event.fulfilled_after) !== fulfilled || planningUnits(event.held_after) !== held)
      throw new Error("Replay and event projection differ");
  }
  return { approved, fulfilled, held };
}
