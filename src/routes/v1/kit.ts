import { Router } from "express";
import { KitService } from "../../services/KitService";
import { validate, IsString, IsOptional, IsUrl, MaxLength, IsArray } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";

const router = Router();
const service = new KitService();

export class CreateKitDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsArray()
  bom_items?: any[];
}

export class UpdateKitDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsArray()
  bom_items?: any[];
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

// GET /api/v1/kit (Viewer+)
router.get("/", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const list = await service.list();
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/kit/:id (Viewer+)
router.get("/:id", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const kit = await service.findById(req.params.id);
    if (!kit) {
      return res.status(404).json({ error: "Kit not found" });
    }
    res.json(kit);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/kit (Staff+)
router.post("/", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const validData = await validateDto(req.body, CreateKitDto);
    const created = await service.create(validData);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/kit/:id (Staff+)
router.put("/:id", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const validData = await validateDto(req.body, UpdateKitDto);
    const updated = await service.update(req.params.id, validData);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/kit/:id (Admin only)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/kit/:id/bom (Viewer+)
router.get("/:id/bom", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const bomItems = await service.getBom(req.params.id);
    res.json(bomItems);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/kit/:id/bom (Staff+)
router.post("/:id/bom", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const bomItem = await service.addToBom(
      req.params.id,
      req.body.inventory_item_id,
      req.body.qty_per_kit
    );
    res.status(201).json(bomItem);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/kit/bom/:bomId (Admin only)
router.delete("/bom/:bomId", requireRole("admin"), async (req, res) => {
  try {
    await service.removeFromBom(req.params.bomId);
    res.json({ message: "BOM item removed" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;