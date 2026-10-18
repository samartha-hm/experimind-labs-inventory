import { Router, RequestHandler } from "express";
import { DataSource } from "typeorm";
import { IsArray, IsObject, IsString, MaxLength, MinLength, IsInt, Min } from "class-validator";
import { authenticateJwt } from "../../middleware/auth.ts";
import { User } from "../../entity/User.ts";
import { ProjectPlanningService } from "../../services/ProjectPlanningService.ts";
import { DraftKitError } from "../../services/ProductTemplateService.ts";
import { dto, draftKitWriters } from "./product-templates.ts";
import { projectsWorkspaceEnabled, projectsWorkspaceEditingEnabled } from '../../features/projects/projectsWorkspaceContract';
import { ProductTemplateService } from '../../services/ProductTemplateService';
import { KitTemplateApproval } from '../../entity/PlanningProject';
import { In } from 'typeorm';
import { RequirementApprovalService } from '../../services/RequirementApprovalService';

class ProjectDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsString() @MaxLength(200) client: string = "";
  @IsString() @MaxLength(5000) notes: string = "";
  @IsArray() commercial_links: unknown[] = [];
  @IsObject() overrides: Record<string, unknown> = {};
  @IsArray() sites: unknown[] = [];
}
class EditProjectDto extends ProjectDto { @IsInt() @Min(1) revision!: number; }
class RevisionDto { @IsInt() @Min(1) revision!: number; }
class RequirementApprovalDto extends RevisionDto { @IsString() @MinLength(1) @MaxLength(100) key!: string; }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function planningProjectRouter(db: DataSource) {
  const router = Router(); const service = new ProjectPlanningService(db);
  const closed = async (id: string, org: string): Promise<boolean> => {
    const [table] = await db.query("SELECT to_regclass(current_schema()||'.project_completions') installed");
    return !!table.installed && !!(await db.query("SELECT 1 FROM project_completions WHERE project_id=$1 AND organization_id=$2 AND status='closed' LIMIT 1", [id, org])).length;
  };
  const action = (run: RequestHandler): RequestHandler => (req, res, next) => {
    Promise.resolve(run(req, res, next)).catch((error: unknown) => {
      if (error instanceof DraftKitError) res.status(error.status).json({ error: error.message });
      else if (error && typeof error === "object" && "code" in error && ["23505", "23514", "P0001", "40001", "40P01"].includes(String(error.code))) res.status(409).json({ error: "Planning requirement conflict. Refresh the saved revision and approval before retrying." });
      else { console.error("Project planning failed", error instanceof Error ? error.name : "Error"); res.status(500).json({ error: "Unable to save or load project planning" }); }
    });
  };
  router.use((req, res, next) => {
    if (!req.headers.authorization?.startsWith("Bearer ")) { res.status(401).json({ error: "Sign in required" }); return; } next();
  }, authenticateJwt);
  router.use(action(async (req, res, next) => {
    const identity = req.user;
    if (!identity || !uuid.test(identity.id) || !identity.orgId || !uuid.test(identity.orgId) || identity.orgId === "00000000-0000-0000-0000-000000000000") {
      res.status(403).json({ error: "An explicit organization is required" }); return;
    }
    const user = await db.getRepository(User).findOneBy({ id: identity.id, organization_id: identity.orgId, is_active: true });
    if (!user) { res.status(403).json({ error: "Organization access denied" }); return; }
    identity.role = user.role;
    const read = ["GET", "HEAD", "OPTIONS"].includes(req.method) || (req.method === "POST" && /^\/[0-9a-f-]{36}\/preview\/?$/i.test(req.path));
    if ((!draftKitWriters.has(user.role) && user.role !== "viewer") || (!read && !draftKitWriters.has(user.role))) {
      res.status(403).json({ error: "Project planning permission denied" }); return;
    } next();
  }));
  router.param("id", (_req, res, next, id: string) => { if (!uuid.test(id)) { res.status(400).json({ error: "Invalid project identity" }); return; } next(); });
  router.get('/workspace-access', action(async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ enabled: projectsWorkspaceEnabled(req.user!.orgId!, process.env) });
  }));
  router.use('/workspace', (req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (!projectsWorkspaceEnabled(req.user!.orgId!, process.env)) { res.status(404).json({ error: 'Projects workspace unavailable' }); return; }
    if (!['GET', 'HEAD'].includes(req.method) && !(req.method === 'PUT' && projectsWorkspaceEditingEnabled(req.user!.orgId!, process.env))) { res.status(405).json({ error: 'Read-only projects workspace' }); return; }
    next();
  });
  router.get('/workspace/projects', action(async (req, res) => { res.json(await service.list(req.user!.orgId!)); }));
  router.get('/workspace/approved-kits', action(async (req, res) => {
    res.json(await new ProductTemplateService(db).approved(req.user!.orgId!));
  }));
  router.put('/workspace/projects/:id', action(async (req, res) => {
    if (await closed(req.params.id, req.user!.orgId!)) throw new DraftKitError(409, 'Closed project is read-only.');
    const { revision, ...content } = await dto(req.body, EditProjectDto);
    res.json(await service.save(req.user!.orgId!, req.user!.id, content, req.params.id, revision));
  }));
  router.get('/workspace/projects/:id', action(async (req, res) => {
    const org = req.user!.orgId!, project = await service.view(req.params.id, org);
    const preview = await service.preview(project.id, org, project.revision);
    const history = await service.history(project.id, org);
    if (history[0]?.revision !== project.revision) throw new DraftKitError(409, 'Project changed. Refresh before reviewing.');
    const versions = (await new ProductTemplateService(db).approved(org)).filter(v => project.sites.some(s => s.selections.some(k => k.version_id === v.id)));
    const approvals = versions.length ? await db.getRepository(KitTemplateApproval).findBy({ organization_id: org, version_id: In(versions.map(v => v.id)) }) : [];
    res.json({ project, preview, history, versions, approvals, canEdit: projectsWorkspaceEditingEnabled(org, process.env) && draftKitWriters.has(req.user!.role!) && !await closed(project.id, org) });
  }));
  router.get("/", action(async (req, res) => { res.json(await service.list(req.user!.orgId!)); }));
  router.get("/:id", action(async (req, res) => { res.json(await service.view(req.params.id, req.user!.orgId!)); }));
  router.get("/:id/revisions", action(async (req, res) => { res.json(await service.history(req.params.id, req.user!.orgId!)); }));
  router.get("/:id/requirement-approvals", action(async (req, res) => {
    res.json(await new RequirementApprovalService(db).list(req.user!.orgId!, req.params.id));
  }));
  router.post("/:id/requirement-approvals", action(async (req, res) => {
    res.status(201).json(await new RequirementApprovalService(db).approve(req.user!.orgId!, req.user!.id, req.params.id, await dto(req.body, RequirementApprovalDto)));
  }));
  router.post("/", action(async (req, res) => { res.status(201).json(await service.save(req.user!.orgId!, req.user!.id, await dto(req.body, ProjectDto))); }));
  router.put("/:id", action(async (req, res) => {
    const { revision, ...content } = await dto(req.body, EditProjectDto);
    res.json(await service.save(req.user!.orgId!, req.user!.id, content, req.params.id, revision));
  }));
  router.post("/:id/archive", action(async (req, res) => {
    const { revision } = await dto(req.body, RevisionDto);
    await service.archive(req.params.id, req.user!.orgId!, req.user!.id, revision); res.status(204).end();
  }));
  router.post("/:id/preview", action(async (req, res) => {
    const { revision } = await dto(req.body, RevisionDto);
    res.json(await service.preview(req.params.id, req.user!.orgId!, revision));
  }));
  return router;
}
