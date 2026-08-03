export type ComponentCategory =
  | 'Boards & Controllers'
  | 'Sensors & Inputs'
  | 'Outputs & Actuators'
  | 'Power & Accessories'
  | 'Cables & Connectors'
  | 'SMD Components';

export interface InventoryItem {
  id: string;
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
  name: string;
  description: string;
  items: BOMRequirement[];
  imageUrl?: string;
}

export interface TransactionRecord {
  id: string;
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
