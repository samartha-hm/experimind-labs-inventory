import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  QrCode,
  Barcode,
  Printer,
  Search,
  XCircle,
  CheckCircle2,
  Copy,
  Sparkles,
  Box,
  Check,
  Filter,
  Download,
  FileText,
  Layers,
  MapPin,
  CheckSquare,
  Square
} from 'lucide-react';
import { InventoryItem } from '@/src/types';
import { useToast } from '@/src/contexts/ToastContext';
import BarcodeSvg from './BarcodeSvg';
import { generatePdfLabelSheet, LabelSheetFormat } from '@/src/utils/pdfLabelGenerator';

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
  const [sheetFormat, setSheetFormat] = useState<LabelSheetFormat>('a4_24');
  const [copiesPerItem, setCopiesPerItem] = useState<number>(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Batch Multi-Select State
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set(inventory.slice(0, 24).map(i => i.id)));

  if (!isOpen) return null;

  const categories = Array.from(new Set(inventory.map((i) => i.category || 'General Components')));
  const selectedItem = inventory.find((i) => i.id === selectedItemId) || inventory[0];

  const filteredInventory = inventory.filter((item) => {
    const matchesCat = batchCategory === 'ALL' || (item.category || 'General Components') === batchCategory;
    const matchesSearch = !searchSKU ||
      item.name.toLowerCase().includes(searchSKU.toLowerCase()) ||
      item.id.toLowerCase().includes(searchSKU.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchSKU.toLowerCase())) ||
      (item.barcode && item.barcode.toLowerCase().includes(searchSKU.toLowerCase())) ||
      (item.binLocation && item.binLocation.toLowerCase().includes(searchSKU.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedItemIds(new Set(filteredInventory.map(i => i.id)));
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  // Get array of selected items for batch operations
  const itemsToPrint = useMemo(() => {
    if (printMode === 'single' && selectedItem) return [selectedItem];
    return inventory.filter(i => selectedItemIds.has(i.id));
  }, [printMode, selectedItem, inventory, selectedItemIds]);

  const handleDownloadPdf = async () => {
    if (itemsToPrint.length === 0) {
      showToast('error', 'No Items Selected', 'Please select at least one item to generate label sheet.');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      await generatePdfLabelSheet(itemsToPrint, sheetFormat, copiesPerItem);
      showToast('success', 'PDF Label Sheet Generated', `Exported ${itemsToPrint.length * copiesPerItem} label(s)`);
    } catch (err) {
      console.error(err);
      showToast('error', 'PDF Export Failed', 'Could not build PDF sheet.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
    showToast('success', 'Sending to Printer', `Printing ${itemsToPrint.length * copiesPerItem} label(s)`);
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200 dark:border-slate-800 space-y-6 animate-scaleUp my-8 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-lg">
                Barcode & Thermal Label Studio
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                High-resolution ISO/IEC Code-128 barcodes with physical storage location details.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 cursor-pointer">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Top Controls Toolbar */}
        <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-amber-400" /> Label Sheet Template & Print Settings
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPrintMode('single')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printMode === 'single' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Single Item
              </button>
              <button
                onClick={() => setPrintMode('batch')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printMode === 'batch' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Batch Sheets ({itemsToPrint.length} Selected)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Sheet Format Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Label Format
              </label>
              <select
                value={sheetFormat}
                onChange={(e) => setSheetFormat(e.target.value as LabelSheetFormat)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
              >
                <option value="a4_24">A4 Sheet (24-up / Avery 5160 - 70x37mm)</option>
                <option value="a4_40">A4 Compact Sheet (40-up / 48x25mm)</option>
                <option value="thermal_50x25">Thermal Roll (50mm x 25mm)</option>
                <option value="thermal_70x35">Large Thermal Sticker (70mm x 35mm)</option>
              </select>
            </div>

            {/* Copies Per Item */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Copies per Item
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={copiesPerItem}
                onChange={(e) => setCopiesPerItem(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Filter Items
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter name, SKU, or bin..."
                  value={searchSKU}
                  onChange={(e) => setSearchSKU(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SINGLE MODE PREVIEW */}
        {/* ========================================================================= */}
        {printMode === 'single' && selectedItem && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {/* Item Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Select Item to Print</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.barcode || item.sku || `EL-${item.id}`}) — Loc: {item.binLocation || 'Rack - Shelf 1'}
                  </option>
                ))}
              </select>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Part Barcode / SKU:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedItem.barcode || selectedItem.sku || `EL-${selectedItem.id}`}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Storage Location:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedItem.binLocation || 'Rack - Shelf 1'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Category:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedItem.category || 'General'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Available Stock:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedItem.stockQty} {selectedItem.unit}</span>
                </div>
              </div>
            </div>

            {/* LIVE RENDERED THERMAL STICKER PREVIEW (LARGE BARCODE, NO PRICE, WITH LOCATION) */}
            <div className="bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
              <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">
                Sticker Preview (High-Res Code-128)
              </div>

              {/* Physical Sticker Card: Large Barcode, Storage Location, No Price */}
              <div className="bg-white text-slate-950 border-2 border-slate-900 p-4 rounded-xl space-y-2 w-full max-w-[280px] shadow-xl">
                {/* Part Name */}
                <div className="font-black text-xs truncate uppercase tracking-tight text-slate-950 text-center">
                  {selectedItem.name}
                </div>

                {/* Storage Location Details (Prominent) */}
                <div className="flex items-center justify-center gap-1 text-[10px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200/80 rounded-md py-0.5 px-2">
                  <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">LOC: {selectedItem.binLocation || 'Rack - Shelf 1'}</span>
                </div>

                {/* Significantly Larger Barcode Vector (55px height, width 2.2) */}
                <div className="py-2 flex flex-col items-center justify-center bg-white">
                  <BarcodeSvg
                    value={selectedItem.barcode || selectedItem.sku || `EL-${selectedItem.id}`}
                    format="CODE128"
                    width={2.2}
                    height={55}
                    displayValue={false}
                    className="h-14 w-auto max-w-[240px]"
                  />
                </div>

                {/* Barcode Number Code */}
                <div className="text-[11px] font-mono font-black tracking-widest text-slate-950 text-center border-t border-slate-200 pt-1">
                  {selectedItem.barcode || selectedItem.sku || `EL-${selectedItem.id}`}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full max-w-[280px]">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-amber-400" /> Export PDF
                </button>
                <button
                  onClick={handleBrowserPrint}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BATCH SELECT & PRINT MODE */}
        {/* ========================================================================= */}
        {printMode === 'batch' && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {/* Category Filter & Selection Counter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Category:</span>
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

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAllFiltered}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Select All ({filteredInventory.length})
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Selection Grid Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1 custom-scrollbar">
              {filteredInventory.map((item) => {
                const code = item.barcode || item.sku || `EL-${item.id}`;
                const isSelected = selectedItemIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelectItem(item.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 select-none ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{item.name}</span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                        {item.category}
                      </span>
                    </div>

                    {/* Location Badge (No price) */}
                    <div className="flex items-center gap-1 text-[10px] font-mono text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                      <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">{item.binLocation || 'Rack - Shelf 1'}</span>
                    </div>

                    {/* Large Code-128 Barcode */}
                    <div className="flex justify-center bg-white p-1 rounded-lg border border-slate-100">
                      <BarcodeSvg
                        value={code}
                        format="CODE128"
                        width={1.6}
                        height={38}
                        displayValue={false}
                        className="h-9 w-auto max-w-[170px]"
                      />
                    </div>

                    <div className="text-center font-mono text-[10px] font-bold text-slate-900 dark:text-white">
                      {code}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Batch Action Bar */}
            <div className="p-4 bg-slate-900 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <strong className="text-sm text-white block">
                  Ready to print {selectedItemIds.size * copiesPerItem} sticker labels
                </strong>
                <span className="text-xs text-slate-400">
                  Format: {sheetFormat === 'a4_24' ? 'A4 24-up (Avery 5160 / 3x8 Grid)' : sheetFormat === 'a4_40' ? 'A4 40-up (4x10 Grid)' : 'Continuous Thermal Roll'}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf || selectedItemIds.size === 0}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" /> Download PDF Sheet
                </button>
                <button
                  onClick={handleBrowserPrint}
                  disabled={selectedItemIds.size === 0}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" /> Direct Print
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
