import { SalesOrder } from "../entity/SalesOrder";
import { SalesOrderLine } from "../entity/SalesOrderLine";
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
      relations: ["customer", "lines", "lines.inventory_item"]
    });
  }

  async create(dto: Partial<SalesOrder> & { lines?: Partial<SalesOrderLine>[] }, organizationId?: string): Promise<SalesOrder> {
    const orgId = organizationId || (dto as any).organization_id || "00000000-0000-0000-0000-000000000000";
    const { lines, ...soData } = dto;
    const so = this.soRepo.create({
      ...soData,
      organization_id: orgId,
    });
    const savedSo = await this.soRepo.save(so);

    if (lines && lines.length > 0) {
      const lineEntities = lines.map((line) => this.soLineRepo.create({
        ...line,
        sales_order: savedSo,
      }));
      await this.soLineRepo.save(lineEntities);
    }

    const populatedSo = await this.soRepo.findOne({
      where: { id: savedSo.id },
      relations: ["customer", "lines", "lines.inventory_item"]
    });
    return populatedSo!;
  }

  async update(id: string, changes: Partial<SalesOrder>, organizationId?: string): Promise<SalesOrder> {
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new Error(`Sales order ${id} not found or access denied.`);
    }
    Object.assign(existing, changes);
    return this.soRepo.save(existing);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new Error(`Sales order ${id} not found or access denied.`);
    }
    await this.soLineRepo.delete({ sales_order: { id } });
    await this.soRepo.delete(id);
  }

  async findById(id: string, organizationId?: string): Promise<SalesOrder | null> {
    const where: any = { id };
    if (organizationId) {
      where.organization_id = organizationId;
    }
    return this.soRepo.findOne({
      where,
      relations: ["customer", "lines", "lines.inventory_item"]
    });
  }

  async shipItems(soId: string, shipments: { lineId: string; quantityShipped: number }[], organizationId?: string): Promise<SalesOrder> {
    const so = await this.findById(soId, organizationId);
    if (!so) {
      throw new Error(`Sales order ${soId} not found or access denied.`);
    }

    for (const shipment of shipments) {
      await this.soLineRepo.update(
        { id: shipment.lineId },
        { qty_shipped: () => `qty_shipped + ${shipment.quantityShipped}` }
      );
    }

    const lines = await this.soLineRepo.find({ where: { sales_order: { id: soId } } });
    const allShipped = lines.every(line => line.qty_shipped >= line.qty_ordered);

    if (allShipped) {
      await this.soRepo.update(soId, { status: "shipped" });
    } else {
      await this.soRepo.update(soId, { status: "packed" });
    }

    return (await this.findById(soId, organizationId))!;
  }
}