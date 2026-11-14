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
 * Cards below 768px; tables on larger screens. Item actions support keyboard input.
 */
export function ResponsiveDataView({
  items,
  onSelectItem = () => {},
}: ResponsiveDataViewProps) {
  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
        No components found matching current filters.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Touch-friendly cards below the tablet breakpoint. */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {items.map((item) => {
          const available = item.totalQuantity - item.reservedQuantity;
          const isLow = available <= 10;
          return (
            <div
              key={item.id}
              className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs"
            >
              {/* Row 1: IPN, Package Badge & ESD Warning */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate">
                  {item.ipn}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.isEsdSafe && (
                    <span className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400" title="ESD Sensitive">
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                    {item.footprint || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Row 2: Part Name */}
              <button type="button" onClick={() => onSelectItem(item)} className="block min-h-[44px] w-full break-words text-left text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                {item.name}
              </button>

              {/* Row 3: Location Breadcrumb & Live Stock */}
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400 truncate max-w-[55%]">
                  📍 {item.locationPath || 'Unassigned'}
                </span>
                <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                  <span className={`font-bold ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {available} <span className="font-normal text-slate-400 text-[10px]">avail</span>
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono font-semibold">
                    ₹{Number(item.unitCostMac || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dense tabular view on larger screens. */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold sticky top-0 backdrop-blur-md">
            <tr>
              <th className="py-3 px-4">IPN / SKU</th>
              <th className="py-3 px-4">Part Description</th>
              <th className="py-3 px-4">Package</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4 text-right">Available</th>
              <th className="py-3 px-4 text-right">Unit Cost (MAC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.ipn}</td>
                <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100"><button type="button" onClick={() => onSelectItem(item)} className="min-h-[44px] rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">{item.name}</button></td>
                <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{item.footprint || 'N/A'}</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.locationPath || 'Unassigned'}</td>
                <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {item.totalQuantity - item.reservedQuantity}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-200 tabular-nums">
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
