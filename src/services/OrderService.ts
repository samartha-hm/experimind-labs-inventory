import { SalesOrder } from "../entity/SalesOrder.ts";
import { SalesOrderLine } from "../entity/SalesOrderLine.ts";
import { Customer } from "../entity/Customer.ts";
import { availableToPromise, publicItem } from "./storefrontStock.ts";
import { randomUUID } from "node:crypto";
import { CustomerOrder } from "../entity/CustomerOrder.ts";
import { CustomerOrderLine } from "../entity/CustomerOrderLine.ts";
import { InventoryItem } from "../entity/InventoryItem.ts";
import { AppDataSource } from "../db.ts";
import { multiplyMoney } from "../utils/money.ts";

export class OrderService {
  private get orderRepo() {
    return AppDataSource.getRepository(CustomerOrder);
  }

  private get itemRepo() {
    return AppDataSource.getRepository(InventoryItem);
  }

  /**
   * Server-authoritative order creation calculating price totals strictly from master DB records.
   */
  async createStorefrontOrder(dto: {
    organizationId: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    carrier?: string;
    trackingNumber?: string;
    shippingFee?: number;
    paymentMethod?: string;
    gstin?: string;
    notes?: string;
    items: { itemId: string; quantity: number }[];
  }): Promise<{ order: CustomerOrder; razorpayOrderId: string }> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let subtotal = 0;
      const orderLines: CustomerOrderLine[] = [];

      if (!dto.items.length) throw new Error("Cart is empty");
      for (const reqItem of [...dto.items].sort((a,b) => a.itemId.localeCompare(b.itemId))) {
        if (!Number.isSafeInteger(reqItem.quantity) || reqItem.quantity < 1) throw new Error("Invalid order quantity");
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reqItem.itemId);
        const item = await queryRunner.manager.findOne(InventoryItem, {
          lock: { mode: "pessimistic_write" },
          where: isUuid
            ? { id: reqItem.itemId, organization_id: dto.organizationId }
            : { sku: reqItem.itemId, organization_id: dto.organizationId },
        });

        if (!item) {
          throw new Error(`Catalog item ${reqItem.itemId} not found`);
        }

        const [stock] = await queryRunner.manager.query(
          `SELECT ${availableToPromise} AS atp FROM inventory_items WHERE ${publicItem} AND id = $2`,
          [dto.organizationId, item.id]);
        if (!stock || Number(stock.atp) < reqItem.quantity) throw new Error("Insufficient available catalog stock for " + item.sku);
        await queryRunner.manager.increment(InventoryItem, { id: item.id }, "reserved_quantity", reqItem.quantity);

        const lineTotal = multiplyMoney(item.base_price, reqItem.quantity);
        subtotal += lineTotal;

        const line = queryRunner.manager.create(CustomerOrderLine, {
          inventory_item_id: item.id,
          item_name: item.name,
          quantity: reqItem.quantity,
          unit_price: item.base_price,
          line_total: lineTotal,
        });
        orderLines.push(line);
      }

      const shippingFee = Number(dto.shippingFee || (subtotal >= 999 ? 0 : 99));
      const totalAmount = subtotal + shippingFee;

      const orderNumber = "WEB-" + randomUUID();
      const invoiceNumber = "INV-" + orderNumber;
      const mockRazorpayOrderId = `order_${Math.random().toString(36).substring(2, 15)}`;

      const order = queryRunner.manager.create(CustomerOrder, {
        organization_id: dto.organizationId,
        order_number: orderNumber,
        customer_name: dto.customerName || "Storefront Customer",
        customer_email: dto.customerEmail,
        customer_phone: dto.customerPhone,
        customer_address: dto.customerAddress,
        carrier: dto.carrier || "Delhivery Express",
        tracking_number: dto.trackingNumber || `AWB-EXP${Math.floor(10000000 + Math.random() * 90000000)}`,
        shipping_fee: shippingFee,
        payment_method: dto.paymentMethod || "cod",
        gstin: dto.gstin,
        notes: dto.notes,
        invoice_number: invoiceNumber,
        total_amount: totalAmount,
        status: dto.paymentMethod === "online" ? "paid" : "created",
        razorpay_order_id: mockRazorpayOrderId,
        lines: orderLines,
      });

      const savedOrder = await queryRunner.manager.save(order);
      const manager = queryRunner.manager;
      const customer = await manager.save(Customer, manager.create(Customer, {
        organization_id: dto.organizationId, customer_code: orderNumber, name: savedOrder.customer_name,
        email: dto.customerEmail, phone: dto.customerPhone,
      }));
      const salesOrder = await manager.save(SalesOrder, manager.create(SalesOrder, {
        organization_id: dto.organizationId, so_number: orderNumber, customer_id: customer.id,
        order_date: new Date(), status: "confirmed", total_amount: totalAmount,
      }));
      await manager.save(SalesOrderLine, orderLines.map(line => manager.create(SalesOrderLine, {
        so_id: salesOrder.id, inventory_item_id: line.inventory_item_id, qty_ordered: line.quantity,
        qty_picked: 0, qty_shipped: 0, unit_price: line.unit_price,
      })));
      await queryRunner.commitTransaction();

      return { order: savedOrder, razorpayOrderId: mockRazorpayOrderId };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Search / Track order for customer portal without full login
   */
  async trackCustomerOrder(organizationId: string, query: { orderNumberOrId: string; contact: string }): Promise<CustomerOrder | null> {
    const { orderNumberOrId, contact } = query;
    const cleanContact = contact.trim().toLowerCase();
    const cleanId = orderNumberOrId.trim();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    const qb = this.orderRepo
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.lines", "lines")
      .where(isUuid ? "order.id = :id" : "LOWER(order.order_number) = :orderNum", {
        id: cleanId,
        orderNum: cleanId.toLowerCase(),
      })
      .andWhere("order.organization_id = :organizationId", {organizationId});

    if (cleanContact) {
      qb.andWhere(
        "(LOWER(order.customer_email) = :contact OR order.customer_phone ILIKE :phoneContact)",
        {
          contact: cleanContact,
          phoneContact: `%${cleanContact.replace(/[\s-+]/g, "")}%`,
        }
      );
    }

    return qb.getOne();
  }

  /**
   * Get all orders for a customer email
   */
  async getCustomerOrdersByEmail(organizationId: string, email: string): Promise<CustomerOrder[]> {
    if (!email) return [];
    return this.orderRepo.find({
      where: { organization_id: organizationId, customer_email: email.trim().toLowerCase() },
      relations: ["lines"],
      order: { created_at: "DESC" },
    });
  }
}
