import { Router } from "express";
import { SettingService } from "../../services/SettingService";
import { validate, IsString, IsEnum, MaxLength } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";

const router = Router();
const service = new SettingService();

export class CreateSettingDto {
  @IsEnum(["category", "room", "shelf", "box"])
  type!: "category" | "room" | "shelf" | "box";

  @IsString()
  @MaxLength(255)
  value!: string;
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

// GET /api/v1/setting?type=... (Viewer+)
router.get("/", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
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

// GET /api/v1/setting/all (Viewer+)
router.get("/all", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const settings = await service.getAll();
    res.json(settings);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/setting (Admin only)
router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const validData = await validateDto(req.body, CreateSettingDto);
    const created = await service.create(validData);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/setting/:id (Admin only)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;