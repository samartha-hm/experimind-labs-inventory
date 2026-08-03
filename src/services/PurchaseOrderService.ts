import { PurchaseOrder } from "../entity/PurchaseOrder";
import { PurchaseOrderLine } from "../entity/PurchaseOrderLine";
import { Vendor } from "../entity/Vendor";
import { InventoryItem } from "../entity/InventoryItem";
import { AppDataSource } from "../db";

export class PurchaseOrderService {
  private get poRepo() {
    return AppDataSource.getRepository(PurchaseOrder);
  }
  private get poLineRepo() {
    return AppDataSource.getRepository(PurchaseOrderLine);
  }
  private get vendorRepo() {
    return AppDataSource.getRepository(Vendor);
  }
  private get inventoryRepo() {
    return AppDataSource.getRepository(InventoryItem);
  }

  async list(): Promise<PurchaseOrder[]> {
    return this.poRepo.find({ relations: ["vendor", "lines", "lines.inventory_item"] });
  }

  async create(dto: Partial<PurchaseOrder> & { lines?: Partial<PurchaseOrderLine>[] }): Promise<PurchaseOrder> {
    const po = this.poRepo.create(dto);
    const savedPo = await this.poRepo.save(po);

    // Handle line items if provided
    if (dto.lines && dto.lines.length > 0) {
      const linePromises = dto.lines.map(async (line) => {
        const poLine = this.poLineRepo.create({
          ...line,
          purchase_order: savedPo
        });
        return this.poLineRepo.save(poLine);
      });
      await Promise.all(linePromises);

      // Reload the PO with lines
      const updatedPo = await this.poRepo.findOne({
        where: { id: savedPo.id },
        relations: ["vendor", "lines", "lines.inventory_item"]
      });
      return updatedPo!;
    }

    // Reload the PO with relations
    const populatedPo = await this.poRepo.findOne({
      where: { id: savedPo.id },
      relations: ["vendor", "lines", "lines.inventory_item"]
    });
    return populatedPo!;
  }

  async update(id: string, changes: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    await this.poRepo.update(id, changes);
    const updated = await this.poRepo.findOneByOrFail({ id });
    return updated;
  }

  async delete(id: string): Promise<void> {
    // Delete lines first due to foreign key constraint
    await this.poLineRepo.delete({ purchase_order: { id } });
    await this.poRepo.delete(id);
  }

  async findById(id: string): Promise<PurchaseOrder | null> {
    return this.poRepo.findOne({
      where: { id },
      relations: ["vendor", "lines", "lines.inventory_item"]
    });
  }

  async receiveItems(poId: string, receptions: { lineId: string; quantityReceived: number }[]): Promise<PurchaseOrder> {
    const po = await this.poRepo.findOneByOrFail({ id: poId });

    // Update each line item's received quantity
    for (const reception of receptions) {
      await this.poLineRepo.update(
        { id: reception.lineId },
        { qty_received: () => `qty_received + ${reception.quantityReceived}` }
      );
    }

    // Check if all items are received
    const lines = await this.poLineRepo.find({ where: { purchase_order: { id: poId } } });
    const allReceived = lines.every(line => line.qty_received >= line.qty_ordered);

    if (allReceived) {
      await this.poRepo.update(poId, { status: "received" });
    } else {
      await this.poRepo.update(poId, { status: "approved" }); // or keep as approved if partial
    }

    return this.poRepo.findOneByOrFail({ id: poId });
  }
}