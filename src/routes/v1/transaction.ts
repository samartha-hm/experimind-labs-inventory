import { Router } from "express";
import { TransactionService } from "../../services/TransactionService";
import { validate, IsString, IsOptional, IsUUID, IsDateString, IsInt, Min, IsArray } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";

const router = Router();
const service = new TransactionService();

export class CreateTransactionDto {
  @IsOptional()
  @IsUUID()
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
    const { lines, ...txData } = req.body;

    const processedData = {
      ...txData,
      occurred_at: txData.occurred_at ? new Date(txData.occurred_at) : undefined
    };

    const created = await service.create({
      ...processedData,
      lines: lines || []
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