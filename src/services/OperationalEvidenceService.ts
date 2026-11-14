import { createHash } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import { OperationalEvidenceEvent } from "../entity/OperationalEvidence";
import { Stocktake } from "../entity/Stocktake";
import { InventoryItem } from "../entity/InventoryItem";
import { User } from "../entity/User";
import { DraftKitError } from "./ProductTemplateService";
import { canonicalRequirementJSON } from "./RequirementApprovalService";
import { stockUnits, stockText } from "../features/inventory/physicalQuantity";
import { evidenceGates, evidenceDecisions, type OperationalCommand, type OperationalRecord } from "../features/inventory/operationalEvidenceTypes";

export const operationalCollectors = ["admin", "super_admin", "manager", "inventory_staff", "staff"];
const reviewers = ["admin", "super_admin", "manager"];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function fail(status: number, message: string): never { throw new DraftKitError(status, message); }
function text(v: unknown, max = 2000): string {
  if (typeof v !== "string" || !v.trim() || v.length > max) fail(400, "Required text is missing or too long");
  return v.trim();
}
function identity(v: unknown): string { const s = text(v, 36); if (!uuid.test(s)) fail(400, "UUID required"); return s; }
function references(v: unknown) {
  if (!Array.isArray(v) || v.length < 1 || v.length > 20) fail(400, "One to twenty evidence references required");
  return v.map(ref => {
    if (!ref || typeof ref !== "object") fail(400, "Invalid evidence reference");
    const r = ref as Record<string, unknown>, sha256 = text(r.sha256, 64);
    if (!/^[a-f0-9]{64}$/.test(sha256)) fail(400, "SHA256 required");
    return {identifier: text(r.identifier, 300), provenance: text(r.provenance, 1000), sha256};
  });
}
function observed(v: unknown): string {
  const value = text(v, 40), date = new Date(value);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(date.getTime()) || date.getTime() > Date.now()) fail(400, "Past evidence timestamp required");
  return date.toISOString();
}
function simulation(v: unknown): string {
  if (v !== "REAL_WORLD_CLAIM" && v !== "SYNTHETIC TEST EVIDENCE") fail(400, "Explicit evidence classification required");
  return v;
}
function publicRecord(e: OperationalEvidenceEvent): OperationalRecord {
  return {stream_id: e.stream_id, revision: e.revision, kind: e.kind, actor_id: e.actor_id,
    captured_at: new Date(e.captured_at).toISOString(), snapshot: e.snapshot};
}

/** Called only inside the trusted writer's live-session transaction. Never posts inventory. */
export async function appendOperationalEvidence(m: EntityManager, org: string, actor: string, role: string, key: string, command: OperationalCommand) {
  if (!operationalCollectors.includes(role)) fail(403, "Evidence collector capability required");
  if (!command || typeof command !== "object" || Array.isArray(command)) fail(400, "Evidence command required");
  if (!key?.trim() || key.length > 100) fail(400, "Exact retry identity required");
  identity(command.stream);
  if (!Number.isSafeInteger(command.revision) || command.revision < 0 || !command.data || typeof command.data !== "object" || Array.isArray(command.data)) fail(400, "Invalid evidence revision or data");
  const digest = createHash("sha256").update(canonicalRequirementJSON(command)).digest("hex");
  await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`operational-key:${org}:${actor}:${key}`]);
  const retry = await m.findOneBy(OperationalEvidenceEvent, {organization_id: org, actor_id: actor, operation_key: key});
  if (retry) {
    if (retry.fingerprint !== digest) fail(409, "Retry key belongs to different evidence");
    return publicRecord(retry);
  }
  await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`operational-stream:${org}:${command.stream}`]);
  const prior = await m.findOne(OperationalEvidenceEvent, {where: {organization_id: org, stream_id: command.stream}, order: {revision: "DESC"}});
  if ((prior?.revision ?? 0) !== command.revision) fail(409, "Evidence changed; reload before retrying");
  const d = command.data;
  let s: Record<string, unknown> = prior ? structuredClone(prior.snapshot) : {};
  let kind: "evidence" | "count" = prior?.kind ?? "evidence";
  if (command.action === "submit") {
    if (prior) fail(409, "Submit a new evidence identity; previous evidence is immutable");
    if (!evidenceGates.includes(d.gate as typeof evidenceGates[number])) fail(400, "Unknown operational gate");
    const site = text(d.site, 100);
    if (site !== "WAREHOUSE") {
      identity(site);
      if (!(await m.query("SELECT id FROM planning_sites WHERE id=$1 AND organization_id=$2", [site, org])).length) fail(404, "Site not found");
    }
    s = {site, gate: d.gate, evidence_type: d.gate, source: text(d.source, 100), record_identity: text(d.record_identity, 300),
      observed_at: observed(d.observed_at), classification: simulation(d.classification), references: references(d.references),
      notes: text(d.notes), created_by: actor, status: "COLLECTED", operational_verified: false};
  } else if (command.action === "review") {
    if (!prior || kind !== "evidence") fail(404, "Evidence not found");
    if (!reviewers.includes(role) || s.created_by === actor) fail(403, "Independent reviewer capability required");
    if (!evidenceDecisions.includes(d.decision as typeof evidenceDecisions[number])) fail(400, "Defined operational approval authority unavailable; VERIFIED is disabled");
    s = {...s, status: d.decision, reviewed_by: actor, review_notes: text(d.notes), review_references: references(d.references), operational_verified: false};
  } else if (command.action === "assign") {
    if (prior) fail(409, "Count scope already assigned");
    if (!reviewers.includes(role)) fail(403, "Count assignment reviewer required");
    const session = await m.findOne(Stocktake, {where: {id: identity(d.stocktake_id), organization_id: org}, lock: {mode: "pessimistic_write"}});
    if (!session) fail(404, "Stocktake not found");
    if (session.status !== "draft" || session.revision !== d.stocktake_revision) fail(409, "Current draft stocktake revision required");
    const item = await m.findOneBy(InventoryItem, {id: identity(d.item_id), organization_id: org});
    const location = text(d.location, 100);
    if (!item?.unit?.trim() || !session.targets.some(t => t.item_id === item.id && t.locations.includes(location))) fail(409, "Count scope or canonical unit mismatch");
    const first = identity(d.first_counter), recount = identity(d.recount_counter);
    if (first === recount) fail(400, "Independent counters required");
    for (const id of [first, recount]) {
      const user = await m.findOneBy(User, {id, organization_id: org, is_active: true});
      if (!user || !operationalCollectors.includes(user.role)) fail(403, "Assigned counter capability unavailable");
    }
    kind = "count";
    s = {stocktake_id: session.id, stocktake_revision: session.revision, item_id: item.id, location, unit: item.unit,
      first_counter: first, recount_counter: recount, classification: simulation(d.classification), observations: [],
      status: "UNKNOWN", quantity: null, assigned_by: actor, notes: text(d.notes)};
  } else {
    if (!prior || kind !== "count") fail(404, "Count campaign scope not found");
    const session = await m.findOne(Stocktake, {where: {id: String(s.stocktake_id), organization_id: org}, lock: {mode: "pessimistic_write"}});
    if (!session || session.status !== "draft" || session.revision !== s.stocktake_revision) fail(409, "Count scope is stale; assign a new campaign scope");
    const observations = s.observations as Record<string, unknown>[];
    if (command.action === "count") {
      const next = observations.length + 1;
      if (s.status === "REVIEWED" || (next > 2 && s.status !== "RECOUNT_REQUESTED")) fail(409, "Independent review or recount request required");
      if (actor !== (next % 2 ? s.first_counter : s.recount_counter)) fail(403, "Assigned independent counter required");
      if (d.unit !== s.unit) fail(400, "Count must use the canonical unit");
      let quantity: string | null = null;
      if (d.quantity !== null) {
        if (typeof d.quantity !== "string") fail(400, "Quantity must be decimal text or explicit UNKNOWN null");
        try { quantity = stockText(stockUnits(d.quantity)); } catch { fail(400, "Invalid nonnegative count quantity"); }
      }
      const observation = {pass: next, actor, quantity, unit: s.unit, observed_at: observed(d.observed_at),
        references: references(d.references), notes: text(d.notes), classification: s.classification};
      observations.push(observation);
      const previous = observations.at(-2);
      const matched = previous && previous.actor !== actor && previous.quantity !== null && quantity !== null && previous.quantity === quantity;
      s = {...s, observations, quantity: matched ? quantity : null, status: matched ? "AWAITING_REVIEW" : observations.length < 2 ? "FIRST_PASS_RECORDED" : "DISPUTED"};
    } else if (command.action === "recount" || command.action === "reviewCount") {
      if (!reviewers.includes(role) || observations.some(o => o.actor === actor)) fail(403, "Independent count reviewer required");
      if (command.action === "reviewCount" && s.status !== "AWAITING_REVIEW") fail(409, "Two independent agreeing numeric passes required");
      s = {...s, status: command.action === "recount" ? "RECOUNT_REQUESTED" : "REVIEWED", reviewed_by: actor,
        review_notes: text(d.notes), review_references: references(d.references)};
    } else fail(400, "Unknown operational action");
  }
  const event = await m.save(OperationalEvidenceEvent, m.create(OperationalEvidenceEvent, {organization_id: org, stream_id: command.stream,
    actor_id: actor, revision: command.revision + 1, kind, operation_key: key, fingerprint: digest, snapshot: s}));
  return publicRecord(event);
}

export class OperationalEvidenceService {
  constructor(private readonly db: DataSource) {}
  async list(org: string, actor: string, stream?: string): Promise<OperationalRecord[]> {
    const exists = (await this.db.query("SELECT to_regclass('operational_evidence_events') IS NOT NULL installed"))[0].installed;
    if (!exists) return [];
    const events = await this.db.getRepository(OperationalEvidenceEvent).find({where: {organization_id: org, ...(stream ? {stream_id: identity(stream)} : {})}, order: {captured_at: "ASC", revision: "ASC"}});
    const latest = new Map<string, OperationalEvidenceEvent>();
    for (const e of events) if (!latest.has(e.stream_id) || latest.get(e.stream_id)!.revision < e.revision) latest.set(e.stream_id, e);
    return (stream ? events : [...latest.values()]).map(e => {
      const record = publicRecord(e);
      if (e.kind === "count") {
        const current = latest.get(e.stream_id)!.snapshot;
        const observations = current.observations as Record<string, unknown>[];
        // Until both blind passes have been committed, each counter sees only their own observations.
        if (observations.length < 2 || current.status === "RECOUNT_REQUESTED") record.snapshot = {...record.snapshot, quantity: null,
          observations: (record.snapshot.observations as Record<string, unknown>[]).filter(o => o.actor === actor)};
      }
      return record;
    });
  }
}
