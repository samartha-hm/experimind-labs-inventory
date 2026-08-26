import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Command, Box, Boxes, ShoppingBag, ShoppingCart, Building2, Zap, History, XCircle, ArrowRight } from 'lucide-react';
import { InventoryItem, KitBOM } from '@/src/types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  kits: KitBOM[];
  onNavigateTab: (tab: string) => void;
}

export default function CommandPaletteModal({ isOpen, onClose, inventory, kits, onNavigateTab }: CommandPaletteModalProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredInventory = inventory.filter(i => 
    i.name.toLowerCase().includes(query.toLowerCase()) || 
    i.id.toLowerCase().includes(query.toLowerCase()) ||
    (i.category && i.category.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 5);

  const filteredKits = kits.filter(k => 
    k.name.toLowerCase().includes(query.toLowerCase()) || 
    k.description.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const QUICK_ACTIONS = [
    { label: 'Go to Inventory & Catalog', tab: 'inventory', icon: <Box className="w-4 h-4 text-indigo-500" /> },
    { label: 'Go to Composite Kits (BOM)', tab: 'kits', icon: <Boxes className="w-4 h-4 text-purple-500" /> },
    { label: 'Go to Vendors Directory', tab: 'vendors', icon: <Building2 className="w-4 h-4 text-emerald-500" /> },
    { label: 'Go to Sales Orders', tab: 'sales_orders', icon: <ShoppingBag className="w-4 h-4 text-emerald-500" /> },
    { label: 'Go to Purchase Orders', tab: 'purchase_orders', icon: <ShoppingCart className="w-4 h-4 text-blue-500" /> },
    { label: 'View Automations & Webhooks', tab: 'automations', icon: <Zap className="w-4 h-4 text-amber-500" /> },
    { label: 'View Revision History Logs', tab: 'history', icon: <History className="w-4 h-4 text-indigo-400" /> },
  ];

  const handleAction = (tab: string) => {
    onNavigateTab(tab);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-start justify-center pt-20 p-4 overflow-y-auto animate-fadeIn">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden space-y-0 animate-scaleUp">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <Command className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search SKUs, Kits, Orders, Vendors, or Actions (Type Ctrl+K)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-slate-800 font-medium text-sm placeholder-slate-400 focus:outline-none"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Results List Container */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
          {/* Quick Action Shortcuts */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">System Navigation & Actions</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((act) => (
                <button
                  key={act.tab}
                  onClick={() => handleAction(act.tab)}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-300 rounded-xl transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-slate-700 group-hover:text-indigo-900">
                    {act.icon}
                    <span>{act.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Component SKU Matches */}
          {filteredInventory.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Inventory Components ({filteredInventory.length})</div>
              <div className="space-y-1.5">
                {filteredInventory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleAction('inventory')}
                    className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Box className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {item.id} • Category: {item.category}</div>
                      </div>
                    </div>

                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg text-[11px]">
                      {item.isCommon ? 'Unlimited' : `${item.stockQty} ${item.unit}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Composite Kits Matches */}
          {filteredKits.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Composite Kits ({filteredKits.length})</div>
              <div className="space-y-1.5">
                {filteredKits.map((kit) => (
                  <div
                    key={kit.id}
                    onClick={() => handleAction('kits')}
                    className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                        <Boxes className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{kit.name}</div>
                        <div className="text-[10px] text-slate-400">{kit.description}</div>
                      </div>
                    </div>

                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg text-[11px]">
                      {kit.items.length} BOM Items
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
