import React from 'react';
import {
  LayoutDashboard,
  Box,
  QrCode,
  PackageCheck,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  onOpenScanner: () => void;
  onToggleMobileMenu: () => void;
  openSoCount?: number;
}

export default function MobileBottomNav({
  activeTab,
  onNavigateTab,
  onOpenScanner,
  onToggleMobileMenu,
  openSoCount = 0,
}: MobileBottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-lg px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] transition-colors"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around relative">
        {/* Item 0: Cockpit */}
        <button
          type="button"
          onClick={() => onNavigateTab('overview')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[44px] rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Home"
        >
          <LayoutDashboard className={`w-5 h-5 transition-transform ${activeTab === 'overview' ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">Home</span>
        </button>

        {/* Item 1: Inventory */}
        <button
          type="button"
          onClick={() => onNavigateTab('inventory')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[44px] rounded-xl transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Inventory"
        >
          <Box className={`w-5 h-5 transition-transform ${activeTab === 'inventory' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Items</span>
        </button>

        {/* Center Prominent Barcode Scanner Action */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-4">
          <button
            type="button"
            onClick={onOpenScanner}
            className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer border-2 border-white dark:border-slate-900"
            aria-label="Scan Barcode / QR Code"
            title="Scan Barcode"
          >
            <QrCode className="w-6 h-6" />
          </button>
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 uppercase tracking-wider">
            Scan
          </span>
        </div>

        {/* Item 3: Orders */}
        <button
          type="button"
          onClick={() => onNavigateTab('sales_orders')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[44px] rounded-xl transition-all relative cursor-pointer ${
            activeTab === 'sales_orders'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Sales Orders"
        >
          <div className="relative">
            <PackageCheck className={`w-5 h-5 transition-transform ${activeTab === 'sales_orders' ? 'scale-110' : ''}`} />
            {openSoCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-3.5 h-3.5 rounded-full bg-indigo-600 text-white text-[8px] font-bold flex items-center justify-center">
                {openSoCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Orders</span>
        </button>

        {/* Item 4: More Menu Toggle */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[44px] rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
