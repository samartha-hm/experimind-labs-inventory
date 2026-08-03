import React, { useState } from 'react';
import { Calculator, XCircle, ShieldCheck, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { InventoryItem } from '@/src/types';
import { useToast } from '@/src/contexts/ToastContext';

interface SafetyStockCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  onUpdateThreshold: (itemId: string, newThreshold: number) => void;
}

export default function SafetyStockCalculatorModal({ isOpen, onClose, item, onUpdateThreshold }: SafetyStockCalculatorModalProps) {
  const { showToast } = useToast();
  const [avgDailyUsage, setAvgDailyUsage] = useState(5);
  const [avgLeadTimeDays, setAvgLeadTimeDays] = useState(7);
  const [maxDailyUsage, setMaxDailyUsage] = useState(8);
  const [maxLeadTimeDays, setMaxLeadTimeDays] = useState(12);

  if (!isOpen) return null;

  // Formula Calculations
  const safetyStock = Math.max(0, (maxDailyUsage * maxLeadTimeDays) - (avgDailyUsage * avgLeadTimeDays));
  const reorderPoint = (avgDailyUsage * avgLeadTimeDays) + safetyStock;

  const handleApplyThreshold = () => {
    onUpdateThreshold(item.id, reorderPoint);
    showToast('success', `Updated Reorder Threshold for ${item.name}`, `New ROP Threshold set to ${reorderPoint} ${item.unit}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Reorder Point (ROP) & Safety Stock Calculator</h3>
              <p className="text-xs text-slate-500 font-medium">Statistical buffer simulator for {item.name}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Input Parameters Form */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-600 mb-1">Avg Daily Usage ({item.unit}/day)</label>
            <input
              type="number"
              min="1"
              value={avgDailyUsage}
              onChange={(e) => setAvgDailyUsage(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">Avg Lead Time (Days)</label>
            <input
              type="number"
              min="1"
              value={avgLeadTimeDays}
              onChange={(e) => setAvgLeadTimeDays(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">Max Daily Usage ({item.unit}/day)</label>
            <input
              type="number"
              min="1"
              value={maxDailyUsage}
              onChange={(e) => setMaxDailyUsage(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">Max Lead Time (Days)</label>
            <input
              type="number"
              min="1"
              value={maxLeadTimeDays}
              onChange={(e) => setMaxLeadTimeDays(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Computed Result Box */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Formula Computation Output</span>
            <span className="text-emerald-400 font-mono font-bold">ROP = (Usage × Lead Time) + Safety Stock</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Safety Stock Buffer</div>
              <div className="text-xl font-black text-amber-400 mt-1 font-mono">{safetyStock} {item.unit}</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Calculated Reorder Point (ROP)</div>
              <div className="text-xl font-black text-emerald-400 mt-1 font-mono">{reorderPoint} {item.unit}</div>
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <button
          onClick={handleApplyThreshold}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" /> Apply {reorderPoint} {item.unit} Threshold to {item.name}
        </button>
      </div>
    </div>
  );
}
