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
  sku?: string;
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

export type StockTransactionType =
  | 'PO_RECEIPT'
  | 'SO_SHIPMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'MANUAL_ADJUSTMENT'
  | 'KIT_CONSUMPTION'
  | 'KIT_PRODUCTION'
  | 'CYCLE_COUNT_VARIANCE'
  | 'INITIAL_BALANCE'
  | 'RETURN_RESTOCK';

export interface StockLedgerEntry {
  id: string;
  organization_id: string;
  item_id: string;
  item_name: string;
  item_sku: string;
  warehouse_id?: string;
  bin_location?: string;
  lot_number?: string;
  serial_number?: string;
  qty_delta: number;
  unit_cost: number;
  running_balance: number;
  transaction_type: StockTransactionType;
  reference_type?: string;
  reference_id?: string;
  reason_code?: string;
  notes?: string;
  actor_id?: string;
  actor_name?: string;
  created_at: string;
}

export interface WarehouseTransferLine {
  id: string;
  transfer_id?: string;
  item_id: string;
  item_name: string;
  item_sku: string;
  requested_qty: number;
  received_qty: number;
  source_bin?: string;
  destination_bin?: string;
}

export interface WarehouseTransfer {
  id: string;
  organization_id?: string;
  transfer_number: string;
  source_warehouse_code: string;
  source_bin?: string;
  destination_warehouse_code: string;
  destination_bin?: string;
  status: 'draft' | 'in_transit' | 'received' | 'cancelled';
  carrier?: string;
  tracking_number?: string;
  dispatched_at?: string;
  received_at?: string;
  notes?: string;
  created_by_name?: string;
  lines: WarehouseTransferLine[];
  created_at: string;
  updated_at: string;
}

export interface CycleCountLine {
  id: string;
  cycle_count_id?: string;
  item_id: string;
  item_name: string;
  item_sku: string;
  bin_location?: string;
  system_qty: number;
  counted_qty?: number;
  variance_qty: number;
  unit_cost: number;
  variance_value: number;
  variance_reason?: string;
}

export interface CycleCount {
  id: string;
  organization_id?: string;
  audit_number: string;
  title: string;
  warehouse_code?: string;
  target_zone_or_category?: string;
  status: 'draft' | 'in_progress' | 'pending_review' | 'approved_posted' | 'cancelled';
  is_blind_count: boolean;
  total_variance_value: number;
  assigned_auditor_name?: string;
  approved_by_name?: string;
  completed_at?: string;
  notes?: string;
  lines: CycleCountLine[];
  created_at: string;
  updated_at: string;
}

