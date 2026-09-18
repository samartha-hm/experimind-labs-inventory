import React from 'react';
import { ShieldAlert } from 'lucide-react';

export interface ComponentItem {
  id: string;
  ipn: string;
  name: string;
  category?: string;
  footprint?: string;
  totalQuantity: number;
  reservedQuantity: number;
  unitCostMac: number;
  locationPath?: string;
  isEsdSafe?: boolean;
}

export interface ResponsiveDataViewProps {
  items: ComponentItem[];
  onSelectItem?: (item: ComponentItem) => void;
}

/**
 * ResponsiveDataView
 * Table-to-Card Responsive Transformer
 * - Mobile (< sm / < 640px): Compact vertical card feed
 * - Desktop (>= sm): High-density TanStack-style table
 */
export function ResponsiveDataView({
  items,
  onSelectItem = () => {},
}: ResponsiveDataViewProps) {
  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
        No components found matching current filters.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 1. MOBILE VIEW (< sm): Compact Card Feed */}
      <div className="flex flex-col gap-2 sm:hidden">
        {items.map((item) => {
          const available = item.totalQuantity - item.reservedQuantity;
          const isLow = available <= 10;
          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-xs active:scale-[0.99] transition-transform text-slate-100 cursor-pointer"
            >
              {/* Row 1: IPN, Package Badge & ESD Warning */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-indigo-400 truncate">
                  {item.ipn}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.isEsdSafe && (
                    <span className="p-0.5 rounded bg-amber-500/10 text-amber-400" title="ESD Sensitive">
                      <ShieldAlert className="w-3 h-3" />
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                    {item.footprint || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Row 2: Part Name */}
              <p className="text-xs font-medium text-slate-200 truncate mb-2">
                {item.name}
              </p>

              {/* Row 3: Location Breadcrumb & Live Stock */}
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
                <span className="text-slate-400 truncate max-w-[55%]">
                  📍 {item.locationPath || 'Unassigned'}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-semibold ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {available} <span className="font-normal text-slate-400 text-[10px]">avail</span>
                  </span>
                  <span className="text-slate-400 font-mono">
                    ₹{Number(item.unitCostMac || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. LAPTOP / DESKTOP VIEW (>= sm): High-Density Table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
            <tr>
              <th className="py-2.5 px-3">IPN</th>
              <th className="py-2.5 px-3">Part Description</th>
              <th className="py-2.5 px-3">Package</th>
              <th className="py-2.5 px-3">Location</th>
              <th className="py-2.5 px-3 text-right">Available</th>
              <th className="py-2.5 px-3 text-right">Unit Cost (MAC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <td className="py-2.5 px-3 font-mono font-semibold text-indigo-400">{item.ipn}</td>
                <td className="py-2.5 px-3 font-medium text-slate-200">{item.name}</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">{item.footprint || 'N/A'}</td>
                <td className="py-2.5 px-3 text-slate-400">{item.locationPath || 'Unassigned'}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                  {item.totalQuantity - item.reservedQuantity}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                  ₹{Number(item.unitCostMac || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResponsiveDataView;
