import React, { useState } from 'react';
import {
  LayoutDashboard,
  Box,
  Package,
  ShoppingCart,
  PackageCheck,
  Users,
  Building2,
  Warehouse,
  Sparkles,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Shield,
  History,
  Coins,
  FileCheck,
  FileCheck2,
  FileText,
  Clock,
  Link2,
  Lock,
  ArrowRightLeft,
  Tag,
  Globe,
} from 'lucide-react';

import { useApproval } from '@/src/contexts/ApprovalContext';
import { useAuth } from '@/src/AuthContext';
import UserProfileModal from '@/src/shared/components/UserProfileModal';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: string | null;
  onSignOut: () => void;
  lowStockCount?: number;
  openPoCount?: number;
  openSoCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  role,
  onSignOut,
  lowStockCount = 0,
  openPoCount = 0,
  openSoCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const { user } = useAuth();
  const { pendingCount } = useApproval();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const sections = [
    {
      title: 'OPERATIONAL COMMAND',
      items: [
        { id: 'overview', label: 'Executive Cockpit', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'sales_orders', label: 'Sales & Dispatches', icon: <PackageCheck className="w-4 h-4" />, badge: openSoCount > 0 ? `${openSoCount}` : undefined, badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
        { id: 'shop', label: 'Storefront Portal', icon: <ShoppingCart className="w-4 h-4" />, badge: 'Live', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      ],
    },
    {
      title: 'INVENTORY & TOPOLOGY',
      items: [
        {
          id: 'inventory',
          label: 'Items & Stock Catalog',
          icon: <Box className="w-4 h-4" />,
          badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        },
        { id: 'kitting', label: 'Composite Kits (BOM)', icon: <Package className="w-4 h-4" /> },
        { id: 'warehouses', label: 'Warehouses & Bins', icon: <Warehouse className="w-4 h-4" /> },
        { id: 'stock_transfer', label: 'Stock Transfers (WMS)', icon: <ArrowRightLeft className="w-4 h-4" /> },
        { id: 'cycle_counts', label: 'Physical Cycle Counts', icon: <FileCheck2 className="w-4 h-4" /> },
        { id: 'serial_numbers', label: 'Serial Number Registry', icon: <Tag className="w-4 h-4" /> },
        { id: 'batch_expiry', label: 'Batch & Expiry Manager', icon: <Clock className="w-4 h-4" /> },
      ],
    },
    {
      title: 'PROCUREMENT & PARTNERS',
      items: [
        { id: 'purchase_orders', label: 'Inbound POs', icon: <Building2 className="w-4 h-4" />, badge: openPoCount > 0 ? `${openPoCount}` : undefined, badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
        { id: 'vendors', label: 'Suppliers & Schools', icon: <Users className="w-4 h-4" /> },
      ],
    },
    {
      title: 'LEDGER & VALUATION',
      items: [
        { id: 'stock_ledger', label: 'Immutable Stock Ledger', icon: <History className="w-4 h-4" /> },
        { id: 'valuation', label: 'FIFO Asset Valuation', icon: <Coins className="w-4 h-4" /> },
        { id: 'gst', label: 'Tax Invoices & Challans', icon: <FileText className="w-4 h-4" />, badge: 'GST', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      ],
    },
    {
      title: 'GOVERNANCE & AUDIT',
      items: [
        { id: 'qms_suite', label: 'QMS Quality Suite', icon: <ShieldCheck className="w-4 h-4" />, badge: 'ISO/GMP', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
        { id: 'audit_verifier', label: '21 CFR Part 11 Audit', icon: <Lock className="w-4 h-4" />, badge: 'SHA-256', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
        { id: 'user_directory', label: 'Team Directory & RBAC', icon: <Users className="w-4 h-4" />, badge: 'Users', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
        { id: 'approval_center', label: 'Approval Center', icon: <Shield className="w-4 h-4" />, badge: pendingCount > 0 ? `${pendingCount}` : undefined, badgeColor: 'bg-amber-500/30 text-amber-300 border-amber-500/40' },
        { id: 'compliance', label: 'Legacy Audit Logs', icon: <History className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 md:hidden animate-fadeIn"
        />
      )}

      <aside
        className={`w-64 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 flex flex-col h-screen fixed md:sticky top-0 shrink-0 border-r border-slate-200 dark:border-slate-800/80 shadow-xl z-50 transition-colors duration-200 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-sm">ExperiMind</span>
                <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.2 rounded-md">ERP</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Inventory & STEM Systems</p>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 [scrollbar-width:none]">
          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <h4 className="px-3 text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                {sec.title}
              </h4>
              <div className="space-y-0.5 pt-1">
                {sec.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                            isActive
                              ? 'bg-white/20 text-white border-white/30'
                              : item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Role & Profile Trigger & Sign Out */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 transition-all cursor-pointer text-left group"
            title="Click to manage profile & password"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-xs">
                {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600">
                  {user?.name || 'My Profile'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium capitalize">
                  {role === 'admin' ? 'Administrator' : role === 'editor' ? 'Inventory Manager' : role === 'employee' ? 'Lab Staff' : role || 'User'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all border border-transparent hover:border-red-200 dark:hover:border-red-900/40 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
