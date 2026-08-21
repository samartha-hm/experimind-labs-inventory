import { Router } from "express";
import { ReportService } from "../../services/ReportService";
import { validate, IsOptional, IsUUID, IsDateString } from "class-validator";
import { plainToInstance } from "class-transformer";
import { requireRole } from "../../middleware/requireRole.ts";
import { requireTenant } from "../../middleware/tenant.ts";

const router = Router();
const service = new ReportService();

export class InventoryTurnoverDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class LowStockAlertDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

async function validateDto<T extends object>(dto: any, cls: new (...args: any[]) => T): Promise<T> {
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

// GET /api/v1/report/inventory-valuation (Viewer+)
router.get("/inventory-valuation", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const valuation = await service.inventoryValuation(orgId);
    res.json(valuation);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/report/inventory-turnover (Viewer+)
router.get("/inventory-turnover", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const validQuery = await validateDto(req.query, InventoryTurnoverDto);
    const turnover = await service.inventoryTurnover(validQuery as any, orgId);
    res.json(turnover);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/report/low-stock-alerts (Viewer+)
router.get("/low-stock-alerts", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const validQuery = await validateDto(req.query, LowStockAlertDto);
    const alerts = await service.lowStockAlerts(validQuery.warehouseId, orgId);
    res.json(alerts);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/report/purchase-order-status (Viewer+)
router.get("/purchase-order-status", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const status = await service.purchaseOrderStatus(orgId);
    res.json(status);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/report/sales-order-status (Viewer+)
router.get("/sales-order-status", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const status = await service.salesOrderStatus(orgId);
    res.json(status);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/v1/report/dashboard (Viewer+)
router.get("/dashboard", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const [
      inventoryValuation,
      lowStockAlerts,
      poStatus,
      soStatus
    ] = await Promise.all([
      service.inventoryValuation(orgId),
      service.lowStockAlerts(undefined, orgId),
      service.purchaseOrderStatus(orgId),
      service.salesOrderStatus(orgId)
    ]);

    res.json({
      inventoryValuation: {
        summary: inventoryValuation.summary,
        lowStockCount: inventoryValuation.lowStockItems.length,
        outOfStockCount: inventoryValuation.outOfStockItems.length
      },
      lowStockAlerts: {
        count: lowStockAlerts.length,
        items: lowStockAlerts.slice(0, 5)
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