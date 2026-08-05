export type ComponentCategory =
  | 'Boards & Controllers'
  | 'Sensors & Inputs'
  | 'Outputs & Actuators'
  | 'Power & Accessories'
  | 'Cables & Connectors'
  | 'SMD Components';

export type UserRoleExtended = 'admin' | 'ops_manager' | 'warehouse_staff' | 'procurement' | 'finance' | 'auditor' | 'staff' | 'user' | 'intern';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  currency: 'INR' | 'USD' | 'EUR';
  gstin?: string;
  stateCode?: string; // Place of Supply state code (e.g. '27' for Maharashtra, '29' for Karnataka)
  plan: 'Starter' | 'Growth' | 'Enterprise';
  isFlagship?: boolean;
  workspaces: string[];
}

export interface GSTConfig {
  hsnCode: string;
  gstRate: number; // e.g. 18 for 18%
  isExempt?: boolean;
}

export interface InventoryItem {
  id: string;
  tenantId?: string;
  name: string;
  category: ComponentCategory | string;
  stockQty: number;
  unit: string;
  isCommon?: boolean; // Unlimited stock components like screwdrivers, screws, etc.
  isSubassembly?: boolean;
  threshold: number; // Alerts when stock is below this
  imageUrl?: string;
  basePrice?: number;
  unitCost?: number; // FIFO / Moving Average unit cost rate
  valuationMethod?: 'FIFO' | 'Moving Average' | 'Standard';
  description?: string;
  binLocation?: string;
  barcode?: string;
  assignedKitName?: string;
  gstConfig?: GSTConfig;
  hsnCode?: string;
  abcClass?: 'A' | 'B' | 'C';
  xyzClass?: 'X' | 'Y' | 'Z';
  monthlyConsumption?: number[];
  forecastedStockoutDays?: number;
}

export interface GSTInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerGstin: string;
  customerStateCode: string;
  placeOfSupply: string;
  totalTaxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalInvoiceAmount: number;
  irn?: string; // E-Invoice Invoice Reference Number
  signedQrCode?: string;
  ewayBillNumber?: string;
  status: 'DRAFT' | 'GENERATED' | 'CANCELLED';
}

export interface ZohoSyncLog {
  id: string;
  timestamp: string;
  entityType: 'INVOICE' | 'BILL' | 'VENDOR' | 'CUSTOMER' | 'ITEM';
  action: 'PUSH' | 'PULL';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  zohoId?: string;
  localId?: string;
  message: string;
}

export interface AuditHashNode {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorRole: string;
  prevHash: string;
  currentHash: string;
  payload: string;
}

export interface WorkflowRule {
  id: string;
  name: string;
  event: 'stock_shortage' | 'kit_packed' | 'order_created' | 'vendor_added';
  action: 'create_po' | 'dispatch_webhook' | 'notify_slack' | 'email_alert';
  targetUrl?: string;
  isActive: boolean;
  lastTriggered?: string;
}

export interface BOMRequirement {
  componentId: string;
  qty: number;
}

export interface KitBOM {
  id: string;
  tenantId?: string;
  name: string;
  description: string;
  items: BOMRequirement[];
  imageUrl?: string;
}

export interface TransactionRecord {
  id: string;
  tenantId?: string;
  timestamp: string; // ISO String
  type: 'pack' | 'add_stock' | 'adjust' | 'unpack';
  kitName?: string;
  kitQty?: number;
  description: string;
  userName?: string;
  userRole?: string;
  userId?: string;
  items: {
    componentId: string;
    componentName: string;
    qtyDiff: number; // positive for addition, negative for deduction
  }[];
  diffs?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface BottleneckItem {
  componentId: string;
  name: string;
  requiredPerKit: number;
  available: number;
  maxKitsPossible: number;
}

export interface PurchaseOrder {
  id: string;
  tenantId?: string;
  poNumber?: string;
  vendorName: string;
  createdAt: string;
  expectedDate?: string;
  status: 'draft' | 'issued' | 'received' | 'cancelled' | string;
  totalAmount: number;
  items: {
    itemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface KittingAnalysis {
  maxKitsPossible: number;
  bottlenecks: BottleneckItem[];
  missingComponents: {
    componentId: string;
    name: string;
    requiredTotal: number;
    available: number;
    shortage: number;
  }[];
}
