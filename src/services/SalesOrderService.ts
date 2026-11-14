import { CustomerOrder } from "../entity/CustomerOrder.ts";
import { StockLot } from "../entity/StockLot.ts";
import { SalesOrder } from "../entity/SalesOrder";
import { SalesOrderLine } from "../entity/SalesOrderLine";
import { Customer } from "../entity/Customer";
import { InventoryItem } from "../entity/InventoryItem";
import { StockLedger } from "../entity/StockLedger";
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
      customer_name?: string;
      customer?: { id: string; name?: string };
      lines?: { inventory_item_id?: string; item_id?: string; qty_ordered: number; unit_price: number }[];
    },
    organizationId?: string
  ): Promise<SalesOrder> {
    const orgId = organizationId || (dto as any).organization_id || "00000000-0000-0000-0000-000000000000";
    let customerId = dto.customer_id || dto.customer?.id;

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let customer: Customer | null = null;
      if (customerId) {
        customer = await queryRunner.manager.findOne(Customer, {
          where: { id: customerId, organization_id: orgId },
        });
      }

      if (!customer) {
        const customerName = dto.customer_name || (dto as any).customerName || 'Direct Customer';
        customer = await queryRunner.manager.findOne(Customer, {
          where: { name: customerName, organization_id: orgId },
        });
        if (!customer) {
          customer = queryRunner.manager.create(Customer, {
            organization_id: orgId,
            name: customerName,
            customer_code: `CUST-${Date.now().toString().slice(-4)}`,
            email: "customer@experimindlabs.com",
            phone: "+91 9876543210"
          });
          customer = await queryRunner.manager.save(customer);
        }
        customerId = customer.id;
      }

      const soNumber = dto.so_number || `SO-${Date.now().toString().slice(-6)}`;

      let totalAmount = Number(dto.total_amount) || 0;
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
    if (existing.so_number.startsWith("WEB-")) throw new Error("Use the storefront fulfillment queue");
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
    if (existing.so_number.startsWith("WEB-")) throw new Error("Storefront orders retain their reservation history");
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
    organizationId?: string,
    actorName?: string
  ): Promise<SalesOrder> {
    const so = await this.findById(soId, organizationId);
    if (!so) {
      throw new Error(`Sales order ${soId} not found or access denied.`);
    }

    const orgId = organizationId || so.organization_id || "00000000-0000-0000-0000-000000000000";

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const locked = await queryRunner.manager.findOne(SalesOrder, {
        where: { id: soId, organization_id: orgId }, lock: { mode: "pessimistic_write" },
      });
      if (!locked) throw new Error("Sales order no longer available");
      const webOrder = locked.so_number.startsWith("WEB-");
      if (webOrder && locked.status !== "packed") throw new Error("Pack the order before shipment");
      if (!shipments.length) throw new Error("No shipment lines");
      for (const shipment of shipments) {
        const line = await queryRunner.manager.findOne(SalesOrderLine, {
          where: { id: shipment.lineId, so_id: soId },
          relations: ["inventory_item"],
        });

        if (!line) {
          throw new Error(`Line ${shipment.lineId} does not belong to Sales Order ${soId}`);
        }

        const qtyToShip = Number(shipment.quantityShipped);
        if (!Number.isSafeInteger(qtyToShip) || qtyToShip <= 0 || qtyToShip > line.qty_ordered - line.qty_shipped)
          throw new Error("Invalid outstanding shipment quantity");

        // Check and acquire pessimistic lock on target inventory item
        if (line.inventory_item_id) {
          const item = await queryRunner.manager.findOne(InventoryItem, {
            where: { id: line.inventory_item_id, organization_id: orgId },
            lock: { mode: "pessimistic_write" },
          });

          if (!item) {
            throw new Error(`Inventory item not found for line ${line.id}`);
          }

          const currentStock = Number(item.quantity || 0);
          if (currentStock < qtyToShip) {
            throw new Error(
              `Insufficient inventory for SKU ${item.sku} (${item.name}): Available on hand is ${currentStock}, but attempted to ship ${qtyToShip}.`
            );
          }

          let cost = Number(line.unit_price || item.base_price || 0);
          if (webOrder) {
            if (Number(item.reserved_quantity) < qtyToShip) throw new Error("Reservation mismatch");
            const lots = await queryRunner.manager.createQueryBuilder(StockLot, "lot")
              .where("lot.item_id = :id AND lot.organization_id = :org AND lot.status = 'RELEASED' AND lot.current_quantity > 0", { id: item.id, org: orgId })
              .orderBy("lot.received_date", "ASC").addOrderBy("lot.id", "ASC").setLock("pessimistic_write").getMany();
            let remaining = qtyToShip;
            let extended = 0;
            for (const lot of lots) {
              const take = Math.min(remaining, Number(lot.current_quantity));
              lot.current_quantity -= take;
              if (lot.current_quantity === 0) lot.status = "DEPLETED";
              extended += take * Number(lot.unit_cost);
              await queryRunner.manager.save(lot);
              remaining -= take;
              if (!remaining) break;
            }
            if (remaining) throw new Error("Insufficient released FIFO layers");
            cost = extended / qtyToShip;
            item.reserved_quantity -= qtyToShip;
          } else if (currentStock - Number(item.reserved_quantity || 0) < qtyToShip) {
            throw new Error("Stock is reserved");
          }
          const newStock = currentStock - qtyToShip;
          item.quantity = newStock;
          item.updated_at = new Date();
          await queryRunner.manager.save(InventoryItem, item);

          // Write append-only immutable ledger record
          const ledgerEntry = queryRunner.manager.create(StockLedger, {
            organization_id: orgId,
            item_id: item.id,
            item_name: item.name,
            item_sku: item.sku,
            bin_location: item.bin_location,
            qty_delta: -qtyToShip,
            unit_cost: cost,
            running_balance: newStock,
            transaction_type: "SO_SHIPMENT",
            reference_type: "sales_order",
            reference_id: so.so_number || so.id,
            reason_code: `Customer Order Shipment`,
            notes: `Dispatched for SO ${so.so_number || so.id}`,
            actor_name: actorName || "Fulfillment Dispatcher",
          });
          await queryRunner.manager.save(StockLedger, ledgerEntry);
        }

        line.qty_shipped += qtyToShip;
        await queryRunner.manager.save(line);
      }

      const allLines = await queryRunner.manager.find(SalesOrderLine, {
        where: { so_id: soId },
      });
      const allShipped = allLines.every((l) => l.qty_shipped >= l.qty_ordered);

      so.status = allShipped ? "shipped" : "packed";
      await queryRunner.manager.save(so);
      if (webOrder) await queryRunner.manager.update(CustomerOrder, { organization_id: orgId, order_number: locked.so_number }, { status: allShipped ? "shipped" : "packed" });

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