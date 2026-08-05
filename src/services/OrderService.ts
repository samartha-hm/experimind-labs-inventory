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
    items: { itemId: string; quantity: number }[];
  }): Promise<{ order: CustomerOrder; razorpayOrderId: string }> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const orderLines: CustomerOrderLine[] = [];

      for (const reqItem of dto.items) {
        const item = await queryRunner.manager.findOne(InventoryItem, {
          where: [
            { id: reqItem.itemId, organization_id: dto.organizationId },
            { sku: reqItem.itemId, organization_id: dto.organizationId },
          ],
        });

        if (!item) {
          throw new Error(`Catalog item ${reqItem.itemId} not found`);
        }

        if (item.quantity < reqItem.quantity && !item.is_common) {
          throw new Error(`Insufficient stock for '${item.name}'. Available: ${item.quantity}`);
        }

        const lineTotal = multiplyMoney(item.base_price, reqItem.quantity);
        totalAmount += lineTotal;

        const line = queryRunner.manager.create(CustomerOrderLine, {
          inventory_item_id: item.id,
          item_name: item.name,
          quantity: reqItem.quantity,
          unit_price: item.base_price,
          line_total: lineTotal,
        });
        orderLines.push(line);
      }

      const orderNumber = `ORD-${Date.now()}`;
      const mockRazorpayOrderId = `order_${Math.random().toString(36).substring(2, 15)}`;

      const order = queryRunner.manager.create(CustomerOrder, {
        organization_id: dto.organizationId,
        order_number: orderNumber,
        customer_name: dto.customerName || "Storefront Guest",
        customer_email: dto.customerEmail,
        customer_phone: dto.customerPhone,
        total_amount: totalAmount,
        status: "created",
        razorpay_order_id: mockRazorpayOrderId,
        lines: orderLines,
      });

      const savedOrder = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();

      return { order: savedOrder, razorpayOrderId: mockRazorpayOrderId };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
