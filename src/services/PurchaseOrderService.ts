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

  async list(organizationId?: string): Promise<PurchaseOrder[]> {
    const where: any = {};
    if (organizationId) {
      where.organization_id = organizationId;
    }
    return this.poRepo.find({
      where,
      relations: ["vendor", "lines", "lines.inventory_item"]
    });
  }

  async create(dto: Partial<PurchaseOrder> & { lines?: Partial<PurchaseOrderLine>[] }, organizationId?: string): Promise<PurchaseOrder> {
    const orgId = organizationId || (dto as any).organization_id || "00000000-0000-0000-0000-000000000000";
    const { lines, ...poData } = dto;
    const po = this.poRepo.create({
      ...poData,
      organization_id: orgId,
    });
    const savedPo = await this.poRepo.save(po);

    if (lines && lines.length > 0) {
      const lineEntities = lines.map((line) => this.poLineRepo.create({
        ...line,
        purchase_order: savedPo,
      }));
      await this.poLineRepo.save(lineEntities);
    }

    const populatedPo = await this.poRepo.findOne({
      where: { id: savedPo.id },
      relations: ["vendor", "lines", "lines.inventory_item"]
    });
    return populatedPo!;
  }

  async update(id: string, changes: Partial<PurchaseOrder>, organizationId?: string): Promise<PurchaseOrder> {
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new Error(`Purchase order ${id} not found or access denied.`);
    }
    Object.assign(existing, changes);
    return this.poRepo.save(existing);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new Error(`Purchase order ${id} not found or access denied.`);
    }
    await this.poLineRepo.delete({ purchase_order: { id } });
    await this.poRepo.delete(id);
  }

  async findById(id: string, organizationId?: string): Promise<PurchaseOrder | null> {
    const where: any = { id };
    if (organizationId) {
      where.organization_id = organizationId;
    }
    return this.poRepo.findOne({
      where,
      relations: ["vendor", "lines", "lines.inventory_item"]
    });
  }

  async receiveItems(poId: string, receptions: { lineId: string; quantityReceived: number }[], organizationId?: string): Promise<PurchaseOrder> {
    const po = await this.findById(poId, organizationId);
    if (!po) {
      throw new Error(`Purchase order ${poId} not found or access denied.`);
    }

    for (const reception of receptions) {
      await this.poLineRepo.update(
        { id: reception.lineId },
        { qty_received: () => `qty_received + ${reception.quantityReceived}` }
      );
    }

    const lines = await this.poLineRepo.find({ where: { purchase_order: { id: poId } } });
    const allReceived = lines.every(line => line.qty_received >= line.qty_ordered);

    if (allReceived) {
      await this.poRepo.update(poId, { status: "received" });
    } else {
      await this.poRepo.update(poId, { status: "approved" });
    }

    return (await this.findById(poId, organizationId))!;
  }
}