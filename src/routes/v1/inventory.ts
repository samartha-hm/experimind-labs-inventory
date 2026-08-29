import { Router } from "express";
import { InventoryService } from "../../services/InventoryService";
import { validate, IsString, IsOptional, IsInt, IsNumber, Min, IsUUID, IsBoolean, MaxLength, IsUrl } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";
import { requireTenant } from "../../middleware/tenant.ts";

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
      lowStock: req.query.lowStock === "true",
      outOfStock: req.query.outOfStock === "true",
      warehouseId: req.query.warehouseId as string,
      organizationId: orgId,
    };
    const list = await service.list(filters);
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
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/inventory/:id/adjust (Staff, Admins) - Concurrency-safe stock mutation
router.post("/:id/adjust", requireTenant, requireRole("staff", "admin"), async (req, res) => {
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

// DELETE /api/v1/inventory/:id (Admins only)
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