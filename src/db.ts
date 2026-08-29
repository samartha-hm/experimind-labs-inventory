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
import { PhysicalRack } from "./entity/PhysicalRack.ts";
import { FloorPlanLayout } from "./entity/FloorPlanLayout.ts";
import { CustomElementType } from "./entity/CustomElementType.ts";
import { SerialNumber } from "./entity/SerialNumber.ts";
import { StockLedger } from "./entity/StockLedger.ts";
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

import { Init1689500000000 } from "./migration/1689500000000-Init.ts";
import { AddOrgAuditOrdersInvoices1689500000001 } from "./migration/1689500000001-AddOrgAuditOrdersInvoices.ts";
import { SeedDefaultOrganization1689500000002 } from "./migration/1689500000002-SeedDefaultOrganization.ts";
import { AlignEntitiesAndSchema1689500000003 } from "./migration/1689500000003-AlignEntitiesAndSchema.ts";
import { CleanSchemaAlignment1689500000004 } from "./migration/1689500000004-CleanSchemaAlignment.ts";
import { FinalSchemaReconciliation1689500000005 } from "./migration/1689500000005-FinalSchemaReconciliation.ts";
import { SeedAdminUser1689500000006 } from "./migration/1689500000006-SeedAdminUser.ts";
import { AddVisualWarehouseAndSerialNumbers1689500000007 } from "./migration/1689500000007-AddVisualWarehouseAndSerialNumbers.ts";
import { AddStockLedgerAndWmsOps1689500000008 } from "./migration/1689500000008-AddStockLedgerAndWmsOps.ts";
import { AddRbacAndSessions1689500000009 } from "./migration/1689500000009-AddRbacAndSessions.ts";
import { EnterpriseMultiLocationAndAuditCore1689500000010 } from "./migration/1689500000010-EnterpriseMultiLocationAndAuditCore.ts";
import { AddQmsAndESignatures1689500000011 } from "./migration/1689500000011-AddQmsAndESignatures.ts";

const isLocalhostDb = env.databaseUrl.includes("localhost") || env.databaseUrl.includes("127.0.0.1");

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.databaseUrl,
  ssl: isLocalhostDb ? false : { rejectUnauthorized: false },
  synchronize: false, // Use migrations for production DB schema changes
  logging: env.nodeEnv === "development" ? ["error", "warn"] : ["error"],
  extra: {
    max: 25, // Connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
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
    PhysicalRack,
    FloorPlanLayout,
    CustomElementType,
    SerialNumber,
    StockLedger,
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
  ],
  migrations: [
    Init1689500000000,
    AddOrgAuditOrdersInvoices1689500000001,
    SeedDefaultOrganization1689500000002,
    AlignEntitiesAndSchema1689500000003,
    CleanSchemaAlignment1689500000004,
    FinalSchemaReconciliation1689500000005,
    SeedAdminUser1689500000006,
    AddVisualWarehouseAndSerialNumbers1689500000007,
    AddStockLedgerAndWmsOps1689500000008,
    AddRbacAndSessions1689500000009,
    EnterpriseMultiLocationAndAuditCore1689500000010,
    AddQmsAndESignatures1689500000011,
  ],
  subscribers: [],
});