import { Router } from "express";
import { WarehouseService } from "../../services/WarehouseService";
import { validate, IsString, IsOptional, IsBoolean, MaxLength } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";

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
router.get("/", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const list = await service.list();
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/warehouse/:id (Viewer+)
router.get("/:id", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const warehouse = await service.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }
    res.json(warehouse);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/warehouse (Staff+)
router.post("/", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    await validateDto(req.body, CreateWarehouseDto);
    const created = await service.create(req.body);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/warehouse/:id (Staff+)
router.put("/:id", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    await validateDto(req.body, CreateWarehouseDto);
    const updated = await service.update(req.params.id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/warehouse/:id (Admin only)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;