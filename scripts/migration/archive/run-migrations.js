// Simple script to run TypeORM migrations
const { AppDataSource } = require('./dist/src/db.js');  // We'll need to compile first

// Alternative: create DataSource directly
const { DataSource } = require("typeorm");
require('dotenv').config();

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  database: process.env.DB_NAME ?? "experimind",
  synchronize: false,
  logging: ["error", "schema"],
  entities: [
    require("./dist/src/entity/User.js"),
    require("./dist/src/entity/InventoryItem.js"),
    require("./dist/src/entity/Warehouse.js"),
    require("./dist/src/entity/Bin.js"),
    require("./dist/src/entity/Kit.js"),
    require("./dist/src/entity/KitBom.js"),
    require("./dist/src/entity/Vendor.js"),
    require("./dist/src/entity/PurchaseOrder.js"),
    require("./dist/src/entity/PurchaseOrderLine.js"),
    require("./dist/src/entity/Customer.js"),
    require("./dist/src/entity/SalesOrder.js"),
    require("./dist/src/entity/SalesOrderLine.js"),
    require("./dist/src/entity/Transaction.js"),
    require("./dist/src/entity/TransactionLine.js"),
    require("./dist/src/entity/Setting.js")
  ],
  migrations: ["./dist/src/migration/**/*.js"],
  subscribers: [],
});

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