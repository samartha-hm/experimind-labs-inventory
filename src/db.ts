import "dotenv/config";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { InventoryItem } from "./entity/InventoryItem";
import { Warehouse } from "./entity/Warehouse";
import { Bin } from "./entity/Bin";
import { Kit } from "./entity/Kit";
import { KitBom } from "./entity/KitBom";
import { Vendor } from "./entity/Vendor";
import { PurchaseOrder } from "./entity/PurchaseOrder";
import { PurchaseOrderLine } from "./entity/PurchaseOrderLine";
import { Customer } from "./entity/Customer";
import { SalesOrder } from "./entity/SalesOrder";
import { SalesOrderLine } from "./entity/SalesOrderLine";
import { Transaction } from "./entity/Transaction";
import { TransactionLine } from "./entity/TransactionLine";
import { Setting } from "./entity/Setting";
import { Init1689500000000 } from "./migration/1689500000000-Init";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  database: process.env.DB_NAME ?? "experimind",
  synchronize: false, // Use migrations in production
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
  migrations: [Init1689500000000],
  subscribers: [],
});