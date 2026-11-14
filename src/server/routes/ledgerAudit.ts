import { Router } from "express";
import { AppDataSource } from "../../db";
import { authenticateJwt } from "../../middleware/auth";
import { getTenantOrgId, requireTenant } from "../../middleware/tenant";
import { requireRole } from "../../middleware/requireRole";
import { ledgerReport, reconciliationSql, type LedgerBalance } from "../services/reconcileLedger";

export const ledgerAuditRouter = Router();
ledgerAuditRouter.get("/reconcile-ledger", authenticateJwt, requireTenant, requireRole("admin"), async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const balances = await AppDataSource.query<LedgerBalance[]>(reconciliationSql, [getTenantOrgId(req)]);
    res.json(ledgerReport(balances));
  } catch {
    res.status(503).json({ error: "Ledger reconciliation unavailable." });
  }
});
