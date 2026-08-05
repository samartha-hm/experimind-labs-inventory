import { Router } from "express";
import { SalesOrderService } from "../../services/SalesOrderService";
import { validate, IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsInt, Min } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";

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
router.get("/", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const list = await service.list();
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/sales-order/:id (Viewer+)
router.get("/:id", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const so = await service.findById(req.params.id);
    if (!so) {
      return res.status(404).json({ error: "Sales order not found" });
    }
    res.json(so);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/sales-order (Staff+)
router.post("/", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
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
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/sales-order/:id (Staff+)
router.put("/:id", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    await validateDto(req.body, CreateSalesOrderDto);
    const { lines, ...soData } = req.body;

    const processedData = {
      ...soData,
      order_date: new Date(soData.order_date),
      required_date: soData.required_date ? new Date(soData.required_date) : undefined
    };

    const updated = await service.update(req.params.id, processedData);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/sales-order/:id (Admin only)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/sales-order/:id/ship (Staff+)
router.post("/:id/ship", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const { shipments } = req.body;
    if (!Array.isArray(shipments)) {
      return res.status(400).json({ error: "shipments must be an array" });
    }

    const updatedSo = await service.shipItems(req.params.id, shipments);
    res.json(updatedSo);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;