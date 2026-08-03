import { Router } from "express";
import { VendorService } from "../../services/VendorService";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

const router = Router();
const service = new VendorService();

// DTO for creating/updating vendors
class CreateVendorDto {
  vendor_code: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: Record<string, any>;
  payment_terms?: string;
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

// GET /api/v1/vendor
router.get("/", async (req, res) => {
  try {
    const list = await service.list();
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/vendor/:id
router.get("/:id", async (req, res) => {
  try {
    const vendor = await service.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json(vendor);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/vendor
router.post("/", async (req, res) => {
  try {
    await validateDto(req.body, CreateVendorDto);
    const created = await service.create(req.body);
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/vendor/:id
router.put("/:id", async (req, res) => {
  try {
    await validateDto(req.body, CreateVendorDto);
    const updated = await service.update(req.params.id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/vendor/:id
router.delete("/:id", async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;