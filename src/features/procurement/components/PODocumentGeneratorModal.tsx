import React, { useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Mail,
  Phone
} from 'lucide-react';
import { PurchaseOrder } from '@/src/types';

interface PODocumentGeneratorModalProps {
  po: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
}

export default function PODocumentGeneratorModal({ po, isOpen, onClose }: PODocumentGeneratorModalProps) {
  const documentRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !po) return null;

  const handlePrint = () => {
    window.print();
  };

  const subtotal = po.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
  const gstAmount = subtotal * 0.18;
  const grandTotal = subtotal + gstAmount;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Actions Header */}
        <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold">Purchase Order Invoice Preview (#{po.id})</h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto space-y-6 bg-white text-slate-900 text-xs font-sans print:p-0 print:m-0" ref={documentRef}>
          {/* Header Section */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center">
                  E
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">EXPERIMIND LABS PRIVATE LIMITED</h1>
              </div>
              <p className="text-slate-500 font-medium leading-relaxed">
                HQ Campus, Lab Block B, Nitte - 574110, Karnataka, India<br />
                <strong>GSTIN:</strong> 29ABCDE1234F1Z5 • <strong>PAN:</strong> ABCDE1234F<br />
                Email: procurement@experimindlabs.com • Phone: +91 98765 43210
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold rounded-lg uppercase tracking-wider text-[11px] border border-indigo-200">
                PURCHASE ORDER
              </span>
              <div className="font-mono text-base font-black text-slate-900 pt-1">#{po.id}</div>
              <div className="text-[11px] text-slate-500 font-mono">Date: {new Date(po.createdAt).toLocaleDateString('en-IN')}</div>
              <div className="text-[11px] font-bold text-emerald-600 uppercase">Status: {po.status}</div>
            </div>
          </div>

          {/* Vendor & Shipping Details Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Vendor / Supplier Details:</span>
              <div className="font-extrabold text-slate-900 text-sm">{po.vendorName}</div>
              <p className="text-slate-600 leading-relaxed font-mono text-[11px]">
                Authorized Industrial Supplier<br />
                State: Karnataka (State Code: 29)<br />
                Terms: Net 30 Days Credit
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Deliver To (Shipping Address):</span>
              <div className="font-extrabold text-slate-900 text-sm">Experimind Central Warehouse</div>
              <p className="text-slate-600 leading-relaxed font-mono text-[11px]">
                Rack A / Receiving Bay 3<br />
                Experimind Labs HQ, Nitte 574110<br />
                Attn: Warehouse Logistics Manager
              </p>
            </div>
          </div>

          {/* Line Items Breakdown Table */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">Purchased Line Items</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3">#</th>
                    <th className="p-3">SKU / Item Description</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Unit Price (₹)</th>
                    <th className="p-3 text-right">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
                  {po.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-sans font-bold text-slate-900">
                        {item.name}
                        <div className="text-[10px] text-slate-400 font-mono font-normal">SKU Code: {item.itemId}</div>
                      </td>
                      <td className="p-3 text-right font-bold">{item.quantity}</td>
                      <td className="p-3 text-right">₹{item.unitPrice.toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">₹{(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax Calculation & Totals Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-700 font-mono">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>CGST (9%):</span>
                <span>₹{(gstAmount / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>SGST (9%):</span>
                <span>₹{(gstAmount / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 text-sm pt-2 border-t border-slate-200 font-sans">
                <span>Total Payable:</span>
                <span className="text-indigo-600">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer & Signature Authorization */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-6 text-slate-500 text-[11px]">
            <div className="space-y-1">
              <strong className="text-slate-900 uppercase">Terms & Conditions:</strong>
              <p>1. Please reference PO Number on all packing slips & shipping documents.<br />
                 2. Quality inspection will be conducted upon receiving at Bay 3.<br />
                 3. E-Invoice and GST IRN details must accompany original bill copy.</p>
            </div>

            <div className="text-right space-y-6">
              <div className="font-bold text-slate-900 uppercase">Authorized Signature</div>
              <div className="pt-6 border-b border-slate-300 w-48 ml-auto" />
              <div className="text-[10px] text-slate-400">Head of Procurement — Experimind Labs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
