import { Router } from "express";
import { OrderService } from "../../services/OrderService.ts";
import { getTenantOrgId, requireTenant } from "../../middleware/tenant.ts";
import { authenticateJwt } from "../../middleware/auth.ts";
import { validate, IsString, IsOptional, IsEmail, IsArray, ArrayNotEmpty, IsInt, Min, ValidateNested } from "class-validator";
import { plainToInstance, Type } from "class-transformer";

const router = Router();
const orderService = new OrderService();

export class OrderItemInput {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsEmail()
  customer_email?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customer_phone?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customer_address?: string;

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  tracking_number?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items!: OrderItemInput[];
}

async function validateDto<T extends object>(dto: T, cls: new () => T): Promise<T> {
  const obj = plainToInstance(cls, dto);
  const errors = await validate(obj, { whitelist: false, forbidNonWhitelisted: false });
  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(", "))
      .join("; ");
    throw new Error(`Validation failed: ${messages}`);
  }
  return obj;
}

// =========================================================================
// 1. PUBLIC ENDPOINTS (STOREFRONT USERS, GUESTS & EDUCATORS)
// =========================================================================

// GET /api/v1/orders/track (Public Tracking Endpoint for Storefront)
router.get("/track", async (req, res) => {
  try {
    const orderId = (req.query.orderId as string) || (req.query.id as string) || "";
    const contact = (req.query.contact as string) || (req.query.email as string) || (req.query.phone as string) || "";

    if (!orderId) {
      return res.status(400).json({ error: "Order ID or Number is required for tracking" });
    }

    const order = await orderService.trackCustomerOrder({
      orderNumberOrId: orderId,
      contact: contact,
    });

    if (!order) {
      return res.status(404).json({ error: "No matching order found. Please check your Order Number and try again." });
    }

    res.json(order);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Tracking lookup failed" });
  }
});

// GET /api/v1/orders/customer/:email (Customer account order history lookup)
router.get("/customer/:email", async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }
    const orders = await orderService.getCustomerOrdersByEmail(email);
    res.json(orders);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to fetch customer orders" });
  }
});

// POST /api/v1/orders (Public Storefront Direct Checkout)
router.post("/", async (req, res) => {
  try {
    const validated = await validateDto(req.body, CreateOrderDto);
    const orgId = getTenantOrgId(req);

    const customerName = validated.customerName || validated.customer_name || "Storefront Customer";
    const customerEmail = validated.customerEmail || validated.customer_email || "";
    const customerPhone = validated.customerPhone || validated.customer_phone || "";
    const customerAddress = validated.customerAddress || validated.customer_address || "";
    const paymentMethod = validated.paymentMethod || validated.payment_method || "cod";

    const items = validated.items.map((i) => ({
      itemId: i.itemId || i.sku || "",
      quantity: i.quantity,
    }));

    const result = await orderService.createStorefrontOrder({
      organizationId: orgId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      paymentMethod,
      carrier: validated.carrier,
      trackingNumber: validated.trackingNumber || validated.tracking_number,
      gstin: validated.gstin,
      notes: validated.notes,
      items,
    });
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// =========================================================================
// 2. PROTECTED ADMIN ERP ENDPOINTS (REQUIRES ADMIN JWT & TENANT)
// =========================================================================

// GET /api/v1/orders (List all storefront orders for ERP Direct Orders workbench)
router.get("/", authenticateJwt, requireTenant, async (req, res) => {
  try {
    const orgId = getTenantOrgId(req);
    const orderRepo = (orderService as any).orderRepo;
    const orders = await orderRepo.find({
      where: orgId ? { organization_id: orgId } : {},
      relations: ["lines"],
      order: { created_at: "DESC" },
    });
    res.json(orders);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to fetch orders" });
  }
});

// PATCH /api/v1/orders/:id/fulfillment (Comprehensive status, carrier, tracking update)
router.patch("/:id/fulfillment", authenticateJwt, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, carrier, tracking_number, notes, customer_address, invoice_number } = req.body;
    const orgId = getTenantOrgId(req);
    const orderRepo = (orderService as any).orderRepo;

    const order = await orderRepo.findOne({
      where: { id, ...(orgId ? { organization_id: orgId } : {}) },
      relations: ["lines"],
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (status) order.status = status;
    if (carrier !== undefined) order.carrier = carrier;
    if (tracking_number !== undefined) order.tracking_number = tracking_number;
    if (notes !== undefined) order.notes = notes;
    if (customer_address !== undefined) order.customer_address = customer_address;
    if (invoice_number !== undefined) order.invoice_number = invoice_number;

    const updated = await orderRepo.save(order);
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to update order fulfillment" });
  }
});

// PATCH /api/v1/orders/:id/status (Legacy status toggle)
router.patch("/:id/status", authenticateJwt, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const orgId = getTenantOrgId(req);
    const orderRepo = (orderService as any).orderRepo;

    const order = await orderRepo.findOne({
      where: { id, ...(orgId ? { organization_id: orgId } : {}) },
      relations: ["lines"],
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.status = status;
    const updated = await orderRepo.save(order);
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to update order status" });
  }
});

export default router;
