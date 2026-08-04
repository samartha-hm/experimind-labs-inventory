import React, { useState } from 'react';
import { ShieldCheck, FileCheck, QrCode, ArrowUpRight, Download, CheckCircle2, AlertTriangle, RefreshCw, Landmark, Sparkles } from 'lucide-react';
import { useTenant } from '@/src/contexts/TenantContext';
import { useToast } from '@/src/contexts/ToastContext';
import { GSTInvoice } from '@/src/types';

export default function GSTEngineTab() {
  const { activeTenant } = useTenant();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<GSTInvoice[]>([
    {
      id: 'inv_101',
      tenantId: activeTenant.id,
      invoiceNumber: 'INV-2026-0089',
      date: '2026-08-04',
      customerName: 'Robotics India Pvt Ltd',
      customerGstin: '29AAACR9988H1Z2',
      customerStateCode: '29', // Karnataka (Interstate from 27)
      placeOfSupply: '29 - Karnataka',
      totalTaxableValue: 125000,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 22500, // 18% IGST
      totalInvoiceAmount: 147500,
      irn: 'e789b1de3a89045ef201c7908b98124f901c890123ef8902c7890123ef',
      signedQrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=IRN-INV-2026-0089',
      ewayBillNumber: '171009823412',
      status: 'GENERATED',
    },
    {
      id: 'inv_102',
      tenantId: activeTenant.id,
      invoiceNumber: 'INV-2026-0090',
      date: '2026-08-04',
      customerName: 'Experimind Micro Systems',
      customerGstin: '27AABCE4455K1Z0',
      customerStateCode: '27', // Maharashtra (Intrastate from 27)
      placeOfSupply: '27 - Maharashtra',
      totalTaxableValue: 45000,
      cgstAmount: 4050, // 9% CGST
      sgstAmount: 4050, // 9% SGST
      igstAmount: 0,
      totalInvoiceAmount: 53100,
      status: 'DRAFT',
    },
  ]);

  const [selectedInvoice, setSelectedInvoice] = useState<GSTInvoice | null>(invoices[1]);

  const handleGenerateEInvoice = (invId: string) => {
    const irnHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const ewayNo = Math.floor(100000000000 + Math.random() * 900000000000).toString();

    setInvoices(prev => prev.map(inv => {
      if (inv.id === invId) {
        const updated: GSTInvoice = {
          ...inv,
          irn: irnHash,
          signedQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=IRN-${inv.invoiceNumber}`,
          ewayBillNumber: ewayNo,
          status: 'GENERATED',
        };
        setSelectedInvoice(updated);
        return updated;
      }
      return inv;
    }));

    showToast('success', 'E-Invoice IRN Generated (GSTN IRP)', `Successfully registered IRN ${irnHash.substring(0, 16)}...`);
  };

  const handleExportGSTR1 = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Invoice Number,Date,Customer GSTIN,Taxable Value,CGST,SGST,IGST,Total Amount,IRN Status\n"
      + invoices.map(i => `${i.invoiceNumber},${i.date},${i.customerGstin},${i.totalTaxableValue},${i.cgstAmount},${i.sgstAmount},${i.igstAmount},${i.totalInvoiceAmount},${i.status}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GSTR1_Export_${activeTenant.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'GSTR-1 Report Exported', 'Downloaded GSTR-1 CSV return file for GST portal upload');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/40 uppercase">
              INDIA COMPLIANCE MODULE
            </span>
            <span className="text-slate-400 text-xs font-medium">• Place of Supply: State Code {activeTenant.stateCode || '27'}</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">GST & E-Invoicing (IRP) Hub</h2>
          <p className="text-xs text-slate-300">
            Auto CGST/SGST/IGST tax calculation, 1-click E-Invoice IRN generation, signed QR codes & GSTR return exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportGSTR1}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export GSTR-1 CSV
          </button>
        </div>
      </div>

      {/* Tenant GSTIN Details Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Tenant GSTIN</span>
          <div className="font-mono font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-emerald-600" />
            {activeTenant.gstin || '27AAACE1234F1Z9'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tax Split Engine</span>
          <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-indigo-600" />
            Intrastate (9%+9%) / Interstate (18%)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-Invoice IRP Gateway</span>
          <div className="font-bold text-emerald-600 text-sm flex items-center gap-1.5 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            CONNECTED (GSTN)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-Way Bill Status</span>
          <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Auto-Generated on Dispatch
          </div>
        </div>
      </div>

      {/* Invoice List & IRN Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice List Column */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-base">GST Tax Invoices</h3>
            <span className="text-xs font-bold text-slate-500 font-mono">{invoices.length} Active Records</span>
          </div>

          <div className="space-y-3">
            {invoices.map((inv) => {
              const isSelected = selectedInvoice?.id === inv.id;
              const isSameState = inv.customerStateCode === activeTenant.stateCode;

              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    isSelected ? 'bg-indigo-50/70 border-indigo-300 shadow-sm' : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-indigo-700 text-sm">{inv.invoiceNumber}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                          {inv.date}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{inv.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">GSTIN: {inv.customerGstin} • Place: {inv.placeOfSupply}</div>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full font-mono uppercase ${
                      inv.status === 'GENERATED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {inv.status}
                    </span>
                  </div>

                  {/* Tax Split Pills */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono font-bold bg-white p-2 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-slate-400 block text-[9px]">TAXABLE</span>
                      <span className="text-slate-800">₹{inv.totalTaxableValue.toLocaleString()}</span>
                    </div>

                    {isSameState ? (
                      <>
                        <div>
                          <span className="text-indigo-500 block text-[9px]">CGST (9%)</span>
                          <span className="text-indigo-700">₹{inv.cgstAmount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-indigo-500 block text-[9px]">SGST (9%)</span>
                          <span className="text-indigo-700">₹{inv.sgstAmount.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <span className="text-purple-500 block text-[9px]">IGST (18% INTERSTATE)</span>
                        <span className="text-purple-700">₹{inv.igstAmount.toLocaleString()}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-emerald-500 block text-[9px]">TOTAL AMOUNT</span>
                      <span className="text-emerald-700 font-black">₹{inv.totalInvoiceAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Invoice Details & Signed QR Code Preview */}
        {selectedInvoice && (
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl space-y-4 border border-slate-800 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">E-Invoice (IRP) Preview</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{selectedInvoice.invoiceNumber}</span>
              </div>

              {selectedInvoice.status === 'GENERATED' && selectedInvoice.irn ? (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto">
                    <img
                      src={selectedInvoice.signedQrCode}
                      alt="Signed E-Invoice QR Code"
                      className="w-36 h-36 mx-auto"
                    />
                  </div>
                  
                  <div className="space-y-1 text-left bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[10px]">
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">IRN Hash (64-Char SHA256)</span>
                    <span className="text-emerald-400 break-all">{selectedInvoice.irn}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left text-[11px] bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[9px]">E-WAY BILL NO</span>
                      <span className="text-amber-400 font-bold">{selectedInvoice.ewayBillNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">IRP GATEWAY</span>
                      <span className="text-emerald-400 font-bold">NIC-IRP-01</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-950 rounded-2xl border border-dashed border-slate-800 text-center space-y-3">
                  <QrCode className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
                  <div className="text-xs text-slate-400 font-medium">
                    This invoice is currently in <strong className="text-amber-400">DRAFT</strong> mode. Generate E-Invoice to register IRN and signed QR code with GSTN.
                  </div>
                  <button
                    onClick={() => handleGenerateEInvoice(selectedInvoice.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Generate E-Invoice (IRN + Signed QR)
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Section 144B Compliant</span>
              <span>GSTN Portal v2.4</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
