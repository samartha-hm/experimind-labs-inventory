import { DataSource, IsNull } from "typeorm";
import { randomUUID } from "node:crypto";
import { ProductTemplate } from "../entity/ProductTemplate.ts";
import { InventoryItem } from "../entity/InventoryItem.ts";
import { KitActivity, KitMaterial, KitSubject, ProductTemplateVersion } from "../entity/ProductTemplateVersion.ts";
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

/** Validate and normalize the material requirements of one activity. Quantities may be
 *  left incomplete (stored as 0) while the kit is a draft; `complete` is computed here so
 *  incomplete definitions can never be treated as ready for production. */
export function normalizeMaterials(value: unknown, ids: Set<string>): KitMaterial[] {
  if (!Array.isArray(value) || value.length > 100) throw new DraftKitError(400, "Materials must be a list of at most 100 entries");
  const items = new Set<string>();
  return value.map(entry => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new DraftKitError(400, "Each material must be an object");
    const { id, inventory_item_id, item_name, quantity, unit, notes, optional, reusable } = entry as Record<string, unknown>;
    const itemId = typeof inventory_item_id === "string" ? inventory_item_id.trim() : "";
    if (!uuidPattern.test(itemId)) throw new DraftKitError(400, "Materials must reference a valid inventory item");
    if (items.has(itemId)) throw new DraftKitError(400, "Each inventory item may appear only once per activity");
    items.add(itemId);
    const label = typeof item_name === "string" ? item_name.trim() : "";
    if (!label || label.length > 200) throw new DraftKitError(400, "Material names must contain 1 to 200 characters");
    if (quantity !== undefined && (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 0))
      throw new DraftKitError(400, "Material quantities must be a nonnegative number");
    const unitLabel = typeof unit === "string" ? unit.trim() : "";
    if (unitLabel.length > 20) throw new DraftKitError(400, "Material units must contain at most 20 characters");
    const noteText = typeof notes === "string" ? notes.trim() : "";
    if (noteText.length > 500) throw new DraftKitError(400, "Material notes must contain at most 500 characters");
    const requiredQuantity = typeof quantity === "number" ? quantity : 0;
    return {
      id: identifier(id, "Material", ids), inventory_item_id: itemId, item_name: label,
      quantity: requiredQuantity, unit: unitLabel || "pcs",
      ...(noteText ? { notes: noteText } : {}),
      ...(optional === true ? { optional: true } : {}),
      ...(reusable === true ? { reusable: true } : {}),
      complete: requiredQuantity > 0,
    };
  });
}

/** Validate and normalize the activities of one grade. Activities are drafts by nature;
 *  missing activity lists default to empty and materials may stay incomplete. */
export function normalizeActivities(value: unknown, ids: Set<string>): KitActivity[] {
  if (!Array.isArray(value) || value.length > 100) throw new DraftKitError(400, "Activities must be a list of at most 100 activities");
  const names = new Set<string>();
  return value.map(entry => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new DraftKitError(400, "Each activity must be an object with a name");
    const { id, code, name, description, instructions, reference_url, optional, materials } = entry as Record<string, unknown>;
    const activityName = typeof name === "string" ? name.trim() : "";
    if (!activityName || activityName.length > 100) throw new DraftKitError(400, "Activity names must contain 1 to 100 characters");
    const nameKey = activityName.toLowerCase();
    if (names.has(nameKey)) throw new DraftKitError(400, "Activity names must be unique within a grade");
    names.add(nameKey);
    const activityCode = typeof code === "string" ? code.trim() : "";
    if (activityCode.length > 50) throw new DraftKitError(400, "Activity codes must contain at most 50 characters");
    const activityDescription = typeof description === "string" ? description.trim() : "";
    if (activityDescription.length > 2000) throw new DraftKitError(400, "Activity descriptions must contain at most 2000 characters");
    const activityInstructions = typeof instructions === "string" ? instructions.trim() : "";
    if (activityInstructions.length > 5000) throw new DraftKitError(400, "Activity instructions must contain at most 5000 characters");
    const referenceUrl = typeof reference_url === "string" ? reference_url.trim() : "";
    if (referenceUrl.length > 500) throw new DraftKitError(400, "Activity reference links must contain at most 500 characters");
    if (materials !== undefined && !Array.isArray(materials)) throw new DraftKitError(400, "Materials must be a list");
    return {
      id: identifier(id, "Activity", ids), name: activityName,
      ...(activityCode ? { code: activityCode } : {}),
      ...(activityDescription ? { description: activityDescription } : {}),
      ...(activityInstructions ? { instructions: activityInstructions } : {}),
      ...(referenceUrl ? { reference_url: referenceUrl } : {}),
      ...(optional === true ? { optional: true } : {}),
      materials: normalizeMaterials(materials ?? [], ids),
    };
  });
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
      const { id: gradeId, name: gradeName, activities } = grade as Record<string, unknown>;
      const gradeLabel = typeof gradeName === "string" ? gradeName.trim() : "";
      if (!gradeLabel || gradeLabel.length > 100) throw new DraftKitError(400, "Grade names must contain 1 to 100 characters");
      const gradeKey = gradeLabel.toLowerCase();
      if (gradeNames.has(gradeKey)) throw new DraftKitError(400, "Grade names must be unique within a subject");
      gradeNames.add(gradeKey);
      if (activities !== undefined && !Array.isArray(activities)) throw new DraftKitError(400, "Activities must be a list");
      return { id: identifier(gradeId, "Grade", ids), name: gradeLabel, activities: normalizeActivities(activities ?? [], ids) };
    });
    return { id: subjectId, name: subjectName, grades: normalizedGrades };
  });
}

export class ProductTemplateService {
  constructor(private readonly db: DataSource) {}
  /** Materials must reference items that exist in the caller's own organization's inventory;
   *  cross-tenant or unknown references are rejected before any write. */
  async validateMaterialReferences(subjects: KitSubject[], orgId: string) {
    const ids = new Set<string>();
    for (const subject of subjects) for (const grade of subject.grades) for (const activity of grade.activities)
      for (const material of activity.materials) ids.add(material.inventory_item_id);
    if (!ids.size) return;
    const found = await this.db.getRepository(InventoryItem).createQueryBuilder("item")
      .select("item.id").where("item.id IN (:...ids) AND item.organization_id = :orgId", { ids: [...ids], orgId })
      .getMany();
    if (found.length !== ids.size) throw new DraftKitError(400, "One or more materials reference items that do not exist in your organization's inventory");
  }
  /** Material picker: search the organization's own inventory master. Returns only
   *  identity and unit fields; quantities and prices are never trusted or exposed here. */
  async searchMaterials(query: string, orgId: string) {
    const text = query.trim();
    const builder = this.db.getRepository(InventoryItem).createQueryBuilder("item")
      .select(["item.id", "item.sku", "item.name", "item.unit", "item.category"])
      .where("item.organization_id = :orgId", { orgId });
    if (text) builder.andWhere("(item.name ILIKE :text OR item.sku ILIKE :text OR item.description ILIKE :text)", { text: `%${text}%` });
    return builder.orderBy("item.name", "ASC").limit(20).getMany();
  }
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
    await this.validateMaterialReferences(subjects, orgId);
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
      if (content) {
        const subjects = content.subjects === undefined ? version.subjects : normalizeSubjects(content.subjects);
        Object.assign(version, { ...content, subjects });
        if (content.subjects !== undefined) await this.validateMaterialReferences(subjects, orgId);
      }
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
