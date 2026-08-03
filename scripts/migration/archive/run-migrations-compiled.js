// Migration runner using compiled JavaScript
// First run: npx tsc
// Then run: node .\run-migrations-compiled.js

const { DataSource } = require("typeorm");
require('dotenv').config();

// Import compiled entities and settings
const User = require("./dist/src/entity/User.js");
const InventoryItem = require("./dist/src/entity/InventoryItem.js");
const Warehouse = require("./dist/src/entity/Warehouse.js");
const Bin = require("./dist/src/entity/Bin.js");
const Kit = require("./dist/src/entity/Kit.js");
const KitBom = require("./dist/src/entity/KitBom.js");
const Vendor = require("./dist/src/entity/Vendor.js");
const PurchaseOrder = require("./dist/src/entity/PurchaseOrder.js");
const PurchaseOrderLine = require("./dist/src/entity/PurchaseOrderLine.js");
const Customer = require("./dist/src/entity/Customer.js");
const SalesOrder = require("./dist/src/entity/SalesOrder.js");
const SalesOrderLine = require("./dist/src/entity/SalesOrderLine.js");
const Transaction = require("./dist/src/entity/Transaction.js");
const TransactionLine = require("./dist/src/entity/TransactionLine.js");
const Setting = require("./dist/src/entity/Setting.js");

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
    User,
    InventoryItem,
    Warehouse,
    Bin,
    Kit,
    KitBom,
    Vendor,
    PurchaseOrder,
    PurchaseOrderLine,
    Customer,
    SalesOrder,
    SalesOrderLine,
    Transaction,
    TransactionLine,
    Setting
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