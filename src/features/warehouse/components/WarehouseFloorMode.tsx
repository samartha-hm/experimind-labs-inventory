import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  Truck,
  ClipboardList,
  ArrowRightLeft,
  Barcode,
  Search,
  CheckCircle2,
  Box,
  MapPin,
  Building2,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import POReceivingModal from '@/src/features/procurement/components/POReceivingModal';
import SOFulfillmentModal from '@/src/features/sales/components/SOFulfillmentModal';
import CycleCountModal from '@/src/features/warehouse/components/CycleCountModal';

export default function WarehouseFloorMode() {
  const { inventory, purchaseOrders, salesOrders, wmsTransfers, wmsCycleCounts } = useData();
  const { showToast } = useToast();

  const [activeReceivingPO, setActiveReceivingPO] = useState<any | null>(null);
  const [activeFulfillSO, setActiveFulfillSO] = useState<any | null>(null);
  const [isCycleCountModalOpen, setIsCycleCountModalOpen] = useState(false);

  // Quick Barcode Scan State
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [matchedItem, setMatchedItem] = useState<any | null>(null);

  // Global Keypress buffer for USB Barcode Guns (terminating in Enter)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input element
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.trim()) {
          const clean = buffer.trim().toLowerCase();
          const match = inventory.find(i =>
            i.id.toLowerCase() === clean ||
            (i.barcode && i.barcode.toLowerCase() === clean) ||
            i.name.toLowerCase() === clean
          );
          if (match) {
            setMatchedItem(match);
            showToast('info', 'Barcode Gun Scanned', `Identified "${match.name}" (Bin: ${match.binLocation || 'Unassigned'})`);
          } else {
            showToast('warning', 'Unknown Barcode', `Scanned: "${buffer}"`);
          }
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inventory, showToast]);

  const pendingPOs = purchaseOrders.filter(po => po.status === 'issued' || po.status === 'draft' || po.status === 'partially_received');
  const pendingSOs = salesOrders.filter(so => so.status === 'pending' || so.status === 'allocated' || so.status === 'processing');

  return (
    <div className="space-y-6 w-full animate-fadeIn pb-12">
      {/* Floor Banner */}
      <div className="bg-slate-950 text-white p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> WAREHOUSE FLOOR OPERATOR MODE
            </span>
            <span className="text-slate-400 text-xs">• Touch & Barcode Scanner Optimized</span>
          </div>
          <h2 className="text-2xl font-black text-white">Station Touchscreen & Scanner Console</h2>
          <p className="text-xs text-slate-300">
            Rapid dock receiving, guided pick-pack order fulfillment, barcode gun scanning, and instant cycle audits.
          </p>
        </div>

        {/* Barcode Quick Scan Bar */}
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 flex items-center gap-3 w-full md:w-80 shadow-inner">
          <Barcode className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            placeholder="Scan barcode or type SKU..."
            value={scannedBarcode}
            onChange={(e) => {
              const val = e.target.value;
              setScannedBarcode(val);
              const match = inventory.find(i =>
                i.id.toLowerCase() === val.toLowerCase() ||
                (i.barcode && i.barcode.toLowerCase() === val.toLowerCase()) ||
                i.name.toLowerCase().includes(val.toLowerCase())
              );
              setMatchedItem(match || null);
            }}
            className="w-full bg-transparent text-xs font-mono font-bold text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Scanned Part Details Banner (if active) */}
      {matchedItem && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-4 animate-fadeIn text-emerald-950 dark:text-emerald-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-500">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <strong className="text-sm font-black block text-slate-900 dark:text-white">{matchedItem.name}</strong>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span>SKU: {matchedItem.barcode || matchedItem.id}</span>
                <span>•</span>
                <span>Bin: <strong className="text-indigo-600 dark:text-indigo-400">{matchedItem.binLocation || 'Unassigned'}</strong></span>
                <span>•</span>
                <span>On Hand: <strong className="text-emerald-600 dark:text-emerald-400">{matchedItem.stockQty} {matchedItem.unit}</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setMatchedItem(null);
              setScannedBarcode('');
            }}
            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-xl hover:bg-slate-300 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. INBOUND RECEIVING */}
        <div
          onClick={() => {
            if (pendingPOs.length > 0) setActiveReceivingPO(pendingPOs[0]);
            else showToast('info', 'No Pending POs', 'All Purchase Orders have been fully received.');
          }}
          className="p-6 bg-white dark:bg-slate-900 border-2 border-emerald-500/30 hover:border-emerald-500 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-3.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
              <PackageCheck className="w-7 h-7" />
            </div>
            <span className="font-mono text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full">
              {pendingPOs.length} Pending
            </span>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">1. Inbound Receiving</h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify arriving supplier shipments, partial receipts, and automatic shelf bin putaway.
            </p>
          </div>
          <div className="pt-2 flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>Open Dock Receiving</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* 2. OUTBOUND PICKING */}
        <div
          onClick={() => {
            if (pendingSOs.length > 0) setActiveFulfillSO(pendingSOs[0]);
            else showToast('info', 'No Pending Orders', 'All sales orders have been shipped.');
          }}
          className="p-6 bg-white dark:bg-slate-900 border-2 border-indigo-500/30 hover:border-indigo-500 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-3.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform">
              <Truck className="w-7 h-7" />
            </div>
            <span className="font-mono text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full">
              {pendingSOs.length} Ready
            </span>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">2. Pick & Dispatch</h3>
            <p className="text-xs text-slate-500 mt-1">
              Follow guided bin pick-paths, scan verify SKUs, attach courier tracking, and release stock.
            </p>
          </div>
          <div className="pt-2 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>Start Order Pick</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* 3. CYCLE AUDITS */}
        <div
          onClick={() => setIsCycleCountModalOpen(true)}
          className="p-6 bg-white dark:bg-slate-900 border-2 border-amber-500/30 hover:border-amber-500 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-3.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:scale-110 transition-transform">
              <ClipboardList className="w-7 h-7" />
            </div>
            <span className="font-mono text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full">
              {wmsCycleCounts.length} Audits
            </span>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">3. ABC Cycle Audits</h3>
            <p className="text-xs text-slate-500 mt-1">
              Conduct blind physical counts, detect variances, and post ledger reconciliation adjustments.
            </p>
          </div>
          <div className="pt-2 flex items-center text-xs font-bold text-amber-600 dark:text-amber-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>Audit Physical Stock</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* 4. TRANSFERS */}
        <div
          onClick={() => showToast('info', 'Stock Transfers', 'Switch to the Transfers tab to initiate bay-to-bay or warehouse movements.')}
          className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 hover:border-indigo-500 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl group-hover:scale-110 transition-transform">
              <ArrowRightLeft className="w-7 h-7" />
            </div>
            <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full">
              {wmsTransfers.length} Active
            </span>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">4. Stock Transfers</h3>
            <p className="text-xs text-slate-500 mt-1">
              Move components between Storage Bays, FabLab Bins, and Chemical Cabinets with full transit tracking.
            </p>
          </div>
          <div className="pt-2 flex items-center text-xs font-bold text-slate-600 dark:text-slate-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>View Transfers</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* Receiving Modal */}
      {activeReceivingPO && (
        <POReceivingModal
          isOpen={!!activeReceivingPO}
          onClose={() => setActiveReceivingPO(null)}
          purchaseOrder={activeReceivingPO}
        />
      )}

      {/* Fulfillment Modal */}
      {activeFulfillSO && (
        <SOFulfillmentModal
          isOpen={!!activeFulfillSO}
          onClose={() => setActiveFulfillSO(null)}
          salesOrder={activeFulfillSO}
        />
      )}

      {/* Cycle Count Modal */}
      <CycleCountModal
        isOpen={isCycleCountModalOpen}
        onClose={() => setIsCycleCountModalOpen(false)}
      />
    </div>
  );
}
