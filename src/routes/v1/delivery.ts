import { Router, type RequestHandler, type ErrorRequestHandler } from "express";
import { DataSource } from "typeorm";
import { IsInt, Min, IsUUID, IsArray, ArrayNotEmpty, ArrayUnique, ArrayMaxSize, IsString, MinLength, MaxLength, IsOptional, IsIn, IsDefined, ValidateNested, IsDateString } from "class-validator";
import { Type } from "class-transformer";
import { authenticateJwt } from "../../middleware/auth";
import { User } from "../../entity/User";
import { DraftKitError } from "../../services/ProductTemplateService";
import { DeliveryService } from "../../services/DeliveryService";
import { dto } from "./product-templates";
class Revision { @IsInt() @Min(1) revision!: number; }
class Transport {
  @IsString() @MinLength(1) @MaxLength(100) carrier!: string;
  @IsString() @MaxLength(100) vehicle = "";
  @IsDateString() planned_date!: string;
  @IsOptional() @IsUUID() employee_id?: string;
  @IsString() @MaxLength(2000) notes = "";
}
class Create {
  @IsUUID() packing_order_id!: string;
  @IsArray() @ArrayNotEmpty() @ArrayUnique() @ArrayMaxSize(10000) @IsUUID("all", { each: true }) package_ids!: string[];
  @IsDefined() @ValidateNested() @Type(() => Transport) transport!: Transport;
}
class Transition extends Revision { @IsString() @MaxLength(2000) reason = ""; }
class Receive extends Revision {
  @IsArray() @ArrayNotEmpty() @ArrayUnique() @ArrayMaxSize(10000) @IsUUID("all", { each: true }) package_ids!: string[];
  @IsString() @MinLength(1) @MaxLength(200) recipient!: string;
  @IsDateString() acknowledged_at!: string;
  @IsString() @MinLength(1) @MaxLength(2000) acknowledgement!: string;
}
class Issue extends Revision {
  @IsUUID() package_id!: string;
  @IsIn(["shortage", "damaged", "missing", "return"]) kind!: "shortage" | "damaged" | "missing" | "return";
  @IsString() @MinLength(1) @MaxLength(2000) notes!: string;
  @IsOptional() @IsUUID() issue_id?: string;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const writers = new Set(["admin", "super_admin", "manager", "staff", "inventory_staff", "production_staff", "project_staff", "editor"]);
export function deliveryRouter(db: DataSource) {
  const r = Router(), s = new DeliveryService(db);
  const action = (run: RequestHandler): RequestHandler => (req, res, next) => {
    Promise.resolve(run(req, res, next)).catch((e: unknown) => {
      if (e instanceof DraftKitError) res.status(e.status).json({ error: e.message });
      else if (e && typeof e === "object" && "code" in e && ["23505", "23503", "23514", "P0001", "40001", "40P01"].includes(String(e.code))) res.status(409).json({ error: "Delivery conflict; refresh before retrying" });
      else res.status(500).json({ error: "Unable to process delivery operation" });
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
    if (read ? !writers.has(current.role) && current.role !== "viewer" : !writers.has(current.role)) throw new DraftKitError(403, "Delivery permission denied");
    if (!read && !req.header("Idempotency-Key")) throw new DraftKitError(400, "Idempotency-Key required"); next();
  }));
  r.param("id", (_req, _res, next, id: string) => next(uuid.test(id) ? undefined : new DraftKitError(400, "Invalid identity")));
  const key = (req: Parameters<RequestHandler>[0]) => req.header("Idempotency-Key")!;
  r.get("/", action(async (req, res) => { const project = req.query.project_id; if (project !== undefined && (typeof project !== "string" || !uuid.test(project))) throw new DraftKitError(400, "Invalid project identity"); res.json(await s.list(req.user!.orgId!, project as string | undefined)); }));
  r.get("/orders/:id", action(async (req, res) => { res.setHeader("Cache-Control", "private, no-store"); res.json(await s.detail(req.user!.orgId!, req.params.id)); }));
  r.post("/orders", action(async (req, res) => { const d = await dto(req.body, Create); res.status(201).json(await s.create(req.user!.orgId!, req.user!.id, key(req), d)); }));
  for (const verb of ["dispatch", "transit", "fail", "return", "retry"] as const) r.post(`/orders/:id/${verb}`, action(async (req, res) => { const d = await dto(req.body, Transition); res.json(await s.transition(req.user!.orgId!, req.user!.id, key(req), req.params.id, d.revision, verb, d.reason)); }));
  r.post("/orders/:id/receive", action(async (req, res) => { const d = await dto(req.body, Receive); res.json(await s.receive(req.user!.orgId!, req.user!.id, key(req), req.params.id, d)); }));
  r.post("/orders/:id/issues", action(async (req, res) => { const d = await dto(req.body, Issue); res.json(await s.issue(req.user!.orgId!, req.user!.id, key(req), req.params.id, d)); }));
  r.use(((e: unknown, _req, res, next) => { if (e instanceof DraftKitError) res.status(e.status).json({ error: e.message }); else next(e); }) as ErrorRequestHandler);
  return r;
}
