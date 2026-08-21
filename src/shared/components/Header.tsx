import React, { useState } from 'react';
import {
  Search,
  Plus,
  Building2,
  AlertTriangle,
  ChevronDown,
  Box,
  ShoppingCart,
  PackageCheck,
  Package,
  QrCode,
  Globe,
  Sun,
  Moon,
  Menu,
  Undo2,
  Redo2,
  Loader2
} from 'lucide-react';
import { InventoryItem, KitBOM } from '@/src/types';
import BarcodeStudioModal from '@/src/shared/components/BarcodeStudioModal';
import BarcodeScannerModal from '@/src/shared/components/BarcodeScannerModal';
import TenantOnboardingModal from '@/src/features/tenant/components/TenantOnboardingModal';
import { useTenant } from '@/src/contexts/TenantContext';
import { useUndoRedo } from '@/src/contexts/UndoRedoContext';

interface HeaderProps {
  inventory: InventoryItem[];
  maxKitsPossible: number;
  kits: KitBOM[];
  selectedKitId: string;
  setSelectedKitId: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenCreateItemModal?: () => void;
  onOpenCreateKitModal?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenBarcodeScanner?: () => void;
  onToggleMobileMenu?: () => void;
}

export default function Header({
  inventory,
  maxKitsPossible,
  kits,
  selectedKitId,
  setSelectedKitId,
  onNavigateTab,
  onOpenCreateItemModal,
  onOpenCreateKitModal,
  onOpenCommandPalette,
  onOpenBarcodeScanner,
  onToggleMobileMenu,
}: HeaderProps) {
  const { activeTenant, tenants, setActiveTenantId, theme, toggleTheme } = useTenant();
  const { past, future, undo, redo, isProcessing } = useUndoRedo();
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isTenantMenuOpen, setIsTenantMenuOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const lowStockCount = inventory.filter(
    (item) => item.stockQty < item.threshold && !item.isCommon
  ).length;

  const nextUndo = past.length > 0 ? past[past.length - 1] : null;
  const nextRedo = future.length > 0 ? future[0] : null;

  return (
    <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-20 shadow-xs transition-colors">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        {/* Mobile Menu Button + Org Selector */}
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          {/* Mobile Hamburger Button */}
          <button
            onClick={onToggleMobileMenu}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 md:hidden cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Org / Tenant Selector */}
          <div className="relative">
            <button
              onClick={() => setIsTenantMenuOpen(!isTenantMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold shrink-0 border border-slate-200/60 dark:border-slate-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
            >
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{activeTenant.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isTenantMenuOpen && (
              <div
                className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 space-y-1 z-50 animate-in fade-in slide-in-from-top-2"
                onMouseLeave={() => setIsTenantMenuOpen(false)}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">Select SaaS Tenant</div>
                {tenants.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTenantId(t.id);
                      setIsTenantMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                      t.id === activeTenant.id ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{t.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{t.code}</span>
                  </button>
                ))}

                <button
                  onClick={() => {
                    setIsTenantMenuOpen(false);
                    setIsOnboardingOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> + Onboard New Tenant
                </button>
              </div>
            )}
          </div>

          {/* Global Search Bar */}
          <div
            onClick={onOpenCommandPalette}
            className="relative w-full max-w-md hidden md:block cursor-pointer"
          >
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              readOnly
              placeholder="Global Search (Ctrl+K for Spotlight)..."
              className="w-full pl-10 pr-12 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none cursor-pointer"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-300/60 dark:border-slate-600">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Right Controls: Undo/Redo Buttons, Scanner, Theme, Quick Create */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Dedicated Global Header Undo & Redo Action Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl p-0.5 border border-slate-200/80 dark:border-slate-700">
            {/* Undo Button */}
            <button
              onClick={() => undo()}
              disabled={past.length === 0 || isProcessing}
              title={nextUndo ? `Undo: ${nextUndo.name} (Ctrl+Z)` : 'Undo (Ctrl+Z) - No past actions'}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                past.length === 0 || isProcessing
                  ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                  : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 shadow-xs'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              ) : (
                <Undo2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span className="hidden xl:inline text-[11px]">Undo</span>
              {past.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[9px] font-mono font-bold">
                  {past.length}
                </span>
              )}
            </button>

            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Redo Button */}
            <button
              onClick={() => redo()}
              disabled={future.length === 0 || isProcessing}
              title={nextRedo ? `Redo: ${nextRedo.name} (Ctrl+Y)` : 'Redo (Ctrl+Y) - No future actions'}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                future.length === 0 || isProcessing
                  ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                  : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 shadow-xs'
              }`}
            >
              <Redo2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xl:inline text-[11px]">Redo</span>
              {future.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px] font-mono font-bold">
                  {future.length}
                </span>
              )}
            </button>
          </div>

          {/* Barcode Scan Button */}
          <button
            onClick={() => {
              if (onOpenBarcodeScanner) {
                onOpenBarcodeScanner();
              } else {
                setIsScannerOpen(true);
              }
            }}
            className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200/80 dark:border-indigo-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Scan Part Barcode / QR Code (Ctrl+B)"
          >
            <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden lg:inline">Barcode Scan</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Toggle Light / Dark Mode"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Shortage Badge */}
          {lowStockCount > 0 && (
            <button
              onClick={() => onNavigateTab?.('inventory')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{lowStockCount} Shortages</span>
            </button>
          )}

          {/* Quick Create Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Quick Create</span>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-200" />
            </button>

            {isQuickCreateOpen && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 space-y-1 z-50 animate-in fade-in slide-in-from-top-2"
                onMouseLeave={() => setIsQuickCreateOpen(false)}
              >
                <button
                  onClick={() => {
                    setIsQuickCreateOpen(false);
                    onNavigateTab?.('inventory');
                    if (onOpenCreateItemModal) onOpenCreateItemModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <Box className="w-4 h-4 text-indigo-600" /> New Inventory Item
                </button>
                <button
                  onClick={() => {
                    setIsQuickCreateOpen(false);
                    onNavigateTab?.('kitting');
                    if (onOpenCreateKitModal) onOpenCreateKitModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <Package className="w-4 h-4 text-emerald-600" /> New Composite Kit
                </button>
                <button
                  onClick={() => {
                    setIsQuickCreateOpen(false);
                    onNavigateTab?.('purchase_orders');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-blue-600" /> Issue Purchase Order
                </button>
                <button
                  onClick={() => {
                    setIsQuickCreateOpen(false);
                    onNavigateTab?.('sales_orders');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4 text-purple-600" /> Create Sales Order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tenant Onboarding Modal */}
      <TenantOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </header>
  );
}
