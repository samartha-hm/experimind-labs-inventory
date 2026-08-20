import { Router } from "express";
import { AppDataSource } from "../../db.ts";
import { AuditLog } from "../../entity/AuditLog.ts";
import { requireRole } from "../../middleware/requireRole.ts";
import { requireTenant } from "../../middleware/tenant.ts";

const router = Router();

// GET /api/v1/audit-log (Viewer+)
router.get("/", requireTenant, requireRole("viewer", "staff", "manager", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const repo = AppDataSource.getRepository(AuditLog);
    
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const [logs, total] = await repo.findAndCount({
      where: { organization_id: orgId },
      order: { created_at: "DESC" },
      take: limit,
      skip: offset,
    });

    res.json({ logs, total, limit, offset });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
