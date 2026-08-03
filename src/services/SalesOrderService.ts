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
  private get customerRepo() {
    return AppDataSource.getRepository(Customer);
  }
  private get inventoryRepo() {
    return AppDataSource.getRepository(InventoryItem);
  }

  async list(): Promise<SalesOrder[]> {
    return this.soRepo.find({ relations: ["customer", "lines", "lines.inventory_item"] });
  }

  async create(dto: Partial<SalesOrder> & { lines?: Partial<SalesOrderLine>[] }): Promise<SalesOrder> {
    const so = this.soRepo.create(dto);
    const savedSo = await this.soRepo.save(so);

    // Handle line items if provided
    if (dto.lines && dto.lines.length > 0) {
      const linePromises = dto.lines.map(async (line) => {
        const soLine = this.soLineRepo.create({
          ...line,
          sales_order: savedSo
        });
        return this.soLineRepo.save(soLine);
      });
      await Promise.all(linePromises);

      // Reload the SO with lines
      const updatedSo = await this.soRepo.findOne({
        where: { id: savedSo.id },
        relations: ["customer", "lines", "lines.inventory_item"]
      });
      return updatedSo!;
    }

    // Reload the SO with relations
    const populatedSo = await this.soRepo.findOne({
      where: { id: savedSo.id },
      relations: ["customer", "lines", "lines.inventory_item"]
    });
    return populatedSo!;
  }

  async update(id: string, changes: Partial<SalesOrder>): Promise<SalesOrder> {
    await this.soRepo.update(id, changes);
    const updated = await this.soRepo.findOneByOrFail({ id });
    return updated;
  }

  async delete(id: string): Promise<void> {
    // Delete lines first due to foreign key constraint
    await this.soLineRepo.delete({ sales_order: { id } });
    await this.soRepo.delete(id);
  }

  async findById(id: string): Promise<SalesOrder | null> {
    return this.soRepo.findOne({
      where: { id },
      relations: ["customer", "lines", "lines.inventory_item"]
    });
  }

  async shipItems(soId: string, shipments: { lineId: string; quantityShipped: number }[]): Promise<SalesOrder> {
    const so = await this.soRepo.findOneByOrFail({ id: soId });

    // Update each line item's shipped quantity
    for (const shipment of shipments) {
      await this.soLineRepo.update(
        { id: shipment.lineId },
        { qty_shipped: () => `qty_shipped + ${shipment.quantityShipped}` }
      );
    }

    // Check if all items are shipped
    const lines = await this.soLineRepo.find({ where: { sales_order: { id: soId } } });
    const allShipped = lines.every(line => line.qty_shipped >= line.qty_ordered);

    if (allShipped) {
      await this.soRepo.update(soId, { status: "shipped" });
    } else {
      await this.soRepo.update(soId, { status: "packed" }); // or keep as picked if partial
    }

    return this.soRepo.findOneByOrFail({ id: soId });
  }
}