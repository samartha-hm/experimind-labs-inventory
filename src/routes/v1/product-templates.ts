import { Router, RequestHandler } from "express";
import { DataSource } from "typeorm";
import { IsString, MaxLength, MinLength, IsInt, Min, validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { authenticateJwt } from "../../middleware/auth.ts";
import { User } from "../../entity/User.ts";
import { DraftKitError, ProductTemplateService } from "../../services/ProductTemplateService.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const readers = new Set(["admin", "super_admin", "staff", "manager", "editor", "inventory_staff", "project_staff", "viewer"]);
export const draftKitWriters = new Set(["admin", "super_admin", "staff", "manager", "editor", "inventory_staff", "project_staff"]);
class ContentDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsString() @MaxLength(5000) description: string = "";
  @IsString() @MaxLength(100) category: string = "";
}
class EditDto extends ContentDto { @IsInt() @Min(1) revision!: number; }
class ArchiveDto { @IsInt() @Min(1) revision!: number; }
async function dto<T extends object>(body: unknown, cls: new () => T) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new DraftKitError(400, "Expected an object");
  const value = plainToInstance(cls, body);
  if ("name" in value && typeof value.name === "string") value.name = value.name.trim();
  const errors = await validate(value, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) throw new DraftKitError(400, errors.map(e => Object.values(e.constraints ?? {}).join(", ")).join("; "));
  return value;
}

export function productTemplateRouter(db: DataSource) {
  const router = Router();
  const service = new ProductTemplateService(db);
  const action = (run: RequestHandler): RequestHandler => (req, res, next) => {
    Promise.resolve(run(req, res, next)).catch(error => {
      if (error instanceof DraftKitError) res.status(error.status).json({ error: error.message });
      else { console.error("Draft kit request failed", error instanceof Error ? error.name : "Error"); res.status(500).json({ error: "Unable to save or load draft kits" }); }
    });
  };
  // Require an Authorization header; never accept query tokens or browser tenant selection.
  router.use((req, res, next) => {
    if (!req.headers.authorization?.startsWith("Bearer ")) { res.status(401).json({ error: "Sign in required" }); return; }
    next();
  }, authenticateJwt);
  router.use(action(async (req, res, next) => {
    const identity = req.user;
    if (!identity || !uuid.test(identity.id) || !identity.orgId || !uuid.test(identity.orgId)
      || identity.orgId === "00000000-0000-0000-0000-000000000000") {
      res.status(403).json({ error: "An explicit organization is required" }); return;
    }
    const user = await db.getRepository(User).findOneBy({ id: identity.id, organization_id: identity.orgId, is_active: true });
    if (!user) { res.status(403).json({ error: "Organization access denied" }); return; }
    // Resolve current permissions from server records, not stale/client-supplied roles.
    identity.role = user.role;
    if (!readers.has(user.role) || (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !draftKitWriters.has(user.role))) {
      res.status(403).json({ error: "You do not have permission to change draft kits" }); return;
    }
    next();
  }));
  router.param("id", (req, res, next, id: string) => {
    if (!uuid.test(id)) { res.status(400).json({ error: "Invalid kit identity" }); return; } next();
  });
  router.get("/", action(async (req, res) => { res.json(await service.list(req.user!.orgId!)); }));
  router.get("/:id", action(async (req, res) => { res.json(await service.view(req.params.id, req.user!.orgId!)); }));
  router.post("/", action(async (req, res) => {
    const value = await dto(req.body, ContentDto);
    res.status(201).json(await service.create(value, req.user!.orgId!, req.user!.id));
  }));
  router.put("/:id", action(async (req, res) => {
    const { revision, ...content } = await dto(req.body, EditDto);
    res.json(await service.change(req.params.id, req.user!.orgId!, req.user!.id, revision, content));
  }));
  router.post("/:id/archive", action(async (req, res) => {
    const { revision } = await dto(req.body, ArchiveDto);
    await service.change(req.params.id, req.user!.orgId!, req.user!.id, revision);
    res.status(204).end();
  }));
  return router;
}
