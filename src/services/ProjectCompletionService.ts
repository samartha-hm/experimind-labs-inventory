import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import { PlanningProject, PlanningSchoolSite } from "../entity/PlanningProject";
import { SupplyEvent } from "../entity/SupplyPlanning";
import { User } from "../entity/User";
import { DraftKitError } from "./ProductTemplateService";
import { DeliveryService } from "./DeliveryService";
import type { PackingOrder } from "../features/packing/packingTypes";
import type { DeliveryOrder } from "../features/delivery/deliveryTypes";
import type { InstallationJob, InstallationTask, ProjectCompletion, CompletionProgress, SchoolCompletion } from "../features/delivery/completionTypes";
const fail = (status: number, message: string): never => { throw new DraftKitError(status, message); };
export class ProjectCompletionService extends DeliveryService {
  private async project(m: EntityManager, org: string, id: string, lock = false) {
    const rows: PlanningProject[] = await m.query(`SELECT * FROM planning_projects WHERE id=$1 AND organization_id=$2 AND archived_at IS NULL ${lock ? "FOR UPDATE" : ""}`, [id, org]);
    if (!rows[0]) fail(404, "Active project not found"); return rows[0];
  }
  private async active(m: EntityManager, org: string, project: string) {
    await this.project(m, org, project, true);
    if ((await m.query("SELECT 1 FROM project_completions WHERE organization_id=$1 AND project_id=$2 AND status='closed'", [org, project])).length) fail(409, "Reopen project before changes");
  }
  private async progress(m: EntityManager, org: string, id: string): Promise<CompletionProgress> {
    const project = await this.project(m, org, id);
    const sites = await m.find(PlanningSchoolSite, { where: { organization_id: org, project_id: id }, order: { position: "ASC" } });
    const packing: PackingOrder[] = await m.query("SELECT * FROM packing_orders WHERE organization_id=$1 AND project_id=$2 AND status<>'cancelled'", [org, id]);
    const deliveries: DeliveryOrder[] = await m.query("SELECT * FROM delivery_orders WHERE organization_id=$1 AND project_id=$2", [org, id]);
    const installations: InstallationJob[] = await m.query("SELECT * FROM site_installations WHERE organization_id=$1 AND project_id=$2", [org, id]);
    const blockers: string[] = []; const schools: SchoolCompletion[] = [];
    if (!sites.length) blockers.push("Project has no schools");
    for (const site of sites) {
      const pack = packing.find(p => p.site_id === site.id), orders = deliveries.filter(o => o.site_id === site.id);
      const packages = pack?.snapshot.packages.filter(p => p.kind !== "batch") ?? [];
      const received = new Set(orders.flatMap(o => o.execution.proofs.flatMap(p => p.package_ids)));
      const delivered = packages.filter(p => received.has(p.id)).length;
      const job = installations.find(j => j.site_id === site.id) ?? null;
      const issues = orders.reduce((n, o) => n + o.execution.issues.filter(i => !i.corrected_by).length, 0) + (job?.issues.filter(i => !i.corrected_by).length ?? 0);
      if (!pack || !packages.length) blockers.push(`${site.content.name}: school packing allocation missing`);
      else {
        if (pack.status !== "ready") blockers.push(`${site.content.name}: packing QC incomplete`);
        if (pack.demand_revision !== project.revision) blockers.push(`${site.content.name}: packing requirement revision is stale`);
        if (delivered < packages.length) blockers.push(`${site.content.name}: ${packages.length - delivered} packages awaiting receipt`);
      }
      if (orders.some(o => ["failed", "returned", "planned", "dispatched", "in_transit", "partially_delivered"].includes(o.status))) blockers.push(`${site.content.name}: delivery orders unfinished`);
      if (issues) blockers.push(`${site.content.name}: ${issues} unresolved issues`);
      if (job?.required && job.status !== "completed") blockers.push(`${site.content.name}: required installation acceptance pending`);
      schools.push({ site_id: site.id, name: site.content.name, packages: packages.length, delivered, remaining: packages.length - delivered, delivery_status: packages.length && delivered === packages.length ? "delivered" : orders.length ? "partial" : "pending", issues, installation: job });
    }
    const pending = await m.query("SELECT count(*)::int n FROM project_stock_reservations WHERE organization_id=$1 AND project_id=$2 AND status='active'", [org, id]);
    if (pending[0].n) blockers.push("Active stock reservations remain");
    const production = await m.query("SELECT count(*)::int n FROM production_work_orders WHERE organization_id=$1 AND project_id=$2 AND status NOT IN ('completed','cancelled')", [org, id]);
    if (production[0].n) blockers.push("Production orders unfinished");
    const completion: ProjectCompletion[] = await m.query("SELECT * FROM project_completions WHERE organization_id=$1 AND project_id=$2", [org, id]);
    const history = await m.query("SELECT kind,revision,snapshot FROM supply_events WHERE organization_id=$1 AND kind IN ('installation','project_completion') AND snapshot->>'project_id'=$2 ORDER BY created_at,id", [org, id]);
    return { project_id: id, project_revision: project.revision, schools, blockers, completion: completion[0] ?? null, history };
  }
  async projectProgress(org: string, id: string) { return this.db.transaction("REPEATABLE READ", m => this.progress(m, org, id)); }
  private async lifecycleAudit(m: EntityManager, org: string, actor: string, kind: string, row: InstallationJob | ProjectCompletion) {
    await m.insert(SupplyEvent, { organization_id: org, actor_id: actor, kind, record_id: row.id, revision: row.revision, snapshot: row });
  }
  async createInstallation(org: string, actor: string, key: string, input: { project_id: string; site_id: string; required: boolean; employee_id?: string; checklist: Pick<InstallationTask, "id" | "label" | "required">[]; survey: string }) {
    return this.operation(org, actor, key, ["installation.create", input], async m => {
      await this.approve(m, org, actor); await this.active(m, org, input.project_id); await this.employee(m, org, input.employee_id);
      if (!await m.findOneBy(PlanningSchoolSite, { id: input.site_id, project_id: input.project_id, organization_id: org })) fail(404, "School not found");
      if (!(await m.query("SELECT 1 FROM delivery_orders WHERE organization_id=$1 AND project_id=$2 AND site_id=$3", [org, input.project_id, input.site_id])).length) fail(409, "School delivery required before installation planning");
      if (new Set(input.checklist.map(t => t.id)).size !== input.checklist.length || input.checklist.some(t => !t.label.trim())) fail(400, "Unique, named checklist tasks required");
      const jobs: InstallationJob[] = await m.query("INSERT INTO site_installations(organization_id,project_id,site_id,required,employee_id,checklist,survey,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *", [org, input.project_id, input.site_id, input.required, input.employee_id ?? null, JSON.stringify(input.checklist.map(t => ({ ...t, checked: false }))), input.survey, actor]);
      await this.lifecycleAudit(m, org, actor, "installation", jobs[0]); return jobs[0];
    });
  }
  async installationAction(org: string, actor: string, key: string, id: string, input: { revision: number; action: "check" | "note" | "assign" | "issue" | "correct" | "finish" | "accept" | "reopen"; task_id?: string; checked?: boolean; notes: string; survey?: string; employee_id?: string; issue_id?: string; recipient?: string }) {
    return this.operation(org, actor, key, ["installation.action", id, input], async m => {
      const initial: InstallationJob[] = await m.query("SELECT * FROM site_installations WHERE id=$1 AND organization_id=$2", [id, org]);
      if (!initial[0]) fail(404, "Installation not found"); await this.active(m, org, initial[0].project_id);
      const rows: InstallationJob[] = await m.query("SELECT * FROM site_installations WHERE id=$1 AND organization_id=$2 FOR UPDATE", [id, org]); const job = rows[0];
      if (job.revision !== input.revision) fail(409, "Installation changed; refresh before retrying");
      const u = await m.findOneBy(User, { id: actor, organization_id: org, is_active: true });
      const supervisor = !!u && ["admin", "super_admin", "manager"].includes(u.role);
      if (["assign", "correct", "accept", "reopen"].includes(input.action)) await this.approve(m, org, actor);
      else if (job.employee_id && job.employee_id !== actor && !supervisor) fail(403, "Assigned installer required");
      if (job.status === "completed" && input.action !== "reopen") fail(409, "Reopen accepted installation before changes");
      if (job.status === "installed" && !["accept", "reopen", "issue"].includes(input.action)) fail(409, "Reopen submitted installation before changes");
      if (["note", "issue", "correct", "accept", "reopen"].includes(input.action) && !input.notes.trim()) fail(400, "Record meaningful notes");
      const now = new Date().toISOString();
      if (input.action === "check") {
        const task = job.checklist.find(t => t.id === input.task_id); if (!task || typeof input.checked !== "boolean") fail(400, "Valid task and check state required");
        task.checked = input.checked!; task.checked_by = actor; task.checked_at = now;
        job.status = job.issues.some(i => !i.corrected_by) ? "blocked" : "in_progress";
      } else if (input.action === "note") { job.notes = input.notes; if (input.survey !== undefined) job.survey = input.survey; }
      else if (input.action === "assign") { await this.employee(m, org, input.employee_id); job.employee_id = input.employee_id ?? null; }
      else if (input.action === "issue") { job.issues.push({ id: randomUUID(), notes: input.notes, reported_by: actor, reported_at: now }); job.status = "blocked"; job.acceptance = null; }
      else if (input.action === "correct") {
        const issue = job.issues.find(i => i.id === input.issue_id); if (!issue) fail(404, "Installation issue not found"); if (issue.corrected_by) fail(409, "Issue already corrected");
        issue.correction = input.notes; issue.corrected_by = actor; issue.corrected_at = now; job.status = job.issues.some(i => !i.corrected_by) ? "blocked" : "in_progress";
      } else if (input.action === "reopen") {
        if (!["completed", "installed", "blocked"].includes(job.status)) fail(409, "Installation is already open");
        job.status = job.issues.some(i => !i.corrected_by) ? "blocked" : "in_progress"; job.acceptance = null; job.notes = input.notes;
      } else {
        const p = await this.progress(m, org, job.project_id), school = p.schools.find(s => s.site_id === job.site_id)!;
        if (!school.packages || school.remaining || school.issues || job.checklist.some(t => t.required && !t.checked)) fail(409, "Receipt, issue correction and required checklist completion required");
        if (input.action === "finish") job.status = "installed";
        else { if (job.status !== "installed" || !input.recipient?.trim()) fail(409, "Installer submission and recipient acceptance required"); job.status = "completed"; job.acceptance = { recipient: input.recipient, notes: input.notes, accepted_by: actor, accepted_at: now }; }
      }
      const [saved]: [InstallationJob[], number] = await m.query("UPDATE site_installations SET revision=revision+1,status=$3,employee_id=$4,checklist=$5,notes=$6,survey=$7,issues=$8,acceptance=$9,updated_by=$10,updated_at=now() WHERE id=$1 AND organization_id=$2 RETURNING *", [id, org, job.status, job.employee_id, JSON.stringify(job.checklist), job.notes, job.survey, JSON.stringify(job.issues), job.acceptance ? JSON.stringify(job.acceptance) : null, actor]);
      await this.lifecycleAudit(m, org, actor, "installation", saved[0]); return saved[0];
    });
  }
  async completeProject(org: string, actor: string, key: string, id: string, input: { revision: number; project_revision: number; action: "close" | "reopen"; recipient?: string; notes: string; exception_reason?: string }) {
    return this.operation(org, actor, key, ["project.completion", id, input], async m => {
      await this.approve(m, org, actor); const project = await this.project(m, org, id, true);
      const old: ProjectCompletion[] = await m.query("SELECT * FROM project_completions WHERE organization_id=$1 AND project_id=$2 FOR UPDATE", [org, id]);
      if ((old[0]?.revision ?? 0) !== input.revision || project.revision !== input.project_revision) fail(409, "Project progress changed; refresh before retrying");
      if (!input.notes.trim()) fail(400, "Acceptance or reopening reason required");
      const progress = await this.progress(m, org, id), now = new Date().toISOString();
      let acceptance: ProjectCompletion["acceptance"] = null, exception: ProjectCompletion["exception"] = null;
      if (input.action === "close") {
        if (old[0]?.status === "closed") fail(409, "Project already closed");
        if (!input.recipient?.trim()) fail(400, "Customer acceptance recipient required");
        if (progress.blockers.length && !input.exception_reason?.trim()) fail(409, `Completion blocked: ${progress.blockers.join("; ")}`);
        acceptance = { recipient: input.recipient, notes: input.notes, accepted_by: actor, accepted_at: now };
        if (progress.blockers.length) exception = { reason: input.exception_reason!, blockers: progress.blockers, approved_by: actor, approved_at: now };
      } else if (old[0]?.status !== "closed") fail(409, "Project is already active");
      const rows: ProjectCompletion[] = await m.query("INSERT INTO project_completions(organization_id,project_id,revision,status,project_revision,acceptance,exception,reason,updated_by) VALUES($1,$2,1,$3,$4,$5,$6,$7,$8) ON CONFLICT(organization_id,project_id) DO UPDATE SET revision=project_completions.revision+1,status=EXCLUDED.status,project_revision=EXCLUDED.project_revision,acceptance=EXCLUDED.acceptance,exception=EXCLUDED.exception,reason=EXCLUDED.reason,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *", [org, id, input.action === "close" ? "closed" : "active", project.revision, acceptance ? JSON.stringify(acceptance) : null, exception ? JSON.stringify(exception) : null, input.notes, actor]);
      await this.lifecycleAudit(m, org, actor, "project_completion", rows[0]); return rows[0];
    });
  }
}
