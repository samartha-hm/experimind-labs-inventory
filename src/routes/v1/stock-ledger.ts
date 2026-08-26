import { Router, Request, Response } from "express";
import { StockLedgerService } from "../../services/StockLedgerService.ts";
import { authenticateJwt } from "../../middleware/auth.ts";
import { requireRole } from "../../middleware/requireRole.ts";

export const stockLedgerRouter = Router();

// 1. List Ledger Entries
stockLedgerRouter.get("/", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const { itemId, binLocation, transactionType, search, limit, offset } = req.query;
    const orgId = req.user?.orgId || "00000000-0000-0000-0000-000000000000";

    const result = await StockLedgerService.listEntries({
      organizationId: orgId,
      itemId: itemId ? String(itemId) : undefined,
      binLocation: binLocation ? String(binLocation) : undefined,
      transactionType: transactionType ? String(transactionType) : undefined,
      search: search ? String(search) : undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch stock ledger entries" });
  }
});

// 2. Real-time Inventory Valuation Summary
stockLedgerRouter.get("/valuation", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || "00000000-0000-0000-0000-000000000000";
    const valuation = await StockLedgerService.getValuationSummary(orgId);
    res.json(valuation);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to compute inventory valuation" });
  }
});

// 3. Post Manual Adjustment Entry
stockLedgerRouter.post("/adjust", authenticateJwt, requireRole("admin", "staff"), async (req: Request, res: Response) => {
  try {
    const { itemId, qtyDelta, binLocation, reasonCode, notes } = req.body;
    if (!itemId || qtyDelta === undefined || !reasonCode) {
      return res.status(400).json({ error: "Missing required fields: itemId, qtyDelta, and reasonCode" });
    }

    const orgId = req.user?.orgId || "00000000-0000-0000-0000-000000000000";
    const actorName = req.user?.id || "Staff Operator";

    const entry = await StockLedgerService.postEntry({
      organizationId: orgId,
      itemId,
      qtyDelta: Number(qtyDelta),
      binLocation,
      transactionType: "MANUAL_ADJUSTMENT",
      referenceType: "manual",
      reasonCode,
      notes,
      actorName,
    });

    res.status(201).json(entry);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to post manual stock adjustment" });
  }
});
