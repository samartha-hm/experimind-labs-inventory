import { Customer } from "../entity/Customer";
import { AppDataSource } from "../db";

export class CustomerService {
  private get repo() {
    return AppDataSource.getRepository(Customer);
  }

  async list(orgId: string = "00000000-0000-0000-0000-000000000000"): Promise<Customer[]> {
    return this.repo.find({ where: { organization_id: orgId } });
  }

  async create(dto: Partial<Customer>, orgId: string = "00000000-0000-0000-0000-000000000000"): Promise<Customer> {
    const entity = this.repo.create({ ...dto, organization_id: orgId });
    return this.repo.save(entity);
  }

  async update(id: string, changes: Partial<Customer>, orgId: string = "00000000-0000-0000-0000-000000000000"): Promise<Customer> {
    await this.repo.update({ id, organization_id: orgId }, changes);
    const updated = await this.repo.findOneByOrFail({ id, organization_id: orgId });
    return updated;
  }

  async delete(id: string, orgId: string = "00000000-0000-0000-0000-000000000000"): Promise<void> {
    await this.repo.delete({ id, organization_id: orgId });
  }

  async findById(id: string, orgId: string = "00000000-0000-0000-0000-000000000000"): Promise<Customer | null> {
    return this.repo.findOneBy({ id, organization_id: orgId });
  }
}