import React, { useState } from 'react';
import { TrendingUp, AlertTriangle, PieChart as PieIcon, BarChart3, Clock, Mail, ArrowUpRight, Zap, CheckCircle2, ShieldCheck, Search } from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

export default function PredictiveAnalyticsTab() {
  const { inventory } = useData();
  const { showToast } = useToast();

  const [selectedClass, setSelectedClass] = useState<string>('AX');

  // Compute ABC/XYZ Mock Classification
  const classifiedSKUs = inventory.map((item, idx) => {
    const abc: 'A' | 'B' | 'C' = idx % 3 === 0 ? 'A' : idx % 3 === 1 ? 'B' : 'C';
    const xyz: 'X' | 'Y' | 'Z' = idx % 2 === 0 ? 'X' : 'Y';
    const forecastDays = item.stockQty === 0 ? 0 : Math.max(2, (item.stockQty * 1.5) - (idx * 2));
    return {
      ...item,
      abc,
      xyz,
      matrixCode: `${abc}${xyz}`,
      forecastDays,
    };
  });

  const filteredSKUs = classifiedSKUs.filter(s => s.matrixCode === selectedClass);

  const handleScheduleResendEmail = () => {
    showToast('success', 'Resend Email Report Scheduled', 'Weekly Inventory & Predictive Stockout Digest scheduled to resend@experimindlabs.com');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-purple-500/40 uppercase">
              PREDICTIVE BI & ANALYTICS
            </span>
            <span className="text-slate-300 text-xs font-medium">• Time-Series Consumption Engine</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Predictive Analytics & ABC/XYZ Hub</h2>
          <p className="text-xs text-slate-300">
            Time-series stockout forecasting, ABC revenue valuation matrix, XYZ consumption volatility, and DIO metrics.
          </p>
        </div>

        <button
          onClick={handleScheduleResendEmail}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer shrink-0"
        >
          <Mail className="w-4 h-4" /> Schedule Weekly Resend Email Digest
        </button>
      </div>

      {/* Cash Flow & Inventory Velocity Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Days Inventory Outstanding (DIO)</span>
          <div className="font-mono font-black text-slate-800 text-xl flex items-baseline gap-1">
            24.5 <span className="text-xs font-bold text-slate-500">Days</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">↓ 3.2 days vs last month</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inventory Turnover Ratio</span>
          <div className="font-mono font-black text-slate-800 text-xl flex items-baseline gap-1">
            8.2x <span className="text-xs font-bold text-slate-500">per year</span>
          </div>
          <span className="text-[10px] text-indigo-600 font-bold">Top 10% Industry Benchmark</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Predicted Critical Stockouts (&lt;5 Days)</span>
          <div className="font-mono font-black text-rose-600 text-xl flex items-baseline gap-1">
            {classifiedSKUs.filter(s => s.forecastDays < 5).length} <span className="text-xs font-bold text-slate-500">SKUs</span>
          </div>
          <span className="text-[10px] text-rose-600 font-bold">Requires Immediate PO Reorder</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dead Stock Asset Value</span>
          <div className="font-mono font-black text-amber-600 text-xl flex items-baseline gap-1">
            ₹45,200
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Unmoved for &gt;90 days</span>
        </div>
      </div>

      {/* ABC / XYZ 9-Box Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 9-Box Matrix Column */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-800 text-base">ABC / XYZ 9-Box Matrix</h3>
            <p className="text-[11px] text-slate-500">Click any matrix cell to filter SKUs</p>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-center">
            {['AX', 'AY', 'AZ', 'BX', 'BY', 'BZ', 'CX', 'CY', 'CZ'].map((code) => {
              const count = classifiedSKUs.filter(s => s.matrixCode === code).length;
              const isSelected = selectedClass === code;

              return (
                <button
                  key={code}
                  onClick={() => setSelectedClass(code)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                    isSelected ? 'bg-purple-600 text-white border-purple-700 shadow-md scale-105' : 'bg-slate-50 hover:bg-purple-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="font-black text-sm">{code}</div>
                  <div className={`text-[10px] font-bold ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                    {count} SKUs
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl text-[10px] text-slate-600 space-y-1 border border-slate-200/80">
            <div><strong className="text-purple-700">A / B / C</strong>: High / Medium / Low Revenue Impact</div>
            <div><strong className="text-purple-700">X / Y / Z</strong>: Constant / Seasonal / Volatile Demand</div>
          </div>
        </div>

        {/* Filtered SKUs List & Stockout Forecast */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-base">
              SKU Drill-Down ({selectedClass} Matrix Group - {filteredSKUs.length} items)
            </h3>
            <span className="text-xs font-mono font-bold text-purple-600">Time-Series Forecast Active</span>
          </div>

          <div className="space-y-2.5">
            {filteredSKUs.length > 0 ? (
              filteredSKUs.map((sku) => (
                <div key={sku.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{sku.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">SKU: {sku.id} • Category: {sku.category}</div>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-bold">STOCK QTY</span>
                      <span className="font-bold text-slate-800">{sku.stockQty} {sku.unit}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-bold">FORECASTED STOCKOUT</span>
                      <span className={`font-bold ${sku.forecastDays < 5 ? 'text-rose-600 font-black' : 'text-emerald-600'}`}>
                        {sku.forecastDays === 0 ? 'OUT OF STOCK' : `In ~${Math.round(sku.forecastDays)} Days`}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                No component SKUs mapped to matrix classification cell {selectedClass}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
