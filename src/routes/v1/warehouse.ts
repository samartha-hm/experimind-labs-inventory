import { Router } from "express";
import { WarehouseService } from "../../services/WarehouseService";
import { validate, IsString, IsOptional, IsBoolean, MaxLength } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";
import { requireTenant } from "../../middleware/tenant.ts";

const router = Router();
const service = new WarehouseService();

export class CreateWarehouseDto {
  @IsString()
  @MaxLength(100)
  code!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  address?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  address?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
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

// GET /api/v1/warehouse (Viewer+)
router.get("/", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const list = await service.list(orgId);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/warehouse/:id (Viewer+)
router.get("/:id", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const warehouse = await service.findById(req.params.id, orgId);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }
    res.json(warehouse);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/warehouse (Staff+)
router.post("/", requireTenant, requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await validateDto(req.body, CreateWarehouseDto);
    const created = await service.create(req.body, orgId);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/warehouse/:id (Staff+)
router.put("/:id", requireTenant, requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await validateDto(req.body, UpdateWarehouseDto);
    const updated = await service.update(req.params.id, req.body, orgId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/warehouse/:id (Admin only)
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