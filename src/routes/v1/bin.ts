import { Router } from "express";
import { BinService } from "../../services/BinService";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

const router = Router();
const service = new BinService();

// DTO for creating/updating bins
class CreateBinDto {
  warehouse_id: string;
  code: string;
  description?: string;
  is_active?: boolean;
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

// GET /api/v1/bin?warehouseId=...
router.get("/", async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId as string;
    const list = await service.list(warehouseId);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/bin/:id
router.get("/:id", async (req, res) => {
  try {
    const bin = await service.findById(req.params.id);
    if (!bin) {
      return res.status(404).json({ error: "Bin not found" });
    }
    res.json(bin);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/bin
router.post("/", async (req, res) => {
  try {
    await validateDto(req.body, CreateBinDto);
    const created = await service.create(req.body);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/bin/:id
router.put("/:id", async (req, res) => {
  try {
    await validateDto(req.body, CreateBinDto);
    const updated = await service.update(req.params.id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/bin/:id
router.delete("/:id", async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;