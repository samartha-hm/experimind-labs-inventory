import { Router, Request, Response } from "express";
import crypto from "crypto";
import { AppDataSource } from "../../db.ts";
import { CustomerOrder } from "../../entity/CustomerOrder.ts";
import { InventoryService } from "../../services/InventoryService.ts";

const router = Router();
const inventoryService = new InventoryService();

/**
 * Razorpay Webhook Endpoint
 * Expects raw Buffer body via express.raw({ type: 'application/json' }) for authentic HMAC verification.
 */
router.post("/razorpay", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[SECURITY_FATAL] RAZORPAY_WEBHOOK_SECRET environment variable is missing.");
      return res.status(500).json({ error: "Webhook signature secret unconfigured on server." });
    }

    if (!signature) {
      return res.status(401).json({ error: "Missing x-razorpay-signature header." });
    }

    // req.body is a raw Buffer passed by express.raw()
    const rawBodyBuffer = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBodyBuffer)
      .digest("hex");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    // Length check before timingSafeEqual to prevent 500 throw
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return res.status(401).json({ error: "Invalid Razorpay webhook signature." });
    }

    // Parse verified JSON payload
    const body = JSON.parse(rawBodyBuffer.toString("utf-8"));
    const event = body.event;

    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = body.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const repo = AppDataSource.getRepository(CustomerOrder);
        const order = await repo.findOne({
          where: { razorpay_order_id: razorpayOrderId },
          relations: ["lines"],
        });

        if (order && order.status !== "paid") {
          order.status = "paid";
          order.razorpay_payment_id = razorpayPaymentId;
          await repo.save(order);

          // Decrement inventory stock idempotently in a transaction
          for (const line of order.lines || []) {
            await inventoryService.adjustStockWithTransaction(
              line.inventory_item_id,
              -line.quantity,
              "RAZORPAY_WEBHOOK_SYSTEM",
              order.organization_id,
              `Storefront Order Fulfillment (${order.order_number})`
            );
          }
        }
      }
    }

    return res.status(200).json({ status: "success", received: true });
  } catch (err: any) {
    console.error("Razorpay webhook error:", err);
    return res.status(400).json({ error: err.message || "Webhook processing error" });
  }
});

export default router;
