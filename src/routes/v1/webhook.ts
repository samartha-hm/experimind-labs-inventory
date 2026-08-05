import { Router, Request, Response } from "express";
import crypto from "crypto";
import { AppDataSource } from "../../db.ts";
import { CustomerOrder } from "../../entity/CustomerOrder.ts";
import { CustomerOrderLine } from "../../entity/CustomerOrderLine.ts";
import { InventoryItem } from "../../entity/InventoryItem.ts";
import { Invoice } from "../../entity/Invoice.ts";
import { InvoiceSequence } from "../../entity/InvoiceSequence.ts";

const router = Router();

/**
 * Razorpay Webhook Endpoint
 * Performs HMAC verification over raw Buffer and executes atomic DB transaction for payment capture, stock decrement, and invoice generation.
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

    const rawBodyBuffer = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBodyBuffer)
      .digest("hex");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return res.status(401).json({ error: "Invalid Razorpay webhook signature." });
    }

    const body = JSON.parse(rawBodyBuffer.toString("utf-8"));
    const event = body.event;

    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = body.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // Lock CustomerOrder row alone to avoid PostgreSQL FOR UPDATE outer join error
          const order = await queryRunner.manager.findOne(CustomerOrder, {
            where: { razorpay_order_id: razorpayOrderId },
            lock: { mode: "pessimistic_write" },
          });

          if (order && order.status !== "paid") {
            order.status = "paid";
            order.razorpay_payment_id = razorpayPaymentId;
            await queryRunner.manager.save(order);

            // Fetch order lines in secondary query inside transaction
            const orderLines = await queryRunner.manager.find(CustomerOrderLine, {
              where: { order: { id: order.id } },
            });

            for (const line of orderLines) {
              const item = await queryRunner.manager.findOne(InventoryItem, {
                where: { id: line.inventory_item_id },
                lock: { mode: "pessimistic_write" },
              });
              if (item) {
                item.quantity = Math.max(0, item.quantity - line.quantity);
                await queryRunner.manager.save(item);
              }
            }

            const currentYear = new Date().getFullYear();
            const financialYear = `${currentYear}-${currentYear + 1}`;
            
            let seq = await queryRunner.manager.findOne(InvoiceSequence, {
              where: { organization_id: order.organization_id, financial_year: financialYear },
              lock: { mode: "pessimistic_write" },
            });

            if (!seq) {
              seq = queryRunner.manager.create(InvoiceSequence, {
                organization_id: order.organization_id,
                financial_year: financialYear,
                last_number: 0,
              });
            }

            seq.last_number += 1;
            await queryRunner.manager.save(seq);

            const invoiceNumber = `EXP-${currentYear}-${String(seq.last_number).padStart(5, "0")}`;

            const invoice = queryRunner.manager.create(Invoice, {
              organization_id: order.organization_id,
              invoice_number: invoiceNumber,
              invoice_date: new Date(),
              customer_name: order.customer_name,
              place_of_supply: "29",
              total_taxable: order.total_amount,
              cgst_total: Math.round(order.total_amount * 0.09),
              sgst_total: Math.round(order.total_amount * 0.09),
              igst_total: 0,
              grand_total: Math.round(order.total_amount * 1.18),
              status: "issued",
            });
            await queryRunner.manager.save(invoice);
          }

          await queryRunner.commitTransaction();
        } catch (txnErr) {
          await queryRunner.rollbackTransaction();
          throw txnErr;
        } finally {
          await queryRunner.release();
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
