import "reflect-metadata";
import { DataSource } from "typeorm";
import { databaseSchema } from "../src/db.ts";
import { configureDatabaseBoundary } from "../src/security/databaseBoundary.ts";

// Explicit owner-only deployment step; never creates roles/passwords or runs at startup.
async function main() {
  const url = process.env.MIGRATION_DATABASE_URL;
  const roles = { runtime: process.env.RUNTIME_DATABASE_ROLE, identity: process.env.IDENTITY_DATABASE_ROLE,
    ledger: process.env.LEDGER_DATABASE_ROLE };
  if (!url || Object.values(roles).some(r => !r)) throw new Error("Owner URL and three role names required");
  const db = new DataSource({ type: "postgres", url, logging: false,
    ssl: ["localhost","127.0.0.1"].includes(new URL(url).hostname) ? false : { rejectUnauthorized: true },
    extra: { max: 1, options: `-c search_path=${databaseSchema},pg_catalog,pg_temp` } });
  try {
    await db.initialize();
    const [owner] = await db.query(`SELECT current_user name,n.nspowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) owns
      FROM pg_namespace n WHERE n.nspname=$1`, [databaseSchema]);
    if (!owner?.owns || Object.values(roles).includes(owner.name)) throw new Error("Distinct schema owner required");
    await db.transaction(m => configureDatabaseBoundary(m, databaseSchema, roles as {runtime:string;identity:string;ledger:string}));
    console.log("Database boundary grants applied; validate each LOGIN before starting the server");
  } finally { if (db.isInitialized) await db.destroy(); }
}
main().catch(() => { console.error("Boundary provisioning failed; connection details suppressed"); process.exitCode=1; });
