import React from 'react';
import { X, Printer, Download, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'purchase_order' | 'sales_order' | 'invoice' | 'packing_slip';
  data: {
    orderNumber: string;
    partnerName: string;
    partnerAddress?: string;
    date: string;
    dueDateOrExpected?: string;
    status: string;
    totalAmount: number;
    items: {
      name: string;
      qty: number;
      unitPrice: number;
      total: number;
    }[];
  };
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  documentType,
  data,
}: DocumentPreviewModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getDocTitle = () => {
    switch (documentType) {
      case 'purchase_order':
        return 'PURCHASE ORDER';
      case 'sales_order':
        return 'SALES ORDER';
      case 'invoice':
        return 'COMMERCIAL INVOICE';
      case 'packing_slip':
        return 'WAREHOUSE PACKING SLIP';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0) || data.totalAmount;
  const tax = subtotal * 0.08; // 8% Tax calculation
  const grandTotal = subtotal + tax;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Top Actions */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold tracking-tight">Zoho-Grade Enterprise Document Viewer</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Export PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-800 font-sans print:p-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-indigo-600 text-white rounded-xl font-black text-sm">NI</div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Experimind Labs Corp</h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">100 Innovation Boulevard, Suite 400</p>
              <p className="text-xs text-slate-500 font-medium">San Jose, CA 95134 • support@experimindlabs.com</p>
            </div>

            <div className="text-right">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                {getDocTitle()}
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2 font-mono">{data.orderNumber}</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Date: <strong>{data.date}</strong></p>
            </div>
          </div>

          {/* B2B Address Details */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">BILLED / ISSUED TO</span>
              <div className="font-bold text-slate-900 text-sm">{data.partnerName}</div>
              <div className="text-slate-500 mt-0.5">{data.partnerAddress || 'Corporate Technology Center, Building B'}</div>
              <div className="text-slate-500">Tax ID: US-948201948</div>
            </div>

            <div className="text-right space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ORDER METADATA</span>
              <div>Status: <strong className="uppercase font-mono text-indigo-600">{data.status}</strong></div>
              <div>Payment Terms: <strong className="text-slate-800">Net 30 Days</strong></div>
              <div>Fulfillment Warehouse: <strong className="text-slate-800">WH-MAIN-01 (San Jose)</strong></div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Amount ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {data.items.length > 0 ? (
                  data.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">{item.qty} pcs</td>
                      <td className="py-3 px-4 text-right font-mono">${item.unitPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">${item.total.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">Standard Components & Subassemblies Bundle</td>
                    <td className="py-3 px-4 text-center font-bold">1 Lot</td>
                    <td className="py-3 px-4 text-right font-mono">${subtotal.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">${subtotal.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Totals */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal Amount:</span>
                <span className="font-mono font-bold text-slate-800">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Estimated Tax (8%):</span>
                <span className="font-mono font-bold text-slate-800">${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-black text-slate-900">
                <span>Total Due:</span>
                <span className="font-mono text-indigo-600">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature & Guarantee */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Verified System Document &bull; Generated by NexaInventory ERP</span>
            </div>
            <div>Authorized Signature: _______________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}
