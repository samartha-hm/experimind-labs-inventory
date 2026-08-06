import { Router } from "express";
import { VendorService } from "../../services/VendorService";
import { validate, IsString, IsOptional, IsEmail, MaxLength } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";

const router = Router();
const service = new VendorService();

export class CreateVendorDto {
  @IsString()
  @MaxLength(100)
  vendor_code!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  address?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  payment_terms?: string;
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendor_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  address?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  payment_terms?: string;
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

// GET /api/v1/vendor (Viewer+)
router.get("/", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const list = await service.list((req as any).orgId);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/vendor/:id (Viewer+)
router.get("/:id", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const vendor = await service.findById(req.params.id, (req as any).orgId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json(vendor);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/vendor (Staff+)
router.post("/", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const validData = await validateDto(req.body, CreateVendorDto);
    const created = await service.create(validData, (req as any).orgId);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/vendor/:id (Staff+)
router.put("/:id", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const validData = await validateDto(req.body, UpdateVendorDto);
    const updated = await service.update(req.params.id, validData, (req as any).orgId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/vendor/:id (Admin only)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await service.delete(req.params.id, (req as any).orgId);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;