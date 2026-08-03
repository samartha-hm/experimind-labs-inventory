import { Transaction } from "../entity/Transaction";
import { TransactionLine } from "../entity/TransactionLine";
import { InventoryItem } from "../entity/InventoryItem";
import { User } from "../entity/User";
import { AppDataSource } from "../db";

export class TransactionService {
  private get txRepo() {
    return AppDataSource.getRepository(Transaction);
  }
  private get txLineRepo() {
    return AppDataSource.getRepository(TransactionLine);
  }
  private get inventoryRepo() {
    return AppDataSource.getRepository(InventoryItem);
  }
  private get userRepo() {
    return AppDataSource.getRepository(User);
  }

  async list(filters: {
    userId?: string;
    referenceType?: string;
    startDate?: string;
    endDate?: string
  }): Promise<Transaction[]> {
    const qb = this.txRepo.createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.user", "user")
      .leftJoinAndSelect("transaction.lines", "lines")
      .leftJoinAndSelect("lines.inventory_item", "item");

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

  async create(dto: Partial<Transaction> & { lines?: Partial<TransactionLine>[] }): Promise<Transaction> {
    const tx = this.txRepo.create(dto);
    const savedTx = await this.txRepo.save(tx);

    // Handle line items if provided
    if (dto.lines && dto.lines.length > 0) {
      const linePromises = dto.lines.map(async (line) => {
        const txLine = this.txLineRepo.create({
          ...line,
          transaction: savedTx
        });
        return this.txLineRepo.save(txLine);
      });
      await Promise.all(linePromises);

      // Reload the transaction with lines
      const updatedTx = await this.txRepo.findOne({
        where: { id: savedTx.id },
        relations: ["user", "lines", "lines.inventory_item"]
      });
      return updatedTx!;
    }

    // Reload the transaction with relations
    const populatedTx = await this.txRepo.findOne({
      where: { id: savedTx.id },
      relations: ["user", "lines", "lines.inventory_item"]
    });
    return populatedTx!;
  }

  async getById(id: string): Promise<Transaction | null> {
    return this.txRepo.findOne({
      where: { id },
      relations: ["user", "lines", "lines.inventory_item"]
    });
  }

  // Convenience method to create a stock adjustment transaction
  async createStockAdjustment(
    userId: string,
    referenceType: string,
    referenceUuid: string | null,
    adjustments: { inventoryItemId: string; quantityChange: number; unitCost: number }[],
    notes?: string
  ): Promise<Transaction> {
    // Lookup user if provided
    const user = userId ? await this.userRepo.findOneBy({ id: userId }) : null;

    // Create transaction
    const transaction = this.txRepo.create({
      user: user || undefined,
      reference_type: referenceType,
      reference_uuid: referenceUuid,
      occurred_at: new Date(),
      notes
    });

    const savedTransaction = await this.txRepo.save(transaction);

    // Create transaction lines
    const linePromises = adjustments.map(adjustment => {
      // Verify inventory item exists
      return this.inventoryRepo.findOneByOrFail({ id: adjustment.inventoryItemId }).then(item => {
        const line = this.txLineRepo.create({
          transaction: savedTransaction,
          inventory_item: item,
          quantity_change: adjustment.quantityChange,
          unit_cost: adjustment.unitCost
        });
        return this.txLineRepo.save(line);
      });
    });

    await Promise.all(linePromises);

    // Update inventory quantities
    for (const adjustment of adjustments) {
      await this.inventoryRepo.update(
        { id: adjustment.inventoryItemId },
        { quantity: () => `quantity + ${adjustment.quantityChange}` }
      );
    }

    // Reload and return the transaction with relations
    return this.txRepo.findOne({
      where: { id: savedTransaction.id },
      relations: ["user", "lines", "lines.inventory_item"]
    }) as Promise<Transaction | null>;
  }
}