import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { QrCode, Barcode, Printer, Search, XCircle, CheckCircle2, Copy, Sparkles, Box, Check, Filter } from 'lucide-react';
import { InventoryItem } from '@/src/types';
import { useToast } from '@/src/contexts/ToastContext';
import { generateBarcodeSVGData } from '@/src/utils/barcode';

interface BarcodeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
}

export default function BarcodeStudioModal({ isOpen, onClose, inventory }: BarcodeStudioModalProps) {
  const { showToast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<string>(inventory[0]?.id || '');
  const [searchSKU, setSearchSKU] = useState('');
  const [batchCategory, setBatchCategory] = useState<string>('ALL');
  const [printMode, setPrintMode] = useState<'single' | 'batch'>('single');
  const [labelSize, setLabelSize] = useState<'50x25' | 'A4_grid'>('50x25');

  if (!isOpen) return null;

  const categories = Array.from(new Set(inventory.map((i) => i.category || 'General Components')));

  const selectedItem = inventory.find((i) => i.id === selectedItemId) || inventory[0];

  const filteredInventory = batchCategory === 'ALL'
    ? inventory
    : inventory.filter((i) => (i.category || 'General Components') === batchCategory);

  const handleSimulateScan = () => {
    const cleanSearch = searchSKU.trim().toLowerCase();
    const found = inventory.find(
      (i) =>
        i.id.toLowerCase().includes(cleanSearch) ||
        i.name.toLowerCase().includes(cleanSearch) ||
        (i.sku && i.sku.toLowerCase().includes(cleanSearch)) ||
        (i.barcode && i.barcode.toLowerCase().includes(cleanSearch))
    );

    if (found) {
      setSelectedItemId(found.id);
      showToast('success', `Barcode Matched: ${found.name}`, `SKU: ${found.sku || found.id} | Stock: ${found.stockQty} ${found.unit}`);
    } else {
      showToast('error', 'Barcode Not Found', 'No matching SKU, barcode, or component name.');
    }
  };

  const handlePrintLabel = () => {
    window.print();
    showToast('success', 'Sending Labels to Browser Printer', `Printing ${printMode === 'single' ? '1 label for ' + selectedItem.name : filteredInventory.length + ' labels'}`);
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 dark:border-slate-800 space-y-6 animate-scaleUp my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg">Barcode & QR Thermal Label Studio</h3>
              <p className="text-xs text-slate-500 font-medium">Generate vector Code-128 barcodes & printable thermal sticker sheets</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 cursor-pointer">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Search & Mode Controls */}
        <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-amber-400" /> Vector Code-128 Engine & Print Settings
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPrintMode('single')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printMode === 'single' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Single Item
              </button>
              <button
                onClick={() => setPrintMode('batch')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printMode === 'batch' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Batch Print ({filteredInventory.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU or Barcode to select item..."
                value={searchSKU}
                onChange={(e) => setSearchSKU(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSimulateScan()}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <button
              onClick={handleSimulateScan}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-md shrink-0"
            >
              Find SKU
            </button>
          </div>
        </div>

        {/* Single Mode View */}
        {printMode === 'single' && selectedItem && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Item Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Select Item to Print Label</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku || item.barcode || item.id}) - Qty: {item.stockQty}
                  </option>
                ))}
              </select>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>SKU / Barcode:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedItem.barcode || selectedItem.sku || selectedItem.id}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Bin Location:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedItem.binLocation || 'Rack A - Bin 1'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Base Price:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">${selectedItem.basePrice || 0}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Available Stock:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedItem.stockQty} {selectedItem.unit}</span>
                </div>
              </div>
            </div>

            {/* Live Rendered Thermal Label Card */}
            <div className="bg-white dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-3 shadow-inner">
              <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">ThermaPrint™ Label 50mm x 25mm</div>
              
              <div className="bg-white text-slate-900 border-2 border-slate-900 p-3.5 rounded-xl space-y-1.5 w-full max-w-[240px] shadow-md">
                <div className="font-black text-xs truncate uppercase tracking-tight text-slate-950">{selectedItem.name}</div>
                <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-700 border-b border-slate-200 pb-1">
                  <span>BIN: {selectedItem.binLocation || 'RACK-A1'}</span>
                  <span>${selectedItem.basePrice || 0}</span>
                </div>
                
                {/* SVG Code 128 Barcode Rendering */}
                {(() => {
                  const barcodeData = generateBarcodeSVGData(selectedItem.barcode || selectedItem.sku || selectedItem.id);
                  return (
                    <div className="py-1.5 flex flex-col items-center justify-center">
                      <svg viewBox={`0 0 ${barcodeData.width} 40`} className="h-10 w-full max-w-[190px]">
                        {barcodeData.bars.map((bar, idx) => (
                          <rect key={idx} x={bar.x} y={0} width={bar.width} height={40} fill="#0f172a" />
                        ))}
                      </svg>
                    </div>
                  );
                })()}

                <div className="text-[9px] font-mono font-black tracking-widest text-slate-950">
                  {selectedItem.barcode || selectedItem.sku || selectedItem.id}
                </div>
              </div>

              <button
                onClick={handlePrintLabel}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-white" /> Print Thermal Sticker
              </button>
            </div>
          </div>
        )}

        {/* Batch Print Mode Grid */}
        {printMode === 'batch' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Category:</span>
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100"
                >
                  <option value="ALL">All Categories ({inventory.length})</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} ({inventory.filter((i) => (i.category || 'General Components') === cat).length})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePrintLabel}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Sheet ({filteredInventory.length} Labels)
              </button>
            </div>

            {/* Batch Label Sheet Preview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
              {filteredInventory.map((item) => {
                const code = item.barcode || item.sku || item.id;
                const barcodeData = generateBarcodeSVGData(code);
                return (
                  <div key={item.id} className="bg-white text-slate-900 border border-slate-300 p-2 rounded-xl text-center space-y-1 shadow-xs">
                    <div className="font-bold text-[10px] truncate">{item.name}</div>
                    <div className="text-[8px] font-mono text-slate-600">BIN: {item.binLocation || 'A-01'}</div>
                    <svg viewBox={`0 0 ${barcodeData.width} 30`} className="h-6 w-full">
                      {barcodeData.bars.map((bar, idx) => (
                        <rect key={idx} x={bar.x} y={0} width={bar.width} height={30} fill="#0f172a" />
                      ))}
                    </svg>
                    <div className="text-[8px] font-mono font-bold">{code}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
