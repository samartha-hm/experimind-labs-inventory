import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRightLeft,
  Building2,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Plus,
  Search,
  MapPin,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

interface TransferRecord {
  id: string;
  sourceLoc: string;
  destLoc: string;
  itemId: string;
  itemName: string;
  qty: number;
  status: 'IN_TRANSIT' | 'RECEIVED' | 'VERIFIED';
  courierNotes: string;
  createdAt: string;
}

export default function StockTransferTab() {
  const { inventory } = useData();
  const { showToast } = useToast();

  const [transfers, setTransfers] = useState<TransferRecord[]>([
    {
      id: 'STO-1082',
      sourceLoc: 'HQ Main Storage (Rack A)',
      destLoc: 'Nitte Branch Lab B',
      itemId: inventory[0]?.id || '1766123928700',
      itemName: inventory[0]?.name || 'Wash bottles',
      qty: 5,
      status: 'IN_TRANSIT',
      courierNotes: 'Internal Dispatch Van #KA-20-EX-1029',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'STO-1081',
      sourceLoc: 'Warehouse Zone 3',
      destLoc: 'HQ Main Storage (Rack C)',
      itemId: inventory[1]?.id || '1766124295358',
      itemName: inventory[1]?.name || 'Petri Dish',
      qty: 20,
      status: 'RECEIVED',
      courierNotes: 'Hand Transfer by Lab Technician',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceLoc, setSourceLoc] = useState('HQ Main Storage (Rack A)');
  const [destLoc, setDestLoc] = useState('Nitte Branch Lab B');
  const [selectedItemId, setSelectedItemId] = useState(inventory[0]?.id || '');
  const [transferQty, setTransferQty] = useState('1');
  const [courierNotes, setCourierNotes] = useState('');

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find((i) => i.id === selectedItemId);
    if (!item || !transferQty) return;

    const newTransfer: TransferRecord = {
      id: `STO-${Date.now().toString().slice(-4)}`,
      sourceLoc,
      destLoc,
      itemId: item.id,
      itemName: item.name,
      qty: parseInt(transferQty) || 1,
      status: 'IN_TRANSIT',
      courierNotes: courierNotes.trim() || 'Direct Inter-Warehouse Transfer',
      createdAt: new Date().toISOString(),
    };

    setTransfers([newTransfer, ...transfers]);
    setIsModalOpen(false);
    setCourierNotes('');
    showToast('success', 'Stock Transfer Initiated', `Created Order ${newTransfer.id}: Transferring ${newTransfer.qty} ${item.name} from ${sourceLoc} to ${destLoc}`);
  };

  const handleMarkReceived = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'RECEIVED' } : t))
    );
    showToast('success', 'Stock Received & Verified', `Transfer #${id} successfully received and verified in destination inventory.`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-500/40 uppercase flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3 text-blue-400" /> INTER-WAREHOUSE TRANSFERS
            </span>
            <span className="text-slate-400 text-xs">• Location Balance Engine</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Stock Transfer Orders (STO Hub)</h2>
          <p className="text-xs text-slate-300">
            Transfer inventory items between warehouses, satellite labs, and internal storage racks with real-time transit telemetry.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Initiate Stock Transfer
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Active In-Transit Orders</span>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {transfers.filter((t) => t.status === 'IN_TRANSIT').length} Orders
            </div>
          </div>
          <Truck className="w-8 h-8 text-indigo-400/40" />
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Completed Transfers Today</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {transfers.filter((t) => t.status === 'RECEIVED' || t.status === 'VERIFIED').length} Orders
            </div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-400/40" />
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Transit Efficiency</span>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              99.2% On-Time
            </div>
          </div>
          <ShieldCheck className="w-8 h-8 text-slate-400/40" />
        </div>
      </div>

      {/* Transfers Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-indigo-500" /> Recent Stock Transfer Activity
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">Showing {transfers.length} transfer logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/60 dark:border-slate-700">
                <th className="p-3.5">Transfer ID</th>
                <th className="p-3.5">Item Name & SKU</th>
                <th className="p-3.5">Origin → Destination</th>
                <th className="p-3.5 text-center">Transfer Qty</th>
                <th className="p-3.5">Transit Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{t.id}</td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                    {t.itemName}
                    <div className="text-[10px] text-slate-400 font-mono font-normal">SKU: {t.itemId}</div>
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold">
                      <span>{t.sourceLoc}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{t.destLoc}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{t.courierNotes}</div>
                  </td>
                  <td className="p-3.5 text-center font-bold font-mono text-sm">{t.qty} pcs</td>
                  <td className="p-3.5">
                    {t.status === 'IN_TRANSIT' ? (
                      <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1">
                        <Truck className="w-3 h-3" /> In Transit
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Received
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    {t.status === 'IN_TRANSIT' && (
                      <button
                        onClick={() => handleMarkReceived(t.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                      >
                        Confirm Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-400" /> Initiate Inter-Warehouse Stock Transfer
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-6 space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div>
                <label className="block font-bold uppercase text-[10px] text-slate-400 mb-1">Select Item to Transfer *</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                >
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Stock: {item.stockQty} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-[10px] text-slate-400 mb-1">Source Location *</label>
                  <input
                    type="text"
                    required
                    value={sourceLoc}
                    onChange={(e) => setSourceLoc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-[10px] text-slate-400 mb-1">Destination Facility *</label>
                  <input
                    type="text"
                    required
                    value={destLoc}
                    onChange={(e) => setDestLoc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-[10px] text-slate-400 mb-1">Quantity to Transfer *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold font-mono"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-[10px] text-slate-400 mb-1">Internal Van / Courier Tracking Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Courier Van #KA-20-EX-1029 or Handover by Driver"
                  value={courierNotes}
                  onChange={(e) => setCourierNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Dispatch Transfer
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
