import React, { createContext, useContext, useEffect, useState } from 'react';
import { InventoryItem, KitBOM, TransactionRecord, BOMRequirement, StockLedgerEntry, WarehouseTransfer, CycleCount } from './types';
import { useAuth } from './AuthContext';
import { apiFetch } from './utils/api';
import { useUndoRedo } from '@/src/contexts/UndoRedoContext';

interface DataContextType {
  inventory: InventoryItem[];
  kits: KitBOM[];
  transactions: TransactionRecord[];
  vendors: any[];
  customers: any[];
  purchaseOrders: any[];
  salesOrders: any[];
  warehouses: any[];
  bins: any[];
  loading: boolean;
  
  // Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<string | null>;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  
  // Kits (BOM)
  addKitBOM: (kit: Omit<KitBOM, 'id'>) => Promise<string>;
  updateKitBOM: (kitId: string, updatedRequirements: BOMRequirement[] | { items?: BOMRequirement[] }, updatedMeta?: Partial<KitBOM>) => Promise<void>;
  deleteKitBOM: (id: string) => Promise<void>;
  
  // Transactions
  logTransaction: (tx: TransactionRecord) => Promise<void>;

  // Vendors
  addVendor: (vendor: any) => Promise<void>;
  updateVendor: (id: string, updates: any) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;

  // Customers
  addCustomer: (customer: any) => Promise<void>;
  updateCustomer: (id: string, updates: any) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  // Purchase Orders
  addPurchaseOrder: (po: any) => Promise<void>;
  updatePurchaseOrder: (id: string, updates: any) => Promise<void>;
  deletePurchaseOrder: (id: string) => Promise<void>;

  // Sales Orders
  addSalesOrder: (so: any) => Promise<void>;
  updateSalesOrder: (id: string, updates: any) => Promise<void>;
  deleteSalesOrder: (id: string) => Promise<void>;

  // Warehouses
  addWarehouse: (wh: any) => Promise<void>;
  updateWarehouse: (id: string, updates: any) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;

  // Bins
  addBin: (bin: any) => Promise<void>;
  deleteBin: (id: string) => Promise<void>;

  // Visual Warehouse & Floor Plans (PostgreSQL Persistence)
  physicalRacks: any[];
  savePhysicalRacks: (racks: any[]) => Promise<void>;
  getFloorPlan: (whCode: string) => Promise<{ elements: any[]; templates: any[] }>;
  saveFloorPlan: (whCode: string, elements: any[], templates: any[]) => Promise<void>;
  elementTypes: any[];
  saveElementType: (typeData: any) => Promise<void>;

  // Serial Numbers
  serialNumbers: any[];
  loadSerialNumbers: (filters?: any) => Promise<any[]>;
  lookupSerialNumber: (serial: string) => Promise<any>;
  registerBulkSerials: (payload: any) => Promise<any>;
  updateSerialStatus: (id: string, status: string, location?: string, notes?: string) => Promise<void>;
  deleteSerialNumber: (id: string) => Promise<void>;

  // Immutable Stock Ledger & WMS Operations
  stockLedger: StockLedgerEntry[];
  wmsTransfers: WarehouseTransfer[];
  wmsCycleCounts: CycleCount[];
  loadStockLedger: (filters?: any) => Promise<StockLedgerEntry[]>;
  postStockAdjustment: (itemId: string, qtyDelta: number, binLocation?: string, reasonCode?: string, notes?: string) => Promise<any>;
  receivePurchaseOrderWms: (poId: string, receiptLines: any[]) => Promise<any>;
  fulfillSalesOrderWms: (soId: string, fulfillmentLines: any[], carrier?: string, trackingNumber?: string) => Promise<any>;
  loadWmsTransfers: () => Promise<WarehouseTransfer[]>;
  createWmsTransfer: (data: any) => Promise<WarehouseTransfer>;
  dispatchWmsTransfer: (transferId: string, carrier?: string, trackingNumber?: string) => Promise<WarehouseTransfer>;
  receiveWmsTransfer: (transferId: string, receiptLines?: any[]) => Promise<WarehouseTransfer>;
  loadWmsCycleCounts: () => Promise<CycleCount[]>;
  // Storefront & Customer Orders
  customerOrders: any[];
  updateCustomerOrderStatus: (orderId: string, status: string) => Promise<void>;
  updateCustomerOrderFulfillment: (orderId: string, fulfillmentData: {
    status?: string;
    carrier?: string;
    tracking_number?: string;
    notes?: string;
    customer_address?: string;
    invoice_number?: string;
  }) => Promise<void>;
  refreshCustomerOrders: () => Promise<void>;
  createWmsCycleCount: (data: any) => Promise<CycleCount>;
  submitWmsCycleCount: (countId: string, counts: any[]) => Promise<CycleCount>;
  approveWmsCycleCount: (countId: string) => Promise<CycleCount>;
}

const DataContext = createContext<DataContextType>({
  inventory: [],
  kits: [],
  transactions: [],
  vendors: [],
  customers: [],
  purchaseOrders: [],
  salesOrders: [],
  customerOrders: [],
  warehouses: [],
  bins: [],
  physicalRacks: [],
  elementTypes: [],
  serialNumbers: [],
  stockLedger: [],
  wmsTransfers: [],
  wmsCycleCounts: [],
  loading: true,
  updateCustomerOrderStatus: async () => {},
  updateCustomerOrderFulfillment: async () => {},
  refreshCustomerOrders: async () => {},
  addInventoryItem: async () => null,
  updateInventoryItem: async () => {},
  deleteInventoryItem: async () => {},
  addKitBOM: async () => '',
  updateKitBOM: async () => {},
  deleteKitBOM: async () => {},
  logTransaction: async () => {},
  addVendor: async () => {},
  updateVendor: async () => {},
  deleteVendor: async () => {},
  addCustomer: async () => {},
  updateCustomer: async () => {},
  deleteCustomer: async () => {},
  addPurchaseOrder: async () => {},
  updatePurchaseOrder: async () => {},
  deletePurchaseOrder: async () => {},
  addSalesOrder: async () => {},
  updateSalesOrder: async () => {},
  deleteSalesOrder: async () => {},
  addWarehouse: async () => {},
  updateWarehouse: async () => {},
  deleteWarehouse: async () => {},
  addBin: async () => {},
  deleteBin: async () => {},
  savePhysicalRacks: async () => {},
  getFloorPlan: async () => ({ elements: [], templates: [] }),
  saveFloorPlan: async () => {},
  saveElementType: async () => {},
  loadSerialNumbers: async () => [],
  lookupSerialNumber: async () => null,
  registerBulkSerials: async () => {},
  updateSerialStatus: async () => {},
  deleteSerialNumber: async () => {},
  loadStockLedger: async () => [],
  postStockAdjustment: async () => {},
  receivePurchaseOrderWms: async () => {},
  fulfillSalesOrderWms: async () => {},
  loadWmsTransfers: async () => [],
  createWmsTransfer: async () => ({} as any),
  dispatchWmsTransfer: async () => ({} as any),
  receiveWmsTransfer: async () => ({} as any),
  loadWmsCycleCounts: async () => [],
  createWmsCycleCount: async () => ({} as any),
  submitWmsCycleCount: async () => ({} as any),
  approveWmsCycleCount: async () => ({} as any),
});

// Conversion functions (PostgreSQL snake_case <-> Frontend camelCase)
function mapItemToFrontend(dbItem: any): InventoryItem {
  return {
    id: dbItem.id,
    name: dbItem.name,
    category: dbItem.category || 'General Components',
    stockQty: Number(dbItem.quantity) || 0,
    unit: dbItem.unit || 'pcs',
    isCommon: !!dbItem.is_common,
    isSubassembly: !!dbItem.is_subassembly,
    threshold: Number(dbItem.threshold) || 10,
    imageUrl: dbItem.image_url || undefined,
    basePrice: Number(dbItem.base_price) || 0,
    description: dbItem.description || undefined,
    binLocation: dbItem.bin_location || undefined,
    barcode: dbItem.sku || undefined,
    sku: dbItem.sku || undefined,
    assignedKitName: dbItem.assigned_kit_name || undefined,
    isSellable: dbItem.is_sellable !== undefined ? !!dbItem.is_sellable : true,
    isHidden: !!dbItem.is_hidden,
    mpn: dbItem.mpn || undefined,
    manufacturer: dbItem.manufacturer || undefined,
    packageFootprint: dbItem.package_footprint || undefined,
    package_footprint: dbItem.package_footprint || undefined,
    mountingType: dbItem.mounting_type || undefined,
    mounting_type: dbItem.mounting_type || undefined,
    mslRating: dbItem.msl_rating || undefined,
    msl_rating: dbItem.msl_rating || undefined,
    datasheetUrl: dbItem.datasheet_url || undefined
  };
}

function mapItemToBackend(item: Partial<InventoryItem>): any {
  const result: any = {};
  if (item.name !== undefined) result.name = item.name;
  if (item.category !== undefined) result.category = item.category;
  if (item.stockQty !== undefined) result.quantity = item.stockQty;
  if (item.unit !== undefined) result.unit = item.unit;
  if (item.isCommon !== undefined) result.is_common = item.isCommon;
  if (item.isSubassembly !== undefined) result.is_subassembly = item.isSubassembly;
  if (item.threshold !== undefined) result.threshold = item.threshold;
  if (item.imageUrl !== undefined) result.image_url = item.imageUrl;
  if (item.basePrice !== undefined) result.base_price = item.basePrice;
  if (item.description !== undefined) result.description = item.description;
  if (item.binLocation !== undefined) result.bin_location = item.binLocation;
  if (item.sku !== undefined) result.sku = item.sku;
  if (item.barcode !== undefined) result.sku = item.barcode;
  if (item.assignedKitName !== undefined) result.assigned_kit_name = item.assignedKitName;
  if (item.isSellable !== undefined) result.is_sellable = item.isSellable;
  if (item.isHidden !== undefined) result.is_hidden = item.isHidden;
  if (item.mpn !== undefined) result.mpn = item.mpn;
  if (item.manufacturer !== undefined) result.manufacturer = item.manufacturer;
  if (item.packageFootprint !== undefined) result.package_footprint = item.packageFootprint;
  if (item.package_footprint !== undefined) result.package_footprint = item.package_footprint;
  if (item.mountingType !== undefined) result.mounting_type = item.mountingType;
  if (item.mounting_type !== undefined) result.mounting_type = item.mounting_type;
  if (item.mslRating !== undefined) result.msl_rating = item.mslRating;
  if (item.msl_rating !== undefined) result.msl_rating = item.msl_rating;
  if (item.datasheetUrl !== undefined) result.datasheet_url = item.datasheetUrl;
  return result;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const { addAction } = useUndoRedo();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [kits, setKits] = useState<KitBOM[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [bins, setBins] = useState<any[]>([]);
  const [physicalRacks, setPhysicalRacks] = useState<any[]>([]);
  const [elementTypes, setElementTypes] = useState<any[]>([]);
  const [serialNumbers, setSerialNumbers] = useState<any[]>([]);
  const [stockLedger, setStockLedger] = useState<StockLedgerEntry[]>([]);
  const [wmsTransfers, setWmsTransfers] = useState<WarehouseTransfer[]>([]);
  const [wmsCycleCounts, setWmsCycleCounts] = useState<CycleCount[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllData = async () => {
    try {
      // ===== Stage 1: Critical Core Data (Inventory & Kits) -> Unblocks UI in <50ms =====
      const [resInv, resKits] = await Promise.allSettled([
        apiFetch('/api/v1/inventory'),
        apiFetch('/api/v1/kit'),
      ]);

      if (resInv.status === 'fulfilled' && Array.isArray(resInv.value)) {
        setInventory(resInv.value.map(mapItemToFrontend));
      }

      if (resKits.status === 'fulfilled' && Array.isArray(resKits.value)) {
        setKits(resKits.value.map((k: any) => ({
          id: k.id,
          name: k.name,
          description: k.description || '',
          imageUrl: k.image_url || undefined,
          items: (k.bom_items || []).map((b: any) => ({
            componentId: b.inventory_item_id || b.componentId,
            qty: Number(b.quantity) || Number(b.qty) || 1
          }))
        })));
      }

      // Unblock initial screen loading immediately!
      setLoading(false);

      // ===== Stage 2: Asynchronous Background Fetching of Secondary Modules =====
      const secondaryResults = await Promise.allSettled([
        apiFetch('/api/v1/transaction'),
        apiFetch('/api/v1/vendor'),
        apiFetch('/api/v1/customer'),
        apiFetch('/api/v1/purchase-order'),
        apiFetch('/api/v1/sales-order'),
        apiFetch('/api/v1/warehouse'),
        apiFetch('/api/v1/bin'),
        apiFetch('/api/v1/warehouse-visual/physical-racks'),
        apiFetch('/api/v1/warehouse-visual/element-types'),
        apiFetch('/api/v1/serials'),
        apiFetch('/api/v1/stock-ledger?limit=150'),
        apiFetch('/api/v1/wms/transfers'),
        apiFetch('/api/v1/wms/cycle-counts'),
        apiFetch('/api/v1/orders')
      ]);

      const [resTx, resVendors, resCustomers, resPos, resSos, resWh, resBins, resRacks, resElemTypes, resSerials, resLedger, resTransfers, resAudits, resOrders] = secondaryResults;

      if (resTx.status === 'fulfilled' && Array.isArray(resTx.value)) {
        setTransactions(resTx.value.map((t: any) => ({
          id: t.id,
          timestamp: t.occurred_at || t.timestamp,
          type: t.type,
          description: t.description || '',
          items: (t.lines || []).map((l: any) => ({
            componentId: l.inventory_item_id || l.componentId,
            componentName: l.inventory_item?.name || 'Unknown Component',
            qtyDiff: Number(l.quantity_change) || 0
          }))
        })));
      }

      if (resVendors.status === 'fulfilled' && Array.isArray(resVendors.value)) {
        setVendors(resVendors.value.map((v: any) => ({
          id: v.id,
          code: v.vendor_code,
          name: v.name,
          contactName: v.contact_name,
          email: v.email,
          phone: v.phone,
          paymentTerms: v.payment_terms || 'Net 30',
          address: typeof v.address === 'object' ? (v.address?.city || 'General') : (v.address || '')
        })));
      }

      if (resCustomers.status === 'fulfilled' && Array.isArray(resCustomers.value)) {
        setCustomers(resCustomers.value.map((c: any) => ({
          id: c.id,
          code: c.customer_code,
          name: c.name,
          contactName: c.contact_name,
          email: c.email,
          phone: c.phone,
          paymentTerms: 'Net 30',
          address: typeof c.billing_address === 'object' ? (c.billing_address?.city || 'General') : (c.billing_address || ''),
          creditLimit: Number(c.credit_limit) || 10000
        })));
      }

      if (resPos.status === 'fulfilled' && Array.isArray(resPos.value)) {
        setPurchaseOrders(resPos.value.map((po: any) => ({
          id: po.id,
          poNumber: po.po_number || po.order_number || po.id,
          vendorId: po.vendor_id,
          vendorName: po.vendor?.name || 'Standard Supplier',
          orderDate: po.order_date ? new Date(po.order_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          expectedDate: po.expected_date ? new Date(po.expected_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          status: po.status || 'draft',
          totalAmount: Number(po.total_amount) || 0,
          itemCount: (po.lines || []).length || 1,
          items: (po.lines || []).map((l: any) => ({
            id: l.id,
            itemId: l.inventory_item_id || l.item_id,
            name: l.inventory_item?.name || l.item_name || 'Component',
            quantity: Number(l.qty_ordered || l.quantity) || 0,
            receivedQty: Number(l.qty_received || l.received_qty) || 0,
            unitPrice: Number(l.unit_cost) || 0
          }))
        })));
      }

      if (resSos.status === 'fulfilled' && Array.isArray(resSos.value)) {
        setSalesOrders(resSos.value.map((so: any) => ({
          id: so.id,
          soNumber: so.so_number || so.order_number || so.id,
          customerId: so.customer_id,
          customerName: so.customer?.name || 'Direct Customer',
          orderDate: so.order_date ? new Date(so.order_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          requiredDate: so.required_date ? new Date(so.required_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          status: so.status || 'draft',
          totalAmount: Number(so.total_amount) || 0,
          itemCount: (so.lines || []).length || 1,
          notes: so.notes || '',
          items: (so.lines || []).map((l: any) => ({
            id: l.id,
            itemId: l.inventory_item_id || l.item_id,
            name: l.inventory_item?.name || l.item_name || 'Component',
            quantity: Number(l.qty_ordered || l.quantity) || 0,
            shippedQty: Number(l.qty_shipped || l.quantity) || 0,
            unitPrice: Number(l.unit_price) || 0
          }))
        })));
      }

      if (resWh.status === 'fulfilled' && Array.isArray(resWh.value)) {
        setWarehouses(resWh.value.map((wh: any) => ({
          id: wh.id,
          code: wh.code,
          name: wh.name,
          address: typeof wh.address === 'object' ? (wh.address?.street || 'Main Storage') : (wh.address || ''),
          isDefault: !!wh.is_default,
          binCount: 0,
          totalCapacityPct: 0
        })));
      }

      if (resBins.status === 'fulfilled' && Array.isArray(resBins.value)) {
        setBins(resBins.value.map((bin: any) => ({
          id: bin.id,
          code: bin.code,
          warehouseCode: bin.warehouse?.code || '',
          description: bin.description || '',
          isActive: true
        })));
      }

      if (resRacks.status === 'fulfilled' && resRacks.value?.data) {
        setPhysicalRacks(resRacks.value.data);
      }

      if (resElemTypes.status === 'fulfilled' && resElemTypes.value?.data) {
        setElementTypes(resElemTypes.value.data);
      }

      if (resSerials.status === 'fulfilled' && resSerials.value?.data) {
        setSerialNumbers(resSerials.value.data);
      }

      if (resLedger.status === 'fulfilled' && resLedger.value?.entries) {
        setStockLedger(resLedger.value.entries);
      }

      if (resTransfers.status === 'fulfilled' && Array.isArray(resTransfers.value)) {
        setWmsTransfers(resTransfers.value);
      }

      if (resAudits.status === 'fulfilled' && Array.isArray(resAudits.value)) {
        setWmsCycleCounts(resAudits.value);
      }

      if (resOrders.status === 'fulfilled' && Array.isArray(resOrders.value)) {
        setCustomerOrders(resOrders.value);
      }

    } catch (e) {
      console.error('Error loading data from PostgreSQL:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let sseSource: EventSource | null = null;

    if (user && token) {
      setLoading(true);
      loadAllData();

      // Establish real-time Server-Sent Events (SSE) stream connection
      try {
        sseSource = new EventSource(`/api/v1/stream/events?token=${encodeURIComponent(token)}`);

        sseSource.addEventListener("STOCK_UPDATE", (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload?.data?.itemId) {
              setInventory((prev) =>
                prev.map((item) =>
                  item.id === payload.data.itemId
                    ? {
                        ...item,
                        stockQty: Number(payload.data.quantity),
                        binLocation: payload.data.binLocation || item.binLocation,
                      }
                    : item
                )
              );
            }
          } catch (err) {
            console.error("Failed to parse realtime stock update event:", err);
          }
        });

        sseSource.addEventListener("PO_UPDATE", () => {
          apiFetch("/api/v1/purchase-order").then((data) => {
            if (Array.isArray(data)) {
              setPurchaseOrders(
                data.map((po: any) => ({
                  id: po.id,
                  poNumber: po.po_number || po.order_number || po.id,
                  vendorId: po.vendor_id,
                  vendorName: po.vendor?.name || "Standard Supplier",
                  orderDate: po.order_date
                    ? new Date(po.order_date).toISOString().slice(0, 10)
                    : new Date().toISOString().slice(0, 10),
                  expectedDate: po.expected_date
                    ? new Date(po.expected_date).toISOString().slice(0, 10)
                    : new Date().toISOString().slice(0, 10),
                  status: po.status || "draft",
                  totalAmount: Number(po.total_amount) || 0,
                  itemCount: (po.lines || []).length || 1,
                  items: (po.lines || []).map((l: any) => ({
                    id: l.id,
                    itemId: l.inventory_item_id || l.item_id,
                    name: l.inventory_item?.name || l.item_name || "Component",
                    quantity: Number(l.qty_ordered || l.quantity) || 0,
                    receivedQty: Number(l.qty_received || l.received_qty) || 0,
                    unitPrice: Number(l.unit_cost) || 0,
                  })),
                }))
              );
            }
          });
        });

        sseSource.onerror = () => {
          // Gracefully close on disconnection / auth failure to prevent browser reconnect spam
          if (sseSource) {
            sseSource.close();
            sseSource = null;
          }
        };
      } catch (err) {
        console.warn("SSE connection error:", err);
      }
    } else {
      setInventory([]);
      setKits([]);
      setTransactions([]);
      setVendors([]);
      setCustomers([]);
      setPurchaseOrders([]);
      setSalesOrders([]);
      setWarehouses([]);
      setBins([]);
      setPhysicalRacks([]);
      setElementTypes([]);
      setSerialNumbers([]);
      setLoading(false);
    }

    return () => {
      if (sseSource) {
        sseSource.close();
      }
    };
  }, [user, token]);

  // CRUD Implementations with Zero-Latency Optimistic State Updates

  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>): Promise<string | null> => {
    try {
      const payload = mapItemToBackend(item);
      if (!payload.sku) payload.sku = `SKU-${Date.now()}`;
      if (payload.base_price === undefined) payload.base_price = 0;
      if (payload.quantity === undefined) payload.quantity = item.stockQty ?? 0;
      if (payload.threshold === undefined) payload.threshold = item.threshold ?? 5;
      if (item.category) payload.category = item.category;
      if (item.binLocation) payload.bin_location = item.binLocation;

      const created = await apiFetch('/api/v1/inventory', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const newItem = mapItemToFrontend(created);
      setInventory(prev => [newItem, ...prev]);

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Created catalog item "${newItem.name}"`,
        items: [{ componentId: newItem.id, componentName: newItem.name, qtyDiff: newItem.stockQty }],
        diffs: [{ field: 'name', oldValue: null, newValue: newItem.name }]
      });

      let createdId = newItem.id;
      addAction({
        id: `add_item_${Date.now()}`,
        name: `Add Item: ${newItem.name}`,
        undo: async () => {
          await apiFetch(`/api/v1/inventory/${createdId}`, { method: 'DELETE' });
          setInventory(prev => prev.filter(i => i.id !== createdId));
        },
        redo: async () => {
          const re = await apiFetch('/api/v1/inventory', { method: 'POST', body: JSON.stringify(payload) });
          const frontend = mapItemToFrontend(re);
          createdId = frontend.id;
          setInventory(prev => [frontend, ...prev]);
        }
      });
      return newItem.id;
    } catch (e: any) {
      console.error(`Add Item Error: ${e.message}`);
      return null;
    }
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    const oldItem = inventory.find(i => i.id === id);
    if (!oldItem) return;

    // 0ms Optimistic UI update immediately
    const newItem = { ...oldItem, ...updates };
    setInventory(prev => prev.map(item => item.id === id ? newItem : item));

    // Calculate detailed property diffs for audit trail
    const diffs: { field: string; oldValue: any; newValue: any }[] = [];
    (Object.keys(updates) as (keyof InventoryItem)[]).forEach(k => {
      if (updates[k] !== undefined && updates[k] !== oldItem[k]) {
        diffs.push({
          field: String(k),
          oldValue: oldItem[k] !== undefined ? String(oldItem[k]) : null,
          newValue: updates[k] !== undefined ? String(updates[k]) : null
        });
      }
    });

    const stockDelta = typeof updates.stockQty === 'number' ? updates.stockQty - oldItem.stockQty : 0;

    logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'adjust',
      description: `Updated component "${newItem.name}"`,
      items: stockDelta !== 0 ? [{ componentId: id, componentName: newItem.name, qtyDiff: stockDelta }] : [],
      diffs
    });

    addAction({
      id: `upd_item_${Date.now()}`,
      name: `Edit Item: ${newItem.name}`,
      undo: async () => {
        setInventory(prev => prev.map(item => item.id === id ? oldItem : item));
        try {
          if (stockDelta !== 0) {
            await apiFetch(`/api/v1/inventory/${id}/adjust`, {
              method: 'POST',
              body: JSON.stringify({ delta: -stockDelta, reason: 'Undo stock adjustment' })
            });
          }
          const oldPayload = mapItemToBackend(oldItem);
          await apiFetch(`/api/v1/inventory/${id}`, { method: 'PUT', body: JSON.stringify(oldPayload) });
        } catch (err) {
          console.warn('Undo item error:', err);
        }
      },
      redo: async () => {
        setInventory(prev => prev.map(item => item.id === id ? newItem : item));
        try {
          if (stockDelta !== 0) {
            await apiFetch(`/api/v1/inventory/${id}/adjust`, {
              method: 'POST',
              body: JSON.stringify({ delta: stockDelta, reason: 'Redo stock adjustment' })
            });
          }
          const newPayload = mapItemToBackend(updates);
          await apiFetch(`/api/v1/inventory/${id}`, { method: 'PUT', body: JSON.stringify(newPayload) });
        } catch (err) {
          console.warn('Redo item error:', err);
        }
      }
    });

    try {
      // Concurrency-safe delta stock mutation via /adjust endpoint
      if (typeof updates.stockQty === 'number') {
        const delta = updates.stockQty - oldItem.stockQty;
        if (delta !== 0) {
          await apiFetch(`/api/v1/inventory/${id}/adjust`, {
            method: 'POST',
            body: JSON.stringify({ delta, reason: 'Stock adjustment' })
          });
        }
      }

      // Non-stock metadata updates via PUT
      const { stockQty, ...otherUpdates } = updates;
      if (Object.keys(otherUpdates).length > 0) {
        const payload = mapItemToBackend(otherUpdates);
        await apiFetch(`/api/v1/inventory/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      }
    } catch (e: any) {
      // Roll back on network error
      setInventory(prev => prev.map(item => item.id === id ? oldItem : item));
      console.error(`Update Error: ${e.message}`);
    }
  };

  const deleteInventoryItem = async (id: string) => {
    const itemToDelete = inventory.find(i => i.id === id);
    if (!itemToDelete) return;

    // 0ms Optimistic UI removal
    setInventory(prev => prev.filter(item => item.id !== id));

    try {
      await apiFetch(`/api/v1/inventory/${id}`, { method: 'DELETE' });

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Deleted catalog item "${itemToDelete.name}"`,
        items: [{ componentId: id, componentName: itemToDelete.name, qtyDiff: -itemToDelete.stockQty }],
        diffs: [{ field: 'deleted', oldValue: itemToDelete.name, newValue: null }]
      });

      let restoredId = id;
      addAction({
        id: `del_item_${Date.now()}`,
        name: `Delete Item: ${itemToDelete.name}`,
        undo: async () => {
          const payload = mapItemToBackend(itemToDelete);
          const created = await apiFetch('/api/v1/inventory', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          const frontendItem = mapItemToFrontend(created);
          restoredId = frontendItem.id;
          setInventory(prev => [frontendItem, ...prev]);
        },
        redo: async () => {
          await apiFetch(`/api/v1/inventory/${restoredId}`, { method: 'DELETE' });
          setInventory(prev => prev.filter(item => item.id !== restoredId));
        }
      });
    } catch (e: any) {
      // Roll back on failure
      setInventory(prev => [itemToDelete, ...prev]);
      console.error(`Delete Item Error: ${e.message}`);
    }
  };

  const addKitBOM = async (kit: Omit<KitBOM, 'id'>): Promise<string> => {
    try {
      const payload = {
        name: kit.name,
        description: kit.description,
        image_url: kit.imageUrl,
        bom_items: (kit.items || []).map(i => ({
          inventory_item_id: i.componentId,
          quantity: i.qty
        }))
      };
      const created = await apiFetch('/api/v1/kit', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      const newKit: KitBOM = {
        id: created.id,
        name: created.name || kit.name,
        description: created.description || kit.description || '',
        imageUrl: created.image_url || kit.imageUrl,
        items: (created.bom_items || kit.items || []).map((b: any) => ({
          componentId: b.inventory_item_id || b.componentId,
          qty: Number(b.quantity) || Number(b.qty) || 1
        }))
      };
      setKits(prev => [newKit, ...prev]);

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Created new kit "${kit.name}"`,
        kitName: kit.name,
        items: [],
        diffs: [{ field: 'name', oldValue: null, newValue: kit.name }]
      });

      let kitId = created.id;
      addAction({
        id: `add_kit_${Date.now()}`,
        name: `Create Kit: ${kit.name}`,
        undo: async () => {
          await apiFetch(`/api/v1/kit/${kitId}`, { method: 'DELETE' });
          setKits(prev => prev.filter(k => k.id !== kitId));
        },
        redo: async () => {
          const re = await apiFetch('/api/v1/kit', { method: 'POST', body: JSON.stringify(payload) });
          kitId = re.id;
          setKits(prev => [{ ...newKit, id: re.id }, ...prev]);
        }
      });

      return created.id;
    } catch (e: any) {
      console.error(`Create Kit Error: ${e.message}`);
      return '';
    }
  };

  const updateKitBOM = async (
    kitId: string,
    updatedRequirements: BOMRequirement[] | { items?: BOMRequirement[] },
    updatedMeta?: Partial<KitBOM>
  ) => {
    const kitToUpdate = kits.find(k => k.id === kitId);
    if (!kitToUpdate) return;
    const oldItems = kitToUpdate.items || [];

    const reqList: BOMRequirement[] = Array.isArray(updatedRequirements)
      ? updatedRequirements
      : Array.isArray((updatedRequirements as any)?.items)
      ? (updatedRequirements as any).items
      : [];

    const updatedName = updatedMeta?.name || kitToUpdate.name;
    const updatedDescription = updatedMeta?.description !== undefined ? updatedMeta.description : kitToUpdate.description;
    const updatedImageUrl = updatedMeta?.imageUrl !== undefined ? updatedMeta.imageUrl : kitToUpdate.imageUrl;

    // 0ms Optimistic UI update
    const optimisticKit: KitBOM = {
      ...kitToUpdate,
      name: updatedName,
      description: updatedDescription,
      imageUrl: updatedImageUrl,
      items: reqList
    };
    setKits(prev => prev.map(k => k.id === kitId ? optimisticKit : k));

    try {
      const payload = {
        name: updatedName,
        description: updatedDescription,
        image_url: updatedImageUrl,
        bom_items: reqList.map(i => ({
          inventory_item_id: i.componentId,
          quantity: i.qty
        }))
      };
      await apiFetch(`/api/v1/kit/${kitId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      const diffs: any[] = [];
      oldItems.forEach(oldI => {
        const newI = reqList.find(i => i.componentId === oldI.componentId);
        if (!newI) diffs.push({ field: 'removed_component', oldValue: oldI.componentId, newValue: null });
        else if (newI.qty !== oldI.qty) diffs.push({ field: `qty_${oldI.componentId}`, oldValue: oldI.qty, newValue: newI.qty });
      });
      reqList.forEach(newI => {
        if (!oldItems.some(i => i.componentId === newI.componentId)) {
          diffs.push({ field: 'added_component', oldValue: null, newValue: newI.componentId });
        }
      });

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Updated BOM for kit "${updatedName}"`,
        kitName: updatedName,
        items: [],
        diffs
      });

      addAction({
        id: `upd_kit_${Date.now()}`,
        name: `Update Kit BOM: ${updatedName}`,
        undo: async () => {
          const oldPayload = {
            name: kitToUpdate.name,
            description: kitToUpdate.description,
            image_url: kitToUpdate.imageUrl,
            bom_items: oldItems.map(i => ({ inventory_item_id: i.componentId, quantity: i.qty }))
          };
          await apiFetch(`/api/v1/kit/${kitId}`, { method: 'PUT', body: JSON.stringify(oldPayload) });
          setKits(prev => prev.map(k => k.id === kitId ? kitToUpdate : k));
        },
        redo: async () => {
          await apiFetch(`/api/v1/kit/${kitId}`, { method: 'PUT', body: JSON.stringify(payload) });
          setKits(prev => prev.map(k => k.id === kitId ? optimisticKit : k));
        }
      });
    } catch (e: any) {
      // Revert on failure
      setKits(prev => prev.map(k => k.id === kitId ? kitToUpdate : k));
      console.error(`Update Kit BOM Error: ${e.message}`);
    }
  };

  const deleteKitBOM = async (id: string) => {
    const kitToDelete = kits.find(k => k.id === id);
    if (!kitToDelete) return;

    // 0ms Optimistic removal
    setKits(prev => prev.filter(k => k.id !== id));

    try {
      await apiFetch(`/api/v1/kit/${id}`, { method: 'DELETE' });

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Deleted kit "${kitToDelete.name}"`,
        kitName: kitToDelete.name,
        items: [],
        diffs: [{ field: 'deleted', oldValue: kitToDelete.name, newValue: null }]
      });

      addAction({
        id: `del_kit_${Date.now()}`,
        name: `Delete Kit: ${kitToDelete.name}`,
        undo: async () => {
          const payload = {
            name: kitToDelete.name,
            description: kitToDelete.description,
            image_url: kitToDelete.imageUrl,
            bom_items: (kitToDelete.items || []).map(i => ({ inventory_item_id: i.componentId, quantity: i.qty }))
          };
          const created = await apiFetch('/api/v1/kit', { method: 'POST', body: JSON.stringify(payload) });
          setKits(prev => [{ ...kitToDelete, id: created.id }, ...prev]);
        },
        redo: async () => {
          await apiFetch(`/api/v1/kit/${id}`, { method: 'DELETE' });
          setKits(prev => prev.filter(k => k.id !== id));
        }
      });
    } catch (e: any) {
      setKits(prev => [kitToDelete, ...prev]);
      console.error(`Delete Kit Error: ${e.message}`);
    }
  };

  const logTransaction = async (tx: TransactionRecord) => {
    const enrichedTx: TransactionRecord = {
      ...tx,
      userName: tx.userName || user?.name || user?.email || 'Guest Administrator',
      userRole: tx.userRole || user?.role || 'admin',
      userId: tx.userId || user?.id || 'admin_user',
    };
    setTransactions(prev => [enrichedTx, ...prev]);
    try {
      const payload = {
        type: enrichedTx.type,
        reference_type: enrichedTx.type || 'adjustment',
        user_id: user?.id || '00000000-0000-0000-0000-000000000001',
        description: enrichedTx.description,
        notes: enrichedTx.description,
        occurred_at: enrichedTx.timestamp,
        lines: enrichedTx.items.map(i => ({
          inventory_item_id: i.componentId,
          quantity_change: i.qtyDiff,
          unit_cost: 0
        }))
      };
      await apiFetch('/api/v1/transaction', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (e: any) {
      console.warn(`Failed to log transaction: ${e.message}`);
    }
  };

  // Vendor handlers
  const addVendor = async (v: any) => {
    try {
      const payload = {
        vendor_code: v.code || `VEND-${Date.now()}`,
        name: v.name,
        contact_name: v.contactName,
        email: v.email,
        phone: v.phone,
        payment_terms: v.paymentTerms,
        address: { city: v.address }
      };
      const created = await apiFetch('/api/v1/vendor', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const newV = {
        id: created.id,
        code: created.vendor_code || payload.vendor_code,
        name: created.name || payload.name,
        contactName: created.contact_name || payload.contact_name,
        email: created.email || payload.email,
        phone: created.phone || payload.phone,
        paymentTerms: created.payment_terms || 'Net 30',
        address: typeof created.address === 'object' ? (created.address?.city || 'General') : (created.address || '')
      };
      setVendors(prev => [newV, ...prev]);

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Added Vendor "${v.name}"`,
        items: [],
        diffs: [{ field: 'vendor_name', oldValue: null, newValue: v.name }]
      });
    } catch (e: any) {
      console.error(`Error creating vendor: ${e.message}`);
    }
  };

  const updateVendor = async (id: string, v: any) => {
    setVendors(prev => prev.map(item => item.id === id ? { ...item, ...v } : item));
    try {
      const payload = {
        vendor_code: v.code,
        name: v.name,
        contact_name: v.contactName,
        email: v.email,
        phone: v.phone,
        payment_terms: v.paymentTerms,
        address: { city: v.address }
      };
      await apiFetch(`/api/v1/vendor/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } catch (e: any) {
      console.error(`Error updating vendor: ${e.message}`);
    }
  };

  const deleteVendor = async (id: string) => {
    setVendors(prev => prev.filter(item => item.id !== id));
    try {
      await apiFetch(`/api/v1/vendor/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.error(`Error deleting vendor: ${e.message}`);
    }
  };

  // Customer handlers
  const addCustomer = async (c: any) => {
    try {
      const payload = {
        customer_code: c.code || `CUST-${Date.now()}`,
        name: c.name,
        contact_name: c.contactName,
        email: c.email,
        phone: c.phone,
        credit_limit: c.creditLimit || 10000,
        billing_address: { city: c.address },
        shipping_address: { city: c.address }
      };
      const created = await apiFetch('/api/v1/customer', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const newC = {
        id: created.id,
        code: created.customer_code || payload.customer_code,
        name: created.name || payload.name,
        contactName: created.contact_name || payload.contact_name,
        email: created.email || payload.email,
        phone: created.phone || payload.phone,
        paymentTerms: 'Net 30',
        address: typeof created.billing_address === 'object' ? (created.billing_address?.city || 'General') : (created.billing_address || ''),
        creditLimit: Number(created.credit_limit) || 10000
      };
      setCustomers(prev => [newC, ...prev]);

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Added Customer "${c.name}"`,
        items: [],
        diffs: [{ field: 'customer_name', oldValue: null, newValue: c.name }]
      });
    } catch (e: any) {
      console.error(`Error creating customer: ${e.message}`);
    }
  };

  const updateCustomer = async (id: string, c: any) => {
    setCustomers(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
    try {
      const payload = {
        customer_code: c.code,
        name: c.name,
        contact_name: c.contactName,
        email: c.email,
        phone: c.phone,
        credit_limit: c.creditLimit,
        billing_address: { city: c.address },
        shipping_address: { city: c.address }
      };
      await apiFetch(`/api/v1/customer/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } catch (e: any) {
      console.error(`Error updating customer: ${e.message}`);
    }
  };

  const deleteCustomer = async (id: string) => {
    setCustomers(prev => prev.filter(item => item.id !== id));
    try {
      await apiFetch(`/api/v1/customer/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.error(`Error deleting customer: ${e.message}`);
    }
  };

  // Purchase Orders
  const addPurchaseOrder = async (po: any) => {
    try {
      const payload: any = {
        vendor_id: po.vendorId || (vendors.length > 0 ? vendors[0].id : undefined),
        vendor_name: po.vendorName,
        po_number: po.poNumber || `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        order_date: po.orderDate || new Date().toISOString().slice(0, 10),
        expected_date: po.expectedDate || new Date().toISOString().slice(0, 10),
        status: po.status || 'draft',
        total_amount: Number(po.totalAmount) || 0,
        lines: (po.items || []).map((i: any) => ({
          inventory_item_id: i.itemId || i.id,
          qty_ordered: Number(i.quantity || i.qty) || 1,
          unit_cost: Number(i.unitPrice || i.unitCost) || 0
        }))
      };
      const created = await apiFetch('/api/v1/purchase-order', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const newPo = {
        id: created.id,
        poNumber: created.po_number || payload.po_number,
        vendorId: created.vendor_id || payload.vendor_id,
        vendorName: created.vendor?.name || po.vendorName || 'Standard Supplier',
        orderDate: created.order_date ? new Date(created.order_date).toISOString().slice(0, 10) : payload.order_date,
        expectedDate: created.expected_date ? new Date(created.expected_date).toISOString().slice(0, 10) : payload.expected_date,
        status: created.status || 'draft',
        totalAmount: Number(created.total_amount) || payload.total_amount,
        itemCount: (created.lines || []).length || 1,
        items: (created.lines || []).map((l: any) => ({
          id: l.id,
          itemId: l.inventory_item_id || l.item_id,
          name: l.inventory_item?.name || l.item_name || 'Component',
          quantity: Number(l.qty_ordered || l.quantity) || 0,
          receivedQty: Number(l.qty_received || l.received_qty) || 0,
          unitPrice: Number(l.unit_cost) || 0
        }))
      };
      setPurchaseOrders(prev => [newPo, ...prev]);
      return created?.id;
    } catch (e: any) {
      console.error(`Error creating Purchase Order: ${e.message}`);
    }
  };

  const updatePurchaseOrder = async (id: string, po: any) => {
    setPurchaseOrders(prev => prev.map(item => item.id === id ? { ...item, ...po } : item));
    try {
      const payload = {
        vendor_id: po.vendorId,
        po_number: po.poNumber,
        order_date: po.orderDate,
        expected_date: po.expectedDate,
        status: po.status
      };
      await apiFetch(`/api/v1/purchase-order/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } catch (e: any) {
      console.error(`Error updating Purchase Order: ${e.message}`);
    }
  };

  const deletePurchaseOrder = async (id: string) => {
    setPurchaseOrders(prev => prev.filter(item => item.id !== id));
    try {
      await apiFetch(`/api/v1/purchase-order/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.error(`Error deleting Purchase Order: ${e.message}`);
    }
  };

  // Sales Orders
  const addSalesOrder = async (so: any) => {
    try {
      const payload: any = {
        customer_id: so.customerId || (customers.length > 0 ? customers[0].id : undefined),
        customer_name: so.customerName,
        so_number: so.soNumber || `SO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        order_date: so.orderDate || new Date().toISOString().slice(0, 10),
        required_date: so.requiredDate || new Date().toISOString().slice(0, 10),
        status: so.status || 'draft',
        total_amount: Number(so.totalAmount) || 0,
        lines: (so.items || []).map((i: any) => ({
          inventory_item_id: i.itemId || i.id,
          qty_ordered: Number(i.quantity || i.qty) || 1,
          unit_price: Number(i.unitPrice) || 0
        }))
      };
      const created = await apiFetch('/api/v1/sales-order', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const newSo = {
        id: created.id,
        soNumber: created.so_number || payload.so_number,
        customerId: created.customer_id || payload.customer_id,
        customerName: created.customer?.name || so.customerName || 'Direct Customer',
        orderDate: created.order_date ? new Date(created.order_date).toISOString().slice(0, 10) : payload.order_date,
        requiredDate: created.required_date ? new Date(created.required_date).toISOString().slice(0, 10) : payload.required_date,
        status: created.status || 'draft',
        totalAmount: Number(created.total_amount) || payload.total_amount,
        itemCount: (created.lines || []).length || 1,
        notes: created.notes || '',
        items: (created.lines || []).map((l: any) => ({
          id: l.id,
          itemId: l.inventory_item_id || l.item_id,
          name: l.inventory_item?.name || l.item_name || 'Component',
          quantity: Number(l.qty_ordered || l.quantity) || 0,
          shippedQty: Number(l.qty_shipped || l.quantity) || 0,
          unitPrice: Number(l.unit_price) || 0
        }))
      };
      setSalesOrders(prev => [newSo, ...prev]);
      return created?.id;
    } catch (e: any) {
      console.error(`Error creating Sales Order: ${e.message}`);
    }
  };

  const updateSalesOrder = async (id: string, so: any) => {
    setSalesOrders(prev => prev.map(item => item.id === id ? { ...item, ...so } : item));
    try {
      const payload = {
        customer_id: so.customerId,
        so_number: so.soNumber,
        order_date: so.orderDate,
        required_date: so.requiredDate,
        status: so.status
      };
      await apiFetch(`/api/v1/sales-order/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } catch (e: any) {
      console.error(`Error updating Sales Order: ${e.message}`);
    }
  };

  const deleteSalesOrder = async (id: string) => {
    setSalesOrders(prev => prev.filter(item => item.id !== id));
    try {
      await apiFetch(`/api/v1/sales-order/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.error(`Error deleting Sales Order: ${e.message}`);
    }
  };

  // Warehouse handlers
  const addWarehouse = async (wh: any) => {
    try {
      const payload = {
        code: wh.code || `WH-${Date.now()}`,
        name: wh.name,
        address: { street: wh.address },
        is_default: !!wh.isDefault
      };
      const created = await apiFetch('/api/v1/warehouse', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const newWh = {
        id: created.id,
        code: created.code || payload.code,
        name: created.name || payload.name,
        address: typeof created.address === 'object' ? (created.address?.street || 'Main Storage') : (created.address || ''),
        isDefault: !!created.is_default,
        binCount: 0,
        totalCapacityPct: 0
      };
      setWarehouses(prev => [newWh, ...prev]);
    } catch (e: any) {
      console.error(`Error creating warehouse: ${e.message}`);
    }
  };

  const updateWarehouse = async (id: string, wh: any) => {
    setWarehouses(prev => prev.map(item => item.id === id ? { ...item, ...wh } : item));
    try {
      const payload = {
        code: wh.code,
        name: wh.name,
        address: { street: wh.address },
        is_default: !!wh.isDefault
      };
      await apiFetch(`/api/v1/warehouse/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } catch (e: any) {
      console.error(`Error updating warehouse: ${e.message}`);
    }
  };

  const deleteWarehouse = async (id: string) => {
    setWarehouses(prev => prev.filter(item => item.id !== id));
    try {
      await apiFetch(`/api/v1/warehouse/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.error(`Error deleting warehouse: ${e.message}`);
    }
  };

  // Bin handlers
  const addBin = async (bin: any) => {
    try {
      const whObj = warehouses.find(w => w.code === bin.warehouseCode);
      const payload = {
        code: bin.code || `BIN-${Date.now()}`,
        warehouse_id: whObj?.id || warehouses[0]?.id || '',
        description: bin.description
      };
      const created = await apiFetch('/api/v1/bin', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const newBin = {
        id: created.id,
        code: created.code || payload.code,
        warehouseCode: bin.warehouseCode || '',
        description: created.description || bin.description || '',
        isActive: true
      };
      setBins(prev => [newBin, ...prev]);
    } catch (e: any) {
      console.error(`Error creating bin storage location: ${e.message}`);
    }
  };

  const deleteBin = async (id: string) => {
    setBins(prev => prev.filter(item => item.id !== id));
    try {
      await apiFetch(`/api/v1/bin/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.error(`Error deleting bin storage location: ${e.message}`);
    }
  };

  // Visual Warehouse Persistence Functions
  const savePhysicalRacks = async (racks: any[]) => {
    try {
      setPhysicalRacks(racks);
      await apiFetch('/api/v1/warehouse-visual/physical-racks/bulk', {
        method: 'POST',
        body: JSON.stringify({ racks })
      });
    } catch (e) {
      console.warn('Backend save failed; preserved in client cache:', e);
    }
  };

  const getFloorPlan = async (whCode: string) => {
    try {
      const res = await apiFetch(`/api/v1/warehouse-visual/floorplan/${whCode}`);
      return res?.data || { elements: [], templates: [] };
    } catch (e) {
      console.warn('Backend floor plan fetch failed:', e);
      return { elements: [], templates: [] };
    }
  };

  const saveFloorPlan = async (whCode: string, elements: any[], templates: any[]) => {
    try {
      await apiFetch(`/api/v1/warehouse-visual/floorplan/${whCode}`, {
        method: 'POST',
        body: JSON.stringify({ elements, templates })
      });
    } catch (e) {
      console.warn('Backend floor plan save failed:', e);
    }
  };

  const saveElementType = async (typeData: any) => {
    try {
      const res = await apiFetch('/api/v1/warehouse-visual/element-types', {
        method: 'POST',
        body: JSON.stringify(typeData)
      });
      if (res?.data) {
        setElementTypes(prev => [...prev, res.data]);
      }
    } catch (e) {
      console.warn('Backend element type save failed:', e);
    }
  };

  // Serial Numbers Functions
  const loadSerialNumbers = async (filters?: any) => {
    try {
      const queryParams = new URLSearchParams(filters || {}).toString();
      const res = await apiFetch(`/api/v1/serials${queryParams ? `?${queryParams}` : ''}`);
      if (res?.data) {
        setSerialNumbers(res.data);
        return res.data;
      }
      return [];
    } catch (e) {
      console.warn('Error loading serial numbers:', e);
      return [];
    }
  };

  const lookupSerialNumber = async (serial: string) => {
    try {
      const res = await apiFetch(`/api/v1/serials/lookup/${encodeURIComponent(serial)}`);
      return res?.data || null;
    } catch (e) {
      return null;
    }
  };

  const registerBulkSerials = async (payload: any) => {
    try {
      const res = await apiFetch('/api/v1/serials/bulk', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res?.data) {
        setSerialNumbers(prev => [...res.data, ...prev]);
      }
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  const updateSerialStatus = async (id: string, status: string, location?: string, notes?: string) => {
    setSerialNumbers(prev => prev.map(s => s.id === id ? { ...s, status, location: location || s.location } : s));
    try {
      const res = await apiFetch(`/api/v1/serials/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, location, notes })
      });
      if (res?.data) {
        setSerialNumbers(prev => prev.map(s => s.id === id ? res.data : s));
      }
    } catch (e: any) {
      throw e;
    }
  };

  const deleteSerialNumber = async (id: string) => {
    setSerialNumbers(prev => prev.filter(s => s.id !== id));
    try {
      await apiFetch(`/api/v1/serials/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      throw e;
    }
  };

  // Stock Ledger & WMS Operations Functions
  const loadStockLedger = async (filters?: any) => {
    try {
      const queryParams = new URLSearchParams(filters || {}).toString();
      const res = await apiFetch(`/api/v1/stock-ledger${queryParams ? `?${queryParams}` : ''}`);
      if (res?.entries) {
        setStockLedger(res.entries);
        return res.entries;
      }
      return [];
    } catch (e) {
      console.warn('Error loading stock ledger:', e);
      return [];
    }
  };

  const postStockAdjustment = async (itemId: string, qtyDelta: number, binLocation?: string, reasonCode?: string, notes?: string) => {
    const item = inventory.find(i => i.id === itemId);
    const itemName = item?.name || 'Component';

    // 0ms Optimistic UI update on inventory
    setInventory(prev => prev.map(i => i.id === itemId ? {
      ...i,
      stockQty: Math.max(0, i.stockQty + qtyDelta),
      binLocation: binLocation || i.binLocation
    } : i));

    logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'adjust',
      description: `Stock adjustment for "${itemName}" (${qtyDelta > 0 ? '+' : ''}${qtyDelta})`,
      items: [{ componentId: itemId, componentName: itemName, qtyDiff: qtyDelta }],
      diffs: [{ field: 'stockQty', oldValue: item?.stockQty ?? 0, newValue: (item?.stockQty ?? 0) + qtyDelta }]
    });

    addAction({
      id: `adj_stock_${Date.now()}`,
      name: `Stock Adjust: ${itemName} (${qtyDelta > 0 ? '+' : ''}${qtyDelta})`,
      undo: async () => {
        setInventory(prev => prev.map(i => i.id === itemId ? { ...i, stockQty: Math.max(0, i.stockQty - qtyDelta) } : i));
        try {
          await apiFetch('/api/v1/stock-ledger/adjust', {
            method: 'POST',
            body: JSON.stringify({ itemId, qtyDelta: -qtyDelta, binLocation, reasonCode: 'Undo Stock Adjustment' })
          });
        } catch (err) {
          console.warn('Undo stock adjust error:', err);
        }
      },
      redo: async () => {
        setInventory(prev => prev.map(i => i.id === itemId ? { ...i, stockQty: Math.max(0, i.stockQty + qtyDelta) } : i));
        try {
          await apiFetch('/api/v1/stock-ledger/adjust', {
            method: 'POST',
            body: JSON.stringify({ itemId, qtyDelta, binLocation, reasonCode: reasonCode || 'Redo Stock Adjustment' })
          });
        } catch (err) {
          console.warn('Redo stock adjust error:', err);
        }
      }
    });

    try {
      const res = await apiFetch('/api/v1/stock-ledger/adjust', {
        method: 'POST',
        body: JSON.stringify({ itemId, qtyDelta, binLocation, reasonCode: reasonCode || 'Manual Stock Adjustment', notes })
      });
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  const receivePurchaseOrderWms = async (poId: string, receiptLines: any[]) => {
    try {
      const res = await apiFetch(`/api/v1/wms/purchase-orders/${poId}/receive`, {
        method: 'POST',
        body: JSON.stringify({ receiptLines })
      });
      // Refresh inventory and POs
      const [invData, poData] = await Promise.all([
        apiFetch('/api/v1/inventory'),
        apiFetch('/api/v1/purchase-order')
      ]);
      if (Array.isArray(invData)) setInventory(invData.map(mapItemToFrontend));
      if (Array.isArray(poData)) {
        setPurchaseOrders(poData.map((po: any) => ({
          id: po.id,
          poNumber: po.po_number || po.order_number || po.id,
          vendorId: po.vendor_id,
          vendorName: po.vendor?.name || 'Standard Supplier',
          orderDate: po.order_date ? new Date(po.order_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          expectedDate: po.expected_date ? new Date(po.expected_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          status: po.status || 'draft',
          totalAmount: Number(po.total_amount) || 0,
          itemCount: (po.lines || []).length || 1,
          items: (po.lines || []).map((l: any) => ({
            id: l.id,
            itemId: l.inventory_item_id || l.item_id,
            name: l.inventory_item?.name || l.item_name || 'Component',
            quantity: Number(l.qty_ordered || l.quantity) || 0,
            receivedQty: Number(l.qty_received || l.received_qty) || 0,
            unitPrice: Number(l.unit_cost) || 0
          }))
        })));
      }
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  const fulfillSalesOrderWms = async (soId: string, fulfillmentLines: any[], carrier?: string, trackingNumber?: string) => {
    try {
      const res = await apiFetch(`/api/v1/wms/sales-orders/${soId}/fulfill`, {
        method: 'POST',
        body: JSON.stringify({ fulfillmentLines, carrier, trackingNumber })
      });
      const [invData, soData] = await Promise.all([
        apiFetch('/api/v1/inventory'),
        apiFetch('/api/v1/sales-order')
      ]);
      if (Array.isArray(invData)) setInventory(invData.map(mapItemToFrontend));
      if (Array.isArray(soData)) {
        setSalesOrders(soData.map((so: any) => ({
          id: so.id,
          soNumber: so.so_number || so.order_number || so.id,
          customerId: so.customer_id,
          customerName: so.customer?.name || 'Direct Customer',
          orderDate: so.order_date ? new Date(so.order_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          requiredDate: so.required_date ? new Date(so.required_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          status: so.status || 'draft',
          totalAmount: Number(so.total_amount) || 0,
          itemCount: (so.lines || []).length || 1,
          notes: so.notes || '',
          items: (so.lines || []).map((l: any) => ({
            id: l.id,
            itemId: l.inventory_item_id || l.item_id,
            name: l.inventory_item?.name || l.item_name || 'Component',
            quantity: Number(l.qty_ordered || l.quantity) || 0,
            shippedQty: Number(l.qty_shipped || l.quantity) || 0,
            unitPrice: Number(l.unit_price) || 0
          }))
        })));
      }
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  const loadWmsTransfers = async () => {
    try {
      const res = await apiFetch('/api/v1/wms/transfers');
      if (Array.isArray(res)) {
        setWmsTransfers(res);
        return res;
      }
      return [];
    } catch (e) {
      console.warn('Error loading transfers:', e);
      return [];
    }
  };

  const createWmsTransfer = async (data: any) => {
    try {
      const res = await apiFetch('/api/v1/wms/transfers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res?.id) {
        setWmsTransfers(prev => [res, ...prev]);
      }
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  const dispatchWmsTransfer = async (transferId: string, carrier?: string, trackingNumber?: string) => {
    try {
      const res = await apiFetch(`/api/v1/wms/transfers/${transferId}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({ carrier, trackingNumber })
      });
      setWmsTransfers(prev => prev.map(t => t.id === transferId ? res : t));
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  const receiveWmsTransfer = async (transferId: string, receiptLines?: any[]) => {
    try {
      const res = await apiFetch(`/api/v1/wms/transfers/${transferId}/receive`, {
        method: 'POST',
        body: JSON.stringify({ receiptLines })
      });
      setWmsTransfers(prev => prev.map(t => t.id === transferId ? res : t));
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  const loadWmsCycleCounts = async () => {
    try {
      const res = await apiFetch('/api/v1/wms/cycle-counts');
      if (Array.isArray(res)) {
        setWmsCycleCounts(res);
        return res;
      }
      return [];
    } catch (e) {
      console.warn('Error loading cycle counts:', e);
      return [];
    }
  };

  const createWmsCycleCount = async (data: any) => {
    try {
      const res = await apiFetch('/api/v1/wms/cycle-counts', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res?.id) {
        setWmsCycleCounts(prev => [res, ...prev]);
      }
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  const submitWmsCycleCount = async (countId: string, counts: any[]) => {
    try {
      const res = await apiFetch(`/api/v1/wms/cycle-counts/${countId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ counts })
      });
      setWmsCycleCounts(prev => prev.map(c => c.id === countId ? res : c));
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  const approveWmsCycleCount = async (countId: string) => {
    try {
      const res = await apiFetch(`/api/v1/wms/cycle-counts/${countId}/approve`, {
        method: 'POST'
      });
      setWmsCycleCounts(prev => prev.map(c => c.id === countId ? res : c));
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  const updateCustomerOrderStatus = async (orderId: string, status: string) => {
    setCustomerOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    try {
      await apiFetch(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    } catch (e: any) {
      console.error('Failed to update storefront order status:', e);
      throw e;
    }
  };

  const updateCustomerOrderFulfillment = async (orderId: string, fulfillmentData: {
    status?: string;
    carrier?: string;
    tracking_number?: string;
    notes?: string;
    customer_address?: string;
    invoice_number?: string;
  }) => {
    setCustomerOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...fulfillmentData } : o));
    try {
      await apiFetch(`/api/v1/orders/${orderId}/fulfillment`, {
        method: 'PATCH',
        body: JSON.stringify(fulfillmentData)
      });
    } catch (e: any) {
      console.error('Failed to update storefront order fulfillment:', e);
      throw e;
    }
  };

  const refreshCustomerOrders = async () => {
    try {
      const orders = await apiFetch('/api/v1/orders');
      if (Array.isArray(orders)) {
        setCustomerOrders(orders);
      }
    } catch (e: any) {
      console.warn('Failed to refresh customer orders:', e);
    }
  };

  return (
    <DataContext.Provider value={{
      inventory, kits, transactions, vendors, customers, purchaseOrders, salesOrders, customerOrders, warehouses, bins, loading,
      physicalRacks, elementTypes, serialNumbers,
      stockLedger, wmsTransfers, wmsCycleCounts,
      addInventoryItem, updateInventoryItem, deleteInventoryItem, addKitBOM, updateKitBOM, deleteKitBOM, logTransaction,
      addVendor, updateVendor, deleteVendor, addCustomer, updateCustomer, deleteCustomer,
      addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, addSalesOrder, updateSalesOrder, deleteSalesOrder,
      addWarehouse, updateWarehouse, deleteWarehouse, addBin, deleteBin,
      savePhysicalRacks, getFloorPlan, saveFloorPlan, saveElementType,
      loadSerialNumbers, lookupSerialNumber, registerBulkSerials, updateSerialStatus, deleteSerialNumber,
      loadStockLedger, postStockAdjustment, receivePurchaseOrderWms, fulfillSalesOrderWms,
      loadWmsTransfers, createWmsTransfer, dispatchWmsTransfer, receiveWmsTransfer,
      loadWmsCycleCounts, createWmsCycleCount, submitWmsCycleCount, approveWmsCycleCount,
      updateCustomerOrderStatus, updateCustomerOrderFulfillment, refreshCustomerOrders
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
