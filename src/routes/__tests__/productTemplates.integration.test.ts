import "reflect-metadata";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { DataSource } from "typeorm";
import express from "express";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { AppDataSource } from "../../db.ts";
import { env } from "../../config/env.ts";
import { User } from "../../entity/User.ts";
import { Organization } from "../../entity/Organization.ts";
import { ProductTemplate } from "../../entity/ProductTemplate.ts";
import { InventoryItem } from "../../entity/InventoryItem.ts";
import { ProductTemplateVersion } from "../../entity/ProductTemplateVersion.ts";
import { ProductTemplateRevision } from "../../entity/ProductTemplateRevision.ts";
import { AddProductTemplates1791417600000 } from "../../migration/1791417600000-AddProductTemplates.ts";
import { AddKitSubjectsAndGrades1791417600001 } from "../../migration/1791417600001-AddKitSubjectsAndGrades.ts";
import { AddProjectPlanning1791417600002 } from "../../migration/1791417600002-AddProjectPlanning.ts";
import { planningEntities } from "../../entity/PlanningProject.ts";
import { productTemplateRouter } from "../v1/product-templates.ts";
import { ProductTemplateService } from "../../services/ProductTemplateService.ts";

const databaseUrl = process.env.KIT_BUILDER_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("PostgreSQL draft-kit CRUD and authorization", () => {
  let db: DataSource;
  let server: Server;
  let base: string;
  let maker: User;
  let viewer: User;
  let other: User;
  let kitId: string;
  let structureKitId = "";
  let structureVersionId = "";
  let structure: { id: string; name: string; grades: { id: string; name: string; activities: never[] }[] }[] = [];
  const schema = `kit_test_${randomUUID().replaceAll("-", "")}`;
  const token = (user: User, changes = {}) => jwt.sign({ sub: user.id, orgId: user.organization_id, role: user.role, ...changes }, env.jwtSecret, { expiresIn: "5m" });
  async function request(method: string, path = "", user?: User, body?: unknown, customToken?: string) {
    return fetch(`${base}/api/v1/product-templates${path}`, { method,
      headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${customToken ?? token(user)}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/experimind_kitbuilder_test") throw new Error("Refusing non-development test database");
    const admin = new DataSource({ type: "postgres", url: databaseUrl });
    await admin.initialize();
    try { await admin.query(`CREATE SCHEMA "${schema}"`); } finally { await admin.destroy(); }
    const options = { type: "postgres" as const, entities: AppDataSource.options.entities, uuidExtension: "pgcrypto" as const, url: databaseUrl, schema, ssl: false,
      extra: { options: `-c search_path=${schema},public` }, migrations: [] };
    const bootstrap = new DataSource({ ...options,
      entities: (AppDataSource.options.entities as Function[]).filter(entity => entity !== ProductTemplate && entity !== ProductTemplateVersion && entity !== ProductTemplateRevision && !planningEntities.some(p => p === entity)),
    });
    await bootstrap.initialize();
    await bootstrap.synchronize();
    // Only these additive migrations, inside this new synthetic schema.
    const runner = bootstrap.createQueryRunner();
    await runner.connect(); await runner.startTransaction();
    try {
      await new AddProductTemplates1791417600000().up(runner);
      await new AddKitSubjectsAndGrades1791417600001().up(runner);
      await new AddProjectPlanning1791417600002().up(runner);
      await runner.commitTransaction();
    }
    catch (error) { await runner.rollbackTransaction(); throw error; }
    finally { await runner.release(); await bootstrap.destroy(); }
    db = new DataSource(options);
    await db.initialize();
    const orgA = await db.getRepository(Organization).save({ name: `A-${schema}` });
    const orgB = await db.getRepository(Organization).save({ name: `B-${schema}` });
    maker = await db.getRepository(User).save({ organization_id: orgA.id, email: "maker@test.invalid", name: "Maker", role: "staff", firebase_uid: null });
    viewer = await db.getRepository(User).save({ organization_id: orgA.id, email: "viewer@test.invalid", name: "Viewer", role: "viewer", firebase_uid: null });
    other = await db.getRepository(User).save({ organization_id: orgB.id, email: "other@test.invalid", name: "Other", role: "admin", firebase_uid: null });
    await startServer();
  }, 30000);
  async function startServer() {
    const app = express(); app.use(express.json()); app.use("/api/v1/product-templates", productTemplateRouter(db));
    server = await new Promise<Server>(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing port");
    base = `http://127.0.0.1:${address.port}`;
  }
  async function closeServer() { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  afterAll(async () => { if (server) await closeServer(); if (db?.isInitialized) await db.destroy(); });

  it("requires authentication on every CRUD endpoint", async () => {
    for (const [method, path] of [["GET", ""], ["POST", ""], ["GET", `/${randomUUID()}`], ["PUT", `/${randomUUID()}`], ["POST", `/${randomUUID()}/archive`]]) expect((await request(method, path)).status).toBe(401);
    expect((await request("GET", `?token=${token(maker)}`)).status).toBe(401);
    expect((await request("GET", "", maker, undefined, "invalid")).status).toBe(401);
  });
  it("starts empty and creates a generic Prastuti draft without a spreadsheet", async () => {
    expect(await (await request("GET", "", maker)).json()).toEqual([]);
    const response = await request("POST", "", maker, { name: " Prastuti ", description: "A kit authored in the ERP", category: "Science" });
    expect(response.status).toBe(201);
    const kit = await response.json(); kitId = kit.template_id;
    expect(kit).toMatchObject({ name: "Prastuti", status: "draft", revision: 1, version_number: 1, organization_id: maker.organization_id });
  });
  it("validates names, lengths, types and rejects ownership/status fields", async () => {
    for (const body of [{ name: " " }, { name: 1 }, { name: "x".repeat(201) }, { name: "Kit", category: "x".repeat(101) }, { name: "Kit", description: "x".repeat(5001) }, { name: "Kit", organization_id: other.organization_id }, { name: "Kit", status: "published" }, null, []]) expect((await request("POST", "", maker, body)).status).toBe(400);
    expect((await request("GET", "/not-a-uuid", maker)).status).toBe(400);
  });
  it("permits viewer reads but denies all writes even with a forged role claim", async () => {
    expect((await request("GET", `/${kitId}`, viewer)).status).toBe(200);
    expect((await request("POST", "", viewer, { name: "Kit" }, token(viewer, { role: "admin" }))).status).toBe(403);
    expect((await request("PUT", `/${kitId}`, viewer, { name: "Changed", revision: 1 })).status).toBe(403);
    expect((await request("POST", `/${kitId}/archive`, viewer, { revision: 1 })).status).toBe(403);
  });
  it("isolates listing, view, edit and archive from other tenants", async () => {
    expect(await (await request("GET", "", other)).json()).toEqual([]);
    expect((await request("GET", `/${kitId}`, other)).status).toBe(404);
    expect((await request("PUT", `/${kitId}`, other, { name: "Intrusion", revision: 1 })).status).toBe(404);
    expect((await request("POST", `/${kitId}/archive`, other, { revision: 1 })).status).toBe(404);
    expect((await request("GET", "", maker, undefined, token(maker, { orgId: other.organization_id }))).status).toBe(403);
    expect((await request("GET", "", maker, undefined, token(maker, { orgId: undefined }))).status).toBe(403);
  });
  it("persists across HTTP server and TypeORM connection restart", async () => {
    await closeServer(); await db.destroy(); await db.initialize(); await startServer();
    const kit = await (await request("GET", `/${kitId}`, maker)).json();
    expect(kit.name).toBe("Prastuti");
    const saved = await request("PUT", `/${kitId}`, maker, { name: "Prastuti", description: "Edited after restart", category: "Custom", revision: kit.revision });
    expect(saved.status).toBe(200); expect(await saved.json()).toMatchObject({ revision: 2, description: "Edited after restart" });
  });
  it("rejects stale saves and concurrent writers without lost edits", async () => {
    const requests = await Promise.all(["First", "Second"].map(description => request("PUT", `/${kitId}`, maker, { name: "Prastuti", description, category: "Custom", revision: 2 })));
    expect(requests.map(response => response.status).sort()).toEqual([200, 409]);
    expect((await request("PUT", `/${kitId}`, maker, { name: "Stale", revision: 1 })).status).toBe(409);
  });
  it("rejects inactive users and rolls back failed creation", async () => {
    await db.getRepository(User).update(maker.id, { is_active: false });
    expect((await request("GET", "", maker)).status).toBe(403);
    await db.getRepository(User).update(maker.id, { is_active: true });
    const count = await db.getRepository(ProductTemplate).count();
    // DB version constraint fails after identity insertion; the real create service must roll both back.
    await expect(new ProductTemplateService(db).create({ name: "", description: "", category: "" }, maker.organization_id, maker.id)).rejects.toThrow();
    expect(await db.getRepository(ProductTemplate).count()).toBe(count);
  });
  it("rejects changing non-draft versions and cross-tenant parent links", async () => {
    await db.getRepository(ProductTemplateVersion).update({ template_id: kitId }, { status: "archived" });
    expect((await request("PUT", `/${kitId}`, maker, { name: "Changed publication", revision: 3 })).status).toBe(409);
    expect((await request("POST", `/${kitId}/archive`, maker, { revision: 3 })).status).toBe(409);
    await expect(db.getRepository(ProductTemplateVersion).save({ template_id: kitId, organization_id: other.organization_id,
      version_number: 2, name: "Invalid tenant link", created_by: other.id, updated_by: other.id })).rejects.toThrow();
    await db.getRepository(ProductTemplateVersion).update({ template_id: kitId }, { status: "draft" });
  });
  it("archives drafts without deleting saved records or touching inventory", async () => {
    expect((await request("POST", `/${kitId}/archive`, maker, { revision: 1 })).status).toBe(409);
    expect((await request("POST", `/${kitId}/archive`, maker, { revision: 3 })).status).toBe(204);
    expect((await request("GET", `/${kitId}`, maker)).status).toBe(404);
    expect(await (await request("GET", "", maker)).json()).toEqual([]);
    expect(await db.getRepository(ProductTemplate).count()).toBe(1);
    expect(await db.getRepository(ProductTemplateVersion).findOneBy({ template_id: kitId })).toMatchObject({ status: "archived", revision: 4 });
    expect((await db.query("SELECT count(*) FROM inventory_items"))[0].count).toBe("0");
    expect((await db.query("SELECT count(*) FROM stock_ledger"))[0].count).toBe("0");
  });
  it("creates a kit with subjects and grades and snapshots the revision immutably", async () => {
    structure = [
      { id: randomUUID(), name: "Science", grades: [{ id: randomUUID(), name: "Grade 8", activities: [] }, { id: randomUUID(), name: "Grade 9", activities: [] }, { id: randomUUID(), name: "Grade 10", activities: [] }] },
      { id: randomUUID(), name: "Mathematics", grades: [{ id: randomUUID(), name: "Grade 8", activities: [] }, { id: randomUUID(), name: "Grade 9", activities: [] }, { id: randomUUID(), name: "Grade 10", activities: [] }] },
    ];
    const response = await request("POST", "", maker, { name: "Prastuti Structure", subjects: structure });
    expect(response.status).toBe(201);
    const kit = await response.json(); structureKitId = kit.template_id; structureVersionId = kit.id;
    expect(kit.subjects).toEqual(structure);
    const snapshots = await db.getRepository(ProductTemplateRevision).find({ where: { version_id: structureVersionId }, order: { revision: "ASC" } });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({ revision: 1, name: "Prastuti Structure", status: "draft", subjects: structure });
  });
  it("rejects invalid subject and grade structures", async () => {
    for (const subjects of [
      "Science", [{ id: "not-a-uuid", name: "Science" }],
      [{ id: randomUUID(), name: "Science" }, { id: randomUUID(), name: "science" }],
      [{ id: randomUUID(), name: "Science", grades: [{ id: randomUUID(), name: "Grade 8" }, { id: randomUUID(), name: "GRADE 8" }] }],
      [{ id: randomUUID(), name: "" }], [{ id: randomUUID(), name: "x".repeat(101) }],
      [{ id: randomUUID(), name: "Science", grades: "Grade 8" }],
      [{ id: randomUUID(), name: "Science", grades: [{ id: randomUUID(), name: "" }] }],
      Array.from({ length: 101 }, () => ({ id: randomUUID(), name: "S" })),
    ]) expect((await request("POST", "", maker, { name: "Kit", subjects })).status).toBe(400);
    const shared = randomUUID();
    expect((await request("POST", "", maker, { name: "Kit", subjects: [{ id: shared, name: "Science" }, { id: shared, name: "Maths" }] })).status).toBe(400);
    // Entries without identifiers receive server-assigned UUIDs.
    const auto = await request("POST", "", maker, { name: "Auto Identified", subjects: [{ name: "Science", grades: [{ name: "Grade 8" }] }] });
    expect(auto.status).toBe(201);
    const autoKit = await auto.json();
    expect(autoKit.subjects[0].grades[0]).toMatchObject({ name: "Grade 8" });
  });
  it("renames, reorders and removes subjects and grades while keeping identifiers stable", async () => {
    const [science, maths] = structure;
    const reordered = [
      { id: maths.id, name: "Mathematics", grades: [maths.grades[1], maths.grades[0], maths.grades[2]] },
      { id: science.id, name: "Natural Science", grades: science.grades.filter(grade => grade.name !== "Grade 9") },
    ];
    const response = await request("PUT", `/${structureKitId}`, maker, { name: "Prastuti Structure", subjects: reordered, revision: 1 });
    expect(response.status).toBe(200);
    const kit = await response.json();
    expect(kit.revision).toBe(2);
    expect(kit.subjects.map((s: { id: string; name: string }) => `${s.id}:${s.name}`))
      .toEqual([`${maths.id}:Mathematics`, `${science.id}:Natural Science`]);
    expect(kit.subjects[0].grades.map((g: { id: string }) => g.id)).toEqual([maths.grades[1].id, maths.grades[0].id, maths.grades[2].id]);
    expect(kit.subjects[1].grades.map((g: { id: string }) => g.id)).toEqual([science.grades[0].id, science.grades[2].id]);
    expect((await request("PUT", `/${structureKitId}`, maker, { name: "Stale", revision: 1 })).status).toBe(409);
    expect((await request("PUT", `/${structureKitId}`, other, { name: "Intrusion", revision: 2 })).status).toBe(404);
    const snapshots = await db.getRepository(ProductTemplateRevision).find({ where: { version_id: structureVersionId }, order: { revision: "ASC" } });
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toMatchObject({ revision: 1, name: "Prastuti Structure", subjects: structure });
    expect(snapshots[1]).toMatchObject({ revision: 2, name: "Prastuti Structure", subjects: reordered });
  });
  it("creates, edits, reorders and removes activities and materials on a draft kit", async () => {
    const beaker = await db.getRepository(InventoryItem).save({ organization_id: maker.organization_id, sku: "LAB-BEAKER", name: "Beaker 250ml", category: "Lab", base_price: 120, quantity: 40, threshold: 5 });
    const funnel = await db.getRepository(InventoryItem).save({ organization_id: maker.organization_id, sku: "LAB-FUNNEL", name: "Funnel", category: "Lab", base_price: 45, quantity: 12, threshold: 3 });
    const inventoryCount = await db.getRepository(InventoryItem).count();
    const activityId = randomUUID();
    const materialId = randomUUID();
    const subjects = [{
      id: randomUUID(), name: "Science", grades: [{
        id: randomUUID(), name: "Grade 8", activities: [{
          id: activityId, code: "8.4.1", name: "Separating mixtures", description: "Filter a mixture", instructions: "Pour and observe",
          materials: [
            { id: materialId, inventory_item_id: beaker.id, item_name: "Beaker 250ml", quantity: 2, unit: "pcs" },
            { inventory_item_id: funnel.id, item_name: "Funnel", quantity: 0 },
          ],
        }],
      }],
    }];
    const created = await request("POST", "", maker, { name: "Activity Kit", subjects });
    expect(created.status).toBe(201);
    const kit = await created.json();
    const activity = kit.subjects[0].grades[0].activities[0];
    expect(activity).toMatchObject({ id: activityId, code: "8.4.1", name: "Separating mixtures", description: "Filter a mixture", instructions: "Pour and observe" });
    expect(activity.materials[0]).toMatchObject({ id: materialId, inventory_item_id: beaker.id, item_name: "Beaker 250ml", quantity: 2, complete: true });
    expect(activity.materials[1]).toMatchObject({ quantity: 0, unit: "pcs", complete: false });
    const snapshots = await db.getRepository(ProductTemplateRevision).find({ where: { version_id: kit.id }, order: { revision: "ASC" } });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].subjects[0].grades[0].activities[0].materials).toHaveLength(2);
    // Reorder the activity, complete the second material, then remove the first material.
    const edited = [{
      id: kit.subjects[0].id, name: "Science", grades: [{
        id: kit.subjects[0].grades[0].id, name: "Grade 8", activities: [{
          ...kit.subjects[0].grades[0].activities[0],
          materials: [
            { ...kit.subjects[0].grades[0].activities[0].materials[1], quantity: 1 },
            kit.subjects[0].grades[0].activities[0].materials[0],
          ],
        }],
      }],
    }];
    const updated = await request("PUT", `/${kit.template_id}`, maker, { name: "Activity Kit", subjects: edited, revision: kit.revision });
    expect(updated.status).toBe(200);
    const saved = await updated.json();
    expect(saved.revision).toBe(2);
    expect(saved.subjects[0].grades[0].activities[0].materials.map((m: { id: string }) => m.id)).toEqual([kit.subjects[0].grades[0].activities[0].materials[1].id, materialId]);
    expect(saved.subjects[0].grades[0].activities[0].materials[0]).toMatchObject({ quantity: 1, complete: true });
    const afterSnapshots = await db.getRepository(ProductTemplateRevision).find({ where: { version_id: kit.id }, order: { revision: "ASC" } });
    expect(afterSnapshots).toHaveLength(2);
    expect(afterSnapshots[0].subjects[0].grades[0].activities[0].materials).toHaveLength(2);
    expect(afterSnapshots[1].subjects[0].grades[0].activities[0].materials).toHaveLength(2);
    // Saving kits must never mutate the inventory master.
    expect(await db.getRepository(InventoryItem).count()).toBe(inventoryCount);
    const reloadedBeaker = await db.getRepository(InventoryItem).findOneBy({ id: beaker.id });
    expect(reloadedBeaker).toMatchObject({ quantity: 40, name: "Beaker 250ml" });
  });
  it("validates activity and material structures", async () => {
    const item = await db.getRepository(InventoryItem).save({ organization_id: maker.organization_id, sku: "LAB-FLASK", name: "Flask", category: "Lab", base_price: 90, quantity: 8, threshold: 2 });
    const gradeId = randomUUID();
    const base = { id: randomUUID(), name: "Science", grades: [{ id: gradeId, name: "Grade 8", activities: [] }] };
    for (const activities of [
      "Separating mixtures",
      [null],
      [{ name: "" }],
      [{ name: "x".repeat(101) }],
      [{ name: "Mix", code: "x".repeat(51) }],
      [{ name: "Mix", description: "x".repeat(2001) }],
      [{ name: "Mix", instructions: "x".repeat(5001) }],
      [{ name: "Mix", reference_url: "x".repeat(501) }],
      [{ name: "Mix", materials: "Flask" }],
      [{ name: "Mix", materials: [{ inventory_item_id: "not-a-uuid", item_name: "Flask", quantity: 1 }] }],
      [{ name: "Mix", materials: [{ inventory_item_id: item.id, item_name: "", quantity: 1 }] }],
      [{ name: "Mix", materials: [{ inventory_item_id: item.id, item_name: "Flask", quantity: -1 }] }],
      [{ name: "Mix", materials: [{ inventory_item_id: item.id, item_name: "Flask", quantity: 1 }, { inventory_item_id: item.id, item_name: "Flask", quantity: 2 }] }],
      [{ name: "Mix" }, { name: "mix" }],
      Array.from({ length: 101 }, () => ({ name: "Mix" })),
    ]) expect((await request("POST", "", maker, { name: "Kit", subjects: [{ ...base, grades: [{ id: gradeId, name: "Grade 8", activities }] }] })).status).toBe(400);
  });
  it("rejects materials referencing items from other tenants or missing items", async () => {
    const foreign = await db.getRepository(InventoryItem).save({ organization_id: other.organization_id, sku: "OTHER-ITEM", name: "Foreign item", category: "Lab", base_price: 10, quantity: 5, threshold: 1 });
    const subjects = [{ id: randomUUID(), name: "Science", grades: [{ id: randomUUID(), name: "Grade 8", activities: [{ name: "Mix", materials: [{ inventory_item_id: foreign.id, item_name: "Foreign item", quantity: 1 }] }] }] }];
    expect((await request("POST", "", maker, { name: "Kit", subjects })).status).toBe(400);
    const missing = [{ id: randomUUID(), name: "Science", grades: [{ id: randomUUID(), name: "Grade 8", activities: [{ name: "Mix", materials: [{ inventory_item_id: randomUUID(), item_name: "Ghost item", quantity: 1 }] }] }] }];
    expect((await request("POST", "", maker, { name: "Kit", subjects: missing })).status).toBe(400);
    // The same reference is accepted for the owning tenant.
    const own = await request("POST", "", other, { name: "Other Kit", subjects });
    expect(own.status).toBe(201);
  });
  it("serves the material picker with tenant isolation and authentication", async () => {
    expect((await request("GET", "/materials?q=beaker")).status).toBe(401);
    const makerResults = await (await request("GET", "/materials?q=beaker", maker)).json();
    expect(makerResults).toHaveLength(1);
    expect(makerResults[0]).toMatchObject({ sku: "LAB-BEAKER", name: "Beaker 250ml", unit: "pcs" });
    expect(makerResults[0].quantity).toBeUndefined();
    expect(makerResults[0].base_price).toBeUndefined();
    expect(await (await request("GET", "/materials?q=beaker", other)).json()).toEqual([]);
    expect((await request("GET", "/materials?q=beaker", viewer)).status).toBe(200);
    expect((await request("GET", "/materials?q=" + "x".repeat(101), maker)).status).toBe(400);
  });
  it("persists dynamic packing, activity links and independent inventory assignments through restart", async () => {
    const item = await db.getRepository(InventoryItem).save({ organization_id: maker.organization_id, sku: "PACK-ITEM", name: "Packing component", category: "Lab", base_price: 5, quantity: 15, threshold: 1 });
    const before = await db.getRepository(InventoryItem).find({ order: { id: "ASC" } });
    const activities = ["Activity A", "Activity B"].map(name => ({ id: randomUUID(), name, materials: [{ inventory_item_id: item.id, item_name: item.name, quantity: 2 }] }));
    const unit = (kind: string, name: string, children: unknown[] = [], activity_ids: string[] = [], inventory_item_ids: string[] = []) => ({ id: randomUUID(), kind, name, code: name, notes: "Handle carefully", children, activity_ids, inventory_item_ids });
    const pouches = [unit("pouch", "Pouch A", [], activities.map(activity => activity.id), [item.id]), unit("pouch", "Pouch B", [], [activities[0].id])];
    const packing = [unit("box", "Box A", [unit("partition", "Partition A", pouches), unit("partition", "Partition B")], [], [item.id]), unit("box", "Box B")];
    const created = await request("POST", "", maker, { name: "Packing Kit", subjects: [{ name: "Science", grades: [{ name: "Grade 8", activities, packing }] }] });
    expect(created.status).toBe(201);
    const kit = await created.json();
    expect(kit.subjects[0].grades[0].packing).toMatchObject(packing);
    expect(kit.subjects[0].grades[0].packing[0].inventory_labels).toEqual({ [item.id]: item.name });
    await closeServer(); await db.destroy(); await db.initialize(); await startServer();
    const reloaded = await (await request("GET", `/${kit.template_id}`, maker)).json();
    expect(reloaded.subjects).toEqual(kit.subjects);
    expect(reloaded.subjects[0].grades[0].activities.map((activity: { materials: unknown[] }) => activity.materials)).toEqual(kit.subjects[0].grades[0].activities.map((activity: { materials: unknown[] }) => activity.materials));
    const edited = structuredClone(kit.subjects);
    const grade = edited[0].grades[0];
    grade.packing.reverse(); grade.packing[1].children.reverse(); grade.packing[1].children[1].children.reverse();
    grade.packing[1].name = "Renamed box"; grade.packing[1].notes = "Updated notes";
    const contenders = await Promise.all(["First edit", "Second edit"].map(description => request("PUT", `/${kit.template_id}`, maker, { name: kit.name, description, subjects: edited, revision: 1 })));
    expect(contenders.map(response => response.status).sort()).toEqual([200, 409]);
    const saved = await (await request("GET", `/${kit.template_id}`, maker)).json();
    expect(saved.subjects).toEqual(edited);
    const snapshots = await db.getRepository(ProductTemplateRevision).find({ where: { version_id: kit.id }, order: { revision: "ASC" } });
    expect(snapshots).toHaveLength(2); expect(snapshots[0].subjects).toEqual(kit.subjects);
    expect((await request("GET", `/${kit.template_id}/revisions`)).status).toBe(401);
    expect((await request("GET", `/${kit.template_id}/revisions`, other)).status).toBe(404);
    const history = await (await request("GET", `/${kit.template_id}/revisions`, viewer)).json();
    expect(history.map((row: { revision: number }) => row.revision)).toEqual([2, 1]);
    expect(history[1].subjects).toEqual(kit.subjects);
    const dangling = structuredClone(edited); dangling[0].grades[0].activities = [];
    expect((await request("PUT", `/${kit.template_id}`, maker, { name: kit.name, subjects: dangling, revision: 2 })).status).toBe(400);
    const foreign = await db.getRepository(InventoryItem).save({ organization_id: other.organization_id, sku: "FOREIGN-PACK", name: "Foreign packing component", category: "Lab", base_price: 5, quantity: 15, threshold: 1 });
    for (const id of [foreign.id, randomUUID()]) {
      const invalid = structuredClone(edited); invalid[0].grades[0].packing[0].inventory_item_ids = [id];
      expect((await request("PUT", `/${kit.template_id}`, maker, { name: kit.name, subjects: invalid, revision: 2 })).status).toBe(400);
    }
    expect((await request("PUT", `/${kit.template_id}`, viewer, { name: kit.name, subjects: edited, revision: 2 }, token(viewer, { role: "admin" }))).status).toBe(403);
    expect((await request("GET", `/${kit.template_id}`, other)).status).toBe(404);
    expect((await request("PUT", `/${kit.template_id}`, other, { name: kit.name, subjects: edited, revision: 2 })).status).toBe(404);
    expect(await db.getRepository(ProductTemplateRevision).count({ where: { version_id: kit.id } })).toBe(2);
    // Remove an entire box and its assignments atomically; earlier snapshots retain it.
    grade.packing = grade.packing.slice(0, 1); grade.activities = [];
    expect((await request("PUT", `/${kit.template_id}`, maker, { name: kit.name, subjects: edited, revision: 2 })).status).toBe(200);
    expect((await db.getRepository(ProductTemplateRevision).findOneByOrFail({ version_id: kit.id, revision: 1 })).subjects).toEqual(kit.subjects);
    expect(await db.getRepository(InventoryItem).find({ where: { organization_id: maker.organization_id }, order: { id: "ASC" } })).toEqual(before.filter(row => row.organization_id === maker.organization_id));
    await db.getRepository(ProductTemplateVersion).update(kit.id, { status: "published" });
    expect((await request("PUT", `/${kit.template_id}`, maker, { name: kit.name, subjects: edited, revision: 3 })).status).toBe(409);
  });
  it("persists crate CRUD and rules across restart with immutable snapshots, tenant isolation and concurrency", async () => {
    const item = await db.getRepository(InventoryItem).save({ organization_id: maker.organization_id, sku: "CRATE-ITEM", name: "Crate component", category: "Lab", base_price: 5, quantity: 123, threshold: 1 });
    const foreign = await db.getRepository(InventoryItem).save({ organization_id: other.organization_id, sku: "FOREIGN-CRATE", name: "Foreign component", category: "Lab", base_price: 5, quantity: 15, threshold: 1 });
    const before = await db.getRepository(InventoryItem).find({ order: { id: "ASC" } });
    const ledgerBefore = await db.query('SELECT * FROM stock_ledger ORDER BY id');
    const scienceId = randomUUID(); const grades = [8, 9, 10].map(number => ({ id: randomUUID(), name: `Grade ${number}`, activities: [] }));
    const components = grades.map(grade => ({ subject_id: scienceId, grade_id: grade.id, quantity: 1 }));
    const material = () => ({ id: randomUUID(), inventory_item_id: item.id, item_name: item.name, quantity: 2, unit: "pcs", notes: "Shared supply", reusable: true });
    const crates = components.map((component, index) => ({ id: randomUUID(), name: `Science ${index + 8} common`, kind: "common", materials: [material()], reusable: true, rule: { kind: "selected_sets", components: [component] } }));
    crates.push({ id: randomUUID(), name: "Universal", kind: "universal", materials: [material()], reusable: true, rule: { kind: "complete_sets", components } });
    const mathGrade = randomUUID();
    const subjects = [{ id: scienceId, name: "Science", grades, crates }, { id: randomUUID(), name: "Mathematics", grades: [{ id: mathGrade, name: "Grade 8", activities: [{ id: randomUUID(), name: "Math activity", materials: [material()] }] }] }];
    const response = await request("POST", "", maker, { name: "Crate acceptance", subjects }); expect(response.status).toBe(201);
    const kit = await response.json(); const path = `/${kit.template_id}`;
    const context = { grade_quantities: Object.fromEntries(grades.map(grade => [grade.id, 2])), complete_sets: { [crates[3].id]: 2 } };
    const preview = await request("POST", `${path}/preview`, viewer, { revision: 1, context }); expect(preview.status).toBe(200);
    const result = await preview.json(); expect(result.revision).toBe(1); expect(result.lines.filter((line: { unit: string }) => line.unit === "crates").map((line: { quantity: number }) => line.quantity)).toEqual([2, 2, 2, 2]);
    expect(result.totals).toEqual([{ inventory_item_id: item.id, unit: "pcs", quantity: 16 }]);
    const partial = { grade_quantities: { [grades[0].id]: 1, [mathGrade]: 3 }, complete_sets: { [crates[3].id]: 0 } };
    expect((await (await request("POST", `${path}/preview`, maker, { revision: 1, context: partial })).json()).totals[0].quantity).toBe(8);
    expect((await request("POST", `${path}/preview`, maker, { revision: 1, context: { grade_quantities: context.grade_quantities } })).status).toBe(400);
    expect((await request("POST", `${path}/preview`, maker, { revision: 1, context: { ...partial, complete_sets: { [crates[3].id]: 1 } } })).status).toBe(400);
    expect((await request("POST", `${path}/preview`, other, { revision: 1, context })).status).toBe(404);
    expect((await request("POST", `${path}/preview`, undefined, { revision: 1, context })).status).toBe(401);
    expect((await request("POST", `${path}/preview`, maker, { revision: 1, context, status: "approved" })).status).toBe(400);
    for (const inventoryId of [foreign.id, randomUUID()]) {
      const invalid = structuredClone(kit.subjects); invalid[0].crates[0].materials[0].inventory_item_id = inventoryId;
      expect((await request("PUT", path, maker, { name: kit.name, subjects: invalid, revision: 1 })).status).toBe(400);
    }
    expect((await request("PUT", path, other, { name: kit.name, subjects: kit.subjects, revision: 1 })).status).toBe(404);
    expect((await request("PUT", path, viewer, { name: kit.name, subjects: kit.subjects, revision: 1 })).status).toBe(403);
    await closeServer(); await db.destroy(); await db.initialize(); await startServer();
    expect((await (await request("GET", path, maker)).json()).subjects).toEqual(kit.subjects);
    const edited = structuredClone(kit.subjects); edited[0].crates.reverse(); edited[0].crates[0].name = "Universal edited"; edited[0].crates[0].notes = "Keep dry"; edited[0].crates[0].materials[0].quantity = 3;
    const contenders = await Promise.all(["A", "B"].map(description => request("PUT", path, maker, { name: kit.name, description, subjects: edited, revision: 1 })));
    expect(contenders.map(response => response.status).sort()).toEqual([200, 409]);
    expect((await request("POST", `${path}/preview`, viewer, { revision: 1, context })).status).toBe(409);
    expect((await (await request("GET", path, maker)).json()).subjects).toEqual(edited);
    const invalid = structuredClone(edited); invalid[0].grades.pop();
    expect((await request("PUT", path, maker, { name: kit.name, subjects: invalid, revision: 2 })).status).toBe(400);
    edited[0].crates = edited[0].crates.slice(1);
    expect((await request("PUT", path, maker, { name: kit.name, subjects: edited, revision: 2 })).status).toBe(200);
    const history = await (await request("GET", `${path}/revisions`, viewer)).json();
    expect(history.map((row: { revision: number }) => row.revision)).toEqual([3, 2, 1]); expect(history[2].subjects).toEqual(kit.subjects);
    await db.getRepository(ProductTemplateVersion).update(kit.id, { status: "published" });
    expect((await request("PUT", path, maker, { name: kit.name, subjects: edited, revision: 3 })).status).toBe(409);
    expect((await db.getRepository(ProductTemplateVersion).findOneByOrFail({ id: kit.id })).subjects).toEqual(edited);
    expect(await db.getRepository(InventoryItem).find({ order: { id: "ASC" } })).toEqual(before);
    expect(await db.query('SELECT * FROM stock_ledger ORDER BY id')).toEqual(ledgerBefore);
  });
  it("rolls the subjects migration back and reapplies it", async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await new AddProjectPlanning1791417600002().down(runner);
      await new AddKitSubjectsAndGrades1791417600001().down(runner);
      let columns = await runner.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'product_template_versions' AND column_name = 'subjects'`);
      expect(columns).toHaveLength(0);
      expect((await runner.query(`SELECT count(*) FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = 'product_template_revisions'`))[0].count).toBe("0");
      await new AddKitSubjectsAndGrades1791417600001().up(runner);
      await new AddProjectPlanning1791417600002().up(runner);
      columns = await runner.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'product_template_versions' AND column_name = 'subjects'`);
      expect(columns).toHaveLength(1);
      await runner.commitTransaction();
    } catch (error) { await runner.rollbackTransaction(); throw error; }
    finally { await runner.release(); }
  });

  it("gates live Studio reads, preserves snapshots and introduces no database mutations", async () => {
    const previous = { NODE_ENV: process.env.NODE_ENV, KIT_STUDIO_READ_ONLY: process.env.KIT_STUDIO_READ_ONLY, KIT_STUDIO_ORGANIZATIONS: process.env.KIT_STUDIO_ORGANIZATIONS };
    try {
      process.env.NODE_ENV = "test"; delete process.env.KIT_STUDIO_READ_ONLY;
      expect((await request("GET", "/studio-access", viewer)).status).toBe(200);
      expect(await (await request("GET", "/studio-access", viewer)).json()).toEqual({ enabled: false });
      expect((await request("GET", "/studio", viewer)).status).toBe(404);
      process.env.KIT_STUDIO_READ_ONLY = "true"; process.env.KIT_STUDIO_ORGANIZATIONS = maker.organization_id;
      const created = await (await request("POST", "", maker, { name: "Studio snapshot", subjects: [{ id: randomUUID(), name: "Science", grades: [{ id: randomUUID(), name: "Grade 8", activities: [] }] }] })).json();
      const service = new ProductTemplateService(db);
      const approved = await service.approve(created.template_id, maker.organization_id, maker.id, 1);
      const changed = await service.change(created.template_id, maker.organization_id, maker.id, 1, { name: "Later draft", description: created.description, category: created.category, subjects: created.subjects });
      const path = `/${created.template_id}/studio`;
      const tables = ['product_templates', 'product_template_versions', 'product_template_revisions', 'kit_template_approvals', 'inventory_items', 'stock_ledger'];
      const before = await Promise.all(tables.map(table => db.query(`SELECT * FROM ${table} ORDER BY 1`)));
      expect((await request("GET", "/studio")).status).toBe(401);
      expect((await request("GET", "/studio", other)).status).toBe(404);
      expect((await request("GET", path, viewer, undefined, token(viewer, { orgId: other.organization_id }))).status).toBe(403);
      const response = await request("GET", path, viewer);
      expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
      const bundle = await response.json(); expect(bundle.draft.name).toBe(changed.name); expect(bundle.draft.revision).toBe(2); expect(bundle.history[1].subjects).toEqual(created.subjects); expect(bundle.approved[0]).toMatchObject({ id: approved.id, name: created.name, revision: 1, status: 'published' });
      const originalView = ProductTemplateService.prototype.view;
      let reads = 0;
      const spy = vi.spyOn(ProductTemplateService.prototype, 'view').mockImplementation(async function (id, org) {
        const value = await originalView.call(this, id, org); return ++reads >= 2 ? { ...value, revision: value.revision + 1 } : value;
      });
      try { expect((await request('GET', path, viewer)).status).toBe(409); } finally { spy.mockRestore(); }
      process.env.KIT_STUDIO_ORGANIZATIONS += `,${other.organization_id}`;
      expect((await request("GET", path, other)).status).toBe(404);
      await db.getRepository(User).update(viewer.id, { is_active: false });
      expect((await request("GET", path, viewer)).status).toBe(403);
      await db.getRepository(User).update(viewer.id, { is_active: true });
      process.env.NODE_ENV = "production";
      expect((await request("GET", path, viewer)).status).toBe(404);
      process.env.NODE_ENV = "test"; process.env.KIT_STUDIO_READ_ONLY = "false";
      expect((await request("GET", path, viewer)).status).toBe(404);
      expect((await request("GET", `/${created.template_id}`, viewer)).status).toBe(200);
      expect(await Promise.all(tables.map(table => db.query(`SELECT * FROM ${table} ORDER BY 1`)))).toEqual(before);
    } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
  });

});
