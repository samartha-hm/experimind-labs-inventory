import { Router } from "express";
import { SalesOrderService } from "../../services/SalesOrderService";
import { validate, IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsInt, Min, IsArray } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";
import { requireTenant } from "../../middleware/tenant.ts";

const router = Router();
const service = new SalesOrderService();

export class CreateSalesOrderDto {
  @IsUUID()
  customer_id!: string;

  @IsString()
  so_number!: string;

  @IsDateString()
  order_date!: string;

  @IsOptional()
  @IsDateString()
  required_date?: string;

  @IsOptional()
  @IsEnum(["draft", "confirmed", "picking", "packed", "shipped", "delivered", "cancelled"])
  status?: "draft" | "confirmed" | "picking" | "packed" | "shipped" | "delivered" | "cancelled";

  @IsOptional()
  @IsArray()
  lines?: any[];

  @IsOptional()
  total_amount?: number;
}

export class UpdateSalesOrderDto {
  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsString()
  so_number?: string;

  @IsOptional()
  @IsDateString()
  order_date?: string;

  @IsOptional()
  @IsDateString()
  required_date?: string;

  @IsOptional()
  @IsEnum(["draft", "confirmed", "picking", "packed", "shipped", "delivered", "cancelled"])
  status?: "draft" | "confirmed" | "picking" | "packed" | "shipped" | "delivered" | "cancelled";

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

// GET /api/v1/sales-order (Viewer+)
router.get("/", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const list = await service.list(orgId);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/sales-order/:id (Viewer+)
router.get("/:id", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const so = await service.findById(req.params.id, orgId);
    if (!so) {
      return res.status(404).json({ error: "Sales order not found" });
    }
    res.json(so);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/sales-order (Staff+)
router.post("/", requireTenant, requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await validateDto(req.body, CreateSalesOrderDto);
    const { lines, ...soData } = req.body;

    const processedData = {
      ...soData,
      order_date: new Date(soData.order_date),
      required_date: soData.required_date ? new Date(soData.required_date) : undefined
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

// PUT /api/v1/sales-order/:id (Staff+)
router.put("/:id", requireTenant, requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await validateDto(req.body, UpdateSalesOrderDto);
    const { lines, ...soData } = req.body;

    const processedData = {
      ...soData,
      ...(soData.order_date ? { order_date: new Date(soData.order_date) } : {}),
      ...(soData.required_date ? { required_date: new Date(soData.required_date) } : {})
    };

    const updated = await service.update(req.params.id, processedData, orgId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/sales-order/:id (Admin only)
router.delete("/:id", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await service.delete(req.params.id, orgId);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/sales-order/:id/ship (Staff+)
router.post("/:id/ship", requireTenant, requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const { shipments } = req.body;
    if (!Array.isArray(shipments)) {
      return res.status(400).json({ error: "shipments must be an array" });
    }

    const updatedSo = await service.shipItems(req.params.id, shipments, orgId);
    res.json(updatedSo);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;