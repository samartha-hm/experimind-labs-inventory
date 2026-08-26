import { Router } from "express";
import { requireTenant } from "../../middleware/tenant";
import { authenticateJwt } from "../../middleware/auth";
import { SessionService } from "../../services/SessionService";

const router = Router();
const sessionService = new SessionService();

// GET /api/v1/sessions/me
router.get("/me", authenticateJwt, async (req, res) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "User not identified" });
    }
    const sessions = await sessionService.listUserSessions(userId);
    res.json(sessions);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/sessions/:id/revoke
router.post("/:id/revoke", authenticateJwt, async (req, res) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    await sessionService.revokeSession(req.params.id, userId);
    res.json({ message: "Session revoked successfully" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/sessions/revoke-all-others
router.post("/revoke-all-others", authenticateJwt, async (req, res) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const currentRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken || "";
    const revoked = await sessionService.revokeAllOtherSessions(currentRefreshToken, userId);
    res.json({ message: `Successfully revoked ${revoked} other active sessions.` });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
