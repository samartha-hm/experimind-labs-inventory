import React from 'react';
import {
  LayoutDashboard,
  Box,
  Package,
  Layers,
  ShoppingCart,
  PackageCheck,
  Users,
  Building2,
  Warehouse,
  Sparkles,
  LogOut,
  ChevronRight,
  ShieldCheck,
  History,
  Zap,
  Coins,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: string | null;
  onSignOut: () => void;
  lowStockCount?: number;
  openPoCount?: number;
  openSoCount?: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  role,
  onSignOut,
  lowStockCount = 0,
  openPoCount = 0,
  openSoCount = 0,
}: SidebarProps) {
  const sections = [
    {
      title: 'CORE',
      items: [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'shop', label: 'Storefront Portal', icon: <ShoppingCart className="w-4 h-4" />, badge: 'Store Live', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      ],
    },
    {
      title: 'INVENTORY MANAGEMENT',
      items: [
        {
          id: 'inventory',
          label: 'Items & Catalog',
          icon: <Box className="w-4 h-4" />,
          badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        },
        { id: 'kitting', label: 'Composite Kits (BOM)', icon: <Package className="w-4 h-4" /> },
        { id: 'warehouses', label: 'Warehouses & Bins', icon: <Warehouse className="w-4 h-4" /> },
      ],
    },
    {
      title: 'SALES & FULFILLMENT',
      items: [
        { id: 'sales_orders', label: 'Sales Orders', icon: <PackageCheck className="w-4 h-4" />, badge: openSoCount > 0 ? `${openSoCount}` : undefined, badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
        { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
      ],
    },
    {
      title: 'PURCHASES & VENDORS',
      items: [
        { id: 'purchase_orders', label: 'Purchase Orders', icon: <ShoppingCart className="w-4 h-4" />, badge: openPoCount > 0 ? `${openPoCount}` : undefined, badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
        { id: 'vendors', label: 'Vendors Directory', icon: <Building2 className="w-4 h-4" /> },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { id: 'copilot', label: 'AI Logistics Copilot', icon: <Sparkles className="w-4 h-4" />, badge: 'AI Pro', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
        { id: 'automations', label: 'Automations & Webhooks', icon: <Zap className="w-4 h-4" />, badge: 'Engine', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
        { id: 'valuation', label: 'Financial Valuation', icon: <Coins className="w-4 h-4" />, badge: 'FIFO', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      ],
    },
    {
      title: 'AUDIT & LOGS',
      items: [
        { id: 'history', label: 'Revision History', icon: <History className="w-4 h-4" />, badge: 'GitHub Sync', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 border-r border-slate-800/80 shadow-2xl z-30">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
        <div className="p-2 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-white font-bold text-base tracking-tight flex items-center gap-1.5">
            NexaInventory <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold uppercase">ERP</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Zoho-Grade Supply Chain</p>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto custom-scrollbar">
        {sections.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 px-3 py-1">
              {sec.title}
            </div>
            {sec.items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all font-semibold text-xs cursor-pointer group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                      : 'hover:bg-slate-900 text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User & Access Profile Footer */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/60">
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Access Level</div>
              <div className="text-xs font-bold text-slate-200 capitalize flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                {role || 'Admin Access'}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all font-semibold text-xs text-slate-400 hover:bg-slate-900 hover:text-rose-400 border border-transparent hover:border-slate-800 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out Session
        </button>
      </div>
    </aside>
  );
}
