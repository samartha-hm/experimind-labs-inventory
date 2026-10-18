import "reflect-metadata";
import { AppDataSource, databaseSchema } from "../src/db.ts";
import { DataSource } from "typeorm";

async function runMigrations() {
  try {
    if (!process.env.MIGRATION_DATABASE_URL) throw new Error("MIGRATION_DATABASE_URL required; runtime credentials cannot run migrations");
    const migrationDb = new DataSource({ ...AppDataSource.options as Extract<import("typeorm").DataSourceOptions, { type: "postgres" }>,
      url: process.env.MIGRATION_DATABASE_URL, logging: false,
      ssl: ["localhost","127.0.0.1"].includes(new URL(process.env.MIGRATION_DATABASE_URL).hostname)
        ? false : { rejectUnauthorized: true },
      extra: { max: 1, options: `-c search_path=${databaseSchema},public` } });
    console.log("Connecting to database for migrations...");
    await migrationDb.initialize();
    console.log("Executing pending PostgreSQL migrations...");
    const executedMigrations = await migrationDb.runMigrations();
    console.log(`Successfully executed ${executedMigrations.length} migrations:`);
    for (const m of executedMigrations) {
      console.log(` - ${m.name}`);
    }
    await migrationDb.destroy();
    process.exit(0);
  } catch {
    console.error("Migration failed; check owner credentials and schema prerequisites (connection details suppressed)");
    process.exit(1);
  }
}

runMigrations();
