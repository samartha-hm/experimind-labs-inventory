import { Router, Request, Response } from "express";
import crypto from "crypto";
import { AppDataSource } from "../../db.ts";
import { CustomerOrder } from "../../entity/CustomerOrder.ts";
import { CustomerOrderLine } from "../../entity/CustomerOrderLine.ts";
import { InventoryItem } from "../../entity/InventoryItem.ts";
import { Invoice } from "../../entity/Invoice.ts";
import { InvoiceLine } from "../../entity/InvoiceLine.ts";
import { InvoiceSequence } from "../../entity/InvoiceSequence.ts";

const router = Router();

/**
 * Razorpay Webhook Endpoint
 * Performs HMAC verification over raw Buffer and executes atomic DB transaction for payment capture, stock decrement, and GST-compliant invoice line generation.
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
          const order = await queryRunner.manager.findOne(CustomerOrder, {
            where: { razorpay_order_id: razorpayOrderId },
            lock: { mode: "pessimistic_write" },
          });

          if (order && order.status !== "paid") {
            order.status = "paid";
            order.razorpay_payment_id = razorpayPaymentId;
            await queryRunner.manager.save(order);

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

            // Indian Financial Year Calculation (April 1 - March 31)
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth(); // 0-indexed (0 = Jan, 3 = Apr)
            const startYear = month < 3 ? year - 1 : year;
            const endYear = startYear + 1;
            const financialYear = `${startYear}-${endYear}`;
            
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

            const invoiceNumber = `EXP-${startYear}-${String(seq.last_number).padStart(5, "0")}`;

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
            const savedInvoice = await queryRunner.manager.save(invoice);

            // Persist individual InvoiceLine items
            for (const line of orderLines) {
              const invLine = queryRunner.manager.create(InvoiceLine, {
                invoice: savedInvoice,
                item_name: line.item_name,
                quantity: line.quantity,
                unit_price: line.unit_price,
                taxable_value: line.line_total,
                gst_rate_pct: 18.0,
                cgst_amount: Math.round(line.line_total * 0.09),
                sgst_amount: Math.round(line.line_total * 0.09),
                igst_amount: 0,
                line_total: Math.round(line.line_total * 1.18),
              });
              await queryRunner.manager.save(invLine);
            }
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
