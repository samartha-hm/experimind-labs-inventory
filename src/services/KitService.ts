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

  async list(organizationId?: string): Promise<any[]> {
    const where: any = {};
    if (organizationId) {
      where.organization_id = organizationId;
    }
    const kits = await this.kitRepo.find({
      where,
      relations: ["boms", "boms.inventory_item"]
    });
    return kits.map(k => this.mapKit(k));
  }

  async create(dto: any, organizationId?: string): Promise<any> {
    const { bom_items, ...kitData } = dto;
    const orgId = organizationId || kitData.organization_id || "00000000-0000-0000-0000-000000000000";
    const entity = this.kitRepo.create({
      ...kitData,
      organization_id: orgId,
    } as any) as unknown as Kit;
    const saved = await this.kitRepo.save(entity) as unknown as Kit;
    if (bom_items && Array.isArray(bom_items)) {
      for (const item of bom_items) {
        await this.addToBom(saved.id, item.inventory_item_id, item.quantity);
      }
    }
    return this.findById(saved.id, orgId);
  }

  async update(id: string, changes: any, organizationId?: string): Promise<any> {
    const { bom_items, ...kitData } = changes;
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new Error(`Kit ${id} not found or access denied.`);
    }
    
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

    return this.findById(id, organizationId);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new Error(`Kit ${id} not found or access denied.`);
    }
    await this.kitRepo.delete(id);
  }

  async findById(id: string, organizationId?: string): Promise<any | null> {
    const where: any = { id };
    if (organizationId) {
      where.organization_id = organizationId;
    }
    const kit = await this.kitRepo.findOne({
      where,
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
    const kit = await this.kitRepo.findOneBy({ id: kitId });
    if (!kit) {
      throw new Error("Kit not found");
    }

    const inventoryItem = await this.inventoryRepo.findOneBy({ id: inventoryItemId });
    if (!inventoryItem) {
      throw new Error("Inventory item not found");
    }

    const existing = await this.bomRepo.findOneBy({
      kit: { id: kitId },
      inventory_item: { id: inventoryItemId }
    });

    if (existing) {
      existing.qty_per_kit = qtyPerKit;
      return this.bomRepo.save(existing);
    }

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