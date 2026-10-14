import { Router, type RequestHandler } from "express";
import { DataSource } from "typeorm";
import { IsString, IsUUID, IsInt, Min, MinLength, MaxLength, IsOptional, IsObject } from "class-validator";
import { authenticateJwt } from "../../middleware/auth";
import { User } from "../../entity/User";
import { dto } from "./product-templates";
import { DraftKitError } from "../../services/ProductTemplateService";
import { PackingService } from "../../services/PackingService";

class Revision { @IsInt() @Min(1) revision!: number; }
class Create {
  @IsOptional() @IsUUID() project_id?: string;
  @IsOptional() @IsUUID() site_id?: string;
  @IsOptional() @IsInt() @Min(1) demand_revision?: number;
  @IsString() @MinLength(1) @MaxLength(100) batch_code!: string;
  @IsOptional() @IsObject() manual?: { name: string; materials: { item_id: string; quantity: string; unit: string }[] };
}
class Action extends Revision { @IsString() @MaxLength(2000) reason = ""; }
class Pick extends Revision {
  @IsUUID() item_id!: string;
  @IsString() @MinLength(1) @MaxLength(20) quantity!: string;
  @IsString() @MinLength(1) @MaxLength(30) unit!: string;
  @IsString() @MinLength(1) @MaxLength(100) location!: string;
  @IsOptional() @IsUUID() reservation_id?: string;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const writers = new Set(["admin", "super_admin", "manager", "staff", "inventory_staff", "production_staff", "project_staff", "editor"]);
export function packingRouter(db: DataSource) {
  const r = Router(), s = new PackingService(db);
  const action = (run: RequestHandler): RequestHandler => (req, res, next) => {
    Promise.resolve(run(req, res, next)).catch((e: unknown) => {
      if (e instanceof DraftKitError) res.status(e.status).json({ error: e.message });
      else if (e && typeof e === "object" && "code" in e && ["23505", "23503", "23514", "P0001", "40001", "40P01"].includes(String(e.code))) res.status(409).json({ error: "Packing conflict; refresh before retrying" });
      else res.status(500).json({ error: "Unable to process packing operation" });
    });
  };
  r.use((req, res, next) => { if (!req.headers.authorization?.startsWith("Bearer ")) { res.status(401).json({ error: "Sign in required" }); return; } next(); }, authenticateJwt);
  r.use(action(async (req, _res, next) => {
    const u = req.user;
    if (!u?.orgId || !uuid.test(u.orgId) || !uuid.test(u.id) || u.orgId === "00000000-0000-0000-0000-000000000000") throw new DraftKitError(403, "Explicit organization required");
    const current = await db.getRepository(User).findOneBy({ id: u.id, organization_id: u.orgId, is_active: true });
    if (!current) throw new DraftKitError(403, "Organization access denied");
    u.role = current.role;
    const read = ["GET", "HEAD", "OPTIONS"].includes(req.method);
    if (read ? !writers.has(current.role) && current.role !== "viewer" : !writers.has(current.role)) throw new DraftKitError(403, "Packing permission denied");
    if (!read && !req.header("Idempotency-Key")) throw new DraftKitError(400, "Idempotency-Key required");
    next();
  }));
  r.param("id", (_req, _res, next, id: string) => next(uuid.test(id) ? undefined : new DraftKitError(400, "Invalid identity")));
  const key = (req: Parameters<RequestHandler>[0]) => req.header("Idempotency-Key")!;
  r.get("/", action(async (req, res) => { res.json(await s.list(req.user!.orgId!)); }));
  r.get("/orders/:id", action(async (req, res) => { res.json(await s.detail(req.user!.orgId!, req.params.id)); }));
  r.post("/orders", action(async (req, res) => { const d = await dto(req.body, Create); res.status(201).json(await s.create(req.user!.orgId!, req.user!.id, key(req), d)); }));
  for (const verb of ["release", "pause", "resume", "cancel", "reopen"] as const) r.post(`/orders/:id/${verb}`, action(async (req, res) => { const d = await dto(req.body, Action); res.json(await s.transition(req.user!.orgId!, req.user!.id, key(req), req.params.id, d.revision, verb, d.reason)); }));
  r.post("/orders/:id/picks", action(async (req, res) => { const d = await dto(req.body, Pick); res.status(201).json(await s.pick(req.user!.orgId!, req.user!.id, key(req), req.params.id, d.revision, d.item_id, d.quantity, d.unit, d.location, d.reservation_id)); }));
  r.use(((e: unknown, _req, res, next) => { if (e instanceof DraftKitError) res.status(e.status).json({ error: e.message }); else next(e); }) as import("express").ErrorRequestHandler);
  return r;
}
