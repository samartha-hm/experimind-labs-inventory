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
import { ProductTemplate } from "../../entity/ProductTemplate.ts";
import { ProductTemplateVersion } from "../../entity/ProductTemplateVersion.ts";
import { ProductTemplateRevision } from "../../entity/ProductTemplateRevision.ts";
import { AddProductTemplates1791417600000 } from "../../migration/1791417600000-AddProductTemplates.ts";
import { AddKitSubjectsAndGrades1791417600001 } from "../../migration/1791417600001-AddKitSubjectsAndGrades.ts";
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
  let structure: { id: string; name: string; grades: { id: string; name: string }[] }[] = [];
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
      entities: (AppDataSource.options.entities as Function[]).filter(entity => entity !== ProductTemplate && entity !== ProductTemplateVersion && entity !== ProductTemplateRevision),
    });
    await bootstrap.initialize();
    await bootstrap.synchronize();
    // Only these additive migrations, inside this new synthetic schema.
    const runner = bootstrap.createQueryRunner();
    await runner.connect(); await runner.startTransaction();
    try {
      await new AddProductTemplates1791417600000().up(runner);
      await new AddKitSubjectsAndGrades1791417600001().up(runner);
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
    await db.getRepository(ProductTemplateVersion).update({ template_id: kitId }, { status: "published" });
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
      { id: randomUUID(), name: "Science", grades: [{ id: randomUUID(), name: "Grade 8" }, { id: randomUUID(), name: "Grade 9" }, { id: randomUUID(), name: "Grade 10" }] },
      { id: randomUUID(), name: "Mathematics", grades: [{ id: randomUUID(), name: "Grade 8" }, { id: randomUUID(), name: "Grade 9" }, { id: randomUUID(), name: "Grade 10" }] },
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
  it("rolls the subjects migration back and reapplies it", async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await new AddKitSubjectsAndGrades1791417600001().down(runner);
      let columns = await runner.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'product_template_versions' AND column_name = 'subjects'`);
      expect(columns).toHaveLength(0);
      expect((await runner.query(`SELECT count(*) FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = 'product_template_revisions'`))[0].count).toBe("0");
      await new AddKitSubjectsAndGrades1791417600001().up(runner);
      columns = await runner.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'product_template_versions' AND column_name = 'subjects'`);
      expect(columns).toHaveLength(1);
      await runner.commitTransaction();
    } catch (error) { await runner.rollbackTransaction(); throw error; }
    finally { await runner.release(); }
  });
});
