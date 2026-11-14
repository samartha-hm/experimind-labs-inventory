import { labLoans } from "./labLoans";
import { packingRouter } from "../../routes/v1/packing.ts";
import { attachmentRouter } from "../../routes/v1/attachments.ts";
import { labelLayoutRouter } from "../../routes/v1/labelLayouts.ts";
import { deliveryRouter } from "../../routes/v1/delivery.ts";
import express from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.ts";
import authRoutes from "../../routes/v1/auth.ts";
import { authenticateJwt } from "../../middleware/auth.ts";
import { requireTenant } from "../../middleware/tenant.ts";
import { legacyOperationsGate, legacyOperationalPaths } from "../../middleware/legacyOperationsGate.ts";
import { productTemplateRouter } from "../../routes/v1/product-templates.ts";
import { planningProjectRouter } from "../../routes/v1/planning-projects.ts";
import { stocktakeRouter } from "../../routes/v1/stocktakes.ts";
import { supplyPlanningRouter } from "../../routes/v1/supply-planning.ts";
import { productionPlanningRouter } from "../../routes/v1/production-planning.ts";
import inventoryRoutes from "../../routes/v1/inventory.ts";
import warehouseRoutes from "../../routes/v1/warehouse.ts";
import binRoutes from "../../routes/v1/bin.ts";
import kitRoutes from "../../routes/v1/kit.ts";
import vendorRoutes from "../../routes/v1/vendor.ts";
import customerRoutes from "../../routes/v1/customer.ts";
import purchaseOrderRoutes from "../../routes/v1/purchase-order.ts";
import salesOrderRoutes from "../../routes/v1/sales-order.ts";
import transactionRoutes from "../../routes/v1/transaction.ts";
import reportRoutes from "../../routes/v1/report.ts";
import settingRoutes from "../../routes/v1/setting.ts";
import webhookRoutes from "../../routes/v1/webhook.ts";
import userRoutes from "../../routes/v1/users.ts";
import orderRoutes from "../../routes/v1/orders.ts";
import auditLogRoutes from "../../routes/v1/audit-log.ts";
import warehouseVisualRoutes from "../../routes/v1/warehouse-visual.ts";
import serialNumberRoutes from "../../routes/v1/serial-number.ts";
import imageProxyRoutes from "../../routes/v1/image-proxy.ts";
import { stockLedgerRouter } from "../../routes/v1/stock-ledger.ts";
import { wmsOperationsRouter } from "../../routes/v1/wms-operations.ts";
import rbacRoutes from "../../routes/v1/rbac.ts";
import sessionRoutes from "../../routes/v1/session.ts";
import bulkImportRoutes from "../../routes/v1/bulk-import.ts";
import storefrontRoutes from "../../routes/v1/storefront.ts";
import realtimeRoutes from "../../routes/v1/realtime.ts";
import eSignatureRoutes from "../../routes/v1/e-signature.ts";
import qmsRoutes from "../../routes/v1/qms.ts";
import auditEventsRoutes from "../../routes/v1/audit-events.ts";
import bomRoutes from "../../routes/v1/bom.ts";
import hardwareRoutes from "../../routes/v1/hardware.ts";
import cartReservationRoutes from "../../routes/v1/cart-reservation.ts";
import { qcRouter } from "../../routes/v1/qc.ts";
import { traceabilityRouter } from "../../routes/v1/traceability.ts";
import { productionRouter } from "../../routes/productionRoutes.ts";
import { projectRouter } from "../../routes/projectRoutes.ts";
import stickerRouter from "../../routes/stickerRoutes.ts";
import { AppDataSource } from "../../db";
import type { TrustedLedgerAuthority } from "../../security/TrustedLedgerAuthority";
import { ledgerAuditRouter } from "./ledgerAudit";

export function mountApi(app: express.Express, receiptAuthority?: TrustedLedgerAuthority) {
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: env.nodeEnv === "production" ? 100 : 1000, standardHeaders: true });
  // ===== Public Asset & Webhook Endpoints =====
  app.use("/api/public/webhook", webhookRoutes);
  app.use("/api/public/storefront", storefrontRoutes);
  app.use("/api/v1/image-proxy", imageProxyRoutes);

  // ===== Versioned API (protected) =====
  app.use("/api/v1/auth", authLimiter, authRoutes);
  app.use("/api/v1/product-templates", productTemplateRouter(AppDataSource));
  app.use("/api/v1/planning-projects", planningProjectRouter(AppDataSource));
  app.use("/api/v1/stocktakes", stocktakeRouter(AppDataSource, receiptAuthority));
  app.use("/api/v1/supply-planning", supplyPlanningRouter(AppDataSource,receiptAuthority));
  app.use("/api/v1/production-planning", productionPlanningRouter(AppDataSource,receiptAuthority));
  app.use("/api/v1/packing", packingRouter(AppDataSource));
  app.use("/api/v1/delivery", deliveryRouter(AppDataSource));
  app.use("/api/v1/attachments", attachmentRouter(AppDataSource));
  app.use("/api/v1/packing-label-layouts", labelLayoutRouter(AppDataSource));
  app.use("/api/v1/orders", orderRoutes);
  app.use("/api/v1/users", authenticateJwt, requireTenant, userRoutes);
  app.use("/api/v1/inventory", authenticateJwt, requireTenant, inventoryRoutes);
  app.use("/api/v1/warehouse", authenticateJwt, requireTenant, warehouseRoutes);
  app.use("/api/v1/bin", authenticateJwt, requireTenant, binRoutes);
  app.use("/api/v1/kit", authenticateJwt, requireTenant, kitRoutes);
  app.use("/api/v1/vendor", authenticateJwt, requireTenant, vendorRoutes);
  app.use("/api/v1/customer", authenticateJwt, requireTenant, customerRoutes);
  app.use("/api/v1/purchase-order", authenticateJwt, requireTenant, purchaseOrderRoutes);
  app.use("/api/v1/lab-loans", authenticateJwt, requireTenant, labLoans);
  app.use("/api/v1/sales-order", authenticateJwt, requireTenant, salesOrderRoutes);
  app.use("/api/v1/transaction", authenticateJwt, requireTenant, transactionRoutes);
  app.use("/api/v1/report", authenticateJwt, requireTenant, reportRoutes);
  app.use("/api/v1/setting", authenticateJwt, requireTenant, settingRoutes);
  app.use("/api/v1/audit", ledgerAuditRouter);
  app.use("/api/v1/audit-log", authenticateJwt, requireTenant, auditLogRoutes);
  app.use("/api/v1/warehouse-visual", authenticateJwt, requireTenant, warehouseVisualRoutes);
  app.use("/api/v1/serials", authenticateJwt, requireTenant, serialNumberRoutes);
  app.use("/api/v1/stock-ledger", authenticateJwt, requireTenant, stockLedgerRouter);
  app.use("/api/v1/wms", authenticateJwt, requireTenant, wmsOperationsRouter);
  app.use("/api/v1/rbac", authenticateJwt, requireTenant, rbacRoutes);
  app.use("/api/v1/sessions", authenticateJwt, requireTenant, sessionRoutes);
  app.use("/api/v1/bulk-import", authenticateJwt, requireTenant, bulkImportRoutes);

  // Realtime & Compliance Extensions
  app.use("/api/v1/stream", realtimeRoutes);
  app.use("/api/v1/e-signature", eSignatureRoutes);
  app.use("/api/v1/qms", qmsRoutes);
  app.use("/api/v1/audit-events", auditEventsRoutes);

  // Hardware & Electronics Lab Extensions
  app.use(["/api/v1/bom", "/api/bom"], authenticateJwt, requireTenant, bomRoutes);
  app.use(["/api/v1/hardware", "/api/hardware"], authenticateJwt, requireTenant, hardwareRoutes);
  app.use("/api/v1/cart", authenticateJwt, requireTenant, cartReservationRoutes);
  app.use("/api/public/cart", cartReservationRoutes);
  // Global legacy stores cannot enforce tenant ownership; gate every alias.
  app.use(legacyOperationalPaths, legacyOperationsGate());
  app.use(["/api/v1/qc", "/api/qc"], qcRouter);
  app.use(["/api/v1/traceability", "/api/traceability"], traceabilityRouter);
  app.use(["/api/v1/production", "/api/production"], productionRouter);
  app.use(["/api/v1/projects", "/api/projects"], projectRouter);
  app.use(["/api/v1/stickers", "/api/stickers"], stickerRouter);
}
