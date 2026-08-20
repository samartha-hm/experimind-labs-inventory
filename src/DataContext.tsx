import React, { createContext, useContext, useEffect, useState } from 'react';
import { InventoryItem, KitBOM, TransactionRecord, BOMRequirement } from './types';
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
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  
  // Kits (BOM)
  addKitBOM: (kit: Omit<KitBOM, 'id'>) => Promise<string>;
  updateKitBOM: (kitId: string, updatedRequirements: BOMRequirement[]) => Promise<void>;
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
}

const DataContext = createContext<DataContextType>({
  inventory: [],
  kits: [],
  transactions: [],
  vendors: [],
  customers: [],
  purchaseOrders: [],
  salesOrders: [],
  warehouses: [],
  bins: [],
  loading: true,
  addInventoryItem: async () => {},
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
    assignedKitName: dbItem.assigned_kit_name || undefined
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
  if (item.barcode !== undefined) result.sku = item.barcode;
  if (item.assignedKitName !== undefined) result.assigned_kit_name = item.assignedKitName;
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
  const [loading, setLoading] = useState(true);

  const loadAllData = async () => {
    try {
      const results = await Promise.allSettled([
        apiFetch('/api/v1/inventory'),
        apiFetch('/api/v1/kit'),
        apiFetch('/api/v1/transaction'),
        apiFetch('/api/v1/vendor'),
        apiFetch('/api/v1/customer'),
        apiFetch('/api/v1/purchase-order'),
        apiFetch('/api/v1/sales-order'),
        apiFetch('/api/v1/warehouse'),
        apiFetch('/api/v1/bin')
      ]);

      const [resInv, resKits, resTx, resVendors, resCustomers, resPos, resSos, resWh, resBins] = results;

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
          poNumber: po.po_number,
          vendorName: po.vendor?.name || 'Supplier',
          orderDate: po.order_date,
          expectedDate: po.expected_date,
          status: po.status,
          totalAmount: Number(po.total_amount) || 0
        })));
      }

      if (resSos.status === 'fulfilled' && Array.isArray(resSos.value)) {
        setSalesOrders(resSos.value.map((so: any) => ({
          id: so.id,
          soNumber: so.so_number,
          customerName: so.customer?.name || 'Customer',
          orderDate: so.order_date,
          requiredDate: so.required_date,
          status: so.status,
          totalAmount: Number(so.total_amount) || 0
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

    } catch (e) {
      console.error('Error loading data from PostgreSQL:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadAllData();
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
      setLoading(false);
    }
  }, [user, token]);

  // CRUD Implementations

  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    try {
      const payload = mapItemToBackend(item);
      if (!payload.sku) payload.sku = `SKU-${Date.now()}`;
      if (payload.base_price === undefined) payload.base_price = 0;
      if (payload.quantity === undefined) payload.quantity = 0;
      if (payload.threshold === undefined) payload.threshold = 5;

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
    } catch (e: any) {
      alert(`Add Item Error: ${e.message}`);
    }
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const oldItem = inventory.find(i => i.id === id);
      let updatedBackend: any = null;

      // Concurrency-safe delta stock mutation via /adjust endpoint
      if (typeof updates.stockQty === 'number' && oldItem) {
        const delta = updates.stockQty - oldItem.stockQty;
        if (delta !== 0) {
          updatedBackend = await apiFetch(`/api/v1/inventory/${id}/adjust`, {
            method: 'POST',
            body: JSON.stringify({ delta, reason: 'Stock adjustment' })
          });
        }
      }

      // Non-stock metadata updates via PUT
      const { stockQty, ...otherUpdates } = updates;
      if (Object.keys(otherUpdates).length > 0) {
        const payload = mapItemToBackend(otherUpdates);
        updatedBackend = await apiFetch(`/api/v1/inventory/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      }

      if (updatedBackend) {
        const newItem = mapItemToFrontend(updatedBackend);
        setInventory(prev => prev.map(item => item.id === id ? newItem : item));
      }
    } catch (e: any) {
      alert(`Update Error: ${e.message}`);
    }
  };

  const deleteInventoryItem = async (id: string) => {
    try {
      const itemToDelete = inventory.find(i => i.id === id);
      if (!itemToDelete) return;

      await apiFetch(`/api/v1/inventory/${id}`, { method: 'DELETE' });
      setInventory(prev => prev.filter(item => item.id !== id));

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
      alert(`Delete Item Error: ${e.message}`);
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
      loadAllData();

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
          loadAllData();
        },
        redo: async () => {
          const re = await apiFetch('/api/v1/kit', { method: 'POST', body: JSON.stringify(payload) });
          kitId = re.id;
          loadAllData();
        }
      });

      return created.id;
    } catch (e: any) {
      alert(`Create Kit Error: ${e.message}`);
      return '';
    }
  };

  const updateKitBOM = async (kitId: string, updatedRequirements: BOMRequirement[]) => {
    try {
      const kitToUpdate = kits.find(k => k.id === kitId);
      if (!kitToUpdate) return;
      const oldItems = kitToUpdate.items || [];

      const payload = {
        name: kitToUpdate.name,
        description: kitToUpdate.description,
        image_url: kitToUpdate.imageUrl,
        bom_items: updatedRequirements.map(i => ({
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
        const newI = updatedRequirements.find(i => i.componentId === oldI.componentId);
        if (!newI) diffs.push({ field: 'removed_component', oldValue: oldI.componentId, newValue: null });
        else if (newI.qty !== oldI.qty) diffs.push({ field: `qty_${oldI.componentId}`, oldValue: oldI.qty, newValue: newI.qty });
      });
      updatedRequirements.forEach(newI => {
        if (!oldItems.some(i => i.componentId === newI.componentId)) {
          diffs.push({ field: 'added_component', oldValue: null, newValue: newI.componentId });
        }
      });

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Updated BOM for kit "${kitToUpdate.name}"`,
        kitName: kitToUpdate.name,
        items: [],
        diffs
      });

      addAction({
        id: `upd_kit_${Date.now()}`,
        name: `Update Kit BOM: ${kitToUpdate.name}`,
        undo: async () => {
          const oldPayload = {
            name: kitToUpdate.name,
            description: kitToUpdate.description,
            image_url: kitToUpdate.imageUrl,
            bom_items: oldItems.map(i => ({ inventory_item_id: i.componentId, quantity: i.qty }))
          };
          await apiFetch(`/api/v1/kit/${kitId}`, { method: 'PUT', body: JSON.stringify(oldPayload) });
          loadAllData();
        },
        redo: async () => {
          await apiFetch(`/api/v1/kit/${kitId}`, { method: 'PUT', body: JSON.stringify(payload) });
          loadAllData();
        }
      });

      loadAllData();
    } catch (e: any) {
      alert(`Update Kit BOM Error: ${e.message}`);
    }
  };

  const deleteKitBOM = async (id: string) => {
    try {
      const kitToDelete = kits.find(k => k.id === id);
      if (!kitToDelete) return;

      await apiFetch(`/api/v1/kit/${id}`, { method: 'DELETE' });
      setKits(prev => prev.filter(k => k.id !== id));

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
          await apiFetch('/api/v1/kit', { method: 'POST', body: JSON.stringify(payload) });
          loadAllData();
        },
        redo: async () => {
          await apiFetch(`/api/v1/kit/${id}`, { method: 'DELETE' });
          loadAllData();
        }
      });
    } catch (e: any) {
      alert(`Delete Kit Error: ${e.message}`);
    }
  };

  const logTransaction = async (tx: TransactionRecord) => {
    const enrichedTx: TransactionRecord = {
      ...tx,
      userName: tx.userName || user?.name || user?.email || 'Guest Administrator',
      userRole: tx.userRole || user?.role || 'admin',
      userId: tx.userId || user?.id || 'admin_user',
    };
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
      setTransactions(prev => [enrichedTx, ...prev]);
    } catch (e: any) {
      console.warn(`Failed to log transaction: ${e.message}`);
      setTransactions(prev => [enrichedTx, ...prev]);
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
      await apiFetch('/api/v1/vendor', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      loadAllData();

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Added Vendor "${v.name}"`,
        items: [],
        diffs: [{ field: 'vendor_name', oldValue: null, newValue: v.name }]
      });

      addAction({
        id: `add_vendor_${Date.now()}`,
        name: `Add Vendor: ${v.name}`,
        undo: async () => {
          // Delete created vendor by refreshing data or standard deletion
          loadAllData();
        },
        redo: async () => {
          await apiFetch('/api/v1/vendor', { method: 'POST', body: JSON.stringify(payload) });
          loadAllData();
        }
      });
    } catch (e: any) {
      alert(`Error creating vendor: ${e.message}`);
    }
  };

  const updateVendor = async (id: string, v: any) => {
    try {
      const oldV = vendors.find(item => item.id === id);
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
      loadAllData();

      if (oldV) {
        logTransaction({
          id: `tx_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'adjust',
          description: `Updated Vendor "${v.name}"`,
          items: [],
          diffs: [{ field: 'name', oldValue: oldV.name, newValue: v.name }]
        });

        addAction({
          id: `upd_vendor_${Date.now()}`,
          name: `Update Vendor: ${v.name}`,
          undo: async () => {
            await apiFetch(`/api/v1/vendor/${id}`, {
              method: 'PUT',
              body: JSON.stringify({
                vendor_code: oldV.code,
                name: oldV.name,
                contact_name: oldV.contactName,
                email: oldV.email,
                phone: oldV.phone,
                payment_terms: oldV.paymentTerms,
                address: { city: oldV.address }
              })
            });
            loadAllData();
          },
          redo: async () => {
            await apiFetch(`/api/v1/vendor/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            loadAllData();
          }
        });
      }
    } catch (e: any) {
      alert(`Error updating vendor: ${e.message}`);
    }
  };

  const deleteVendor = async (id: string) => {
    try {
      const v = vendors.find(item => item.id === id);
      await apiFetch(`/api/v1/vendor/${id}`, { method: 'DELETE' });
      loadAllData();

      if (v) {
        logTransaction({
          id: `tx_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'adjust',
          description: `Deleted Vendor "${v.name}"`,
          items: [],
          diffs: [{ field: 'deleted', oldValue: v.name, newValue: null }]
        });
      }
    } catch (e: any) {
      alert(`Error deleting vendor: ${e.message}`);
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
      await apiFetch('/api/v1/customer', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      loadAllData();

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Added Customer "${c.name}"`,
        items: [],
        diffs: [{ field: 'customer_name', oldValue: null, newValue: c.name }]
      });
    } catch (e: any) {
      alert(`Error creating customer: ${e.message}`);
    }
  };

  const updateCustomer = async (id: string, c: any) => {
    try {
      const oldC = customers.find(item => item.id === id);
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
      loadAllData();

      if (oldC) {
        logTransaction({
          id: `tx_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'adjust',
          description: `Updated Customer "${c.name}"`,
          items: [],
          diffs: [{ field: 'name', oldValue: oldC.name, newValue: c.name }]
        });
      }
    } catch (e: any) {
      alert(`Error updating customer: ${e.message}`);
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const c = customers.find(item => item.id === id);
      await apiFetch(`/api/v1/customer/${id}`, { method: 'DELETE' });
      loadAllData();

      if (c) {
        logTransaction({
          id: `tx_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'adjust',
          description: `Deleted Customer "${c.name}"`,
          items: [],
          diffs: [{ field: 'deleted', oldValue: c.name, newValue: null }]
        });
      }
    } catch (e: any) {
      alert(`Error deleting customer: ${e.message}`);
    }
  };

  // Purchase Orders
  const addPurchaseOrder = async (po: any) => {
    try {
      const payload = {
        vendor_id: po.vendorId || vendors[0]?.id || '',
        po_number: po.poNumber || `PO-${Date.now()}`,
        order_date: po.orderDate || new Date().toISOString(),
        expected_date: po.expectedDate || new Date().toISOString(),
        status: po.status || 'draft',
        lines: []
      };
      await apiFetch('/api/v1/purchase-order', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      loadAllData();

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Created Purchase Order "${payload.po_number}"`,
        items: [],
        diffs: [{ field: 'po_number', oldValue: null, newValue: payload.po_number }]
      });
    } catch (e: any) {
      alert(`Error creating Purchase Order: ${e.message}`);
    }
  };

  const updatePurchaseOrder = async (id: string, po: any) => {
    try {
      const oldPo = purchaseOrders.find(item => item.id === id);
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
      loadAllData();

      if (oldPo) {
        logTransaction({
          id: `tx_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'adjust',
          description: `Updated Purchase Order "${po.poNumber || oldPo.poNumber}"`,
          items: [],
          diffs: [{ field: 'status', oldValue: oldPo.status, newValue: po.status }]
        });
      }
    } catch (e: any) {
      alert(`Error updating Purchase Order: ${e.message}`);
    }
  };

  const deletePurchaseOrder = async (id: string) => {
    try {
      const po = purchaseOrders.find(item => item.id === id);
      await apiFetch(`/api/v1/purchase-order/${id}`, { method: 'DELETE' });
      loadAllData();

      if (po) {
        logTransaction({
          id: `tx_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'adjust',
          description: `Deleted Purchase Order "${po.poNumber}"`,
          items: [],
          diffs: [{ field: 'deleted', oldValue: po.poNumber, newValue: null }]
        });
      }
    } catch (e: any) {
      alert(`Error deleting Purchase Order: ${e.message}`);
    }
  };

  // Sales Orders
  const addSalesOrder = async (so: any) => {
    try {
      const payload = {
        customer_id: so.customerId || customers[0]?.id || '',
        so_number: so.soNumber || `SO-${Date.now()}`,
        order_date: so.orderDate || new Date().toISOString(),
        required_date: so.requiredDate || new Date().toISOString(),
        status: so.status || 'draft',
        lines: []
      };
      await apiFetch('/api/v1/sales-order', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      loadAllData();

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Created Sales Order "${payload.so_number}"`,
        items: [],
        diffs: [{ field: 'so_number', oldValue: null, newValue: payload.so_number }]
      });
    } catch (e: any) {
      alert(`Error creating Sales Order: ${e.message}`);
    }
  };

  const updateSalesOrder = async (id: string, so: any) => {
    try {
      const oldSo = salesOrders.find(item => item.id === id);
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
      loadAllData();

      if (oldSo) {
        logTransaction({
          id: `tx_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'adjust',
          description: `Updated Sales Order "${so.soNumber || oldSo.soNumber}"`,
          items: [],
          diffs: [{ field: 'status', oldValue: oldSo.status, newValue: so.status }]
        });
      }
    } catch (e: any) {
      alert(`Error updating Sales Order: ${e.message}`);
    }
  };

  const deleteSalesOrder = async (id: string) => {
    try {
      const so = salesOrders.find(item => item.id === id);
      await apiFetch(`/api/v1/sales-order/${id}`, { method: 'DELETE' });
      loadAllData();

      if (so) {
        logTransaction({
          id: `tx_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'adjust',
          description: `Deleted Sales Order "${so.soNumber}"`,
          items: [],
          diffs: [{ field: 'deleted', oldValue: so.soNumber, newValue: null }]
        });
      }
    } catch (e: any) {
      alert(`Error deleting Sales Order: ${e.message}`);
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
      await apiFetch('/api/v1/warehouse', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      loadAllData();

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Added Warehouse "${wh.name}"`,
        items: [],
        diffs: [{ field: 'warehouse_name', oldValue: null, newValue: wh.name }]
      });
    } catch (e: any) {
      alert(`Error creating warehouse: ${e.message}`);
    }
  };

  const updateWarehouse = async (id: string, wh: any) => {
    try {
      const oldWh = warehouses.find(item => item.id === id);
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
      loadAllData();

      if (oldWh) {
        logTransaction({
          id: `tx_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'adjust',
          description: `Updated Warehouse "${wh.name}"`,
          items: [],
          diffs: [{ field: 'name', oldValue: oldWh.name, newValue: wh.name }]
        });
      }
    } catch (e: any) {
      alert(`Error updating warehouse: ${e.message}`);
    }
  };

  const deleteWarehouse = async (id: string) => {
    try {
      const wh = warehouses.find(item => item.id === id);
      await apiFetch(`/api/v1/warehouse/${id}`, { method: 'DELETE' });
      loadAllData();

      if (wh) {
        logTransaction({
          id: `tx_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'adjust',
          description: `Deleted Warehouse "${wh.name}"`,
          items: [],
          diffs: [{ field: 'deleted', oldValue: wh.name, newValue: null }]
        });
      }
    } catch (e: any) {
      alert(`Error deleting warehouse: ${e.message}`);
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
      await apiFetch('/api/v1/bin', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      loadAllData();

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Added Bin Location "${bin.code}"`,
        items: [],
        diffs: [{ field: 'bin_code', oldValue: null, newValue: bin.code }]
      });
    } catch (e: any) {
      alert(`Error creating bin storage location: ${e.message}`);
    }
  };

  const deleteBin = async (id: string) => {
    try {
      const bin = bins.find(item => item.id === id);
      await apiFetch(`/api/v1/bin/${id}`, { method: 'DELETE' });
      loadAllData();

      if (bin) {
        logTransaction({
          id: `tx_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'adjust',
          description: `Deleted Bin Location "${bin.code}"`,
          items: [],
          diffs: [{ field: 'deleted', oldValue: bin.code, newValue: null }]
        });
      }
    } catch (e: any) {
      alert(`Error deleting bin storage location: ${e.message}`);
    }
  };

  return (
    <DataContext.Provider value={{
      inventory, kits, transactions, vendors, customers, purchaseOrders, salesOrders, warehouses, bins, loading,
      addInventoryItem, updateInventoryItem, deleteInventoryItem, addKitBOM, updateKitBOM, deleteKitBOM, logTransaction,
      addVendor, updateVendor, deleteVendor, addCustomer, updateCustomer, deleteCustomer,
      addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, addSalesOrder, updateSalesOrder, deleteSalesOrder,
      addWarehouse, updateWarehouse, deleteWarehouse, addBin, deleteBin
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
