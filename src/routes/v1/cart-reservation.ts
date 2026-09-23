import { Router, Request, Response } from "express";
import { CartReservationService } from "../../services/CartReservationService.ts";
import { authenticateJwt } from "../../middleware/auth.ts";
import { requireTenant } from "../../middleware/tenant.ts";

const router = Router();

/**
 * POST /api/v1/cart/reserve
 * Acquire a 15-minute soft-lock for an item in a cart
 */
router.post("/reserve", async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const { cartId, itemId, quantity = 1, ttlMinutes = 15 } = req.body;

    if (!cartId || !itemId) {
      res.status(400).json({ success: false, error: "Both cartId and itemId are required." });
      return;
    }

    const result = await CartReservationService.reserveStock({
      organizationId: orgId,
      cartId,
      itemId,
      quantity: Number(quantity),
      ttlMinutes: Number(ttlMinutes),
    });

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/cart/release
 * Release soft-lock reservations for a cart or specific item
 */
router.post("/release", async (req: Request, res: Response): Promise<void> => {
  try {
    const { cartId, itemId } = req.body;
    if (!cartId) {
      res.status(400).json({ success: false, error: "cartId is required." });
      return;
    }

    const releasedCount = CartReservationService.releaseReservation(cartId, itemId);
    res.status(200).json({ success: true, releasedCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/cart/checkout-hard-lock
 * Execute PostgreSQL Row-Level SERIALIZABLE transaction commit on inventory
 */
router.post("/checkout-hard-lock", authenticateJwt, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const { cartId, orderReference, lines, notes } = req.body;

    if (!cartId || !Array.isArray(lines) || lines.length === 0) {
      res.status(400).json({ success: false, error: "cartId and non-empty lines array required." });
      return;
    }

    const result = await CartReservationService.executeHardLockCheckout({
      organizationId: orgId,
      cartId,
      orderReference,
      lines,
      actorId: (req as any).user?.id,
      actorName: (req as any).user?.name || "Storefront Customer",
      notes,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
