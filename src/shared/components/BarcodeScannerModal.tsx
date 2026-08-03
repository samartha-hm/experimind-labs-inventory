import React, { useState } from 'react';
import { QrCode, Camera, X, Search, CheckCircle2, AlertCircle, Box } from 'lucide-react';
import { InventoryItem } from '@/src/types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onSelectItem: (item: InventoryItem) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  inventory,
  onSelectItem,
}: BarcodeScannerModalProps) {
  const [scannedCode, setScannedCode] = useState('');
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);
  const [matchedItem, setMatchedItem] = useState<InventoryItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedCode.trim()) return;

    const code = scannedCode.trim().toLowerCase();
    const found = inventory.find(
      (item) =>
        (item.barcode && item.barcode.toLowerCase() === code) ||
        item.id.toLowerCase() === code ||
        `el-${item.id}`.toLowerCase() === code ||
        item.name.toLowerCase().includes(code)
    );

    if (found) {
      setMatchedItem(found);
      setErrorMsg(null);
    } else {
      setMatchedItem(null);
      setErrorMsg(`No component found matching barcode/SKU: "${scannedCode}"`);
    }
  };

  const handleSimulateCameraScan = () => {
    setIsSimulatingCamera(true);
    setErrorMsg(null);
    setMatchedItem(null);

    setTimeout(() => {
      // Pick a random item with barcode
      const itemsWithBarcode = inventory.filter((i) => i.barcode);
      const target = itemsWithBarcode.length > 0
        ? itemsWithBarcode[Math.floor(Math.random() * itemsWithBarcode.length)]
        : inventory[0];

      if (target) {
        setScannedCode(target.barcode || target.id);
        setMatchedItem(target);
      }
      setIsSimulatingCamera(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden space-y-4">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold tracking-tight">Barcode & QR Code Scanner</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Camera Scanner Viewfinder Simulation */}
          <div className="w-full h-48 bg-slate-950 rounded-2xl border-2 border-dashed border-indigo-500/50 flex flex-col items-center justify-center relative overflow-hidden group">
            {isSimulatingCamera ? (
              <div className="text-center space-y-2 animate-pulse">
                <Camera className="w-8 h-8 text-indigo-400 mx-auto animate-bounce" />
                <span className="text-xs font-mono font-bold text-indigo-300">Scanning Barcode Stream...</span>
                <div className="w-32 h-1 bg-indigo-500 mx-auto rounded-full" />
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400 font-medium">Position barcode in viewfinder</p>
                <button
                  type="button"
                  onClick={handleSimulateCameraScan}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Trigger Camera Auto-Scan
                </button>
              </div>
            )}
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleScanSubmit} className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Or Type Barcode / SKU ID (e.g. EL-1, EL-2):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter EL-1, EL-2, or barcode..."
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Lookup
              </button>
            </div>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Matched Component Card */}
          {matchedItem && (
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Barcode Match Identified!</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-indigo-200 flex items-center justify-center shrink-0">
                  <Box className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{matchedItem.name}</h4>
                  <div className="text-[10px] text-indigo-700 font-mono">
                    Barcode: {matchedItem.barcode || 'EL-0'} &bull; Stock: {matchedItem.stockQty} {matchedItem.unit}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectItem(matchedItem);
                  onClose();
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                Open Component Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
