import { supplyAvailability } from "./SupplyStockService";
import { DataSource, EntityManager, In, IsNull } from "typeorm";
import { verifiedAvailability } from "./PhysicalStockService";
import { PlanningProject, PlanningSchoolSite, PlanningVersionLink, PlanningProjectRevision, KitTemplateApproval } from "../entity/PlanningProject.ts";
import { ProductTemplateVersion } from "../entity/ProductTemplateVersion.ts";
import { InventoryItem } from "../entity/InventoryItem.ts";
import { UomConversion } from "../entity/UomConversion.ts";
import { DraftKitError } from "./ProductTemplateService.ts";
import { QuantityRuleError } from "../features/kit-builder/quantityRules.ts";
import { calculateRequirements } from "../features/projects/requirementPlanning.ts";
import type { PlanningContent, PlanningSite, PlanningView } from "../features/projects/planningTypes";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function object(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(k => !fields.includes(k))) throw new DraftKitError(400, "Invalid or unknown planning field");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, required = false): string {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new DraftKitError(400, "Invalid planning text");
  return value.trim();
}
function identity(value: unknown, seen: Set<string>): string {
  if (typeof value !== "string" || !uuid.test(value) || seen.has(value.toLowerCase())) throw new DraftKitError(400, "Planning identifiers must be unique UUIDs");
  const id = value.toLowerCase(); seen.add(id); return id;
}
export function normalizePlanning(value: unknown): PlanningContent {
  const input = object(value, ["name", "client", "notes", "commercial_links", "overrides", "sites"]);
  if (!Array.isArray(input.sites) || input.sites.length > 100) throw new DraftKitError(400, "A project supports at most 100 sites");
  const seen = new Set<string>(); let selections = 0;
  const sites = input.sites.map(raw => {
    const site = object(raw, ["id", "name", "address", "location", "contact", "notes", "schedule", "fulfillment", "selections"]);
    if (!Array.isArray(site.selections) || (selections += site.selections.length) > 500) throw new DraftKitError(400, "A project supports at most 500 kit selections");
    return { id: identity(site.id, seen), name: text(site.name, 200, true), address: text(site.address, 2000), location: text(site.location, 500),
      contact: text(site.contact, 1000), notes: text(site.notes, 5000), schedule: text(site.schedule, 1000), fulfillment: text(site.fulfillment, 2000),
      selections: site.selections.map(raw => {
        const selection = object(raw, ["id", "version_id", "context"]);
        if (typeof selection.version_id !== "string" || !uuid.test(selection.version_id)) throw new DraftKitError(400, "Invalid approved version identity");
        object(selection.context, ["grade_quantities", "complete_sets", "project_count", "site_count", "included_optional", "overrides"]);
        return { id: identity(selection.id, seen), version_id: selection.version_id.toLowerCase(), context: structuredClone(selection.context) as PlanningSite["selections"][number]["context"] };
      }),
    };
  });
  if (!Array.isArray(input.commercial_links) || input.commercial_links.length > 20) throw new DraftKitError(400, "Invalid commercial reference list");
  const links: PlanningContent["commercial_links"] = input.commercial_links.map(raw => {
    const link = object(raw, ["kind", "reference"]);
    if (link.kind !== "quotation" && link.kind !== "sales_order") throw new DraftKitError(400, "Invalid commercial reference kind");
    return { kind: link.kind, reference: text(link.reference, 200, true) };
  });
  if (!input.overrides || typeof input.overrides !== "object" || Array.isArray(input.overrides)) throw new DraftKitError(400, "Invalid project overrides");
  const versionIds = new Set(sites.flatMap(s => s.selections.map(k => k.version_id)));
  for (const [id, overrides] of Object.entries(input.overrides)) {
    if (!versionIds.has(id) || !overrides || typeof overrides !== "object" || Array.isArray(overrides)) throw new DraftKitError(400, "Project overrides require a selected version");
  }
  return { name: text(input.name, 200, true), client: text(input.client, 200), notes: text(input.notes, 5000), commercial_links: links,
    overrides: structuredClone(input.overrides) as PlanningContent["overrides"], sites };
}
export class ProjectPlanningService {
  constructor(private readonly db: DataSource) {}
  private async load(manager: EntityManager, project: PlanningProject): Promise<PlanningView> {
    const sites = await manager.find(PlanningSchoolSite, { where: { project_id: project.id, organization_id: project.organization_id }, order: { position: "ASC" } });
    return { ...project.content, sites: sites.map(s => s.content), id: project.id, revision: project.revision, updated_at: project.updated_at.toISOString() };
  }
  async list(orgId: string) {
    const projects = await this.db.getRepository(PlanningProject).find({ where: { organization_id: orgId, archived_at: IsNull() }, order: { updated_at: "DESC" }, take: 200 });
    return projects.map(p => ({ id: p.id, name: p.content.name, client: p.content.client, revision: p.revision, updated_at: p.updated_at }));
  }
  async view(id: string, orgId: string) {
    return this.db.transaction("REPEATABLE READ", async manager => {
      const p = await manager.findOneBy(PlanningProject, { id, organization_id: orgId, archived_at: IsNull() });
      if (!p) throw new DraftKitError(404, "Project not found"); return this.load(manager, p);
    });
  }
  private async calculation(manager: EntityManager, id: string, revision: number, content: PlanningContent, orgId: string) {
    const ids = [...new Set(content.sites.flatMap(s => s.selections.map(k => k.version_id)))];
    const approvals = ids.length ? await manager.findBy(KitTemplateApproval, { version_id: In(ids), organization_id: orgId }) : [];
    if (approvals.length !== ids.length) throw new DraftKitError(400, "Select an approved immutable kit version from your organization");
    const versions = ids.length ? await manager.findBy(ProductTemplateVersion, { id: In(ids), organization_id: orgId, status: "published" }) : [];
    const itemIds = new Set<string>();
    for (const v of versions) for (const s of v.subjects) {
      for (const c of s.crates ?? []) for (const m of c.materials) itemIds.add(m.inventory_item_id);
      for (const g of s.grades) for (const a of g.activities) for (const m of a.materials) itemIds.add(m.inventory_item_id);
    }
    const items = itemIds.size ? await manager.getRepository(InventoryItem).createQueryBuilder("item")
      .select(["item.id", "item.name", "item.unit"]).where("item.organization_id = :orgId AND item.id IN (:...ids)", { orgId, ids: [...itemIds] }).getMany() : [];
    const conversions = await manager.findBy(UomConversion, { organization_id: orgId, is_active: true });
    try {
      const result=calculateRequirements(id, revision, content, versions, items, conversions);
      // Read-only, snapshot-consistent physical ledger reconciliation. Legacy quantities never participate.
      await verifiedAvailability(manager,orgId,result.materials);
      await supplyAvailability(manager,orgId,result.materials,id === "unsaved" ? undefined : id);
      result.warnings=result.warnings.filter(w=>!w.startsWith("Stock NOT VERIFIED:"));
      if(result.materials.some(m=>m.stock_status==="unverified"))result.warnings.unshift("Unverified stock: counts must cover every declared location in a confirmed item scope; incompatible demand units remain unverified.");
      result.warnings.push("Available stock excludes active reservations. Immediate shortage credits reservations and fulfillments assigned to this project; projected shortage also credits its approved incoming supply. Pending inspection is not usable stock.");
      return result;
    }
    catch (error) { if (error instanceof QuantityRuleError) throw new DraftKitError(400, error.message); throw error; }
  }
  async previewInTransaction(manager: EntityManager, id:string, orgId:string, revision:number) {
    const p=await manager.findOneBy(PlanningProject,{id,organization_id:orgId,archived_at:IsNull()});
    if(!p)throw new DraftKitError(404,"Project not found");
    if(p.revision!==revision)throw new DraftKitError(409,"Project changed. Reopen before calculating.");
    return this.calculation(manager,id,revision,await this.load(manager,p),orgId);
  }
  async preview(id:string,orgId:string,revision:number) {
    return this.db.transaction("REPEATABLE READ",m=>this.previewInTransaction(m,id,orgId,revision));
  }
  async save(orgId: string, actor: string, raw: unknown, id?: string, revision?: number) {
    const content = normalizePlanning(raw);
    return this.db.transaction(async manager => {
      let project = id ? await manager.findOne(PlanningProject, { where: { id, organization_id: orgId, archived_at: IsNull() }, lock: { mode: "pessimistic_write" } }) : manager.create(PlanningProject, { organization_id: orgId, created_by: actor, revision: 0 });
      if (!project) throw new DraftKitError(404, "Project not found");
      if (id && project.revision !== revision) throw new DraftKitError(409, "Project changed. Reopen before saving.");
      await this.calculation(manager, id ?? "unsaved", project.revision + 1, content, orgId);
      const { sites, ...header } = content;
      project.content = header; project.revision++; project.updated_by = actor;
      project = await manager.save(project);
      // Replacing children is atomic; immutable snapshots retain previous allocations.
      await manager.delete(PlanningVersionLink, { project_id: project.id, organization_id: orgId });
      const existingSites=await manager.findBy(PlanningSchoolSite,{project_id:project.id,organization_id:orgId});
      for(const old of existingSites)if(!sites.some(site=>site.id===old.id)) {
        if(await manager.query(`SELECT 1 FROM project_stock_reservations WHERE organization_id=$1 AND site_id=$2 LIMIT 1`,[orgId,old.id]).then((rows:unknown[])=>rows.length))throw new DraftKitError(409,"A site with reservation history cannot be removed");
        if(await manager.query(`SELECT 1 FROM purchase_requests r, jsonb_array_elements(r.lines) l WHERE r.organization_id=$1 AND l->>'site_id'=$2 LIMIT 1`,[orgId,old.id]).then((rows:unknown[])=>rows.length))throw new DraftKitError(409,"A site with procurement history cannot be removed");
        if((await manager.query(`SELECT to_regclass(current_schema()||'.production_work_orders') installed`))[0].installed && await manager.query(`SELECT 1 FROM production_work_orders WHERE organization_id=$1 AND site_id=$2 LIMIT 1`,[orgId,old.id]).then((rows:unknown[])=>rows.length))throw new DraftKitError(409,"A site with production history cannot be removed");
        if((await manager.query(`SELECT to_regclass(current_schema()||'.packing_orders') installed`))[0].installed && (await manager.query(`SELECT 1 FROM packing_orders WHERE organization_id=$1 AND site_id=$2 LIMIT 1`,[orgId,old.id])).length)throw new DraftKitError(409,"A site with packing history cannot be removed");
        await manager.delete(PlanningSchoolSite,{id:old.id,organization_id:orgId});
      }
      for (const [position, site] of sites.entries()) {
        if(existingSites.some(old=>old.id===site.id))await manager.update(PlanningSchoolSite,{id:site.id,project_id:project.id,organization_id:orgId},{position,content:site});
        else await manager.insert(PlanningSchoolSite, { id: site.id, project_id: project.id, organization_id: orgId, position, content: site });
        for (const selection of site.selections) await manager.insert(PlanningVersionLink, { selection_id: selection.id, site_id: site.id, project_id: project.id, organization_id: orgId, version_id: selection.version_id });
      }
      await manager.insert(PlanningProjectRevision, { project_id: project.id, organization_id: orgId, revision: project.revision, content, archived: false, updated_by: actor });
      return this.load(manager, project);
    });
  }
  async archive(id: string, orgId: string, actor: string, revision: number) {
    return this.db.transaction(async manager => {
      const p = await manager.findOne(PlanningProject, { where: { id, organization_id: orgId, archived_at: IsNull() }, lock: { mode: "pessimistic_write" } });
      if (!p) throw new DraftKitError(404, "Project not found");
      if (p.revision !== revision) throw new DraftKitError(409, "Project changed. Reopen before archiving.");
      if(await manager.query(`SELECT 1 FROM project_stock_reservations WHERE organization_id=$1 AND project_id=$2 AND status='active' LIMIT 1`,[orgId,id]).then((rows:unknown[])=>rows.length))throw new DraftKitError(409,"Release active reservations before archiving the project");
      if((await manager.query(`SELECT to_regclass(current_schema()||'.production_work_orders') installed`))[0].installed && await manager.query(`SELECT 1 FROM production_work_orders WHERE organization_id=$1 AND project_id=$2 AND status NOT IN ('completed','cancelled') LIMIT 1`,[orgId,id]).then((rows:unknown[])=>rows.length))throw new DraftKitError(409,"Finalize active production before archiving the project");
      if((await manager.query(`SELECT to_regclass(current_schema()||'.packing_orders') installed`))[0].installed && (await manager.query(`SELECT 1 FROM packing_orders WHERE organization_id=$1 AND project_id=$2 AND status NOT IN ('ready','cancelled') LIMIT 1`,[orgId,id])).length)throw new DraftKitError(409,"Finalize active packing before archiving the project");
      const { id: _id, revision: _rev, updated_at: _date, ...content } = await this.load(manager, p);
      p.archived_at = new Date(); p.revision++; p.updated_by = actor; await manager.save(p);
      await manager.insert(PlanningProjectRevision, { project_id: id, organization_id: orgId, revision: p.revision, content, archived: true, updated_by: actor });
    });
  }
  async history(id: string, orgId: string) {
    if (!await this.db.getRepository(PlanningProject).findOneBy({ id, organization_id: orgId })) throw new DraftKitError(404, "Project not found");
    return this.db.getRepository(PlanningProjectRevision).find({ where: { project_id: id, organization_id: orgId }, order: { revision: "DESC" }, take: 50 });
  }
}
