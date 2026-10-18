import { createHash } from "node:crypto";
import { DataSource } from "typeorm";
import { PlanningProject, PlanningProjectRevision } from "../entity/PlanningProject";
import { User } from "../entity/User";
import { DraftKitError } from "./ProductTemplateService";
import { ProjectPlanningService } from "./ProjectPlanningService";

export interface RequirementApproval {
  id: string; organization_id: string; project_id: string; revision: number;
  snapshot: unknown; snapshot_hash: string; approved_by: string; approved_at: string;
}
// JSONB reorders object keys; canonical encoding keeps retained hashes reproducible.
export function canonicalRequirementJSON(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(item => canonicalRequirementJSON(item ?? null)).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalRequirementJSON(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export class RequirementApprovalService {
  constructor(private readonly db: DataSource) {}
  async approve(org: string, actor: string, project: string, input: unknown): Promise<RequirementApproval> {
    const raw = input as { revision?: unknown; key?: unknown } | null;
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some(k => !["revision", "key"].includes(k)) ||
      !Number.isSafeInteger(raw.revision) || Number(raw.revision) < 1 || typeof raw.key !== "string" || !raw.key.trim() || raw.key.length > 100)
      throw new DraftKitError(400, "A saved revision and idempotency key of 1–100 characters are required");
    const revision = Number(raw.revision), key = raw.key;
    return this.db.transaction(async m => {
      const user = await m.findOne(User, { where: { id: actor, organization_id: org, is_active: true }, lock: { mode: "pessimistic_read" } });
      if (!user || !["admin", "super_admin"].includes(user.role)) throw new DraftKitError(403, "Requirement approval requires an active tenant administrator");
      await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`requirement:${org}:${actor}:${key}`]);
      const [retry] = await m.query(`SELECT a.*, r.project_id retry_project, r.revision retry_revision FROM requirement_approval_retries r
        JOIN requirement_approvals a ON a.id=r.approval_id AND a.organization_id=r.organization_id
        WHERE r.organization_id=$1 AND r.actor_id=$2 AND r.key=$3`, [org, actor, key]);
      if (retry) {
        if (retry.retry_project !== project || retry.retry_revision !== revision) throw new DraftKitError(409, "Idempotency key already used for another approval");
        const { retry_project: _project, retry_revision: _revision, ...approval } = retry;
        return approval;
      }
      const p = await m.findOne(PlanningProject, { where: { id: project, organization_id: org }, lock: { mode: "pessimistic_write" } });
      if (!p) throw new DraftKitError(404, "Project not found");
      if (p.archived_at || p.revision !== revision) throw new DraftKitError(409, "Project revision is archived or stale");
      if ((await m.query("SELECT 1 FROM project_completions WHERE organization_id=$1 AND project_id=$2 AND status='closed'", [org, project])).length)
        throw new DraftKitError(409, "Closed project cannot be approved");
      let [approval] = await m.query("SELECT * FROM requirement_approvals WHERE organization_id=$1 AND project_id=$2 AND revision=$3", [org, project, revision]);
      if (!approval) {
        const saved = await m.findOneBy(PlanningProjectRevision, { organization_id: org, project_id: project, revision, archived: false });
        if (!saved || !saved.content.sites.length || saved.content.sites.some(s => !s.selections.length)) throw new DraftKitError(400, "Every school requires saved Kit selections");
        const preview = await new ProjectPlanningService(this.db).previewInTransaction(m, project, org, revision);
        if (preview.warnings.some(w => /^(Inventory item unavailable:|Missing unit:|Incompatible\/ambiguous units:)/.test(w) || w.includes("units kept separate")) ||
          preview.lines.some(l => !Number.isFinite(l.quantity) || l.quantity < 0) ||
          saved.content.sites.some(s => !preview.lines.some(l => l.site_id === s.id && l.inventory_item_id && l.quantity > 0)))
          throw new DraftKitError(400, "Every school needs positive, valid physical demand with resolved material units");
        const snapshot = { schema_version: 1, calculator: "requirementPlanning/v1", content: saved.content,
          lines: preview.lines, packing_assignments: preview.packing_assignments,
          materials: preview.materials.map(({ inventory_item_id, name, unit, gross_demand }) => ({ inventory_item_id, name, unit, gross_demand })) };
        const hash = createHash("sha256").update(canonicalRequirementJSON(snapshot)).digest("hex");
        [approval] = await m.query(`INSERT INTO requirement_approvals(organization_id,project_id,revision,snapshot,snapshot_hash,approved_by)
          VALUES($1,$2,$3,$4::jsonb,$5,$6) RETURNING *`, [org, project, revision, JSON.stringify(snapshot), hash, actor]);
      }
      await m.query(`INSERT INTO requirement_approval_retries(organization_id,actor_id,key,project_id,revision,approval_id) VALUES($1,$2,$3,$4,$5,$6)`,
        [org, actor, key, project, revision, approval.id]);
      return approval;
    });
  }
  async list(org: string, project: string): Promise<RequirementApproval[]> {
    if (!await this.db.getRepository(PlanningProject).existsBy({ id: project, organization_id: org })) throw new DraftKitError(404, "Project not found");
    return this.db.query("SELECT * FROM requirement_approvals WHERE organization_id=$1 AND project_id=$2 ORDER BY revision DESC", [org, project]);
  }
}
