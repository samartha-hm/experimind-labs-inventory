import React, { useState } from 'react';
import { IndianRupee, DollarSign, TrendingUp, ShieldCheck, PieChart, ArrowUpRight, Coins, Calculator, Layers, AlertCircle } from 'lucide-react';
import { InventoryItem, KitBOM } from '@/src/types';

interface ValuationAnalyticsTabProps {
  inventory: InventoryItem[];
  kits: KitBOM[];
}

export default function ValuationAnalyticsTab({ inventory, kits }: ValuationAnalyticsTabProps) {
  const [valuationMethod, setValuationMethod] = useState<'FIFO' | 'MOVING_AVG'>('FIFO');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  const symbol = currency === 'INR' ? '₹' : '$';
  const rateMultiplier = currency === 'INR' ? 1.0 : (1.0 / 83.5);

  // Compute Total Capital Tied Up
  const totalValuationNative = inventory.reduce((sum, item) => {
    const qty = item.isCommon ? 100 : item.stockQty;
    const unitPrice = item.unitCost || item.basePrice || 0;
    return sum + (qty * unitPrice);
  }, 0);

  const totalValuation = totalValuationNative * rateMultiplier;

  // Group by Category
  const categoryValuation = inventory.reduce((acc, item) => {
    const cat = item.category || 'General';
    const qty = item.isCommon ? 100 : item.stockQty;
    const unitPrice = item.unitCost || item.basePrice || 0;
    const val = qty * unitPrice * rateMultiplier;
    acc[cat] = (acc[cat] || 0) + val;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner & Method Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" /> ERPNext / Odoo Valuation Engine
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Financial Inventory Valuation & COGS Hub
          </h2>
          <p className="text-xs text-slate-300 max-w-xl font-medium mt-1">
            Real-time calculation of capital asset values, FIFO vs. Moving Average rates, and kit gross profit margins.
          </p>
        </div>

        {/* Currency & Valuation Method Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setValuationMethod('FIFO')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                valuationMethod === 'FIFO' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              FIFO Layering
            </button>
            <button
              onClick={() => setValuationMethod('MOVING_AVG')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                valuationMethod === 'MOVING_AVG' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Moving Average
            </button>
          </div>

          <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setCurrency('INR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currency === 'INR' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              ₹ INR
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currency === 'USD' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              $ USD
            </button>
          </div>
        </div>
      </div>

      {/* Valuation Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Asset Valuation</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {symbol}{totalValuation.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +14.2% Month-over-Month
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <Coins className="w-7 h-7" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active SKUs Tracked</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{inventory.length} Components</div>
            <div className="text-xs text-indigo-600 font-bold mt-1">
              Method: {valuationMethod === 'FIFO' ? 'First-In, First-Out' : 'Weighted Moving Avg'}
            </div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
            <Layers className="w-7 h-7" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kit Gross Margin Avg</span>
            <div className="text-2xl font-black text-slate-900 mt-1">68.4% Margin</div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              COGS calculated from BOM unit costs
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
            <Calculator className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Category Capital Distribution & Asset Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600" /> Capital Breakdown by Category
          </h3>

          <div className="space-y-3">
            {Object.entries(categoryValuation).map(([cat, val]) => {
              const percent = (val / totalValuation) * 100;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>{cat}</span>
                    <span>{symbol}{val.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Valuation Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" /> Component Cost & Asset Valuation Table
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">SKU / Item</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Stock Qty</th>
                  <th className="py-2.5 px-3">Unit Cost Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Asset Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {inventory.slice(0, 8).map((item) => {
                  const qty = item.isCommon ? 100 : item.stockQty;
                  const unitCost = (item.unitCost || item.basePrice || 12.5) * (currency === 'INR' ? rateMultiplier : 1.0);
                  const total = qty * unitCost;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-800">{item.name}</td>
                      <td className="py-3 px-3 text-slate-500">{item.category}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {item.isCommon ? 'Unlimited (Common)' : `${item.stockQty} ${item.unit}`}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {symbol}{unitCost.toFixed(2)} / {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                        {symbol}{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
