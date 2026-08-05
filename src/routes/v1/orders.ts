import { Router } from "express";
import { OrderService } from "../../services/OrderService.ts";
import { getTenantOrgId } from "../../middleware/tenant.ts";
import { validate, IsString, IsOptional, IsEmail, IsArray, ArrayNotEmpty, IsInt, Min, IsUUID, ValidateNested } from "class-validator";
import { plainToInstance, Type } from "class-transformer";

const router = Router();
const orderService = new OrderService();

export class OrderItemInput {
  @IsUUID()
  itemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items!: OrderItemInput[];
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

// POST /api/v1/orders (Public / Storefront)
router.post("/", async (req, res) => {
  try {
    await validateDto(req.body, CreateOrderDto);
    const orgId = getTenantOrgId(req);
    const result = await orderService.createStorefrontOrder({
      ...req.body,
      organizationId: orgId,
    });
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
