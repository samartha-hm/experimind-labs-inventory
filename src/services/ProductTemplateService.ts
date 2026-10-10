import { DataSource, IsNull } from "typeorm";
import { randomUUID } from "node:crypto";
import { ProductTemplate } from "../entity/ProductTemplate.ts";
import { KitSubject, ProductTemplateVersion } from "../entity/ProductTemplateVersion.ts";
import { ProductTemplateRevision } from "../entity/ProductTemplateRevision.ts";

export interface DraftKitContent { name: string; description: string; category: string; subjects?: unknown }
export class DraftKitError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function identifier(value: unknown, label: string, ids: Set<string>): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id) return randomUUID();
  if (!uuidPattern.test(id)) throw new DraftKitError(400, `${label} identifiers must be valid UUIDs`);
  if (ids.has(id)) throw new DraftKitError(400, `${label} identifiers must be unique`);
  ids.add(id);
  return id;
}

/** Validate and normalize the editable subject/grade structure sent by clients.
 *  Names are trimmed and unique per level (case-insensitive); identifiers are stable
 *  UUIDs, generated for new entries and preserved for existing ones. */
export function normalizeSubjects(value: unknown): KitSubject[] {
  if (!Array.isArray(value) || value.length > 100) throw new DraftKitError(400, "Subjects must be a list of at most 100 subjects");
  const subjectNames = new Set<string>();
  const ids = new Set<string>();
  return value.map(entry => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new DraftKitError(400, "Each subject must be an object with a name");
    const { id, name, grades } = entry as Record<string, unknown>;
    const subjectName = typeof name === "string" ? name.trim() : "";
    if (!subjectName || subjectName.length > 100) throw new DraftKitError(400, "Subject names must contain 1 to 100 characters");
    const nameKey = subjectName.toLowerCase();
    if (subjectNames.has(nameKey)) throw new DraftKitError(400, "Subject names must be unique");
    subjectNames.add(nameKey);
    const subjectId = identifier(id, "Subject", ids);
    if (grades !== undefined && !Array.isArray(grades)) throw new DraftKitError(400, "Grades must be a list");
    const gradeNames = new Set<string>();
    const normalizedGrades = ((grades ?? []) as unknown[]).map(grade => {
      if (!grade || typeof grade !== "object" || Array.isArray(grade)) throw new DraftKitError(400, "Each grade must be an object with a name");
      const { id: gradeId, name: gradeName } = grade as Record<string, unknown>;
      const gradeLabel = typeof gradeName === "string" ? gradeName.trim() : "";
      if (!gradeLabel || gradeLabel.length > 100) throw new DraftKitError(400, "Grade names must contain 1 to 100 characters");
      const gradeKey = gradeLabel.toLowerCase();
      if (gradeNames.has(gradeKey)) throw new DraftKitError(400, "Grade names must be unique within a subject");
      gradeNames.add(gradeKey);
      return { id: identifier(gradeId, "Grade", ids), name: gradeLabel };
    });
    return { id: subjectId, name: subjectName, grades: normalizedGrades };
  });
}

export class ProductTemplateService {
  constructor(private readonly db: DataSource) {}
  private snapshot(version: ProductTemplateVersion) {
    const { organization_id, revision, name, description, category, status, subjects, updated_by } = version;
    return { version_id: version.id, organization_id, revision, name, description, category, status, subjects, updated_by };
  }
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
    const subjects = normalizeSubjects(content.subjects === undefined ? [] : content.subjects);
    return this.db.transaction(async manager => {
      const template = await manager.save(ProductTemplate, manager.create(ProductTemplate, { organization_id: orgId, created_by: actor }));
      const version = await manager.save(ProductTemplateVersion, manager.create(ProductTemplateVersion, {
        ...content, subjects, template_id: template.id, organization_id: orgId, created_by: actor, updated_by: actor,
      }));
      await manager.save(ProductTemplateRevision, manager.create(ProductTemplateRevision, this.snapshot(version)));
      return version;
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
      if (content) Object.assign(version, { ...content, subjects: content.subjects === undefined ? version.subjects : normalizeSubjects(content.subjects) });
      else { template.archived_at = new Date(); version.status = "archived"; }
      version.updated_by = actor;
      version.revision++;
      await manager.save(template);
      const saved = await manager.save(version);
      await manager.save(ProductTemplateRevision, manager.create(ProductTemplateRevision, this.snapshot(saved)));
      return saved;
    });
  }
}
