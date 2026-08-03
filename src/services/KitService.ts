import { Kit } from "../entity/Kit";
import { KitBom } from "../entity/KitBom";
import { InventoryItem } from "../entity/InventoryItem";
import { AppDataSource } from "../db";

export class KitService {
  private get kitRepo() {
    return AppDataSource.getRepository(Kit);
  }
  private get bomRepo() {
    return AppDataSource.getRepository(KitBom);
  }
  private get inventoryRepo() {
    return AppDataSource.getRepository(InventoryItem);
  }

  async list(): Promise<any[]> {
    const kits = await this.kitRepo.find({
      relations: ["boms", "boms.inventory_item"]
    });
    return kits.map(k => this.mapKit(k));
  }

  async create(dto: any): Promise<any> {
    const { bom_items, ...kitData } = dto;
    const entity = this.kitRepo.create(kitData as any) as unknown as Kit;
    const saved = await this.kitRepo.save(entity) as unknown as Kit;
    if (bom_items && Array.isArray(bom_items)) {
      for (const item of bom_items) {
        await this.addToBom(saved.id, item.inventory_item_id, item.quantity);
      }
    }
    return this.findById(saved.id);
  }

  async update(id: string, changes: any): Promise<any> {
    const { bom_items, ...kitData } = changes;
    
    // Only update kitData if there are actual fields to update
    if (Object.keys(kitData).length > 0) {
      await this.kitRepo.update(id, kitData);
    }
    
    if (bom_items && Array.isArray(bom_items)) {
      const existingBoms = await this.getBom(id);
      for (const bom of existingBoms) {
        await this.removeFromBom(bom.id);
      }
      for (const item of bom_items) {
        await this.addToBom(id, item.inventory_item_id, item.quantity);
      }
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.kitRepo.delete(id);
  }

  async findById(id: string): Promise<any | null> {
    const kit = await this.kitRepo.findOne({
      where: { id },
      relations: ["boms", "boms.inventory_item"]
    });
    return kit ? this.mapKit(kit) : null;
  }

  private mapKit(kit: Kit): any {
    return {
      ...kit,
      bom_items: (kit.boms || []).map(b => ({
        id: b.id,
        inventory_item_id: b.inventory_item?.id,
        quantity: b.qty_per_kit
      }))
    };
  }

  async getBom(kitId: string): Promise<KitBom[]> {
    return this.bomRepo.find({
      where: { kit: { id: kitId } },
      relations: ["inventory_item"]
    });
  }

  async addToBom(kitId: string, inventoryItemId: string, qtyPerKit: number): Promise<KitBom> {
    // Verify kit exists
    const kit = await this.kitRepo.findOneBy({ id: kitId });
    if (!kit) {
      throw new Error("Kit not found");
    }

    // Verify inventory item exists
    const inventoryItem = await this.inventoryRepo.findOneBy({ id: inventoryItemId });
    if (!inventoryItem) {
      throw new Error("Inventory item not found");
    }

    // Check if this BOM item already exists
    const existing = await this.bomRepo.findOneBy({
      kit: { id: kitId },
      inventory_item: { id: inventoryItemId }
    });

    if (existing) {
      // Update quantity if exists
      existing.qty_per_kit = qtyPerKit;
      return this.bomRepo.save(existing);
    }

    // Create new BOM item
    const bomItem = this.bomRepo.create({
      kit,
      inventory_item: inventoryItem,
      qty_per_kit: qtyPerKit
    });

    return this.bomRepo.save(bomItem);
  }

  async removeFromBom(bomId: string): Promise<void> {
    await this.bomRepo.delete(bomId);
  }
}