import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./config/env.ts";

import { User } from "./entity/User.ts";
import { InventoryItem } from "./entity/InventoryItem.ts";
import { Warehouse } from "./entity/Warehouse.ts";
import { Bin } from "./entity/Bin.ts";
import { Kit } from "./entity/Kit.ts";
import { KitBom } from "./entity/KitBom.ts";
import { Vendor } from "./entity/Vendor.ts";
import { PurchaseOrder } from "./entity/PurchaseOrder.ts";
import { PurchaseOrderLine } from "./entity/PurchaseOrderLine.ts";
import { Customer } from "./entity/Customer.ts";
import { SalesOrder } from "./entity/SalesOrder.ts";
import { SalesOrderLine } from "./entity/SalesOrderLine.ts";
import { Transaction } from "./entity/Transaction.ts";
import { TransactionLine } from "./entity/TransactionLine.ts";
import { Setting } from "./entity/Setting.ts";
import { Organization } from "./entity/Organization.ts";
import { AuditLog } from "./entity/AuditLog.ts";
import { Invoice } from "./entity/Invoice.ts";
import { InvoiceLine } from "./entity/InvoiceLine.ts";
import { InvoiceSequence } from "./entity/InvoiceSequence.ts";
import { CustomerOrder } from "./entity/CustomerOrder.ts";
import { CustomerOrderLine } from "./entity/CustomerOrderLine.ts";
import { StockAdjustment } from "./entity/StockAdjustment.ts";
import { RefreshToken } from "./entity/RefreshToken.ts";
import { Init1689500000000 } from "./migration/1689500000000-Init.ts";
import { AddOrgAuditOrdersInvoices1689500000001 } from "./migration/1689500000001-AddOrgAuditOrdersInvoices.ts";
import { SeedDefaultOrganization1689500000002 } from "./migration/1689500000002-SeedDefaultOrganization.ts";
import { AlignEntitiesAndSchema1689500000003 } from "./migration/1689500000003-AlignEntitiesAndSchema.ts";
import { CleanSchemaAlignment1689500000004 } from "./migration/1689500000004-CleanSchemaAlignment.ts";

const isLocalhostDb = env.databaseUrl.includes("localhost") || env.databaseUrl.includes("127.0.0.1");

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.databaseUrl,
  ssl: isLocalhostDb ? false : { rejectUnauthorized: false },
  synchronize: false, // Use migrations for production DB schema changes
  logging: env.nodeEnv === "development" ? ["error", "warn"] : ["error"],
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
    Setting,
    Organization,
    AuditLog,
    Invoice,
    InvoiceLine,
    InvoiceSequence,
    CustomerOrder,
    CustomerOrderLine,
    StockAdjustment,
    RefreshToken,
  ],
  migrations: [Init1689500000000, AddOrgAuditOrdersInvoices1689500000001, SeedDefaultOrganization1689500000002, AlignEntitiesAndSchema1689500000003, CleanSchemaAlignment1689500000004],
  subscribers: [],
});