import { Router } from "express";
import { TransactionService } from "../../services/TransactionService";
import { validate, IsString, IsOptional, IsUUID, IsDateString, IsInt, Min, IsArray } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";

const router = Router();
const service = new TransactionService();

export class CreateTransactionDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  reference_type?: string;

  @IsOptional()
  @IsUUID()
  reference_uuid?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  occurred_at?: string;

  @IsOptional()
  @IsArray()
  items?: any[];

  @IsOptional()
  @IsArray()
  lines?: any[];
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

// GET /api/v1/transaction (Viewer+)
router.get("/", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId as string,
      referenceType: req.query.referenceType as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };
    const list = await service.list(filters);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/transaction/:id (Viewer+)
router.get("/:id", requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const transaction = await service.getById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(transaction);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/transaction (Staff+)
router.post("/", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    await validateDto(req.body, CreateTransactionDto);
    const { lines, items, ...txData } = req.body;

    const user = (req as any).user;
    let userId = txData.user_id || user?.id || "00000000-0000-0000-0000-000000000001";
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      userId = "00000000-0000-0000-0000-000000000001";
    }

    const referenceType = txData.reference_type || txData.type || "adjustment";

    const linesInput = lines || (items || []).map((i: any) => ({
      inventory_item_id: i.componentId || i.inventory_item_id,
      quantity_change: i.qtyDiff ?? i.quantity_change ?? 0,
      unit_cost: i.unit_cost ?? 0
    }));

    const processedData = {
      ...txData,
      user_id: userId,
      reference_type: referenceType,
      notes: txData.notes || txData.description || "",
      occurred_at: txData.occurred_at ? new Date(txData.occurred_at) : new Date()
    };

    const created = await service.create({
      ...processedData,
      lines: linesInput
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/transaction/stock-adjustment (Staff+)
router.post("/stock-adjustment", requireRole("staff", "manager", "admin"), async (req, res) => {
  try {
    const {
      user_id,
      reference_type,
      reference_uuid,
      adjustments,
      notes
    } = req.body;

    if (!user_id || !reference_type || !Array.isArray(adjustments)) {
      return res.status(400).json({
        error: "user_id, reference_type, and adjustments array are required"
      });
    }

    for (const adj of adjustments) {
      if (!adj.inventoryItemId || typeof adj.quantityChange !== 'number' || typeof adj.unitCost !== 'number') {
        return res.status(400).json({
          error: "Each adjustment must have inventoryItemId, quantityChange (number), and unitCost (number)"
        });
      }
    }

    const transaction = await service.createStockAdjustment(
      user_id,
      reference_type,
      reference_uuid || null,
      adjustments.map(adj => ({
        inventoryItemId: adj.inventoryItemId,
        quantityChange: adj.quantityChange,
        unitCost: adj.unitCost
      })),
      notes
    );

    res.status(201).json(transaction);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;