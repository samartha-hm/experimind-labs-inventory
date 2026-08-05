import "reflect-metadata";
import { AppDataSource } from "../src/db.ts";

async function runMigrations() {
  try {
    console.log("Connecting to database for migrations...");
    await AppDataSource.initialize();
    console.log("Executing pending PostgreSQL migrations...");
    const executedMigrations = await AppDataSource.runMigrations();
    console.log(`Successfully executed ${executedMigrations.length} migrations:`);
    for (const m of executedMigrations) {
      console.log(` - ${m.name}`);
    }
    await AppDataSource.destroy();
    process.exit(0);
  } catch (err: any) {
    console.error("Migration failure:", err);
    process.exit(1);
  }
}

runMigrations();
