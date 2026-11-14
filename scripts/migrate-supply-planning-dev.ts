import "reflect-metadata";
import { DataSource } from "typeorm";
import { AppDataSource } from "../src/db.ts";
import { AddReservationsAndProcurement1791676800004 } from "../src/migration/1791676800004-AddReservationsAndProcurement.ts";

const url = new URL(process.env.DATABASE_URL ?? "");
if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/experimind_kitbuilder_development") throw new Error("Only the dedicated loopback development database is allowed");
// Apply only this additive migration; never synchronize, reset or seed existing data.
const db = new DataSource({ ...AppDataSource.options, migrations: [AddReservationsAndProcurement1791676800004] });
await db.initialize();
try { const applied = await db.runMigrations({ transaction: "all" }); console.log(`Supply planning migrations applied: ${applied.length}`); }
finally { await db.destroy(); }
