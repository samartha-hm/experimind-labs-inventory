import React, { useState, useMemo, useEffect } from 'react';
import { Settings, DatabaseZap, LayoutDashboard } from 'lucide-react';
import { analyzeKitting } from './utils/kitting';
import { useData, DataProvider } from './DataContext';
import { useAuth } from './AuthContext';
import { apiFetch } from './utils/api';
import { BOMRequirement } from './types';

import UndoRedoWidget from '@/src/components/UndoRedoWidget';
import { useUndoRedo } from '@/src/contexts/UndoRedoContext';
import Sidebar from '@/src/shared/components/Sidebar';
import Header from '@/src/shared/components/Header';
import OverviewTab from '@/src/features/dashboard/components/OverviewTab';
import InventoryTab from '@/src/features/inventory/components/InventoryTab';
import KittingTab from '@/src/features/kitting/components/KittingTab';
import AICopilotTab from '@/src/features/copilot/components/AICopilotTab';
import PurchaseOrdersTab from '@/src/features/procurement/components/PurchaseOrdersTab';
import SalesOrdersTab from '@/src/features/sales/components/SalesOrdersTab';
import PartnersTab from '@/src/features/partners/components/PartnersTab';
import WarehousesTab from '@/src/features/warehouse/components/WarehousesTab';
import BOMCustomizerModal from '@/src/features/kitting/components/BOMCustomizerModal';
import CreateKitModal from '@/src/features/kitting/components/CreateKitModal';
import ShopTab from '@/src/features/storefront/components/ShopTab';
import RevisionHistoryTab from '@/src/features/history/RevisionHistoryTab';
import AutomationTab from '@/src/features/automation/AutomationTab';
import ValuationAnalyticsTab from '@/src/features/dashboard/components/ValuationAnalyticsTab';
import AIAgentSuggestionBar from '@/src/shared/components/AIAgentSuggestionBar';
import AIAgentResearchDrawer from '@/src/features/copilot/components/AIAgentResearchDrawer';
import CommandPaletteModal from '@/src/shared/components/CommandPaletteModal';
import GSTEngineTab from '@/src/features/gst/GSTEngineTab';
import ZohoIntegrationTab from '@/src/features/integrations/ZohoIntegrationTab';
import PredictiveAnalyticsTab from '@/src/features/analytics/PredictiveAnalyticsTab';
import ComplianceSecurityTab from '@/src/features/compliance/ComplianceSecurityTab';
import WarehouseHeatmapTab from '@/src/features/warehouse/components/WarehouseHeatmapTab';
import StockTransferTab from '@/src/features/warehouse/components/StockTransferTab';
import BatchExpiryTab from '@/src/features/inventory/components/BatchExpiryTab';
import StockLedgerTab from '@/src/features/inventory/components/StockLedgerTab';
import WarehouseFloorMode from '@/src/features/warehouse/components/WarehouseFloorMode';
import CompAIVoiceAssistant from '@/src/features/copilot/components/CompAIVoiceAssistant';
import Warehouse3DDigitalTwin from '@/src/features/warehouse/components/Warehouse3DDigitalTwin';
import FloorPlanDesignerTab from '@/src/features/warehouse/components/FloorPlanDesignerTab';
import ApprovalCenterTab from '@/src/features/compliance/components/ApprovalCenterTab';
import { RolePermissionMatrixTab } from '@/src/features/compliance/components/RolePermissionMatrixTab';
import { UserDirectoryTab } from '@/src/features/compliance/components/UserDirectoryTab';
import GlobalLogisticsMapTab from '@/src/features/procurement/components/GlobalLogisticsMapTab';
import BarcodeStudioModal from '@/src/shared/components/BarcodeStudioModal';
import BarcodeScannerModal from '@/src/shared/components/BarcodeScannerModal';
import OfflineStatusBar from '@/src/shared/components/OfflineStatusBar';
import { TenantProvider } from '@/src/contexts/TenantContext';
import { ToastProvider } from '@/src/contexts/ToastContext';
import { ApprovalProvider } from '@/src/contexts/ApprovalContext';
import ToastContainer from '@/src/components/ToastContainer';

function MainApp() {
  const { inventory, kits, transactions, loading, addInventoryItem, updateInventoryItem, deleteInventoryItem, updateKitBOM, addKitBOM, deleteKitBOM, logTransaction } = useData();
  const { user, role, signOut } = useAuth();
  const { addAction, isProcessing } = useUndoRedo();
  const [isResearchDrawerOpen, setIsResearchDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedKitId, setSelectedKitId] = useState<string>('all');
  const [isBOMModalOpen, setIsBOMModalOpen] = useState(false);
  const [isCreateKitModalOpen, setIsCreateKitModalOpen] = useState(false);
  const [isBarcodeStudioOpen, setIsBarcodeStudioOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  const kittingAnalysis = useMemo(() => {
    const targetKitId = selectedKitId === 'all' ? (kits[0]?.id || '') : selectedKitId;
    const targetKit = kits.find(k => k.id === targetKitId) || kits[0];
    if (!targetKit) return { maxKitsPossible: 0, bottlenecks: [], missingComponents: [] };
    return analyzeKitting(inventory, targetKit);
  }, [inventory, kits, selectedKitId]);

  const activeKit = useMemo(() => {
    const targetKitId = selectedKitId === 'all' ? (kits[0]?.id || '') : selectedKitId;
    return kits.find(k => k.id === targetKitId) || kits[0];
  }, [kits, selectedKitId]);

  const handleUpdateStock = async (id: string, targetQtyOrDelta: number, isDelta = false) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const oldQty = item.stockQty;
    const newQty = isDelta ? Math.max(0, oldQty + targetQtyOrDelta) : Math.max(0, targetQtyOrDelta);
    const delta = newQty - oldQty;
    if (delta === 0) return;
    
    await updateInventoryItem(id, { stockQty: newQty });
    
    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: delta > 0 ? 'add_stock' : 'adjust',
      description: `Stock change for ${item.name}`,
      items: [{ componentId: id, componentName: item.name, qtyDiff: delta }],
      diffs: [{ field: 'stockQty', oldValue: oldQty, newValue: newQty }],
    });

    addAction({
      id: `act_${Date.now()}`,
      name: `Stock Adjust: ${item.name}`,
      undo: async () => { await updateInventoryItem(id, { stockQty: oldQty }); },
      redo: async () => { await updateInventoryItem(id, { stockQty: newQty }); },
    });
  };

  const handleUpdateThreshold = async (id: string, newThreshold: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const oldThresh = item.threshold;
    await updateInventoryItem(id, { threshold: newThreshold });
    
    addAction({
      id: `act_${Date.now()}`,
      name: `Threshold Change: ${item.name}`,
      undo: async () => { await updateInventoryItem(id, { threshold: oldThresh }); },
      redo: async () => { await updateInventoryItem(id, { threshold: newThreshold }); },
    });
  };

  const handleAddComponent = async (newItem: Omit<import('./types').InventoryItem, 'id'>) => {
    if (!['admin', 'staff'].includes(role || '')) return alert("Permission denied.");
    const id = await addInventoryItem(newItem);
    if (!id) return;
    
    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'add_stock',
      description: `Created catalog item "${newItem.name}"`,
      items: [{ componentId: id, componentName: newItem.name, qtyDiff: newItem.stockQty }],
      diffs: [{ field: 'name', oldValue: null, newValue: newItem.name }],
    });

    addAction({
      id: `act_${Date.now()}`,
      name: `Add Item: ${newItem.name}`,
      undo: async () => { await deleteInventoryItem(id); },
      redo: async () => { await addInventoryItem({ ...newItem, id } as any); },
    });
  };

  const handleUpdateComponent = async (id: string, updates: Partial<import('./types').InventoryItem>) => {
    if (!['admin', 'staff'].includes(role || '')) return alert("Permission denied.");
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const oldItem = { ...item };
    
    await updateInventoryItem(id, updates);
    
    const diffs = Object.keys(updates).map(k => ({
      field: k,
      oldValue: (oldItem as any)[k],
      newValue: (updates as any)[k],
    }));

    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'adjust',
      description: `Updated properties for "${item.name}"`,
      items: [{ componentId: id, componentName: item.name, qtyDiff: 0 }],
      diffs,
    });

    addAction({
      id: `act_${Date.now()}`,
      name: `Update ${item.name}`,
      undo: async () => { await updateInventoryItem(id, oldItem); },
      redo: async () => { await updateInventoryItem(id, updates); },
    });
  };

  const handleDeleteComponent = async (id: string) => {
    if (role !== 'admin') return alert("Only Admins can delete components.");
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    await deleteInventoryItem(id);

    addAction({
      id: `act_${Date.now()}`,
      name: `Delete Item: ${item.name}`,
      undo: async () => { await addInventoryItem(item); },
      redo: async () => { await deleteInventoryItem(id); },
    });
  };

  const handlePackKits = async (kitId: string, count: number) => {
    if (!['admin', 'staff'].includes(role || '')) return alert("Permission denied.");
    const kit = kits.find(k => k.id === kitId);
    if (!kit) return;

    for (const req of kit.items) {
      const item = inventory.find(i => i.id === req.componentId);
      if (item && !item.isCommon) {
        await updateInventoryItem(item.id, { stockQty: Math.max(0, item.stockQty - (req.qty * count)) });
      }
    }

    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'pack',
      kitName: kit.name,
      kitQty: count,
      description: `Packed ${count} set(s) of "${kit.name}"`,
      items: kit.items.map(req => {
        const item = inventory.find(i => i.id === req.componentId);
        return {
          componentId: req.componentId,
          componentName: item?.name || req.componentId,
          qtyDiff: -(req.qty * count),
        };
      }),
    });
  };

  const handleUnpackKits = async (kitId: string, count: number) => {
    if (!['admin', 'staff'].includes(role || '')) return alert("Permission denied.");
    const kit = kits.find(k => k.id === kitId);
    if (!kit) return;

    for (const req of kit.items) {
      const item = inventory.find(i => i.id === req.componentId);
      if (item && !item.isCommon) {
        await updateInventoryItem(item.id, { stockQty: item.stockQty + (req.qty * count) });
      }
    }

    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'unpack',
      kitName: kit.name,
      kitQty: count,
      description: `Unpacked ${count} set(s) of "${kit.name}" back into inventory`,
      items: kit.items.map(req => {
        const item = inventory.find(i => i.id === req.componentId);
        return {
          componentId: req.componentId,
          componentName: item?.name || req.componentId,
          qtyDiff: (req.qty * count),
        };
      }),
    });
  };

  const handleCreateKit = async (kit: Omit<import('./types').KitBOM, 'id'>) => {
    if (!['admin', 'staff'].includes(role || '')) return alert("Permission denied.");
    const newId = await addKitBOM(kit);
    if (newId) {
      setSelectedKitId(newId);
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsBarcodeScannerOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40 flex font-sans antialiased text-slate-800 dark:text-slate-100 transition-colors">
      <UndoRedoWidget />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        role={role} 
        onSignOut={signOut}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          inventory={inventory}
          maxKitsPossible={kittingAnalysis.maxKitsPossible}
          kits={kits}
          selectedKitId={selectedKitId}
          setSelectedKitId={setSelectedKitId}
          onNavigateTab={setActiveTab}
          onOpenCreateKitModal={() => setIsCreateKitModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <div className="flex-1 overflow-auto">
          <div className="w-full px-4 md:px-6 lg:px-10 py-6">
            <main>
              {activeTab === 'overview' && (
                <OverviewTab
                  inventory={inventory}
                  kits={kits}
                  selectedKitId={selectedKitId}
                  setSelectedKitId={setSelectedKitId}
                  onNavigateToTab={setActiveTab}
                  onCreateKitClick={() => setIsCreateKitModalOpen(true)}
                  onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
                  onOpenBarcodeStudio={() => setIsBarcodeStudioOpen(true)}
                />
              )}

              {activeTab === 'shop' && (
                <ShopTab
                  inventory={inventory}
                  onPlaceOrder={async (orderData) => {
                    try {
                      await apiFetch('/api/v1/orders', {
                        method: 'POST',
                        body: JSON.stringify({
                          customerName: orderData.customerName,
                          customerEmail: orderData.customerEmail,
                          customerPhone: orderData.phone,
                          items: orderData.items.map((i: any) => ({
                            itemId: i.assetId,
                            quantity: i.quantity,
                          })),
                        }),
                      });
                      for (const it of orderData.items) {
                        const existing = inventory.find((x) => x.id === it.assetId);
                        if (existing) {
                          const newQty = Math.max(0, existing.stockQty - it.quantity);
                          await updateInventoryItem(existing.id, { stockQty: newQty });
                        }
                      }
                      await logTransaction({
                        id: `tx_${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        type: 'adjust',
                        description: `Storefront dispatch for ${orderData.customerName || 'Customer'} (#${orderData.orderId})`,
                        items: orderData.items.map((i: any) => ({
                          componentId: i.assetId,
                          componentName: i.name,
                          qtyDiff: -i.quantity,
                        })),
                      });
                    } catch (err) {
                      console.error('Storefront order placement error:', err);
                    }
                  }}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryTab
                  inventory={inventory}
                  kits={kits}
                  onUpdateStock={handleUpdateStock}
                  onUpdateThreshold={handleUpdateThreshold}
                  onAddComponent={handleAddComponent}
                  onUpdateComponent={handleUpdateComponent}
                  onDeleteComponent={handleDeleteComponent}
                  onResetInventory={() => {}}
                  onOpenBarcodeStudio={() => setIsBarcodeStudioOpen(true)}
                  onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
                />
              )}

              {activeTab === 'kitting' && (
                <KittingTab
                  inventory={inventory}
                  kits={kits}
                  selectedKitId={selectedKitId === 'all' ? (kits[0]?.id || '') : selectedKitId}
                  setSelectedKitId={setSelectedKitId}
                  onPackKits={handlePackKits}
                  onUnpackKits={handleUnpackKits}
                  transactions={transactions}
                  onCreateKitClick={() => setIsCreateKitModalOpen(true)}
                  onConfigureKitClick={() => setIsBOMModalOpen(true)}
                  onDeleteKit={(kitId) => deleteKitBOM(kitId)}
                  onUpdateKitBOM={(kitId, reqs, meta) => updateKitBOM(kitId, reqs, meta)}
                />
              )}

              {activeTab === 'gst' && (
                <GSTEngineTab />
              )}

              {activeTab === 'zoho' && (
                <ZohoIntegrationTab />
              )}

              {activeTab === 'analytics' && (
                <PredictiveAnalyticsTab />
              )}

              {activeTab === 'compliance' && (
                <ComplianceSecurityTab />
              )}

              {activeTab === 'roles_permissions' && (
                <RolePermissionMatrixTab />
              )}

              {activeTab === 'user_directory' && (
                <UserDirectoryTab />
              )}

              {activeTab === 'purchase_orders' && (
                <PurchaseOrdersTab role={role} />
              )}

              {activeTab === 'sales_orders' && (
                <SalesOrdersTab role={role} />
              )}

              {(activeTab === 'partners' || activeTab === 'vendors' || activeTab === 'customers') && (
                <PartnersTab role={role} />
              )}

              {activeTab === 'stock_ledger' && (
                <StockLedgerTab />
              )}

              {activeTab === 'warehouse_floor' && (
                <WarehouseFloorMode />
              )}

              {activeTab === 'warehouses' && (
                <WarehousesTab role={role} />
              )}

              {activeTab === 'floor_plan' && (
                <FloorPlanDesignerTab />
              )}

              {activeTab === 'warehouse_heatmap' && (
                <WarehouseHeatmapTab />
              )}

              {activeTab === 'warehouse_3d' && (
                <Warehouse3DDigitalTwin />
              )}

              {activeTab === 'stock_transfer' && (
                <StockTransferTab />
              )}

              {activeTab === 'batch_expiry' && (
                <BatchExpiryTab />
              )}

              {activeTab === 'global_logistics' && (
                <GlobalLogisticsMapTab />
              )}

              {activeTab === 'copilot' && (
                <AICopilotTab
                  inventory={inventory}
                  kits={kits}
                  selectedKitId={selectedKitId}
                />
              )}

              {activeTab === 'approval_center' && (
                <ApprovalCenterTab />
              )}

              {activeTab === 'history' && (
                <RevisionHistoryTab />
              )}

              {activeTab === 'automations' && (
                <AutomationTab />
              )}

              {activeTab === 'valuation' && (
                <ValuationAnalyticsTab inventory={inventory} kits={kits} />
              )}
            </main>
          </div>
        </div>
      </div>

      {activeKit && (
        <BOMCustomizerModal
          isOpen={isBOMModalOpen}
          onClose={() => setIsBOMModalOpen(false)}
          kit={activeKit}
          inventory={inventory}
          onSaveBOM={async (kitId, updatedReqs, updatedMeta) => {
            await updateKitBOM(kitId, updatedReqs, updatedMeta);
            setIsBOMModalOpen(false);
          }}
        />
      )}

      <CreateKitModal
        isOpen={isCreateKitModalOpen}
        onClose={() => setIsCreateKitModalOpen(false)}
        onCreateKit={handleCreateKit}
      />

      <AIAgentResearchDrawer
        isOpen={isResearchDrawerOpen}
        onClose={() => setIsResearchDrawerOpen(false)}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        inventory={inventory}
        kits={kits}
        onNavigateTab={setActiveTab}
      />

      <BarcodeStudioModal
        isOpen={isBarcodeStudioOpen}
        onClose={() => setIsBarcodeStudioOpen(false)}
        inventory={inventory}
      />

      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
      />
    </div>
  );
}

export default function App() {
  const { user, loading, signInWithEmailPassword, registerWithEmailPassword, signInAsGuest } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roleSelection, setRoleSelection] = useState('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-white">
        <div className="bg-slate-950 p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-800 space-y-6 animate-fadeIn">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-white">NexaInventory ERP v2</h1>
            <p className="text-xs text-slate-400 font-medium">Experimind Labs Multi-Tenant SaaS</p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              try {
                if (isRegistering) {
                  await registerWithEmailPassword(email, password, name, roleSelection);
                } else {
                  await signInWithEmailPassword(email, password);
                }
              } catch (err: any) {
                alert(err.message || 'Authentication failed');
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-4 text-xs"
          >
            {isRegistering && (
              <div>
                <label className="block text-slate-300 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-bold mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-md cursor-pointer"
            >
              {isSubmitting ? 'Processing...' : isRegistering ? 'Create SaaS Account' : 'Sign In'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 space-y-3 text-center text-xs">
            <button
              onClick={() => signInAsGuest('admin')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              Continue as Guest Admin
            </button>

            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-slate-400 hover:text-white underline cursor-pointer text-[11px]"
            >
              {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TenantProvider>
      <ToastProvider>
        <ApprovalProvider>
          <DataProvider>
            <ToastContainer />
            <OfflineStatusBar />
            <MainApp />
          </DataProvider>
        </ApprovalProvider>
      </ToastProvider>
    </TenantProvider>
  );
}
