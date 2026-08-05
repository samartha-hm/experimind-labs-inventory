import { Router } from "express";
import { OrderService } from "../../services/OrderService.ts";
import { getTenantOrgId } from "../../middleware/tenant.ts";
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

// POST /api/v1/orders (Public / Storefront)
router.post("/", async (req, res) => {
  try {
    const validated = await validateDto(req.body, CreateOrderDto);
    const orgId = getTenantOrgId(req);

    const customerName = validated.customerName || validated.customer_name || "Guest Customer";
    const customerEmail = validated.customerEmail || validated.customer_email || "guest@experimindlabs.com";
    const customerPhone = validated.customerPhone || validated.customer_phone || "";

    const items = validated.items.map((i) => ({
      itemId: i.itemId || i.sku || "",
      quantity: i.quantity,
    }));

    const result = await orderService.createStorefrontOrder({
      customerName,
      customerEmail,
      customerPhone,
      items,
      organizationId: orgId,
    });
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
