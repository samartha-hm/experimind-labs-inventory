import React from 'react';
import { Building2, ShoppingCart, Warehouse, Boxes, ShoppingBag, Truck, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { InventoryItem, KitBOM } from '@/src/types';

interface SupplyChainPipelineProps {
  inventory: InventoryItem[];
  kits: KitBOM[];
}

export default function SupplyChainPipeline({ inventory, kits }: SupplyChainPipelineProps) {
  const lowStockCount = inventory.filter(i => !i.isCommon && i.stockQty < i.threshold).length;
  const totalStockCount = inventory.reduce((acc, i) => acc + (i.isCommon ? 999 : i.stockQty), 0);

  const NODES = [
    {
      id: 'vendors',
      title: 'Suppliers & Vendors',
      sub: 'Approved Suppliers',
      count: '3 Active Vendors',
      icon: <Building2 className="w-5 h-5 text-indigo-400" />,
      badge: 'Upstream',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    },
    {
      id: 'po',
      title: 'Purchase Orders',
      sub: 'Inbound Orders',
      count: '2 POs Pending',
      icon: <ShoppingCart className="w-5 h-5 text-blue-400" />,
      badge: 'Procurement',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    {
      id: 'warehouse',
      title: 'Warehouse & Bins',
      sub: 'Main Storage HQ',
      count: `${inventory.length} SKUs (${totalStockCount} units)`,
      icon: <Warehouse className="w-5 h-5 text-amber-400" />,
      badge: lowStockCount > 0 ? `${lowStockCount} Shortages` : 'Stocked',
      badgeColor: lowStockCount > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'kitting',
      title: 'Kitting Assembly',
      sub: 'BOM Customizer',
      count: `${kits.length} Composite Kits`,
      icon: <Boxes className="w-5 h-5 text-purple-400" />,
      badge: 'Manufacturing',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    },
    {
      id: 'sales',
      title: 'Sales & Fulfillment',
      sub: 'Customer Orders',
      count: '4 Active Sales Orders',
      icon: <ShoppingBag className="w-5 h-5 text-emerald-400" />,
      badge: 'Outbound',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'delivery',
      title: 'Customer Delivery',
      sub: 'Dispatch & Logistics',
      count: '100% On-Time Rate',
      icon: <Truck className="w-5 h-5 text-cyan-400" />,
      badge: 'Delivered',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-400" /> End-to-End Logistics Pipeline
            </span>
          </div>
          <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            Visual Supply Chain Flow
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-4 h-4" /> System Healthy
          </div>
        </div>
      </div>

      {/* Node Flow Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 relative">
        {NODES.map((node, index) => (
          <div key={node.id} className="relative group">
            <div className="bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-300 shadow-lg flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 group-hover:scale-110 transition-transform">
                  {node.icon}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${node.badgeColor}`}>
                  {node.badge}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white leading-snug">{node.title}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{node.sub}</p>
              </div>

              <div className="text-[11px] font-mono text-indigo-300 font-bold bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-center">
                {node.count}
              </div>
            </div>

            {/* Connecting Arrow for Desktop */}
            {index < NODES.length - 1 && (
              <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 text-slate-600 group-hover:text-indigo-400 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
