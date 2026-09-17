import { Router } from "express";
import { KitService } from "../../services/KitService";
import { validate, IsString, IsOptional, IsUrl, MaxLength, IsArray } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";
import { requireTenant } from "../../middleware/tenant.ts";
import { MemoryCache } from "../../utils/cache.ts";

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
router.get("/", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const cacheKey = `org:${orgId}:kits:all`;
    const cached = MemoryCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const list = await service.list(orgId);
    MemoryCache.set(cacheKey, list, 30, [`org:${orgId}:kits`]);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/kit/:id (Viewer+)
router.get("/:id", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const kit = await service.findById(req.params.id, orgId);
    if (!kit) {
      return res.status(404).json({ error: "Kit not found" });
    }
    res.json(kit);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/kit (Staff+)
router.post("/", requireTenant, requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const validData = await validateDto(req.body, CreateKitDto);
    const created = await service.create(validData, orgId);
    MemoryCache.invalidateTag(`org:${orgId}:kits`);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/kit/:id (Staff+)
router.put("/:id", requireTenant, requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const validData = await validateDto(req.body, UpdateKitDto);
    const updated = await service.update(req.params.id, validData, orgId);
    MemoryCache.invalidateTag(`org:${orgId}:kits`);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/kit/:id (Admin only)
router.delete("/:id", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await service.delete(req.params.id, orgId);
    MemoryCache.invalidateTag(`org:${orgId}:kits`);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/kit/:id/bom (Viewer+)
router.get("/:id/bom", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const bomItems = await service.getBom(req.params.id);
    res.json(bomItems);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/kit/:id/bom (Staff+)
router.post("/:id/bom", requireTenant, requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const bomItem = await service.addToBom(
      req.params.id,
      req.body.inventory_item_id,
      req.body.qty_per_kit
    );
    MemoryCache.invalidateTag(`org:${orgId}:kits`);
    res.status(201).json(bomItem);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/kit/bom/:bomId (Admin only)
router.delete("/bom/:bomId", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await service.removeFromBom(req.params.bomId);
    MemoryCache.invalidateTag(`org:${orgId}:kits`);
    res.json({ message: "BOM item removed" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;