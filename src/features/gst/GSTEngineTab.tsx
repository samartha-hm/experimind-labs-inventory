import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  Building2,
  Plus,
  Search,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Percent,
  Receipt
} from 'lucide-react';
import { useTenant } from '@/src/contexts/TenantContext';
import { useToast } from '@/src/contexts/ToastContext';
import { useData } from '@/src/DataContext';

export interface TaxInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerGstin: string;
  customerStateCode: string;
  placeOfSupply: string;
  items: { description: string; hsn: string; qty: number; rate: number; taxRate: number }[];
  totalTaxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalInvoiceAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID';
}

export default function GSTEngineTab() {
  const { activeTenant } = useTenant();
  const { showToast } = useToast();
  const { salesOrders = [], customers = [] } = useData();

  const [invoices, setInvoices] = useState<TaxInvoice[]>([
    {
      id: 'inv_101',
      invoiceNumber: 'EXP-INV-2026-0089',
      date: '2026-08-25',
      customerName: 'Robotics India STEM Academy',
      customerGstin: '29AAACR9988H1Z2',
      customerStateCode: '29',
      placeOfSupply: '29 - Karnataka',
      items: [
        { description: 'STEM Robotics Explorer Kit (Rev 2)', hsn: '95030090', qty: 25, rate: 4500, taxRate: 18 },
        { description: 'IoT Sensor Starter Module', hsn: '85423100', qty: 50, rate: 250, taxRate: 18 }
      ],
      totalTaxableValue: 125000,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 22500,
      totalInvoiceAmount: 147500,
      status: 'ISSUED',
    },
    {
      id: 'inv_102',
      invoiceNumber: 'EXP-INV-2026-0090',
      date: '2026-08-28',
      customerName: 'Experimind Micro Lab School',
      customerGstin: '27AABCE4455K1Z0',
      customerStateCode: '27',
      placeOfSupply: '27 - Maharashtra',
      items: [
        { description: 'Physics Optics & Mechanics Lab Kit', hsn: '90230000', qty: 10, rate: 4500, taxRate: 18 }
      ],
      totalTaxableValue: 45000,
      cgstAmount: 4050,
      sgstAmount: 4050,
      igstAmount: 0,
      totalInvoiceAmount: 53100,
      status: 'ISSUED',
    },
  ]);

  const [selectedInvoice, setSelectedInvoice] = useState<TaxInvoice | null>(invoices[0]);
  const [search, setSearch] = useState('');

  const handlePrint = () => {
    window.print();
    showToast('info', 'Print Dialog Opened', 'Standard GST Tax Invoice prepared for printing.');
  };

  const handleExportCSV = () => {
    const headers = ['Invoice No', 'Date', 'Customer Name', 'GSTIN', 'Taxable Value (INR)', 'CGST', 'SGST', 'IGST', 'Total Invoice (INR)', 'Status'];
    const rows = invoices.map(i => [
      i.invoiceNumber,
      i.date,
      `"${i.customerName}"`,
      i.customerGstin,
      i.totalTaxableValue.toFixed(2),
      i.cgstAmount.toFixed(2),
      i.sgstAmount.toFixed(2),
      i.igstAmount.toFixed(2),
      i.totalInvoiceAmount.toFixed(2),
      i.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `GST_Tax_Invoices_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Invoices Exported', 'GST summary CSV downloaded successfully.');
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn select-none pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 uppercase">
              GST Compliant Billing
            </span>
            <span className="text-xs text-slate-400 font-mono">HSN Codes • CGST / SGST / IGST Engine</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-400" /> Tax Invoices & Delivery Challans
          </h1>
          <p className="text-xs text-slate-300 font-medium max-w-2xl">
            Generate and export standard GST-compliant tax invoices, calculate intrastate vs interstate tax splits, and print official delivery challans for dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Grid: List + Invoice Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Invoice Registry List */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md lg:col-span-5 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" /> Issued Tax Invoices
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400">{invoices.length} Documents</span>
          </div>

          <div className="space-y-2.5">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedInvoice?.id === inv.id
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500/80 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{inv.invoiceNumber}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{inv.date}</span>
                </div>

                <div className="font-bold text-slate-900 dark:text-white text-xs mt-1 truncate">
                  {inv.customerName}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  <span>GSTIN: {inv.customerGstin}</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{inv.totalInvoiceAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Print-Ready GST Tax Invoice Document */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md lg:col-span-7 p-6 md:p-8 space-y-6">
          {selectedInvoice ? (
            <div className="space-y-6">
              
              {/* Actions Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 uppercase">
                    {selectedInvoice.status}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">{selectedInvoice.invoiceNumber}</span>
                </div>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Tax Invoice
                </button>
              </div>

              {/* Invoice Printable Sheet */}
              <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-6">
                
                {/* Header & Seller/Buyer */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">EXPERIMIND LABS PVT LTD</h2>
                    <p className="text-xs text-slate-500">Innovation & STEM Educational Systems</p>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">GSTIN: 27AABCE1234F1Z5 • State Code: 27 (MH)</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 dark:text-white block font-mono">TAX INVOICE</span>
                    <span className="text-xs font-mono text-slate-500">Date: {selectedInvoice.date}</span>
                  </div>
                </div>

                {/* Bill To */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Billed To (Customer)</span>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedInvoice.customerName}</p>
                  <p className="font-mono text-slate-500">GSTIN: {selectedInvoice.customerGstin} • Place of Supply: {selectedInvoice.placeOfSupply}</p>
                </div>

                {/* Line Items Table */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2">Item Description</th>
                      <th className="py-2">HSN</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Rate (₹)</th>
                      <th className="py-2 text-right">Taxable Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-mono">
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-white">{item.description}</td>
                        <td className="py-2.5 text-slate-500">{item.hsn}</td>
                        <td className="py-2.5 text-right font-bold">{item.qty}</td>
                        <td className="py-2.5 text-right">₹{item.rate.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 text-right font-bold">₹{(item.qty * item.rate).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tax Breakdown & Totals */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                  <div className="w-72 space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Total Taxable Value:</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{selectedInvoice.totalTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {selectedInvoice.cgstAmount > 0 && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>CGST (9%):</span>
                        <span>₹{selectedInvoice.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {selectedInvoice.sgstAmount > 0 && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>SGST (9%):</span>
                        <span>₹{selectedInvoice.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {selectedInvoice.igstAmount > 0 && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>IGST (18%):</span>
                        <span>₹{selectedInvoice.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-300 dark:border-slate-600 flex justify-between text-sm font-black text-slate-900 dark:text-white font-sans">
                      <span>Grand Total:</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{selectedInvoice.totalInvoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">Select an invoice to view preview</div>
          )}
        </div>

      </div>
    </div>
  );
}
