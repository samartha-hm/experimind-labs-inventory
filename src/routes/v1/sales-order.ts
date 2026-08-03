import { Router } from "express";
import { SalesOrderService } from "../../services/SalesOrderService";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

const router = Router();
const service = new SalesOrderService();

// DTO for creating/updating sales orders
class CreateSalesOrderDto {
  customer_id: string;
  so_number: string;
  order_date: string; // ISO date string
  required_date?: string; // ISO date string
  status?: "draft" | "confirmed" | "picking" | "packed" | "shipped" | "delivered" | "cancelled";
}

// DTO for sales order lines
class SalesOrderLineDto {
  inventory_item_id: string;
  qty_ordered: number;
  unit_price: number;
}

// Validation helper
async function validateDto(dto: any, cls: any) {
  const obj = plainToInstance(cls, dto);
  const errors = await validate(obj, { forbidUnknownValues: false });
  if (errors.length > 0) {
    const messages = Object.values(errors)
      .map((e) => Object.values(e.constraints ?? {}))
      .flat()
      .join(", ");
    throw new Error(messages);
  }
}

// GET /api/v1/sales-order
router.get("/", async (req, res) => {
  try {
    const list = await service.list();
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/sales-order/:id
router.get("/:id", async (req, res) => {
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

// POST /api/v1/sales-order
router.post("/", async (req, res) => {
  try {
    await validateDto(req.body, CreateSalesOrderDto);
    const { lines, ...soData } = req.body;

    // Convert date strings to Date objects
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

// PUT /api/v1/sales-order/:id
router.put("/:id", async (req, res) => {
  try {
    await validateDto(req.body, CreateSalesOrderDto);
    const { lines, ...soData } = req.body;

    // Convert date strings to Date objects
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

// DELETE /api/v1/sales-order/:id
router.delete("/:id", async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/sales-order/:id/ship
router.post("/:id/ship", async (req, res) => {
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