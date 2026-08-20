import { Transaction } from "../entity/Transaction";
import { TransactionLine } from "../entity/TransactionLine";
import { AppDataSource } from "../db";

export class TransactionService {
  private get txRepo() {
    return AppDataSource.getRepository(Transaction);
  }
  private get txLineRepo() {
    return AppDataSource.getRepository(TransactionLine);
  }

  async list(filters: {
    userId?: string;
    referenceType?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  }): Promise<Transaction[]> {
    const qb = this.txRepo.createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.user", "user")
      .leftJoinAndSelect("transaction.lines", "lines")
      .leftJoinAndSelect("lines.inventory_item", "item");

    if (filters.organizationId) {
      qb.andWhere("transaction.organization_id = :orgId", { orgId: filters.organizationId });
    }
    if (filters.userId) {
      qb.andWhere("user.id = :userId", { userId: filters.userId });
    }
    if (filters.referenceType) {
      qb.andWhere("transaction.reference_type = :referenceType", { referenceType: filters.referenceType });
    }
    if (filters.startDate) {
      qb.andWhere("transaction.occurred_at >= :startDate", { startDate: new Date(filters.startDate) });
    }
    if (filters.endDate) {
      qb.andWhere("transaction.occurred_at <= :endDate", { endDate: new Date(filters.endDate) });
    }

    return qb.getMany();
  }

  async create(dto: Partial<Transaction> & { lines?: Partial<TransactionLine>[] }, organizationId?: string): Promise<Transaction> {
    const orgId = organizationId || (dto as any).organization_id || "00000000-0000-0000-0000-000000000000";
    const { lines, ...txData } = dto;
    const tx = this.txRepo.create({
      ...txData,
      organization_id: orgId,
    });
    const savedTx = await this.txRepo.save(tx);

    if (lines && lines.length > 0) {
      const lineEntities = lines.map((line) => this.txLineRepo.create({
        ...line,
        transaction: savedTx,
      }));
      await this.txLineRepo.save(lineEntities);
    }

    const populatedTx = await this.txRepo.findOne({
      where: { id: savedTx.id },
      relations: ["user", "lines", "lines.inventory_item"]
    });
    return populatedTx!;
  }

  async getById(id: string, organizationId?: string): Promise<Transaction | null> {
    const where: any = { id };
    if (organizationId) {
      where.organization_id = organizationId;
    }
    return this.txRepo.findOne({
      where,
      relations: ["user", "lines", "lines.inventory_item"]
    });
  }
}