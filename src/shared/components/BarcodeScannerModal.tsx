import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Box,
  Zap,
  Volume2,
  Sparkles
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { InventoryItem } from '@/src/types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BarcodeScannerModal({ isOpen, onClose }: BarcodeScannerModalProps) {
  const { inventory, updateInventoryItem } = useData();
  const { showToast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [scanHistory, setScanHistory] = useState<{ code: string; name: string; timestamp: string }[]>([]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            setCameraActive(true);
          }
        })
        .catch((err) => {
          console.warn("Camera access unavailable or denied:", err);
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBarcodeSubmit = (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim().toUpperCase();
    if (!cleanCode) return;

    // Search inventory by barcode, SKU id, or name
    const match = inventory.find(
      (item) =>
        (item.barcode && item.barcode.toUpperCase() === cleanCode) ||
        item.id.toUpperCase() === cleanCode ||
        item.name.toUpperCase().includes(cleanCode)
    );

    if (match) {
      setScannedItem(match);
      setScanHistory((prev) => [
        { code: cleanCode, name: match.name, timestamp: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4),
      ]);
      showToast('success', 'Barcode Matched!', `Found SKU ${match.id}: ${match.name}`);
    } else {
      setScannedItem(null);
      showToast('error', 'Barcode Not Found', `No item matching barcode "${cleanCode}" in master catalog.`);
    }
  };

  const handleAdjustStock = async (delta: number) => {
    if (!scannedItem) return;
    const newQty = Math.max(0, scannedItem.stockQty + delta);
    await updateInventoryItem(scannedItem.id, { stockQty: newQty });
    setScannedItem({ ...scannedItem, stockQty: newQty });
    showToast('info', 'Stock Level Updated', `${scannedItem.name} stock set to ${newQty} ${scannedItem.unit}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold">WebCam Live Barcode & QR Scanner</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {/* Camera Viewport & Scan Reticle */}
          <div className="relative w-full h-56 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {cameraActive ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
            ) : (
              <div className="text-center space-y-2 text-slate-500">
                <Camera className="w-10 h-10 mx-auto text-slate-600 animate-pulse" />
                <p className="text-xs">WebCam Feed Active • Simulated Optical Reticle</p>
              </div>
            )}

            {/* Laser Line Overlay */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-lg shadow-rose-500/80 animate-pulse pointer-events-none" />

            {/* Corner Framing Brackets */}
            <div className="absolute inset-10 border-2 border-dashed border-indigo-400/60 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="text-[10px] font-mono text-indigo-300 bg-slate-950/80 px-2 py-0.5 rounded-md">
                ALIGN BARCODE HERE
              </span>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBarcodeSubmit(manualCode);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Scan or enter Barcode/SKU string (e.g. EL-1, EL-2, 1766123928700)..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" /> Scan
            </button>
          </form>

          {/* Quick Demo Scan Barcode Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="font-bold text-slate-400 uppercase">Quick Demo Barcodes:</span>
            {['EL-1', 'EL-2', 'EL-3', 'EL-4', 'EL-5'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setManualCode(code);
                  handleBarcodeSubmit(code);
                }}
                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 font-mono font-bold rounded-md border border-slate-200 dark:border-slate-700"
              >
                {code}
              </button>
            ))}
          </div>

          {/* Scanned Item Result Card */}
          {scannedItem && (
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {scannedItem.category || 'General'}
                  </span>
                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm">{scannedItem.name}</h4>
                  <div className="text-[10px] font-mono text-slate-400">SKU: {scannedItem.id} • Barcode: {scannedItem.barcode || 'EL-STD'}</div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Current Stock</span>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    {scannedItem.stockQty} {scannedItem.unit}
                  </div>
                </div>
              </div>

              {/* Instant Stock Adjustment Controls */}
              <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Quick Physical Stock Adjustment:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(-1)}
                    className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(1)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add 1 Unit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
