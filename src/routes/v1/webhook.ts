import { Router, Request, Response } from "express";
import crypto from "crypto";
import { env } from "../../config/env.ts";
import { AppDataSource } from "../../db.ts";
import { CustomerOrder } from "../../entity/CustomerOrder.ts";
import { InventoryService } from "../../services/InventoryService.ts";

const router = Router();
const inventoryService = new InventoryService();

/**
 * Razorpay Webhook Endpoint
 * Verifies HMAC-SHA256 signature and idempotently decrements stock upon payment confirmation.
 */
router.post("/razorpay", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "default_webhook_secret_experimind";

    if (!signature) {
      return res.status(400).json({ error: "Missing Razorpay webhook signature header" });
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return res.status(400).json({ error: "Invalid Razorpay webhook signature" });
    }

    const event = req.body.event;
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = req.body.payload?.payment?.entity;
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
    return res.status(500).json({ error: err.message || "Webhook processing error" });
  }
});

export default router;
