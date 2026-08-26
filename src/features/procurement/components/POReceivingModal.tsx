import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  PackageCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Printer,
  Barcode,
  Truck,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import BarcodeSvg from '@/src/shared/components/BarcodeSvg';

interface POReceivingModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: any;
}

export default function POReceivingModal({ isOpen, onClose, purchaseOrder }: POReceivingModalProps) {
  const { receivePurchaseOrderWms, bins, inventory } = useData();
  const { showToast } = useToast();

  const [receiptLines, setReceiptLines] = useState<Record<string, { receivingQty: number; putawayBin: string; lotNumber: string }>>(() => {
    const initial: Record<string, { receivingQty: number; putawayBin: string; lotNumber: string }> = {};
    (purchaseOrder?.items || []).forEach((item: any) => {
      const invItem = inventory.find(i => i.id === item.itemId || i.name.toLowerCase() === item.name.toLowerCase());
      const remainingQty = Math.max(0, Number(item.quantity) - Number(item.receivedQty || 0));
      initial[item.id || item.itemId] = {
        receivingQty: remainingQty,
        putawayBin: invItem?.binLocation || 'Rack - Shelf 1',
        lotNumber: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${item.itemId.slice(0, 4)}`,
      };
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printingItem, setPrintingItem] = useState<any | null>(null);

  if (!isOpen || !purchaseOrder) return null;

  const handleQtyChange = (itemId: string, val: number, maxQty: number) => {
    setReceiptLines(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        receivingQty: Math.max(0, Math.min(maxQty, val))
      }
    }));
  };

  const handleBinChange = (itemId: string, bin: string) => {
    setReceiptLines(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        putawayBin: bin
      }
    }));
  };

  const handleLotChange = (itemId: string, lot: string) => {
    setReceiptLines(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        lotNumber: lot
      }
    }));
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = Object.entries(receiptLines).map(([lineId, data]: [string, { receivingQty: number; putawayBin: string; lotNumber: string }]) => ({
        lineId,
        itemId: lineId,
        receivingQty: Number(data.receivingQty),
        putawayBin: data.putawayBin,
        lotNumber: data.lotNumber,
      })).filter(l => l.receivingQty > 0);

      if (payload.length === 0) {
        alert('Please specify at least 1 item with receiving quantity greater than 0.');
        setIsSubmitting(false);
        return;
      }

      await receivePurchaseOrderWms(purchaseOrder.id, payload);
      showToast('success', 'Dock Receiving Complete', `Posted inbound stock movements to Immutable Ledger.`);
      onClose();
    } catch (e: any) {
      showToast('error', 'Receiving Failed', e.message || 'Error processing PO receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  Inbound Dock Receiving & 3-Way Match
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="font-mono text-xs text-slate-300 font-bold">{purchaseOrder.poNumber || purchaseOrder.id}</span>
              </div>
              <h2 className="text-xl font-black text-white">Receive Goods from {purchaseOrder.vendorName}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleReceiveSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Summary Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Supplier</span>
                <strong className="text-slate-900 dark:text-white">{purchaseOrder.vendorName}</strong>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Order Total</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">₹{purchaseOrder.totalAmount?.toLocaleString('en-IN')}</strong>
              </div>
            </div>
            <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Receiving directly updates on-hand stock and appends immutable ledger movements.</span>
            </div>
          </div>

          {/* Line Items Receiving Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Component / Part</th>
                    <th className="p-3.5 text-center">Ordered</th>
                    <th className="p-3.5 text-center">Prev. Received</th>
                    <th className="p-3.5">Receiving Now</th>
                    <th className="p-3.5">Putaway Shelf / Bin</th>
                    <th className="p-3.5">Lot / Batch #</th>
                    <th className="p-3.5 text-right">Label</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(purchaseOrder.items || []).map((item: any) => {
                    const key = item.id || item.itemId;
                    const maxToReceive = Math.max(0, Number(item.quantity) - Number(item.receivedQty || 0));
                    const currentRec = receiptLines[key]?.receivingQty ?? maxToReceive;
                    const currentBin = receiptLines[key]?.putawayBin || 'Rack - Shelf 1';
                    const currentLot = receiptLines[key]?.lotNumber || '';

                    return (
                      <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5">
                          <strong className="text-slate-900 dark:text-white block">{item.name}</strong>
                          <span className="font-mono text-[10px] text-slate-400">SKU: {item.itemId || 'N/A'}</span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {item.quantity}
                        </td>
                        <td className="p-3.5 text-center font-mono text-slate-500">
                          {item.receivedQty || 0}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max={maxToReceive}
                              value={currentRec}
                              onChange={(e) => handleQtyChange(key, Number(e.target.value), maxToReceive)}
                              className="w-20 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-[10px] text-slate-400">/ {maxToReceive}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <input
                            type="text"
                            value={currentBin}
                            onChange={(e) => handleBinChange(key, e.target.value)}
                            placeholder="e.g. Rack - Shelf 1"
                            className="w-36 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-3.5">
                          <input
                            type="text"
                            value={currentLot}
                            onChange={(e) => handleLotChange(key, e.target.value)}
                            placeholder="LOT-XXXX"
                            className="w-32 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setPrintingItem({ ...item, binLocation: currentBin, lot: currentLot })}
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                            title="Print Barcode Shelf Label"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Posting Ledger...' : 'Confirm Receipt & Putaway'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Barcode Print Preview Modal */}
      {printingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full text-slate-900 shadow-2xl border border-slate-200">
            <div className="text-center space-y-2 border-b pb-4">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Experimind Warehouse Label</span>
              <h3 className="font-bold text-sm leading-snug">{printingItem.name}</h3>
              <p className="font-mono text-xs text-slate-500">Bin: {printingItem.binLocation} | Lot: {printingItem.lot}</p>
              <div className="flex justify-center py-3 bg-white rounded-xl">
                <BarcodeSvg value={printingItem.itemId || 'SKU-SAMPLE'} width={2.4} height={70} className="h-20 w-auto max-w-[280px]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setPrintingItem(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                  setPrintingItem(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" /> Print Thermal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
