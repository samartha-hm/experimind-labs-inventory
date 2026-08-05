import { Router } from "express";
import { CustomerService } from "../../services/CustomerService";
import { validate, IsString, IsOptional, IsEmail, MaxLength, IsInt, Min } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";

const router = Router();
const service = new CustomerService();

export class CreateCustomerDto {
  @IsString()
  @MaxLength(100)
  customer_code!: string;

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
  billing_address?: Record<string, any>;

  @IsOptional()
  shipping_address?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(0)
  credit_limit?: number;
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

// GET /api/v1/customer (Viewer+)
router.get("/", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const list = await service.list((req as any).orgId);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/customer/:id (Viewer+)
router.get("/:id", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const customer = await service.findById(req.params.id, (req as any).orgId);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/customer (Staff+)
router.post("/", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    await validateDto(req.body, CreateCustomerDto);
    const created = await service.create(req.body, (req as any).orgId);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/customer/:id (Staff+)
router.put("/:id", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    await validateDto(req.body, CreateCustomerDto);
    const updated = await service.update(req.params.id, req.body, (req as any).orgId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/customer/:id (Admin only)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await service.delete(req.params.id, (req as any).orgId);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;