import { registeredMigrations } from './migrations/registry';

import { commitmentEntities } from "./entity/CommitmentLedger";
import { productionEntities } from "./entity/ProductionPlanning";
import { supplyEntities } from "./entity/SupplyPlanning";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./config/env.ts";
import { ProductTemplate } from "./entity/ProductTemplate.ts";
import { ProductTemplateVersion } from "./entity/ProductTemplateVersion.ts";
import { ProductTemplateRevision } from "./entity/ProductTemplateRevision.ts";
import { planningEntities } from "./entity/PlanningProject.ts";

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
import { PhysicalRack } from "./entity/PhysicalRack.ts";
import { FloorPlanLayout } from "./entity/FloorPlanLayout.ts";
import { CustomElementType } from "./entity/CustomElementType.ts";
import { SerialNumber } from "./entity/SerialNumber.ts";
import { StockLedger } from "./entity/StockLedger.ts";
import { stocktakeEntities } from "./entity/Stocktake.ts";
import { OperationalEvidenceEvent } from "./entity/OperationalEvidence";
import { WarehouseTransfer } from "./entity/WarehouseTransfer.ts";
import { WarehouseTransferLine } from "./entity/WarehouseTransferLine.ts";
import { CycleCount } from "./entity/CycleCount.ts";
import { CycleCountLine } from "./entity/CycleCountLine.ts";
import { Role } from "./entity/Role.ts";
import { Session } from "./entity/Session.ts";
import { StockLocation } from "./entity/StockLocation.ts";
import { StockLot } from "./entity/StockLot.ts";
import { StockByLot } from "./entity/StockByLot.ts";
import { UomConversion } from "./entity/UomConversion.ts";
import { AuditEvent } from "./entity/AuditEvent.ts";
import { ElectronicSignature } from "./entity/ElectronicSignature.ts";
import { QualityInspection } from "./entity/QualityInspection.ts";
import { Deviation } from "./entity/Deviation.ts";
import { Capa } from "./entity/Capa.ts";
import { ChangeRequest } from "./entity/ChangeRequest.ts";
import { Rma } from "./entity/Rma.ts";
import { RmaLine } from "./entity/RmaLine.ts";
import { BomNode } from "./entity/BomNode.ts";
import { ComponentAlternate } from "./entity/ComponentAlternate.ts";


const isLocalhostDb = env.databaseUrl.includes("localhost") || env.databaseUrl.includes("127.0.0.1");
export const databaseSchema = process.env.DATABASE_SCHEMA ?? "public";
if (!/^[a-z_][a-z0-9_]*$/.test(databaseSchema)) throw new Error("Invalid DATABASE_SCHEMA");

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.databaseUrl,
  schema: databaseSchema,
  ssl: isLocalhostDb ? false : { rejectUnauthorized: true },
  synchronize: false, // Use migrations for production DB schema changes
  logging: env.nodeEnv === "development" ? ["error", "warn"] : ["error"],
  extra: {
    max: 25, // Connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    options: `-c search_path=pg_catalog,${databaseSchema},pg_temp`,
  },
  entities: [
    ...commitmentEntities,
    ...productionEntities,
    ...supplyEntities,
    ...planningEntities,
    ProductTemplate,
    ProductTemplateVersion,
    ProductTemplateRevision,
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
    PhysicalRack,
    FloorPlanLayout,
    CustomElementType,
    SerialNumber,
    StockLedger,
    ...stocktakeEntities,
    OperationalEvidenceEvent,
    WarehouseTransfer,
    WarehouseTransferLine,
    CycleCount,
    CycleCountLine,
    Role,
    Session,
    StockLocation,
    StockLot,
    StockByLot,
    UomConversion,
    AuditEvent,
    ElectronicSignature,
    QualityInspection,
    Deviation,
    Capa,
    ChangeRequest,
    Rma,
    RmaLine,
    BomNode,
    ComponentAlternate,
  ],
  migrationsRun: false,
  migrations: registeredMigrations,
  subscribers: [],
});

// Separate credentials; missing identity credentials fail at server startup, never fall back.
export const IdentityDataSource = new DataSource({
  ...AppDataSource.options as Extract<import("typeorm").DataSourceOptions, { type: "postgres" }>,
  url: process.env.IDENTITY_DATABASE_URL,
  logging: false,
  ssl: process.env.IDENTITY_DATABASE_URL && ["localhost","127.0.0.1"].includes(new URL(process.env.IDENTITY_DATABASE_URL).hostname)
    ? false : { rejectUnauthorized: true },
  extra: { max: 5, connectionTimeoutMillis: 5000, options: `-c search_path=pg_catalog,${databaseSchema},pg_temp` },
});

// Opt-in private writer for synthetic recovery only; never reuse runtime/identity credentials.
export const ReceiptLedgerDataSource = process.env.RECEIPT_LEDGER_DATABASE_URL ? new DataSource({
  ...AppDataSource.options as Extract<import("typeorm").DataSourceOptions, { type: "postgres" }>,
  url: process.env.RECEIPT_LEDGER_DATABASE_URL,
  logging: false,
  ssl: false,
  extra: { max: 5, connectionTimeoutMillis: 5000, options: `-c search_path=pg_catalog,${databaseSchema},pg_temp` },
}) : undefined;
