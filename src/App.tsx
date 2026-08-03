import React, { useState, useMemo } from 'react';
import { Settings, DatabaseZap, LayoutDashboard } from 'lucide-react';
import { analyzeKitting } from './utils/kitting';
import { useData, DataProvider } from './DataContext';
import { useAuth } from './AuthContext';
import { INITIAL_INVENTORY, INITIAL_KITS } from './data';
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
import { ToastProvider } from '@/src/contexts/ToastContext';
import ToastContainer from '@/src/components/ToastContainer';

function MainApp() {
  const { inventory, kits, transactions, loading, addInventoryItem, updateInventoryItem, deleteInventoryItem, updateKitBOM, addKitBOM, logTransaction } = useData();
  const { user, role, signOut } = useAuth();
  const { addAction, isProcessing } = useUndoRedo();
  const [isResearchDrawerOpen, setIsResearchDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  const handleCreateKit = async (kit: Omit<import('./types').KitBOM, 'id'>) => {
    if (!['admin', 'staff'].includes(role || '')) return alert("You don't have permission to create kits.");
    const newId = await addKitBOM(kit);
    if (newId) {
      setSelectedKitId(newId);
      await logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Created new kit profile: "${kit.name}"`,
        userId: user!.id,
        items: [],
      });
      // Automatically open BOM modal to add parts
      setIsBOMModalOpen(true);
    }
  };
  const [selectedKitId, setSelectedKitId] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [isBOMModalOpen, setIsBOMModalOpen] = useState(false);
  const [isCreateKitModalOpen, setIsCreateKitModalOpen] = useState(false);

  const activeKit = useMemo(() => {
    return kits.find((k) => k.id === selectedKitId) || kits[0];
  }, [kits, selectedKitId]);

  const kittingAnalysis = useMemo(() => {
    if (!activeKit) return { maxKitsPossible: 0, missingComponents: [] };
    return analyzeKitting(inventory, activeKit, 1);
  }, [inventory, activeKit]);

  const handleUpdateStock = async (id: string, newQty: number) => {
    if (!['admin', 'staff', 'user'].includes(role || '')) return alert("You don't have permission to edit stock.");
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const oldQty = item.stockQty;
    if (oldQty !== newQty) {
      await updateInventoryItem(id, { stockQty: newQty });
      await logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Manual adjustment of stock for "${item.name}"`,
        userId: user!.id,
        items: [{ componentId: id, componentName: item.name, qtyDiff: newQty - oldQty }],
      });
    }
  };

  const handleUpdateThreshold = async (id: string, newThreshold: number) => {
    if (!['admin', 'staff'].includes(role || '')) return alert("You don't have permission to edit thresholds.");
    await updateInventoryItem(id, { threshold: newThreshold });
  };

  const handleAddComponent = async (itemData: Omit<import('./types').InventoryItem, 'id'>) => {
    if (!['admin', 'staff'].includes(role || '')) return alert("You don't have permission to add components.");
    await addInventoryItem(itemData);
    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'add_stock',
      description: `Registered new catalog item: "${itemData.name}"`,
      userId: user!.id,
      items: [{ componentId: 'NEW', componentName: itemData.name, qtyDiff: itemData.stockQty }],
    });
  };

  const handleUpdateComponent = async (id: string, updates: Partial<import('./types').InventoryItem>) => {
    if (!['admin', 'staff'].includes(role || '')) return alert("You don't have permission to edit components.");
    
    const oldItem = inventory.find(i => i.id === id);
    if (!oldItem) return;

    await updateInventoryItem(id, updates);

    const diffs: any[] = [];
    Object.keys(updates).forEach(key => {
      const field = key as keyof typeof updates;
      if (oldItem[field] !== updates[field]) {
        diffs.push({
          field,
          oldValue: oldItem[field],
          newValue: updates[field]
        });
      }
    });

    if (diffs.length > 0) {
      await logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Updated properties for "${oldItem.name}"`,
        userId: user!.id,
        items: [{ componentId: id, componentName: oldItem.name, qtyDiff: 0 }],
        diffs
      });
    }
  };

  const handleDeleteComponent = async (id: string) => {
    if (role !== 'admin') return alert("You don't have permission to delete components. Admin only.");
    const itemToDelete = inventory.find((item) => item.id === id);
    if (!itemToDelete) return;

    await deleteInventoryItem(id);
    kits.forEach(async (kit) => {
      if ((kit.items || []).some(r => r.componentId === id)) {
        await updateKitBOM(kit.id, (kit.items || []).filter(r => r.componentId !== id));
      }
    });

    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'adjust',
      description: `Removed catalog entry: "${itemToDelete.name}"`,
      userId: user!.id,
      items: [{ componentId: id, componentName: itemToDelete.name, qtyDiff: -itemToDelete.stockQty }],
    });
  };

  const handleSaveBOM = async (kitId: string, updatedRequirements: BOMRequirement[], updatedKit?: Partial<import('./types').KitBOM>) => {
    if (!['admin', 'staff'].includes(role || '')) return alert("You don't have permission to modify BOMs.");
    
    const kitToUpdate = kits.find(k => k.id === kitId);
    if (!kitToUpdate) return;
    
    // Update BOM requirements via local REST API
    await updateKitBOM(kitId, updatedRequirements);

    const diffs: any[] = [];
    
    // Track BOM requirement changes
    const oldItems = kitToUpdate.items || [];
    const newItems = updatedRequirements;
    
    // Find removed or changed items
    oldItems.forEach(oldItem => {
      const newItem = newItems.find(i => i.componentId === oldItem.componentId);
      if (!newItem) {
        diffs.push({ field: 'removed_component', oldValue: oldItem.componentId, newValue: null });
      } else if (newItem.qty !== oldItem.qty) {
        diffs.push({ field: `qty_${oldItem.componentId}`, oldValue: oldItem.qty, newValue: newItem.qty });
      }
    });

    // Find added items
    newItems.forEach(newItem => {
      const oldItem = oldItems.find(i => i.componentId === newItem.componentId);
      if (!oldItem) {
        diffs.push({ field: 'added_component', oldValue: null, newValue: newItem.componentId });
      }
    });

    if (diffs.length > 0) {
      await logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Updated Bill of Materials for kit "${kitToUpdate.name}"`,
        userId: user!.id,
        kitName: kitToUpdate.name,
        items: [],
        diffs
      });
    }
  };

  const handlePackKits = async (kitId: string, qty: number) => {
    if (role === 'intern') return alert("You don't have permission to pack kits.");
    const kitToPack = kits.find((k) => k.id === kitId);
    if (!kitToPack) return;

    const ledgerItems: any[] = [];

    for (const req of (kitToPack.items || [])) {
      const invItem = inventory.find(i => i.id === req.componentId);
      if (invItem && !invItem.isCommon) {
        const newQty = Math.max(0, invItem.stockQty - req.qty * qty);
        await updateInventoryItem(invItem.id, { stockQty: newQty });
        ledgerItems.push({
          componentId: req.componentId,
          componentName: invItem.name,
          qtyDiff: -(req.qty * qty),
        });
      }
    }

    const assembledItem = inventory.find(i => i.assignedKitName === kitToPack.name);
    if (assembledItem) {
      const newQty = assembledItem.stockQty + qty;
      await updateInventoryItem(assembledItem.id, { stockQty: newQty });
      ledgerItems.push({
        componentId: assembledItem.id,
        componentName: assembledItem.name,
        qtyDiff: qty,
      });
    }

    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'pack',
      kitName: kitToPack.name,
      kitQty: qty,
      description: `Packed and dispatched ${qty} sets of "${kitToPack.name}"`,
      userId: user!.id,
      items: ledgerItems,
    });

    if (!isProcessing) {
      addAction({
        id: `pack_${Date.now()}`,
        name: `Pack ${qty}x ${kitToPack.name}`,
        undo: async () => await handleUnpackKits(kitId, qty),
        redo: async () => await handlePackKits(kitId, qty)
      });
    }
  };

  const handleUnpackKits = async (kitId: string, qty: number) => {
    if (role === 'intern') return alert("You don't have permission to reduce/unpack kits.");
    const kitToUnpack = kits.find((k) => k.id === kitId);
    if (!kitToUnpack) return;

    const ledgerItems: any[] = [];

    const assembledItem = inventory.find(i => i.assignedKitName === kitToUnpack.name);
    if (assembledItem) {
      const newQty = Math.max(0, assembledItem.stockQty - qty);
      await updateInventoryItem(assembledItem.id, { stockQty: newQty });
      ledgerItems.push({
        componentId: assembledItem.id,
        componentName: assembledItem.name,
        qtyDiff: -qty,
      });
    }

    for (const req of (kitToUnpack.items || [])) {
      const invItem = inventory.find(i => i.id === req.componentId);
      if (invItem && !invItem.isCommon) {
        const newQty = invItem.stockQty + (req.qty * qty);
        await updateInventoryItem(invItem.id, { stockQty: newQty });
        ledgerItems.push({
          componentId: req.componentId,
          componentName: invItem.name,
          qtyDiff: req.qty * qty,
        });
      }
    }

    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'unpack',
      kitName: kitToUnpack.name,
      kitQty: qty,
      description: `Reduced/Unpacked ${qty} sets of "${kitToUnpack.name}" back into components`,
      userId: user!.id,
      items: ledgerItems,
    });

    if (!isProcessing) {
      addAction({
        id: `unpack_${Date.now()}`,
        name: `Reduce ${qty}x ${kitToUnpack.name}`,
        undo: async () => await handlePackKits(kitId, qty),
        redo: async () => await handleUnpackKits(kitId, qty)
      });
    }
  };

  const handleSeedDatabase = async () => {
    if (role !== 'admin') return alert("Insufficient permissions to seed database.");
    if (!window.confirm("This will initialize the database with default CSV data. Continue?")) return;
    
    try {
      for (const item of INITIAL_INVENTORY) {
        await addInventoryItem(item);
      }
      for (const kit of INITIAL_KITS) {
        await addKitBOM(kit);
      }
      alert("Database seeded successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to seed database.");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/30 flex font-sans antialiased text-slate-800">
      <UndoRedoWidget />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        role={role} 
        onSignOut={signOut} 
      />

      <div className="flex-1 flex flex-col min-w-0">
        <AIAgentSuggestionBar onOpenResearchDrawer={() => setIsResearchDrawerOpen(true)} />
        <Header
          inventory={inventory}
          maxKitsPossible={kittingAnalysis.maxKitsPossible}
          kits={kits}
          selectedKitId={selectedKitId}
          setSelectedKitId={setSelectedKitId}
          onNavigateTab={setActiveTab}
          onOpenCreateKitModal={() => setIsCreateKitModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        <div className="flex-1 overflow-auto">
          <div className="w-full px-6 lg:px-10 py-6">
            <main>
              {activeTab === 'overview' && (
                <OverviewTab
                  inventory={inventory}
                  kits={kits}
                  selectedKitId={selectedKitId}
                  setSelectedKitId={setSelectedKitId}
                  onNavigateToTab={setActiveTab}
                  onCreateKitClick={() => setIsCreateKitModalOpen(true)}
                />
              )}

              {activeTab === 'shop' && (
                <ShopTab
                  inventory={inventory}
                  onPlaceOrder={(orderData) => {
                    console.log('New storefront order placed:', orderData);
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
                  onDeleteKit={(kitId) => {
                    console.log('Delete kit requested:', kitId);
                  }}
                  onUpdateKitBOM={(kitId, name, desc) => {
                    console.log('Update kit BOM requested:', kitId, name, desc);
                  }}
                />
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

              {activeTab === 'warehouses' && (
                <WarehousesTab role={role} />
              )}

              {activeTab === 'copilot' && (
                <AICopilotTab
                  inventory={inventory}
                  kits={kits}
                  selectedKitId={selectedKitId}
                />
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
          onSaveBOM={handleSaveBOM}
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
    </div>
  );
}

// Wrapper to provide auth and data
// Wrapper to provide auth and data
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100 space-y-6 animate-fadeIn">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm mb-4">
              <LayoutDashboard className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">NexaInventory</h1>
            <p className="text-xs text-slate-500 font-medium">
              {isRegistering ? "Create your workspace account" : "Sign in to manage logistics"}
            </p>
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              try {
                if (isRegistering) {
                  await registerWithEmailPassword(email, password, name, roleSelection as any);
                } else {
                  await signInWithEmailPassword(email, password);
                }
              } catch (err: any) {
                alert(err.message || 'Authentication failed');
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-medium"
                  placeholder="John Doe"
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-medium"
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Role Request</label>
                <select
                  value={roleSelection}
                  onChange={e => setRoleSelection(e.target.value)}
                  className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-medium cursor-pointer"
                >
                  <option value="admin">Admin (Full Access)</option>
                  <option value="staff">Staff (Manage Kits & Inventory)</option>
                  <option value="user">User (View Only)</option>
                  <option value="intern">Intern (Draft Only)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {isSubmitting ? 'Processing...' : isRegistering ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">or</div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={signInAsGuest}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              Continue as Guest Admin
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors cursor-pointer"
              >
                {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <DataProvider>
        <ToastContainer />
        <MainApp />
      </DataProvider>
    </ToastProvider>
  );
}
