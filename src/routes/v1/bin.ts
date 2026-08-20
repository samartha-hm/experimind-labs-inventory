import { Router } from "express";
import { BinService } from "../../services/BinService";
import { validate, IsString, IsOptional, IsUUID, IsBoolean, MaxLength } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";
import { requireTenant } from "../../middleware/tenant.ts";

const router = Router();
const service = new BinService();

export class CreateBinDto {
  @IsUUID()
  warehouse_id!: string;

  @IsString()
  @MaxLength(100)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateBinDto {
  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

async function validateDto<T extends object>(dto: T, cls: new () => T): Promise<T> {
  const obj = plainToInstance(cls, dto);
  const errors = await validate(obj, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(", "))
      .join("; ");
    throw new Error(`Validation failed: ${messages}`);
  }
  return obj;
}

// GET /api/v1/bin (Viewer+)
router.get("/", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId as string;
    const orgId = (req as any).orgId;
    const list = await service.list(warehouseId, orgId);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/bin/:id (Viewer+)
router.get("/:id", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const bin = await service.findById(req.params.id, orgId);
    if (!bin) {
      return res.status(404).json({ error: "Bin not found" });
    }
    res.json(bin);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/bin (Staff+)
router.post("/", requireTenant, requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await validateDto(req.body, CreateBinDto);
    const created = await service.create(req.body, orgId);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/bin/:id (Staff+)
router.put("/:id", requireTenant, requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await validateDto(req.body, UpdateBinDto);
    const updated = await service.update(req.params.id, req.body, orgId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/bin/:id (Admin only)
router.delete("/:id", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await service.delete(req.params.id, orgId);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;