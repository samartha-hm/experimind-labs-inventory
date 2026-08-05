import { Router } from "express";
import { BinService } from "../../services/BinService";
import { validate, IsString, IsOptional, IsUUID, IsBoolean, MaxLength } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";

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
router.get("/", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId as string;
    const list = await service.list(warehouseId);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/bin/:id (Viewer+)
router.get("/:id", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const bin = await service.findById(req.params.id);
    if (!bin) {
      return res.status(404).json({ error: "Bin not found" });
    }
    res.json(bin);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/bin (Staff+)
router.post("/", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    await validateDto(req.body, CreateBinDto);
    const created = await service.create(req.body);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/bin/:id (Staff+)
router.put("/:id", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    await validateDto(req.body, CreateBinDto);
    const updated = await service.update(req.params.id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/bin/:id (Admin only)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;