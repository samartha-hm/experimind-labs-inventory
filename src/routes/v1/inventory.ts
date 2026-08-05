import { Router } from "express";
import { InventoryService } from "../../services/InventoryService";
import { validate, IsString, IsOptional, IsInt, Min, IsUUID, IsBoolean, MaxLength, IsUrl } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";

const router = Router();
const service = new InventoryService();

export class CreateInventoryDto {
  @IsString()
  @MaxLength(100)
  sku!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(0)
  base_price!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price_markup_pct?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number;

  @IsOptional()
  @IsBoolean()
  is_common?: boolean;

  @IsOptional()
  @IsBoolean()
  is_subassembly?: boolean;

  @IsOptional()
  @IsBoolean()
  is_sellable?: boolean;

  @IsOptional()
  @IsBoolean()
  is_hidden?: boolean;

  @IsOptional()
  @IsUrl()
  image_url?: string;

  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  bin_location?: string;
}

// Strict validation helper
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

// GET /api/v1/inventory?... (Viewers, Staff, Admins)
router.get("/", requireRole("viewer", "staff", "admin"), async (req, res) => {
  try {
    const filters = {
      sku: req.query.sku as string,
      name: req.query.name as string,
      lowStock: req.query.lowStock === "true",
      outOfStock: req.query.outOfStock === "true",
      warehouseId: req.query.warehouseId as string,
    };
    const list = await service.list(filters);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/inventory (Staff, Admins)
router.post("/", requireRole("staff", "admin"), async (req, res) => {
  try {
    await validateDto(req.body, CreateInventoryDto);
    const created = await service.create(req.body);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/inventory/:id (Staff, Admins)
router.put("/:id", requireRole("staff", "admin"), async (req, res) => {
  try {
    await validateDto(req.body, CreateInventoryDto);
    const updated = await service.update(req.params.id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/inventory/:id (Admins only)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;