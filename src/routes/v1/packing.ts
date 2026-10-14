import { Router, type RequestHandler } from "express";
import { DataSource } from "typeorm";
import { IsString, IsUUID, IsInt, Min, MinLength, MaxLength, IsOptional, IsObject, IsArray, ArrayNotEmpty, ArrayMaxSize, ArrayUnique, IsBoolean, IsIn } from "class-validator";
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
class Assignment extends Revision {
  @IsString() @MaxLength(100) team = "";
  @IsOptional() @IsUUID() employee_id?: string;
}
class Checklist extends Revision {
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(10000) @ArrayUnique() @IsUUID("all", { each: true }) package_ids!: string[];
  @IsBoolean() assembled!: boolean;
  @IsString() @MaxLength(2000) notes = "";
}
class QC extends Revision {
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(10000) @ArrayUnique() @IsUUID("all", { each: true }) package_ids!: string[];
  @IsIn(["accept", "reject"]) decision!: "accept" | "reject";
  @IsObject() checks!: Record<(typeof import("../../features/packing/packingTypes").qcChecks)[number], boolean>;
  @IsString() @MaxLength(2000) notes = "";
}
class Exception extends Revision {
  @IsUUID() package_id!: string;
  @IsIn(["missing", "damaged", "other"]) kind!: "missing" | "damaged" | "other";
  @IsString() @MinLength(1) @MaxLength(2000) notes!: string;
  @IsOptional() @IsUUID() exception_id?: string;
}
class Change extends Revision {
  @IsUUID() package_id!: string;
  @IsIn(["substitute", "additional"]) kind!: "substitute" | "additional";
  @IsUUID() item_id!: string;
  @IsString() @MinLength(1) @MaxLength(20) quantity!: string;
  @IsString() @MinLength(1) @MaxLength(30) unit!: string;
  @IsString() @MinLength(1) @MaxLength(2000) reason!: string;
  @IsOptional() @IsUUID() original_item_id?: string;
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
  r.post("/orders/:id/assign", action(async (req, res) => { const d = await dto(req.body, Assignment); res.json(await s.assign(req.user!.orgId!, req.user!.id, key(req), req.params.id, d.revision, d.team, d.employee_id)); }));
  r.post("/orders/:id/checklist", action(async (req, res) => { const d = await dto(req.body, Checklist); res.json(await s.check(req.user!.orgId!, req.user!.id, key(req), req.params.id, d.revision, d.package_ids, d.assembled, d.notes)); }));
  r.post("/orders/:id/qc", action(async (req, res) => { const d = await dto(req.body, QC); res.json(await s.qc(req.user!.orgId!, req.user!.id, key(req), req.params.id, d.revision, d.package_ids, d.decision, d.checks, d.notes)); }));
  r.post("/orders/:id/exceptions", action(async (req, res) => { const d = await dto(req.body, Exception); res.json(await s.exception(req.user!.orgId!, req.user!.id, key(req), req.params.id, d.revision, d.package_id, d.kind, d.notes, d.exception_id)); }));
  r.post("/orders/:id/changes", action(async (req, res) => { const d = await dto(req.body, Change); res.json(await s.change(req.user!.orgId!, req.user!.id, key(req), req.params.id, d.revision, d.package_id, d.kind, d.item_id, d.quantity, d.unit, d.reason, d.original_item_id)); }));
  r.use(((e: unknown, _req, res, next) => { if (e instanceof DraftKitError) res.status(e.status).json({ error: e.message }); else next(e); }) as import("express").ErrorRequestHandler);
  return r;
}
