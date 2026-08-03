import { Router } from "express";
import { TransactionService } from "../../services/TransactionService";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

const router = Router();
const service = new TransactionService();

// DTO for creating transactions
class CreateTransactionDto {
  user_id: string;
  reference_type: string;
  reference_uuid?: string;
  notes?: string;
  occurred_at?: string; // ISO date string
}

// DTO for transaction lines
class TransactionLineDto {
  inventory_item_id: string;
  quantity_change: number;
  unit_cost: number;
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

// GET /api/v1/transaction
router.get("/", async (req, res) => {
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

// GET /api/v1/transaction/:id
router.get("/:id", async (req, res) => {
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

// POST /api/v1/transaction
router.post("/", async (req, res) => {
  try {
    await validateDto(req.body, CreateTransactionDto);
    const { lines, ...txData } = req.body;

    // Convert date string to Date object if provided
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

// GET /api/v1/transaction/stock-adjustment (convenience endpoint)
router.post("/stock-adjustment", async (req, res) => {
  try {
    const {
      user_id,
      reference_type,
      reference_uuid,
      adjustments, // [{ inventoryItemId, quantityChange, unitCost }]
      notes
    } = req.body;

    // Validate required fields
    if (!user_id || !reference_type || !Array.isArray(adjustments)) {
      return res.status(400).json({
        error: "user_id, reference_type, and adjustments array are required"
      });
    }

    // Validate each adjustment
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