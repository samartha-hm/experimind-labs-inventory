import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  Truck,
  CheckCircle2,
  Package,
  MapPin,
  Barcode,
  Printer,
  FileText
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

interface SOFulfillmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesOrder: any;
}

export default function SOFulfillmentModal({ isOpen, onClose, salesOrder }: SOFulfillmentModalProps) {
  const { fulfillSalesOrderWms, inventory } = useData();
  const { showToast } = useToast();

  const [carrier, setCarrier] = useState('BlueDart Express');
  const [trackingNumber, setTrackingNumber] = useState(`TRK-IN-${Date.now().toString().slice(-6)}`);
  const [pickedItems, setPickedItems] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !salesOrder) return null;

  const togglePicked = (key: string) => {
    setPickedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allItemsPicked = (salesOrder.items || []).every((item: any) => pickedItems[item.id || item.itemId]);

  const handleFulfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fulfillmentLines = (salesOrder.items || []).map((item: any) => {
        const inv = inventory.find(i => i.id === item.itemId || i.name.toLowerCase() === item.name.toLowerCase());
        return {
          lineId: item.id || item.itemId,
          itemId: item.itemId || item.id,
          fulfillQty: Number(item.quantity),
          sourceBin: inv?.binLocation || 'Rack - Shelf 1',
        };
      });

      await fulfillSalesOrderWms(salesOrder.id, fulfillmentLines, carrier, trackingNumber);
      showToast('success', 'Order Dispatched', `Posted SO_SHIPMENT to Stock Ledger & updated tracking #${trackingNumber}`);
      onClose();
    } catch (e: any) {
      showToast('error', 'Fulfillment Error', e.message || 'Failed to dispatch order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-indigo-400 font-bold uppercase tracking-wider">
                  Outbound Pick, Pack & Dispatch
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="font-mono text-xs text-slate-300 font-bold">{salesOrder.soNumber || salesOrder.id}</span>
              </div>
              <h2 className="text-xl font-black text-white">Fulfill Order for {salesOrder.customerName}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFulfillSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Shipping Manifest Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Logistics Carrier
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="BlueDart Express">BlueDart Express (Air Cargo)</option>
                <option value="Delhivery Logistics">Delhivery Logistics (Surface / Express)</option>
                <option value="DTDC Courier">DTDC Priority Logistics</option>
                <option value="Direct Lab Delivery">Direct Lab Delivery (Internal Van)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Courier Tracking / AWB Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. AWB987654321"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Guided Warehouse Pick Path */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                <span>Guided Pick Path & Verification</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {Object.values(pickedItems).filter(Boolean).length} / {(salesOrder.items || []).length} Verified
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
              {(salesOrder.items || []).map((item: any) => {
                const key = item.id || item.itemId;
                const isPicked = !!pickedItems[key];
                const inv = inventory.find(i => i.id === item.itemId || i.name.toLowerCase() === item.name.toLowerCase());
                const binLocation = inv?.binLocation || 'Rack - Shelf 1';

                return (
                  <div
                    key={key}
                    onClick={() => togglePicked(key)}
                    className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer transition-all ${
                      isPicked
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        isPicked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}>
                        {isPicked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <strong className={`text-xs block ${isPicked ? 'text-emerald-950 dark:text-emerald-300 font-bold' : 'text-slate-900 dark:text-white'}`}>
                          {item.name}
                        </strong>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>Pick from: <strong className="text-indigo-600 dark:text-indigo-400">{binLocation}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold text-slate-700 dark:text-slate-300">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Dispatching...' : 'Confirm Dispatch & Release Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
