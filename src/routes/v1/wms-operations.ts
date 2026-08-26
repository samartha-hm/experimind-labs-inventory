import { Router, Request, Response } from "express";
import { WmsOperationService } from "../../services/WmsOperationService.ts";
import { authenticateJwt } from "../../middleware/auth.ts";
import { requireRole } from "../../middleware/requireRole.ts";

export const wmsOperationsRouter = Router();

// =========================================================================
// 1. INBOUND RECEIVING DOCK & 3-WAY MATCH
// =========================================================================
wmsOperationsRouter.post(
  "/receive-po/:poId",
  authenticateJwt,
  requireRole("admin", "staff"),
  async (req: Request, res: Response) => {
    try {
      const { poId } = req.params;
      const { receiptLines, notes } = req.body;

      if (!Array.isArray(receiptLines) || receiptLines.length === 0) {
        return res.status(400).json({ error: "Missing or invalid receiptLines array" });
      }

      const actorName = req.user?.id || "Dock Receiving Operator";
      const orgId = req.user?.orgId || "00000000-0000-0000-0000-000000000000";

      const updatedPo = await WmsOperationService.receivePurchaseOrder(
        poId,
        receiptLines,
        actorName,
        orgId
      );

      res.status(200).json({
        message: "Purchase Order inbound receipt processed successfully",
        po: updatedPo,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to process PO receiving" });
    }
  }
);

// =========================================================================
// 2. OUTBOUND SO PICK / PACK / SHIP FULFILLMENT
// =========================================================================
wmsOperationsRouter.post(
  "/fulfill-so/:soId",
  authenticateJwt,
  requireRole("admin", "staff"),
  async (req: Request, res: Response) => {
    try {
      const { soId } = req.params;
      const { fulfillmentLines, carrier, trackingNumber } = req.body;

      if (!Array.isArray(fulfillmentLines) || fulfillmentLines.length === 0) {
        return res.status(400).json({ error: "Missing or invalid fulfillmentLines array" });
      }

      const actorName = req.user?.id || "Fulfillment Dispatcher";
      const orgId = req.user?.orgId || "00000000-0000-0000-0000-000000000000";

      const updatedSo = await WmsOperationService.fulfillSalesOrder(
        soId,
        fulfillmentLines,
        carrier,
        trackingNumber,
        actorName,
        orgId
      );

      res.status(200).json({
        message: "Sales Order fulfillment & dispatch completed successfully",
        so: updatedSo,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fulfill Sales Order" });
    }
  }
);

// =========================================================================
// 3. MULTI-STAGE STOCK TRANSFERS
// =========================================================================
wmsOperationsRouter.get("/transfers", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || "00000000-0000-0000-0000-000000000000";
    const status = req.query.status ? String(req.query.status) : undefined;
    const transfers = await WmsOperationService.listTransfers(orgId, status);
    res.json(transfers);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to list transfers" });
  }
});

wmsOperationsRouter.post(
  "/transfers",
  authenticateJwt,
  requireRole("admin", "staff"),
  async (req: Request, res: Response) => {
    try {
      const orgId = req.user?.orgId || "00000000-0000-0000-0000-000000000000";
      const actorName = req.user?.id || "Transfer Specialist";

      const transfer = await WmsOperationService.createTransfer({
        ...req.body,
        organizationId: orgId,
        actorName,
      });

      res.status(201).json(transfer);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create transfer order" });
    }
  }
);

wmsOperationsRouter.post(
  "/transfers/:transferId/dispatch",
  authenticateJwt,
  requireRole("admin", "staff"),
  async (req: Request, res: Response) => {
    try {
      const { transferId } = req.params;
      const { carrier, trackingNumber } = req.body;
      const actorName = req.user?.id || "Transfer Dispatcher";

      const transfer = await WmsOperationService.dispatchTransfer(
        transferId,
        carrier,
        trackingNumber,
        actorName
      );

      res.json({ message: "Stock transfer dispatched to transit", transfer });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to dispatch transfer" });
    }
  }
);

wmsOperationsRouter.post(
  "/transfers/:transferId/receive",
  authenticateJwt,
  requireRole("admin", "staff"),
  async (req: Request, res: Response) => {
    try {
      const { transferId } = req.params;
      const { receiptLines } = req.body || {};
      const actorName = req.user?.id || "Receiving Clerk";
      const transfer = await WmsOperationService.receiveTransfer(transferId, receiptLines, actorName);
      res.json({ message: "Stock transfer received into destination bin", transfer });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to receive transfer" });
    }
  }
);

// =========================================================================
// 4. ABC CYCLE COUNTING & PHYSICAL AUDITS
// =========================================================================
wmsOperationsRouter.get("/cycle-counts", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || "00000000-0000-0000-0000-000000000000";
    const counts = await WmsOperationService.listCycleCounts(orgId);
    res.json(counts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to list cycle counts" });
  }
});

wmsOperationsRouter.post(
  "/cycle-counts",
  authenticateJwt,
  requireRole("admin", "staff"),
  async (req: Request, res: Response) => {
    try {
      const orgId = req.user?.orgId || "00000000-0000-0000-0000-000000000000";
      const actorName = req.user?.id || "Inventory Auditor";

      const audit = await WmsOperationService.createCycleCount({
        ...req.body,
        organizationId: orgId,
        actorName,
      });

      res.status(201).json(audit);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create cycle count" });
    }
  }
);

wmsOperationsRouter.post(
  "/cycle-counts/:auditId/submit",
  authenticateJwt,
  requireRole("admin", "staff"),
  async (req: Request, res: Response) => {
    try {
      const { auditId } = req.params;
      const { countedLines } = req.body;

      if (!Array.isArray(countedLines)) {
        return res.status(400).json({ error: "Missing or invalid countedLines array" });
      }

      const audit = await WmsOperationService.submitCountResults(auditId, countedLines);
      res.json({ message: "Physical count results recorded successfully", audit });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to submit count results" });
    }
  }
);

wmsOperationsRouter.post(
  "/cycle-counts/:auditId/approve",
  authenticateJwt,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const { auditId } = req.params;
      const approverName = req.user?.id || "Warehouse Manager";

      const audit = await WmsOperationService.approveAndPostVariance(auditId, approverName);
      res.json({ message: "Cycle count variance approved & posted to Immutable Stock Ledger", audit });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to approve cycle count variance" });
    }
  }
);
