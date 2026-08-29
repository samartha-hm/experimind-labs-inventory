import { PurchaseOrder } from "../entity/PurchaseOrder";
import { PurchaseOrderLine } from "../entity/PurchaseOrderLine";
import { Vendor } from "../entity/Vendor";
import { InventoryItem } from "../entity/InventoryItem";
import { StockLedger } from "../entity/StockLedger";
import { AppDataSource } from "../db";

export class PurchaseOrderService {
  private get poRepo() {
    return AppDataSource.getRepository(PurchaseOrder);
  }
  private get poLineRepo() {
    return AppDataSource.getRepository(PurchaseOrderLine);
  }

  async list(organizationId?: string): Promise<PurchaseOrder[]> {
    const where: any = {};
    if (organizationId) {
      where.organization_id = organizationId;
    }
    return this.poRepo.find({
      where,
      relations: ["vendor", "lines", "lines.inventory_item"],
      order: { created_at: "DESC" }
    });
  }

  async create(
    dto: Partial<PurchaseOrder> & {
      vendor_id?: string;
      vendor_name?: string;
      vendor?: { id: string; name?: string };
      lines?: { inventory_item_id?: string; item_id?: string; qty_ordered: number; unit_cost: number }[];
    },
    organizationId?: string
  ): Promise<PurchaseOrder> {
    const orgId = organizationId || (dto as any).organization_id || "00000000-0000-0000-0000-000000000000";
    let vendorId = dto.vendor_id || dto.vendor?.id;

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate or resolve Vendor
      let vendor: Vendor | null = null;
      if (vendorId) {
        vendor = await queryRunner.manager.findOne(Vendor, {
          where: { id: vendorId, organization_id: orgId },
        });
      }

      if (!vendor) {
        const vendorName = dto.vendor_name || (dto as any).vendorName || 'ExperiMind Vendor';
        vendor = await queryRunner.manager.findOne(Vendor, {
          where: { name: vendorName, organization_id: orgId },
        });
        if (!vendor) {
          vendor = queryRunner.manager.create(Vendor, {
            organization_id: orgId,
            name: vendorName,
            vendor_code: `VEND-${Date.now().toString().slice(-4)}`,
            email: "vendor@supplier.com",
            phone: "+91 9876543210"
          });
          vendor = await queryRunner.manager.save(vendor);
        }
        vendorId = vendor.id;
      }

      // Generate PO number if not provided
      const poNumber = dto.po_number || `PO-${Date.now().toString().slice(-6)}`;

      let totalAmount = Number(dto.total_amount) || 0;
      const linesToCreate: { inventory_item: InventoryItem; inventory_item_id: string; qty_ordered: number; qty_received: number; unit_cost: number }[] = [];

      if (dto.lines && Array.isArray(dto.lines)) {
        for (const lineDto of dto.lines) {
          const itemId = lineDto.inventory_item_id || lineDto.item_id;
          if (!itemId) {
            throw new Error("Each PO line must reference an inventory_item_id");
          }

          const item = await queryRunner.manager.findOne(InventoryItem, {
            where: { id: itemId, organization_id: orgId },
          });
          if (!item) {
            throw new Error(`Item ${itemId} not found or belongs to another organization`);
          }

          const qty = Number(lineDto.qty_ordered) || 1;
          const cost = Number(lineDto.unit_cost) ?? Number(item.base_price);
          totalAmount += qty * cost;

          linesToCreate.push({
            inventory_item: item,
            inventory_item_id: item.id,
            qty_ordered: qty,
            qty_received: 0,
            unit_cost: cost,
          });
        }
      }

      const po = queryRunner.manager.create(PurchaseOrder, {
        organization_id: orgId,
        po_number: poNumber,
        vendor_id: vendor.id,
        vendor: vendor,
        order_date: dto.order_date || new Date(),
        expected_date: dto.expected_date,
        status: dto.status || "draft",
        total_amount: Number(totalAmount.toFixed(2)),
      });

      const savedPo = await queryRunner.manager.save(po);

      for (const lineData of linesToCreate) {
        const lineEntity = queryRunner.manager.create(PurchaseOrderLine, {
          po_id: savedPo.id,
          purchase_order: savedPo,
          inventory_item_id: lineData.inventory_item_id,
          inventory_item: lineData.inventory_item,
          qty_ordered: lineData.qty_ordered,
          qty_received: 0,
          unit_cost: lineData.unit_cost,
        });
        await queryRunner.manager.save(lineEntity);
      }

      await queryRunner.commitTransaction();

      return (await this.findById(savedPo.id, orgId))!;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, changes: Partial<PurchaseOrder> & { vendor_id?: string }, organizationId?: string): Promise<PurchaseOrder> {
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new Error(`Purchase order ${id} not found or access denied.`);
    }
    Object.assign(existing, changes);
    if (changes.vendor_id) {
      existing.vendor_id = changes.vendor_id;
    }
    return this.poRepo.save(existing);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new Error(`Purchase order ${id} not found or access denied.`);
    }
    await this.poLineRepo.delete({ po_id: id });
    await this.poRepo.delete(id);
  }

  async findById(id: string, organizationId?: string): Promise<PurchaseOrder | null> {
    const where: any = { id };
    if (organizationId) {
      where.organization_id = organizationId;
    }
    return this.poRepo.findOne({
      where,
      relations: ["vendor", "lines", "lines.inventory_item"],
    });
  }

  async receiveItems(
    poId: string,
    receptions: { lineId: string; quantityReceived: number }[],
    organizationId?: string,
    actorName?: string
  ): Promise<PurchaseOrder> {
    const po = await this.findById(poId, organizationId);
    if (!po) {
      throw new Error(`Purchase order ${poId} not found or access denied.`);
    }

    const orgId = organizationId || po.organization_id || "00000000-0000-0000-0000-000000000000";

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const reception of receptions) {
        const line = await queryRunner.manager.findOne(PurchaseOrderLine, {
          where: { id: reception.lineId, po_id: poId },
          relations: ["inventory_item"],
        });

        if (!line) {
          throw new Error(`Line ${reception.lineId} does not belong to PO ${poId}`);
        }

        const qtyDelta = Number(reception.quantityReceived);
        if (qtyDelta <= 0) continue;

        line.qty_received += qtyDelta;
        await queryRunner.manager.save(line);

        // Pessimistic lock and update inventory item with atomic ledger entry
        if (line.inventory_item_id) {
          const item = await queryRunner.manager.findOne(InventoryItem, {
            where: { id: line.inventory_item_id },
            lock: { mode: "pessimistic_write" },
          });

          if (item) {
            const currentQty = Number(item.quantity || 0);
            const newQty = currentQty + qtyDelta;
            item.quantity = newQty;
            item.updated_at = new Date();
            await queryRunner.manager.save(InventoryItem, item);

            // Post to immutable stock ledger in same atomic transaction
            const ledgerEntry = queryRunner.manager.create(StockLedger, {
              organization_id: orgId,
              item_id: item.id,
              item_name: item.name,
              item_sku: item.sku,
              bin_location: item.bin_location,
              qty_delta: qtyDelta,
              unit_cost: Number(line.unit_cost || item.base_price || 0),
              running_balance: newQty,
              transaction_type: "PO_RECEIPT",
              reference_type: "purchase_order",
              reference_id: po.po_number || po.id,
              reason_code: `Inward PO Goods Receipt`,
              notes: `Received from PO ${po.po_number || po.id}`,
              actor_name: actorName || "Warehouse Receiver",
            });
            await queryRunner.manager.save(StockLedger, ledgerEntry);
          }
        }
      }

      const allLines = await queryRunner.manager.find(PurchaseOrderLine, {
        where: { po_id: poId },
      });
      const allReceived = allLines.every((l) => l.qty_received >= l.qty_ordered);

      po.status = allReceived ? "received" : "approved";
      await queryRunner.manager.save(po);

      await queryRunner.commitTransaction();

      return (await this.findById(poId, organizationId))!;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}