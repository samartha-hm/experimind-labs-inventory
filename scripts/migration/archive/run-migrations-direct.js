import { AppDataSource } from "./src/db.js";

async function runMigrations() {
  try {
    await AppDataSource.initialize();
    console.log("Database connected");

    await AppDataSource.runMigrations();
    console.log("Migrations completed successfully");

    await AppDataSource.destroy();
  } catch (err) {
    console.error("Error running migrations:", err);
    process.exit(1);
  }
}

runMigrations();