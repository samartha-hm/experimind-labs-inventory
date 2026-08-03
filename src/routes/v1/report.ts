import { Router } from "express";
import { ReportService } from "../../services/ReportService";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

const router = Router();
const service = new ReportService();

// DTO for inventory valuation request
class InventoryValuationDto {
  // No parameters needed for basic valuation
}

// DTO for inventory turnover request
class InventoryTurnoverDto {
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
}

// DTO for low stock alerts request
class LowStockAlertDto {
  warehouseId?: string;
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

// GET /api/v1/report/inventory-valuation
router.get("/inventory-valuation", async (req, res) => {
  try {
    const valuation = await service.inventoryValuation();
    res.json(valuation);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/report/inventory-turnover
router.get("/inventory-turnover", async (req, res) => {
  try {
    await validateDto(req.query, InventoryTurnoverDto);
    const turnover = await service.inventoryTurnover(req.query as any);
    res.json(turnover);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/report/low-stock-alerts
router.get("/low-stock-alerts", async (req, res) => {
  try {
    await validateDto(req.query, LowStockAlertDto);
    const alerts = await service.lowStockAlerts(req.query.warehouseId as string | undefined);
    res.json(alerts);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/report/purchase-order-status
router.get("/purchase-order-status", async (req, res) => {
  try {
    const status = await service.purchaseOrderStatus();
    res.json(status);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/report/sales-order-status
router.get("/sales-order-status", async (req, res) => {
  try {
    const status = await service.salesOrderStatus();
    res.json(status);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/report/dashboard (combined overview)
router.get("/dashboard", async (req, res) => {
  try {
    // Get data for dashboard widgets
    const [
      inventoryValuation,
      lowStockAlerts,
      poStatus,
      soStatus
    ] = await Promise.all([
      service.inventoryValuation(),
      service.lowStockAlerts(),
      service.purchaseOrderStatus(),
      service.salesOrderStatus()
    ]);

    res.json({
      inventoryValuation: {
        summary: inventoryValuation.summary,
        lowStockCount: inventoryValuation.lowStockItems.length,
        outOfStockCount: inventoryValuation.outOfStockItems.length
      },
      lowStockAlerts: {
        count: lowStockAlerts.length,
        items: lowStockAlerts.slice(0, 5) // Top 5 for dashboard
      },
      purchaseOrderStatus: {
        totalPos: poStatus.summary.totalPos,
        pendingValue: poStatus.summary.pendingValue,
        completionRate: poStatus.summary.completionRate
      },
      salesOrderStatus: {
        totalSos: soStatus.summary.totalSos,
        fulfilledValue: soStatus.summary.fulfilledValue,
        fulfillmentRate: soStatus.summary.fulfillmentRate
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;