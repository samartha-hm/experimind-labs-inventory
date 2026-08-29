import { Router } from "express";
import { AuditService } from "../../services/AuditService.ts";
import { authenticateJwt } from "../../middleware/auth.ts";
import { requireTenant } from "../../middleware/tenant.ts";

const router = Router();

/**
 * GET /api/v1/audit-events
 * Query immutable audit events with pagination and filtering
 */
router.get("/", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const { entityType, entityId, actorId, action, limit, offset } = req.query;
    const result = await AuditService.queryAuditTrail({
      organizationId: req.user.orgId,
      entityType: entityType ? String(entityType) : undefined,
      entityId: entityId ? String(entityId) : undefined,
      actorId: actorId ? String(actorId) : undefined,
      action: action ? String(action) : undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/v1/audit-events/verify-chain
 * Mathematically verify the SHA-256 hash chain for the tenant
 */
router.get("/verify-chain", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const verification = await AuditService.verifyChainIntegrity(req.user.orgId);
    res.json(verification);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
