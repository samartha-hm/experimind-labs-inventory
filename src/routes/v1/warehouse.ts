import { Router } from "express";
import { WarehouseService } from "../../services/WarehouseService";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

const router = Router();
const service = new WarehouseService();

// DTO for creating/updating warehouses
class CreateWarehouseDto {
  code: string;
  name: string;
  address?: Record<string, any>;
  is_default?: boolean;
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

// GET /api/v1/warehouse
router.get("/", async (req, res) => {
  try {
    const list = await service.list();
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/warehouse/:id
router.get("/:id", async (req, res) => {
  try {
    const warehouse = await service.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }
    res.json(warehouse);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/warehouse
router.post("/", async (req, res) => {
  try {
    await validateDto(req.body, CreateWarehouseDto);
    const created = await service.create(req.body);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/warehouse/:id
router.put("/:id", async (req, res) => {
  try {
    await validateDto(req.body, CreateWarehouseDto);
    const updated = await service.update(req.params.id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/warehouse/:id
router.delete("/:id", async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;