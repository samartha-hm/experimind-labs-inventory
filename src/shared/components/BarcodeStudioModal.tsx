import React, { useState } from 'react';
import { QrCode, Barcode, Printer, Search, XCircle, CheckCircle2, Copy, Sparkles, Box } from 'lucide-react';
import { InventoryItem } from '@/src/types';
import { useToast } from '@/src/contexts/ToastContext';

interface BarcodeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
}

export default function BarcodeStudioModal({ isOpen, onClose, inventory }: BarcodeStudioModalProps) {
  const { showToast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<string>(inventory[0]?.id || '');
  const [searchSKU, setSearchSKU] = useState('');
  const [scannedResult, setScannedResult] = useState<InventoryItem | null>(null);

  if (!isOpen) return null;

  const selectedItem = inventory.find(i => i.id === selectedItemId) || inventory[0];

  const handleSimulateScan = () => {
    const found = inventory.find(i => 
      i.id.toLowerCase().includes(searchSKU.toLowerCase()) || 
      i.name.toLowerCase().includes(searchSKU.toLowerCase()) ||
      (i.barcode && i.barcode.includes(searchSKU))
    );

    if (found) {
      setScannedResult(found);
      setSelectedItemId(found.id);
      showToast('success', `Barcode Matched: ${found.name}`, `SKU: ${found.id} | Qty: ${found.stockQty}`);
    } else {
      showToast('error', 'Barcode Not Found', 'No matching SKU or component found.');
    }
  };

  const handlePrintLabel = () => {
    showToast('success', 'Sending Label to Thermal Barcode Printer', `Printed SKU Label for ${selectedItem.name}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 space-y-6 animate-scaleUp">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-indigo-100 rounded-2xl text-indigo-600">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">Barcode & QR Label Studio</h3>
              <p className="text-xs text-slate-500 font-medium">Generate, preview, and print high-density SKU barcodes</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 cursor-pointer">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Barcode Scanner Search */}
        <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-3">
          <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
            <Barcode className="w-4 h-4 text-amber-400" /> Optical Barcode & QR Scanner Simulator
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Scan barcode or enter SKU code (e.g. inv_item_8829)..."
                value={searchSKU}
                onChange={(e) => setSearchSKU(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSimulateScan()}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <button
              onClick={handleSimulateScan}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md shrink-0"
            >
              Simulate Scan
            </button>
          </div>
        </div>

        {/* Component Selector & Label Preview Grid */}
        {selectedItem && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Component Picker */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Select Inventory SKU</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.id}) - Qty: {item.stockQty}
                  </option>
                ))}
              </select>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>SKU ID:</span>
                  <span className="font-mono font-bold text-indigo-600">{selectedItem.id}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Bin Location:</span>
                  <span className="font-medium text-slate-800">{selectedItem.binLocation || 'Bin A-01'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Stock Available:</span>
                  <span className="font-bold text-slate-800">{selectedItem.stockQty} {selectedItem.unit}</span>
                </div>
              </div>
            </div>

            {/* Generated Label Preview Card */}
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-3 shadow-inner">
              <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">ThermaPrint™ Label 50mm x 25mm</div>
              
              <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1 w-full max-w-[200px]">
                <div className="font-black text-xs truncate">{selectedItem.name}</div>
                <div className="text-[9px] font-mono text-indigo-300">BIN: {selectedItem.binLocation || 'A-01'}</div>
                
                {/* Simulated Barcode Lines */}
                <div className="py-2 flex items-center justify-center gap-0.5 opacity-90">
                  {[4,2,5,1,3,6,2,4,1,5,3,2,6,1,4,2,5,3].map((h, idx) => (
                    <div key={idx} className="bg-white rounded-xs" style={{ width: '3px', height: `${h * 4 + 10}px` }}></div>
                  ))}
                </div>

                <div className="text-[8px] font-mono tracking-widest text-slate-400">{selectedItem.id.toUpperCase()}</div>
              </div>

              <button
                onClick={handlePrintLabel}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" /> Print Thermal Label
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
