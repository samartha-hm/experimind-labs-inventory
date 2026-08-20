import { Router } from "express";
import { PurchaseOrderService } from "../../services/PurchaseOrderService";
import { validate, IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsInt, Min, IsArray } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";
import { requireTenant } from "../../middleware/tenant.ts";

const router = Router();
const service = new PurchaseOrderService();

export class PurchaseOrderLineDto {
  @IsUUID()
  inventory_item_id!: string;

  @IsInt()
  @Min(1)
  qty_ordered!: number;

  @IsInt()
  @Min(0)
  unit_cost!: number;
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  vendor_id!: string;

  @IsString()
  po_number!: string;

  @IsDateString()
  order_date!: string;

  @IsOptional()
  @IsDateString()
  expected_date?: string;

  @IsOptional()
  @IsEnum(["draft", "sent", "approved", "received", "cancelled"])
  status?: "draft" | "sent" | "approved" | "received" | "cancelled";

  @IsOptional()
  @IsArray()
  lines?: any[];

  @IsOptional()
  total_amount?: number;
}

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsUUID()
  vendor_id?: string;

  @IsOptional()
  @IsString()
  po_number?: string;

  @IsOptional()
  @IsDateString()
  order_date?: string;

  @IsOptional()
  @IsDateString()
  expected_date?: string;

  @IsOptional()
  @IsEnum(["draft", "sent", "approved", "received", "cancelled"])
  status?: "draft" | "sent" | "approved" | "received" | "cancelled";

  @IsOptional()
  @IsArray()
  lines?: any[];

  @IsOptional()
  total_amount?: number;
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

// GET /api/v1/purchase-order
router.get("/", requireTenant, requireRole("viewer", "staff", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const list = await service.list(orgId);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/purchase-order/:id
router.get("/:id", requireTenant, requireRole("viewer", "staff", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const po = await service.findById(req.params.id, orgId);
    if (!po) {
      return res.status(404).json({ error: "Purchase order not found" });
    }
    res.json(po);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/purchase-order
router.post("/", requireTenant, requireRole("staff", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await validateDto(req.body, CreatePurchaseOrderDto);
    const { lines, ...poData } = req.body;

    const processedData = {
      ...poData,
      order_date: new Date(poData.order_date),
      expected_date: poData.expected_date ? new Date(poData.expected_date) : undefined
    };

    const created = await service.create({
      ...processedData,
      lines: lines || []
    }, orgId);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/purchase-order/:id
router.put("/:id", requireTenant, requireRole("staff", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await validateDto(req.body, UpdatePurchaseOrderDto);
    const { lines, ...poData } = req.body;

    const processedData = {
      ...poData,
      ...(poData.order_date ? { order_date: new Date(poData.order_date) } : {}),
      ...(poData.expected_date ? { expected_date: new Date(poData.expected_date) } : {})
    };

    const updated = await service.update(req.params.id, processedData, orgId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/purchase-order/:id
router.delete("/:id", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await service.delete(req.params.id, orgId);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/purchase-order/:id/receive
router.post("/:id/receive", requireTenant, requireRole("staff", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const { receptions } = req.body;
    if (!Array.isArray(receptions)) {
      return res.status(400).json({ error: "receptions must be an array" });
    }

    const updatedPo = await service.receiveItems(req.params.id, receptions, orgId);
    res.json(updatedPo);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;