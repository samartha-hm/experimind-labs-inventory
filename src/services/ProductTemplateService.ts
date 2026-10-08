import { DataSource, IsNull } from "typeorm";
import { ProductTemplate } from "../entity/ProductTemplate.ts";
import { ProductTemplateVersion } from "../entity/ProductTemplateVersion.ts";

export interface DraftKitContent { name: string; description: string; category: string }
export class DraftKitError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export class ProductTemplateService {
  constructor(private readonly db: DataSource) {}
  async list(orgId: string) {
    return this.db.getRepository(ProductTemplateVersion).createQueryBuilder("v")
      .innerJoin(ProductTemplate, "t", "t.id = v.template_id AND t.organization_id = v.organization_id")
      .where("v.organization_id = :orgId AND v.status = 'draft' AND t.archived_at IS NULL", { orgId })
      .orderBy("v.updated_at", "DESC").getMany();
  }
  async view(id: string, orgId: string) {
    const template = await this.db.getRepository(ProductTemplate).findOneBy({ id, organization_id: orgId, archived_at: IsNull() });
    if (!template) throw new DraftKitError(404, "Draft kit not found");
    const version = await this.db.getRepository(ProductTemplateVersion).findOne({
      where: { template_id: id, organization_id: orgId, status: "draft" }, order: { version_number: "DESC" },
    });
    if (!version) throw new DraftKitError(404, "Draft kit not found");
    return version;
  }
  async create(content: DraftKitContent, orgId: string, actor: string) {
    return this.db.transaction(async manager => {
      const template = await manager.save(ProductTemplate, manager.create(ProductTemplate, { organization_id: orgId, created_by: actor }));
      return manager.save(ProductTemplateVersion, manager.create(ProductTemplateVersion, {
        ...content, template_id: template.id, organization_id: orgId, created_by: actor, updated_by: actor,
      }));
    });
  }
  async change(id: string, orgId: string, actor: string, revision: number, content?: DraftKitContent) {
    return this.db.transaction(async manager => {
      const template = await manager.findOne(ProductTemplate, {
        where: { id, organization_id: orgId, archived_at: IsNull() }, lock: { mode: "pessimistic_write" },
      });
      if (!template) throw new DraftKitError(404, "Draft kit not found");
      const version = await manager.findOne(ProductTemplateVersion, {
        where: { template_id: id, organization_id: orgId, status: "draft" }, order: { version_number: "DESC" },
      });
      if (!version) throw new DraftKitError(409, "Only drafts can be changed");
      if (version.revision !== revision) throw new DraftKitError(409, "This kit changed since you opened it. Reopen it before saving.");
      if (content) Object.assign(version, content);
      else { template.archived_at = new Date(); version.status = "archived"; }
      version.updated_by = actor;
      version.revision++;
      await manager.save(template);
      return manager.save(version);
    });
  }
}
