import { Setting } from "../entity/Setting";
import { AppDataSource } from "../db";

export class SettingService {
  private get repo() {
    return AppDataSource.getRepository(Setting);
  }

  async listByType(type: string): Promise<string[]> {
    const settings = await this.repo.findBy({ setting_type: type });
    return settings.map(s => s.value);
  }

  async getAll(): Promise<any[]> {
    return this.repo.find();
  }

  async create(dto: { type: string; value: string }): Promise<any> {
    const setting = this.repo.create({
      setting_type: dto.type,
      value: dto.value
    });
    return this.repo.save(setting);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}