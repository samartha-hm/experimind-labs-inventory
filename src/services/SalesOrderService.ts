import { SalesOrder } from "../entity/SalesOrder";
import { SalesOrderLine } from "../entity/SalesOrderLine";
import { Customer } from "../entity/Customer";
import { InventoryItem } from "../entity/InventoryItem";
import { AppDataSource } from "../db";

export class SalesOrderService {
  private get soRepo() {
    return AppDataSource.getRepository(SalesOrder);
  }
  private get soLineRepo() {
    return AppDataSource.getRepository(SalesOrderLine);
  }

  async list(organizationId?: string): Promise<SalesOrder[]> {
    const where: any = {};
    if (organizationId) {
      where.organization_id = organizationId;
    }
    return this.soRepo.find({
      where,
      relations: ["customer", "lines", "lines.inventory_item"],
      order: { created_at: "DESC" }
    });
  }

  async create(
    dto: Partial<SalesOrder> & {
      customer_id?: string;
      customer?: { id: string };
      lines?: { inventory_item_id?: string; item_id?: string; qty_ordered: number; unit_price: number }[];
    },
    organizationId?: string
  ): Promise<SalesOrder> {
    const orgId = organizationId || (dto as any).organization_id || "00000000-0000-0000-0000-000000000000";
    const customerId = dto.customer_id || dto.customer?.id;
    if (!customerId) {
      throw new Error("customer_id is required to create a sales order");
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate Customer belongs to caller's organization
      const customer = await queryRunner.manager.findOne(Customer, {
        where: { id: customerId, organization_id: orgId },
      });
      if (!customer) {
        throw new Error(`Customer ${customerId} not found or belongs to another organization`);
      }

      // Generate SO number if not provided
      const soNumber = dto.so_number || `SO-${Date.now().toString().slice(-6)}`;

      let totalAmount = 0;
      const linesToCreate: { inventory_item: InventoryItem; inventory_item_id: string; qty_ordered: number; qty_picked: number; qty_shipped: number; unit_price: number }[] = [];

      if (dto.lines && Array.isArray(dto.lines)) {
        for (const lineDto of dto.lines) {
          const itemId = lineDto.inventory_item_id || lineDto.item_id;
          if (!itemId) {
            throw new Error("Each SO line must reference an inventory_item_id");
          }

          const item = await queryRunner.manager.findOne(InventoryItem, {
            where: { id: itemId, organization_id: orgId },
          });
          if (!item) {
            throw new Error(`Item ${itemId} not found or belongs to another organization`);
          }

          const qty = Number(lineDto.qty_ordered) || 1;
          const price = Number(lineDto.unit_price) ?? Number(item.base_price);
          totalAmount += qty * price;

          linesToCreate.push({
            inventory_item: item,
            inventory_item_id: item.id,
            qty_ordered: qty,
            qty_picked: 0,
            qty_shipped: 0,
            unit_price: price,
          });
        }
      }

      const so = queryRunner.manager.create(SalesOrder, {
        organization_id: orgId,
        so_number: soNumber,
        customer_id: customer.id,
        customer: customer,
        order_date: dto.order_date || new Date(),
        required_date: dto.required_date,
        status: dto.status || "draft",
        total_amount: Number(totalAmount.toFixed(2)),
      });

      const savedSo = await queryRunner.manager.save(so);

      for (const lineData of linesToCreate) {
        const lineEntity = queryRunner.manager.create(SalesOrderLine, {
          so_id: savedSo.id,
          sales_order: savedSo,
          inventory_item_id: lineData.inventory_item_id,
          inventory_item: lineData.inventory_item,
          qty_ordered: lineData.qty_ordered,
          qty_picked: 0,
          qty_shipped: 0,
          unit_price: lineData.unit_price,
        });
        await queryRunner.manager.save(lineEntity);
      }

      await queryRunner.commitTransaction();

      return (await this.findById(savedSo.id, orgId))!;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, changes: Partial<SalesOrder> & { customer_id?: string }, organizationId?: string): Promise<SalesOrder> {
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new Error(`Sales order ${id} not found or access denied.`);
    }
    Object.assign(existing, changes);
    if (changes.customer_id) {
      existing.customer_id = changes.customer_id;
    }
    return this.soRepo.save(existing);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new Error(`Sales order ${id} not found or access denied.`);
    }
    await this.soLineRepo.delete({ so_id: id });
    await this.soRepo.delete(id);
  }

  async findById(id: string, organizationId?: string): Promise<SalesOrder | null> {
    const where: any = { id };
    if (organizationId) {
      where.organization_id = organizationId;
    }
    return this.soRepo.findOne({
      where,
      relations: ["customer", "lines", "lines.inventory_item"],
    });
  }

  async shipItems(
    soId: string,
    shipments: { lineId: string; quantityShipped: number }[],
    organizationId?: string
  ): Promise<SalesOrder> {
    const so = await this.findById(soId, organizationId);
    if (!so) {
      throw new Error(`Sales order ${soId} not found or access denied.`);
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const shipment of shipments) {
        const line = await queryRunner.manager.findOne(SalesOrderLine, {
          where: { id: shipment.lineId, so_id: soId },
          relations: ["inventory_item"],
        });

        if (!line) {
          throw new Error(`Line ${shipment.lineId} does not belong to Sales Order ${soId}`);
        }

        line.qty_shipped += shipment.quantityShipped;
        await queryRunner.manager.save(line);

        // Decrement stock in inventory item (clamping safely to 0)
        if (line.inventory_item) {
          line.inventory_item.quantity = Math.max(0, line.inventory_item.quantity - shipment.quantityShipped);
          await queryRunner.manager.save(line.inventory_item);
        }
      }

      const allLines = await queryRunner.manager.find(SalesOrderLine, {
        where: { so_id: soId },
      });
      const allShipped = allLines.every((l) => l.qty_shipped >= l.qty_ordered);

      so.status = allShipped ? "shipped" : "packed";
      await queryRunner.manager.save(so);

      await queryRunner.commitTransaction();

      return (await this.findById(soId, organizationId))!;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}