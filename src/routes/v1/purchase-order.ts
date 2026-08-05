import { Router } from "express";
import { PurchaseOrderService } from "../../services/PurchaseOrderService";
import { validate, IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsInt, Min, ArrayNotEmpty, ValidateNested } from "class-validator";
import { plainToInstance, Type } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";

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
router.get("/", requireRole("viewer", "staff", "admin"), async (req, res) => {
  try {
    const list = await service.list();
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/purchase-order/:id
router.get("/:id", requireRole("viewer", "staff", "admin"), async (req, res) => {
  try {
    const po = await service.findById(req.params.id);
    if (!po) {
      return res.status(404).json({ error: "Purchase order not found" });
    }
    res.json(po);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/purchase-order
router.post("/", requireRole("staff", "admin"), async (req, res) => {
  try {
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
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/purchase-order/:id
router.put("/:id", requireRole("staff", "admin"), async (req, res) => {
  try {
    await validateDto(req.body, CreatePurchaseOrderDto);
    const { lines, ...poData } = req.body;

    const processedData = {
      ...poData,
      order_date: new Date(poData.order_date),
      expected_date: poData.expected_date ? new Date(poData.expected_date) : undefined
    };

    const updated = await service.update(req.params.id, processedData);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/purchase-order/:id
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/purchase-order/:id/receive
router.post("/:id/receive", requireRole("staff", "admin"), async (req, res) => {
  try {
    const { receptions } = req.body;
    if (!Array.isArray(receptions)) {
      return res.status(400).json({ error: "receptions must be an array" });
    }

    const updatedPo = await service.receiveItems(req.params.id, receptions);
    res.json(updatedPo);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;