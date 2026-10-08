import "reflect-metadata";
import { DataSource } from "typeorm";
import { AppDataSource } from "../src/db.ts";
import { ProductTemplate } from "../src/entity/ProductTemplate.ts";
import { ProductTemplateVersion } from "../src/entity/ProductTemplateVersion.ts";
import { Organization } from "../src/entity/Organization.ts";
import { User } from "../src/entity/User.ts";
import { AddProductTemplates1791417600000 } from "../src/migration/1791417600000-AddProductTemplates.ts";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const url = new URL(process.env.DATABASE_URL ?? "");
if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/experimind_kitbuilder_development") {
  throw new Error("Only the dedicated loopback development database is allowed");
}
const db = new DataSource({ ...AppDataSource.options, migrations: [],
  entities: (AppDataSource.options.entities as Function[]).filter(entity => entity !== ProductTemplate && entity !== ProductTemplateVersion),
});
await db.initialize();
try {
  const tables: { count: string }[] = await db.query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
  if (tables[0].count !== "0") throw new Error("Database is not empty. Setup refuses to synchronize or overwrite existing data.");
  // Metadata bootstrap for this NEW empty development DB only; no legacy seeds/migrations.
  await db.synchronize();
  const orgs = db.getRepository(Organization);
  const users = db.getRepository(User);
  const credentials: { email: string; password: string }[] = [];
  async function passwordHash(email: string) {
    const password = randomBytes(24).toString("base64url");
    credentials.push({ email, password });
    return bcrypt.hash(password, 10);
  }
  for (const [name, email, role] of [
    ["Kit Builder Development", "maker@kitbuilder.test", "staff"],
    ["Kit Builder Other Tenant", "other@kitbuilder.test", "staff"],
  ]) {
    const org = await orgs.save(orgs.create({ name }));
    await users.save(users.create({ organization_id: org.id, email, name: "Development Maker", role,
      password_hash: await passwordHash(email), firebase_uid: null }));
    if (email === "maker@kitbuilder.test") await users.save(users.create({ organization_id: org.id,
      email: "viewer@kitbuilder.test", name: "Development Viewer", role: "viewer",
      password_hash: await passwordHash("viewer@kitbuilder.test"), firebase_uid: null }));
  }
  await mkdir(".local-dev", { recursive: true });
  await writeFile(".local-dev/development-accounts.json", JSON.stringify(credentials, null, 2), { mode: 0o600 });
} finally { await db.destroy(); }
const migrationDb = new DataSource({ ...AppDataSource.options, migrations: [AddProductTemplates1791417600000] });
await migrationDb.initialize();
try { await migrationDb.runMigrations({ transaction: "all" }); }
finally { await migrationDb.destroy(); }
console.log("Fresh development schema ready; new Kit Builder migration applied. Synthetic accounts only. Catalog empty.");
