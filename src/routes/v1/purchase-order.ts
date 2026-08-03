import { Router } from "express";
import { PurchaseOrderService } from "../../services/PurchaseOrderService";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

const router = Router();
const service = new PurchaseOrderService();

// DTO for creating/updating purchase orders
class CreatePurchaseOrderDto {
  vendor_id: string;
  po_number: string;
  order_date: string; // ISO date string
  expected_date?: string; // ISO date string
  status?: "draft" | "sent" | "approved" | "received" | "cancelled";
}

// DTO for purchase order lines
class PurchaseOrderLineDto {
  inventory_item_id: string;
  qty_ordered: number;
  unit_cost: number;
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

// GET /api/v1/purchase-order
router.get("/", async (req, res) => {
  try {
    const list = await service.list();
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/purchase-order/:id
router.get("/:id", async (req, res) => {
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
router.post("/", async (req, res) => {
  try {
    await validateDto(req.body, CreatePurchaseOrderDto);
    const { lines, ...poData } = req.body;

    // Convert date strings to Date objects
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
router.put("/:id", async (req, res) => {
  try {
    await validateDto(req.body, CreatePurchaseOrderDto);
    const { lines, ...poData } = req.body;

    // Convert date strings to Date objects
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
router.delete("/:id", async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/purchase-order/:id/receive
router.post("/:id/receive", async (req, res) => {
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