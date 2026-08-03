import { Customer } from "../entity/Customer";
import { AppDataSource } from "../db";

export class CustomerService {
  private get repo() {
    return AppDataSource.getRepository(Customer);
  }

  async list(): Promise<Customer[]> {
    return this.repo.find();
  }

  async create(dto: Partial<Customer>): Promise<Customer> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(id: string, changes: Partial<Customer>): Promise<Customer> {
    await this.repo.update(id, changes);
    const updated = await this.repo.findOneByOrFail({ id });
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findById(id: string): Promise<Customer | null> {
    return this.repo.findOneBy({ id });
  }
}