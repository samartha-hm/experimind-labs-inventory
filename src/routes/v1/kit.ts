import { Router } from "express";
import { KitService } from "../../services/KitService";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

const router = Router();
const service = new KitService();

// DTO for creating/updating kits
class CreateKitDto {
  name: string;
  description?: string;
  image_url?: string;
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

// GET /api/v1/kit
router.get("/", async (req, res) => {
  try {
    const list = await service.list();
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/kit/:id
router.get("/:id", async (req, res) => {
  try {
    const kit = await service.findById(req.params.id);
    if (!kit) {
      return res.status(404).json({ error: "Kit not found" });
    }
    res.json(kit);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/kit
router.post("/", async (req, res) => {
  try {
    await validateDto(req.body, CreateKitDto);
    const created = await service.create(req.body);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/kit/:id
router.put("/:id", async (req, res) => {
  try {
    await validateDto(req.body, CreateKitDto);
    const updated = await service.update(req.params.id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/kit/:id
router.delete("/:id", async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/kit/:id/bom
router.get("/:id/bom", async (req, res) => {
  try {
    const bomItems = await service.getBom(req.params.id);
    res.json(bomItems);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/kit/:id/bom
router.post("/:id/bom", async (req, res) => {
  try {
    const bomItem = await service.addToBom(
      req.params.id,
      req.body.inventory_item_id,
      req.body.qty_per_kit
    );
    res.status(201).json(bomItem);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/kit/bom/:bomId
router.delete("/bom/:bomId", async (req, res) => {
  try {
    await service.removeFromBom(req.params.bomId);
    res.json({ message: "BOM item removed" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;