import { Router, Request, Response } from "express";
import { RealTimeEventService } from "../../services/RealTimeEventService.ts";
import { authenticateJwt } from "../../middleware/auth.ts";
import { requireTenant } from "../../middleware/tenant.ts";
import crypto from "crypto";

const router = Router();

/**
 * GET /api/v1/stream/events
 * Live Server-Sent Events (SSE) stream for real-time stock sync and notifications
 */
router.get("/events", authenticateJwt, requireTenant, (req: any, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disables response buffering in Nginx
  });

  const clientId = `sse-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const orgId = req.user.orgId || "00000000-0000-0000-0000-000000000000";
  const userId = req.user.id || "anonymous";

  RealTimeEventService.registerClient(clientId, orgId, userId, res);

  req.on("close", () => {
    RealTimeEventService.unregisterClient(clientId);
  });
});

export default router;
