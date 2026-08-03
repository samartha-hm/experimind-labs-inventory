import { Router } from "express";
import { InventoryService } from "../../services/InventoryService";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

const router = Router();
const service = new InventoryService();

// DTO for creating/updating inventory items
class CreateInventoryDto {
  sku: string;
  name: string;
  description?: string;
  base_price: number;
  price_markup_pct?: number;
  quantity?: number;
  unit?: string;
  threshold?: number;
  is_common?: boolean;
  is_subassembly?: boolean;
  is_sellable?: boolean;
  is_hidden?: boolean;
  image_url?: string;
  warehouse_id?: string;
  bin_location?: string;
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

// GET /api/v1/inventory?...
router.get("/", async (req, res) => {
  try {
    const filters = {
      sku: req.query.sku as string,
      name: req.query.name as string,
      lowStock: req.query.lowStock === "true",
      outOfStock: req.query.outOfStock === "true",
      warehouseId: req.query.warehouseId as string,
    };
    const list = await service.list(filters);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/inventory
router.post("/", async (req, res) => {
  try {
    await validateDto(req.body, CreateInventoryDto);
    const created = await service.create(req.body);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/inventory/:id
router.put("/:id", async (req, res) => {
  try {
    await validateDto(req.body, CreateInventoryDto);
    const updated = await service.update(req.params.id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/inventory/:id
router.delete("/:id", async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;