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
} from 'lucide-react';
import { InventoryItem, KitBOM } from '@/src/types';
import BarcodeStudioModal from '@/src/shared/components/BarcodeStudioModal';

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
}: HeaderProps) {
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const lowStockCount = inventory.filter(
    (item) => item.stockQty < item.threshold && !item.isCommon
  ).length;

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Organization & Global Search */}
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          {/* Org Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 text-slate-800 text-xs font-bold shrink-0 border border-slate-200/60 cursor-pointer hover:bg-slate-200/70 transition-colors">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Experimind Labs (HQ)</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Search Bar */}
          <div
            onClick={onOpenCommandPalette}
            className="relative w-full max-w-md hidden md:block cursor-pointer"
          >
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              readOnly
              placeholder="Global Search (Items, SKUs, POs, Sales Orders)..."
              value={globalSearch}
              className="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none cursor-pointer"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded border border-slate-300/60">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Right: Barcode Scanner, Currency Switcher, Theme & Quick Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Live Barcode Scanner Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="p-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Scan Part Barcode / QR Code"
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span className="hidden lg:inline">Barcode Scan</span>
          </button>

          {/* Multi-Currency Engine Switcher */}
          <div className="bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 flex items-center gap-0.5 text-xs font-bold">
            <button
              onClick={() => setCurrency('INR')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                currency === 'INR'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              ₹ INR
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                currency === 'USD'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              $ USD
            </button>
          </div>

          {/* Low Stock Indicator */}
          {lowStockCount > 0 && (
            <button
              onClick={() => onNavigateTab?.('inventory')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{lowStockCount} Shortages</span>
            </button>
          )}

          {/* Quick Create Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Create</span>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-200" />
            </button>

            {isQuickCreateOpen && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 space-y-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onMouseLeave={() => setIsQuickCreateOpen(false)}
              >
                <button
                  onClick={() => {
                    setIsQuickCreateOpen(false);
                    onNavigateTab?.('inventory');
                    if (onOpenCreateItemModal) onOpenCreateItemModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <Box className="w-4 h-4 text-indigo-600" /> New Inventory Item
                </button>
                <button
                  onClick={() => {
                    setIsQuickCreateOpen(false);
                    onNavigateTab?.('kitting');
                    if (onOpenCreateKitModal) onOpenCreateKitModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <Package className="w-4 h-4 text-emerald-600" /> New Composite Kit
                </button>
                <button
                  onClick={() => {
                    setIsQuickCreateOpen(false);
                    onNavigateTab?.('purchase_orders');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-blue-600" /> Issue Purchase Order
                </button>
                <button
                  onClick={() => {
                    setIsQuickCreateOpen(false);
                    onNavigateTab?.('sales_orders');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4 text-purple-600" /> Create Sales Order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barcode & QR Label Studio Modal */}
      <BarcodeStudioModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        inventory={inventory}
      />
    </header>
  );
}
