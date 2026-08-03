import { Router } from "express";
import { SettingService } from "../../services/SettingService";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

const router = Router();
const service = new SettingService();

// DTO for creating settings
class CreateSettingDto {
  type: "category" | "room" | "shelf" | "box";
  value: string;
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

// GET /api/v1/setting?type=...
router.get("/", async (req, res) => {
  try {
    const type = req.query.type as string;
    if (!type || !["category", "room", "shelf", "box"].includes(type)) {
      return res.status(400).json({ error: "Valid type parameter required (category, room, shelf, box)" });
    }
    const values = await service.listByType(type);
    res.json({ type, values });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/setting/all
router.get("/all", async (req, res) => {
  try {
    const settings = await service.getAll();
    res.json(settings);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/setting
router.post("/", async (req, res) => {
  try {
    await validateDto(req.body, CreateSettingDto);
    const created = await service.create(req.body);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/setting/:id
router.delete("/:id", async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;