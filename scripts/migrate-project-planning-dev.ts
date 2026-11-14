import "reflect-metadata";
import { DataSource } from "typeorm";
import { AppDataSource } from "../src/db.ts";
import { AddProjectPlanning1791417600002 } from "../src/migration/1791417600002-AddProjectPlanning.ts";

const url = new URL(process.env.DATABASE_URL ?? "");
if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/experimind_kitbuilder_development") throw new Error("Only the dedicated loopback development database is allowed");
// No synchronization, seed/reset, legacy migrations or company databases.
const db = new DataSource({ ...AppDataSource.options, migrations: [AddProjectPlanning1791417600002] });
await db.initialize();
try { const applied = await db.runMigrations({ transaction: "all" }); console.log(`Planning migrations applied: ${applied.length}`); }
finally { await db.destroy(); }
