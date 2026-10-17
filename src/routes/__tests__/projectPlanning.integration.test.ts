import "reflect-metadata";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { DataSource } from "typeorm";
import express from "express";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { AppDataSource } from "../../db.ts";
import { env } from "../../config/env.ts";
import { User } from "../../entity/User.ts";
import { Organization } from "../../entity/Organization.ts";
import { InventoryItem } from "../../entity/InventoryItem.ts";
import { UomConversion } from "../../entity/UomConversion.ts";
import { ProductTemplate } from "../../entity/ProductTemplate.ts";
import { ProductTemplateVersion } from "../../entity/ProductTemplateVersion.ts";
import { ProductTemplateRevision } from "../../entity/ProductTemplateRevision.ts";
import { planningEntities, PlanningProject, PlanningProjectRevision, KitTemplateApproval } from "../../entity/PlanningProject.ts";
import { AddProductTemplates1791417600000 } from "../../migration/1791417600000-AddProductTemplates.ts";
import { AddKitSubjectsAndGrades1791417600001 } from "../../migration/1791417600001-AddKitSubjectsAndGrades.ts";
import { AddProjectPlanning1791417600002 } from "../../migration/1791417600002-AddProjectPlanning.ts";
import { planningProjectRouter } from "../v1/planning-projects.ts";
import { productTemplateRouter } from "../v1/product-templates.ts";
import { planningFixture } from "../../features/projects/__tests__/planningFixture.ts";
import type { PlanningContent, PlanningView, PlanningPreview } from "../../features/projects/planningTypes";

const databaseUrl = process.env.KIT_BUILDER_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("PostgreSQL multi-school planning", () => {
  let db: DataSource; let server: Server; let base: string;
  let maker: User; let viewer: User; let other: User;
  let fixture: ReturnType<typeof planningFixture>; let content: PlanningContent; let project: PlanningView;
  let draft: ProductTemplateVersion; let approved: ProductTemplateVersion;
  let inventoryBefore: InventoryItem[]; let ledgerBefore: unknown[];
  const schema = `planning_test_${randomUUID().replaceAll("-", "")}`;
  const token = (user: User, claims = {}) => jwt.sign({ sub: user.id, orgId: user.organization_id, role: user.role, ...claims }, env.jwtSecret, { expiresIn: "5m" });
  const request = (method: string, path: string, user?: User, body?: unknown, customToken?: string) => fetch(`${base}/api/v1${path}`, {
    method, headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${customToken ?? token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  async function start() {
    const app = express(); app.use(express.json());
    app.use("/api/v1/product-templates", productTemplateRouter(db)); app.use("/api/v1/planning-projects", planningProjectRouter(db));
    server = await new Promise<Server>(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing port");
    base = `http://127.0.0.1:${address.port}`;
  }
  const close = () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/experimind_kitbuilder_test") throw new Error("Refusing non-development test database");
    const admin = new DataSource({ type: "postgres", url: databaseUrl }); await admin.initialize();
    try { await admin.query(`CREATE SCHEMA "${schema}"`); } finally { await admin.destroy(); }
    const options = { type: "postgres" as const, url: databaseUrl, schema, ssl: false, uuidExtension: "pgcrypto" as const,
      entities: AppDataSource.options.entities, migrations: [], extra: { options: `-c search_path=${schema},public` } };
    const bootstrap = new DataSource({ ...options, entities: (options.entities as Function[]).filter(e =>
      ![ProductTemplate, ProductTemplateVersion, ProductTemplateRevision, ...planningEntities].some(p => p === e)) });
    await bootstrap.initialize(); await bootstrap.synchronize();
    const runner = bootstrap.createQueryRunner(); await runner.connect(); await runner.startTransaction();
    try {
      await new AddProductTemplates1791417600000().up(runner); await new AddKitSubjectsAndGrades1791417600001().up(runner);
      await new AddProjectPlanning1791417600002().up(runner);
      // Empty rollback/reapply must preserve every pre-existing table.
      await new AddProjectPlanning1791417600002().down(runner); await new AddProjectPlanning1791417600002().up(runner);
      await runner.commitTransaction();
    } catch (error) { await runner.rollbackTransaction(); throw error; }
    finally { await runner.release(); await bootstrap.destroy(); }
    db = new DataSource(options); await db.initialize();
    const orgA = await db.getRepository(Organization).save({ name: `A-${schema}` });
    const orgB = await db.getRepository(Organization).save({ name: `B-${schema}` });
    maker = await db.getRepository(User).save({ organization_id: orgA.id, email: "maker@test.invalid", name: "Maker", role: "staff", firebase_uid: null });
    viewer = await db.getRepository(User).save({ organization_id: orgA.id, email: "viewer@test.invalid", name: "Viewer", role: "viewer", firebase_uid: null });
    other = await db.getRepository(User).save({ organization_id: orgB.id, email: "other@test.invalid", name: "Other", role: "admin", firebase_uid: null });
    const item = await db.getRepository(InventoryItem).save({ organization_id: orgA.id, sku: "SYNTHETIC-WIRE", name: "Shared wire", unit: "m", quantity: 987, threshold: 0, base_price: 1 });
    fixture = planningFixture(item.id); await start();
  }, 30000);
  afterAll(async () => { if (server) await close(); if (db?.isInitialized) await db.destroy(); });

  it("requires header authentication, explicit tenancy and current database roles", async () => {
    for (const method of ["GET", "POST"]) expect((await request(method, "/planning-projects")).status).toBe(401);
    expect((await request("GET", "/planning-projects", maker, undefined, token(maker, { orgId: "00000000-0000-0000-0000-000000000000" }))).status).toBe(403);
    expect((await request("GET", "/planning-projects", maker, undefined, token(maker, { orgId: other.organization_id }))).status).toBe(403);
    expect((await request("POST", "/planning-projects", viewer, { name: "Forbidden" }, token(viewer, { role: "admin" }))).status).toBe(403);
    await db.getRepository(User).update(maker.id, { is_active: false });
    expect((await request("GET", "/planning-projects", maker)).status).toBe(403);
    await db.getRepository(User).update(maker.id, { is_active: true });
  });
  it("approves a complete immutable copy and keeps draft editing independent", async () => {
    const created = await request("POST", "/product-templates", maker, { name: "Synthetic Prastuti", subjects: fixture.subjects });
    expect(created.status).toBe(201); draft = await created.json();
    expect((await request("POST", `/product-templates/${draft.template_id}/approve`, viewer, { revision: 1 })).status).toBe(403);
    expect((await request("POST", `/product-templates/${draft.template_id}/approve`, maker, { revision: 99 })).status).toBe(409);
    const response = await request("POST", `/product-templates/${draft.template_id}/approve`, maker, { revision: 1 });
    expect(response.status).toBe(201); approved = await response.json();
    expect(approved).toMatchObject({ status: "published", version_number: 2, revision: 1 }); expect(approved.id).not.toBe(draft.id);
    const repeated = await (await request("POST", `/product-templates/${draft.template_id}/approve`, maker, { revision: 1 })).json();
    expect(repeated.id).toBe(approved.id); expect(await db.getRepository(KitTemplateApproval).count()).toBe(1);
    expect((await (await request("GET", "/product-templates/approved", viewer)).json()).map((v: ProductTemplateVersion) => v.id)).toEqual([approved.id]);
    expect(await (await request("GET", "/product-templates/approved", other)).json()).toEqual([]);
    content = structuredClone(fixture.content); for (const site of content.sites) site.selections[0].version_id = approved.id;
    inventoryBefore = await db.getRepository(InventoryItem).find({ order: { id: "ASC" } }); ledgerBefore = await db.query("SELECT * FROM stock_ledger ORDER BY id");
  });
  it("rejects draft/foreign masters, unknown fields and incomplete-set inference without writing", async () => {
    const invalid = structuredClone(content); invalid.sites[0].selections[0].version_id = draft.id;
    expect((await request("POST", "/planning-projects", maker, invalid)).status).toBe(400);
    expect((await request("POST", "/planning-projects", other, content)).status).toBe(400);
    expect((await request("POST", "/planning-projects", maker, { ...content, organization_id: maker.organization_id })).status).toBe(400);
    invalid.sites[0].selections[0].version_id = approved.id; invalid.sites[0].selections[0].context.complete_sets = {};
    expect((await request("POST", "/planning-projects", maker, invalid)).status).toBe(400);
    expect(await db.getRepository(PlanningProject).count()).toBe(0);
  });
  it("saves two schools and expands 2 complete sets plus 3 Grade 8-only sets", async () => {
    const response = await request("POST", "/planning-projects", maker, content); expect(response.status).toBe(201); project = await response.json();
    expect(project).toMatchObject({ revision: 1, name: content.name, sites: content.sites });
    const result: PlanningPreview = await (await request("POST", `/planning-projects/${project.id}/preview`, viewer, { revision: 1 })).json();
    expect(result.materials[0]).toMatchObject({ gross_demand: 3.3, verified_on_hand: null, immediate_shortage: null, stock_status: "unverified" });
    expect(result.lines.filter(l => l.owner_id === fixture.universalId && !l.material_id).map(l => l.quantity)).toEqual([2, 0]);
    expect(result.packing_assignments.filter(a => a.kind === "pouch")).toHaveLength(8);
    expect(result.operational_release).toBe(false);
  });
  it("reopens after HTTP/data-source restart with the same deterministic result", async () => {
    const before = await (await request("POST", `/planning-projects/${project.id}/preview`, maker, { revision: 1 })).json();
    await close(); await db.destroy(); await db.initialize(); await start();
    expect(await (await request("GET", `/planning-projects/${project.id}`, viewer)).json()).toEqual(project);
    expect(await (await request("POST", `/planning-projects/${project.id}/preview`, maker, { revision: 1 })).json()).toEqual(before);
  });
  it("preserves approved masters and old project snapshots while draft and project edits evolve", async () => {
    expect((await request("PUT", `/product-templates/${draft.template_id}`, maker, { name: "Changed draft", subjects: [], revision: 1 })).status).toBe(200);
    const edited = { ...content, notes: "Independent planning edit", overrides: { [approved.id]: { [fixture.universalId]: { quantity: 1, reason: "NGO project default" } } } };
    edited.sites = structuredClone(content.sites); edited.sites[0].selections[0].context.overrides = { [fixture.universalId]: { quantity: 2, reason: "School A needs two" } };
    const saved = await request("PUT", `/planning-projects/${project.id}`, maker, { ...edited, revision: 1 }); expect(saved.status).toBe(200); project = await saved.json();
    const history = await (await request("GET", `/planning-projects/${project.id}/revisions`, viewer)).json();
    expect(history.map((r: { revision: number }) => r.revision)).toEqual([2, 1]); expect(history[1].content).toEqual(content);
    const result: PlanningPreview = await (await request("POST", `/planning-projects/${project.id}/preview`, maker, { revision: 2 })).json();
    expect(result.lines.filter(l => l.owner_id === fixture.universalId && !l.material_id).map(l => l.override_scope)).toEqual(["site", "project"]);
    expect((await db.getRepository(ProductTemplateVersion).findOneByOrFail({ id: approved.id })).subjects).toEqual(approved.subjects);
    await expect(db.getRepository(ProductTemplateVersion).update(approved.id, { name: "Forbidden" })).rejects.toThrow("immutable");
    await expect(db.getRepository(PlanningProjectRevision).update({ project_id: project.id, revision: 1 }, { archived: true })).rejects.toThrow("Immutable");
    await expect(db.getRepository(KitTemplateApproval).delete({ version_id: approved.id })).rejects.toThrow("Immutable");
  });
  it("rolls back child identity collisions without partial replacement", async () => {
    const collision = await request("POST", "/planning-projects", maker, content); expect(collision.status).toBe(409);
    expect(await db.getRepository(PlanningProject).count()).toBe(1);
    expect(await (await request("GET", `/planning-projects/${project.id}`, maker)).json()).toEqual(project);
  });
  it("serializes concurrent writers and rejects stale previews", async () => {
    const { id: _id, updated_at: _date, ...editable } = project;
    const responses = await Promise.all(["First", "Second"].map(notes => request("PUT", `/planning-projects/${project.id}`, maker, { ...editable, notes })));
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect((await request("POST", `/planning-projects/${project.id}/preview`, maker, { revision: 2 })).status).toBe(409);
    project = await (await request("GET", `/planning-projects/${project.id}`, maker)).json(); expect(project.revision).toBe(3);
  });
  it("isolates listing, detail, edits, history, calculation and archive by tenant", async () => {
    expect(await (await request("GET", "/planning-projects", other)).json()).toEqual([]);
    for (const [method, suffix, body] of [["GET", "", undefined], ["GET", "/revisions", undefined], ["POST", "/preview", { revision: 3 }],
      ["POST", "/archive", { revision: 3 }], ["PUT", "", { ...content, revision: 3 }]] as const) {
      expect((await request(method, `/planning-projects/${project.id}${suffix}`, other, body)).status).toBe(404);
    }
  });
  it("uses active tenant UOM conversions and flags incompatible units without trusting historical stock", async () => {
    expect(await db.getRepository(InventoryItem).find({ order: { id: "ASC" } })).toEqual(inventoryBefore);
    // Only this synthetic fixture's metadata changes; stock quantities never change.
    await db.getRepository(InventoryItem).update(fixture.itemId, { unit: "cm" });
    await db.getRepository(UomConversion).save({ organization_id: other.organization_id, from_uom: "m", to_uom: "cm", conversion_factor: 999 });
    let result = await (await request("POST", `/planning-projects/${project.id}/preview`, maker, { revision: 3 })).json();
    expect(result.materials[0].unit).toBe("m"); expect(result.warnings.join(" ")).toContain("Incompatible");
    const conversion = await db.getRepository(UomConversion).save({ organization_id: maker.organization_id, item_id: fixture.itemId, from_uom: "m", to_uom: "cm", conversion_factor: 100 });
    result = await (await request("POST", `/planning-projects/${project.id}/preview`, maker, { revision: 3 })).json();
    expect(result.materials[0]).toMatchObject({ unit: "cm", gross_demand: 360, verified_on_hand: null });
    expect(result.lines.filter((l: { material_id?: string; quantity: number }) => l.material_id && l.quantity > 0).every((l: { conversion_id: string }) => l.conversion_id === conversion.id)).toBe(true);
    await db.getRepository(InventoryItem).update(fixture.itemId, { unit: "m" });
    inventoryBefore = await db.getRepository(InventoryItem).find({ order: { id: "ASC" } });
  });
  it("gates the read-only workspace, reconciles existing contracts and preserves all persisted tables", async () => {
    const original = { flag: process.env.PROJECTS_WORKSPACE_READ_ONLY, orgs: process.env.PROJECTS_WORKSPACE_ORGANIZATIONS };
    const snapshot = async () => {
      const result: Record<string, unknown> = {};
      const tables = await db.query('SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename', [schema]);
      for (const { tablename } of tables) result[tablename] = await db.query(`SELECT count(*)::int rows, md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM "${schema}"."${tablename}" t`);
      return result;
    };
    try {
      const before = await snapshot();
      delete process.env.PROJECTS_WORKSPACE_READ_ONLY;
      expect(await (await request('GET', '/planning-projects/workspace-access', viewer)).json()).toEqual({ enabled: false });
      expect((await request('GET', '/planning-projects/workspace/projects', viewer)).status).toBe(404);
      process.env.PROJECTS_WORKSPACE_READ_ONLY = 'true'; process.env.PROJECTS_WORKSPACE_ORGANIZATIONS = `${maker.organization_id},${other.organization_id}`;
      expect((await request('GET', '/planning-projects/workspace/projects')).status).toBe(401);
      const response = await request('GET', `/planning-projects/workspace/projects/${project.id}`, viewer);
      expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store');
      const detail = await response.json();
      expect(detail.project).toEqual(await (await request('GET', `/planning-projects/${project.id}`, viewer)).json());
      expect(detail.preview).toEqual(await (await request('POST', `/planning-projects/${project.id}/preview`, viewer, { revision: project.revision })).json());
      expect(detail.history).toEqual(await (await request('GET', `/planning-projects/${project.id}/revisions`, viewer)).json());
      expect(detail.versions.map((v: { id: string }) => v.id)).toEqual([approved.id]);
      expect(detail.approvals[0]).toMatchObject({ version_id: approved.id, approved_by: maker.id });
      expect(await (await request('GET', '/planning-projects/workspace/projects', viewer)).json()).toEqual(await (await request('GET', '/planning-projects', viewer)).json());
      expect((await request('GET', `/planning-projects/workspace/projects/${project.id}`, other)).status).toBe(404);
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) expect((await request(method, `/planning-projects/workspace/projects/${project.id}`, maker, {})).status).toBe(405);

      expect(await snapshot()).toEqual(before);
      await db.getRepository(User).update(viewer.id, { is_active: false });
      expect((await request('GET', '/planning-projects/workspace/projects', viewer)).status).toBe(403);
      await db.getRepository(User).update(viewer.id, { is_active: true });
    } finally {
      for (const [key, value] of [['PROJECTS_WORKSPACE_READ_ONLY', original.flag], ['PROJECTS_WORKSPACE_ORGANIZATIONS', original.orgs]]) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    }
  });
  it('blocks unsupported requirement approvals, including concurrent and repeated submissions, without persistence', async () => {
    const keys = ['PROJECTS_WORKSPACE_READ_ONLY', 'PROJECTS_WORKSPACE_ORGANIZATIONS', 'PROJECTS_WORKSPACE_EDITING'];
    const original = keys.map(k => process.env[k]);
    const fingerprint = async () => {
      const result: Record<string, unknown> = {};
      for (const { tablename } of await db.query('SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename', [schema])) {
        result[tablename] = await db.query(`SELECT count(*)::int rows, md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM "${schema}"."${tablename}" t`);
      }
      return result;
    };
    try {
      process.env.PROJECTS_WORKSPACE_READ_ONLY = 'true'; process.env.PROJECTS_WORKSPACE_ORGANIZATIONS = `${maker.organization_id},${other.organization_id}`; process.env.PROJECTS_WORKSPACE_EDITING = 'true';
      const before = await fingerprint();
      const path = `/planning-projects/workspace/projects/${project.id}/approve`;
      const body = { revision: project.revision, site_id: content.sites[0].id };
      expect((await request('POST', path, undefined, body)).status).toBe(401);
      expect((await request('POST', path, viewer, body)).status).toBe(403);
      expect((await request('POST', path, other, body)).status).toBe(405);
      const replies = await Promise.all([body, { ...body, revision: 1 }, body].map(value => request('POST', path, maker, value)));
      expect(replies.map(r => r.status)).toEqual([405, 405, 405]);
      expect((await request('POST', path, maker, body)).status).toBe(405);
      expect((await request('POST', `/planning-projects/${project.id}/approve`, maker, body)).status).toBe(404);
      const detail = await (await request('GET', `/planning-projects/workspace/projects/${project.id}`, viewer)).json();
      expect(detail.project.revision).toBe(project.revision);
      expect(detail.history[0].updated_by).toBe(maker.id);
      expect(detail.history.at(-1).content).toEqual(content);
      expect(await fingerprint()).toEqual(before);
      delete process.env.PROJECTS_WORKSPACE_READ_ONLY;
      expect((await request('POST', path, maker, body)).status).toBe(404);
    } finally { keys.forEach((k, i) => { if (original[i] === undefined) delete process.env[k]; else process.env[k] = original[i]; }); }
  });
  it('allows only opted-in draft saves, rejects cross-school races/retries, and reconciles every table', async () => {
    const keys = ['PROJECTS_WORKSPACE_READ_ONLY', 'PROJECTS_WORKSPACE_ORGANIZATIONS', 'PROJECTS_WORKSPACE_EDITING'];
    const original = keys.map(k => process.env[k]);
    const fresh = structuredClone(content);
    for (const site of fresh.sites) { site.id = randomUUID(); for (const selection of site.selections) selection.id = randomUUID(); }
    const created = await request('POST', '/planning-projects', maker, fresh);
    expect(created.status).toBe(201); const saved = await created.json();
    const path = `/planning-projects/workspace/projects/${saved.id}`;
    const fingerprint = async () => {
      const result: Record<string, unknown> = {};
      for (const { tablename } of await db.query('SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename', [schema])) {
        result[tablename] = await db.query(`SELECT count(*)::int rows, md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM "${schema}"."${tablename}" t`);
      }
      return result;
    };
    try {
      process.env.PROJECTS_WORKSPACE_READ_ONLY = 'true'; process.env.PROJECTS_WORKSPACE_ORGANIZATIONS = `${maker.organization_id},${other.organization_id}`;
      delete process.env.PROJECTS_WORKSPACE_EDITING;
      expect((await request('PUT', path, maker, { ...fresh, revision: 1 })).status).toBe(405);
      process.env.PROJECTS_WORKSPACE_EDITING = 'true';
      expect((await (await request('GET', path, viewer)).json()).canEdit).toBe(false);
      expect((await (await request('GET', path, maker)).json()).canEdit).toBe(true);
      expect((await request('PUT', path, viewer, { ...fresh, revision: 1 }, token(viewer, { role: 'admin' }))).status).toBe(403);
      expect((await request('PUT', path, other, { ...fresh, revision: 1 })).status).toBe(404);
      expect(await (await request('GET', '/planning-projects/workspace/approved-kits', other)).json()).toEqual([]);
      for (const suffix of ['/approve', '/archive', '/dispatch']) expect((await request('POST', `${path}${suffix}`, maker, { revision: 1 })).status).toBe(405);
      const before = await fingerprint();
      const edits = [0, 1].map(index => { const edit = structuredClone(fresh); edit.sites[index].notes = `Concurrent school ${index}`; return { ...edit, revision: 1 }; });
      const replies = await Promise.all(edits.map(edit => request('PUT', path, maker, edit)));
      expect(replies.map(r => r.status).sort()).toEqual([200, 409]);
      const winner = edits[replies.findIndex(r => r.status === 200)];
      expect((await request('PUT', path, maker, winner)).status).toBe(409);
      const detail = await (await request('GET', path, maker)).json();
      expect(detail.project).toMatchObject({ revision: 2, sites: winner.sites });
      expect(detail.history).toHaveLength(2);
      expect(detail.history[0]).toMatchObject({ revision: 2, updated_by: maker.id, content: { sites: winner.sites } });
      expect(detail.history[1].content).toEqual(fresh);
      expect(detail.preview.materials[0]).toMatchObject({ gross_demand: 3.3, verified_on_hand: null, immediate_shortage: null });
      const after = await fingerprint();
      const changed = Object.keys(before).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
      expect(changed.sort()).toEqual(['planning_project_revisions', 'planning_projects', 'planning_sites']);
      delete process.env.PROJECTS_WORKSPACE_READ_ONLY;
      expect((await request('PUT', path, maker, { ...fresh, revision: 2 })).status).toBe(404);
      expect((await (await request('GET', `/planning-projects/${saved.id}`, maker)).json()).revision).toBe(2);
    } finally { keys.forEach((k, i) => { if (original[i] === undefined) delete process.env[k]; else process.env[k] = original[i]; }); }
  });
  it("refuses populated rollback, archives with revision control and never mutates inventory", async () => {
    const runner = db.createQueryRunner(); await runner.connect();
    try { await expect(new AddProjectPlanning1791417600002().down(runner)).rejects.toThrow("Rollback blocked"); } finally { await runner.release(); }
    expect((await request("POST", `/planning-projects/${project.id}/archive`, viewer, { revision: 3 })).status).toBe(403);
    expect((await request("POST", `/planning-projects/${project.id}/archive`, maker, { revision: 2 })).status).toBe(409);
    expect((await request("POST", `/planning-projects/${project.id}/archive`, maker, { revision: 3 })).status).toBe(204);
    expect((await request("GET", `/planning-projects/${project.id}`, maker)).status).toBe(404);
    const history = await (await request("GET", `/planning-projects/${project.id}/revisions`, maker)).json();
    expect(history.map((r: { revision: number }) => r.revision)).toEqual([4, 3, 2, 1]); expect(history[0].archived).toBe(true); expect(history[3].content).toEqual(content);
    expect(await db.getRepository(InventoryItem).find({ order: { id: "ASC" } })).toEqual(inventoryBefore);
    expect(await db.query("SELECT * FROM stock_ledger ORDER BY id")).toEqual(ledgerBefore);
    expect((await db.getRepository(InventoryItem).findOneByOrFail({ id: fixture.itemId })).quantity).toBe(987);
  });
});
