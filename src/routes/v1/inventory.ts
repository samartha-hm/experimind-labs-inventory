import { Router } from "express";
import { InventoryService } from "../../services/InventoryService";
import { validate, IsString, IsOptional, IsInt, IsNumber, Min, IsUUID, IsBoolean, MaxLength, IsUrl } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireCapability, requireRole } from "../../middleware/requireRole.ts";
import { requireTenant } from "../../middleware/tenant.ts";
import { MemoryCache } from "../../utils/cache.ts";

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

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  base_price?: number;

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
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  assigned_kit_name?: string;

  @IsOptional()
  @IsString()
  bin_location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  mpn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  package_footprint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mounting_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  msl_rating?: string;

  @IsOptional()
  @IsString()
  datasheet_url?: string;
}

export class UpdateInventoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  base_price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price_markup_pct?: number;

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
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  assigned_kit_name?: string;

  @IsOptional()
  @IsString()
  bin_location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  mpn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  package_footprint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mounting_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  msl_rating?: string;

  @IsOptional()
  @IsString()
  datasheet_url?: string;
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
router.get("/", requireTenant, requireRole("viewer", "staff", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const filters = {
      sku: req.query.sku as string,
      name: req.query.name as string,
      category: req.query.category as string,
      q: (req.query.q || req.query.search) as string,
      lowStock: req.query.lowStock === "true",
      outOfStock: req.query.outOfStock === "true",
      warehouseId: req.query.warehouseId as string,
      organizationId: orgId,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    const cacheKey = `org:${orgId}:inventory:${JSON.stringify(filters)}`;
    const cached = MemoryCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const list = await service.list(filters);
    MemoryCache.set(cacheKey, list, 30, [`org:${orgId}:inventory`]);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/inventory/:id (Viewers, Staff, Admins)
router.get("/:id", requireTenant, requireRole("viewer", "staff", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const item = await service.getById(req.params.id, orgId);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json(item);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/inventory (Staff, Admins)
router.post("/", requireTenant, requireRole("staff", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await validateDto(req.body, CreateInventoryDto);
    const created = await service.create(req.body, orgId);
    MemoryCache.invalidateTag(`org:${orgId}:inventory`);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/inventory/:id/adjust (Staff, Admins) - Concurrency-safe stock mutation
router.post("/:id/adjust", requireTenant, requireCapability("adjust_stock"), async (req, res) => {
  try {
    const { delta, reason } = req.body;
    if (typeof delta !== "number") {
      return res.status(400).json({ error: "delta numeric property is required" });
    }
    const actorId = (req as any).user?.id || "00000000-0000-0000-0000-000000000001";
    const orgId = (req as any).orgId;
    const updated = await service.adjustStockWithTransaction(
      req.params.id,
      delta,
      actorId,
      orgId,
      reason || "Manual stock adjustment"
    );
    MemoryCache.invalidateTag(`org:${orgId}:inventory`);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/inventory/:id (Staff, Admins)
router.put("/:id", requireTenant, requireRole("staff", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await validateDto(req.body, UpdateInventoryDto);
    const updated = await service.update(req.params.id, req.body, orgId);
    MemoryCache.invalidateTag(`org:${orgId}:inventory`);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/inventory/:id/zpl (Zebra label generation)
router.get("/:id/zpl", requireTenant, async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const item = await service.getById(req.params.id, orgId);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const { ZplPrintService } = await import("../../services/ZplPrintService.ts");
    const { Gs1BarcodeService } = await import("../../services/Gs1BarcodeService.ts");

    const barcodeValue = Gs1BarcodeService.encodeGs1({
      gtin: item.sku,
      lotNumber: item.batch_number || "LOT-01",
      serialNumber: item.serial_number || undefined,
      expiryDate: item.expiry_date || undefined,
    }) || item.sku;

    const zpl = ZplPrintService.generateItemLabelZpl({
      itemName: item.name,
      sku: item.sku,
      binLocation: item.bin_location,
      lotNumber: item.batch_number,
      expiryDate: item.expiry_date ? new Date(item.expiry_date).toISOString().split("T")[0] : undefined,
      barcodeValue,
    });

    res.json({ zpl, barcodeValue, itemName: item.name, sku: item.sku });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/inventory/:id/valuation (FIFO & Moving Average Cost valuation)
router.get("/:id/valuation", requireTenant, async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const { ValuationService } = await import("../../services/ValuationService.ts");
    const valuation = await ValuationService.getValuation(req.params.id, orgId);
    res.json(valuation);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/inventory/:id/cogs-preview (Preview COGS simulation under FIFO or Moving Average)
router.post("/:id/cogs-preview", requireTenant, async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const { quantity, strategy } = req.body;
    if (!quantity || Number(quantity) <= 0) {
      return res.status(400).json({ error: "Positive quantity is required" });
    }

    const { ValuationService } = await import("../../services/ValuationService.ts");
    const result = await ValuationService.calculateCogs(
      req.params.id,
      Number(quantity),
      strategy === "MOVING_AVERAGE" ? "MOVING_AVERAGE" : "FIFO",
      orgId
    );
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/inventory/:id (Admins only)
router.delete("/:id", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await service.delete(req.params.id, orgId);
    MemoryCache.invalidateTag(`org:${orgId}:inventory`);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;