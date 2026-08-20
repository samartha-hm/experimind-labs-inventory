import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Camera,
  X,
  Plus,
  Minus,
  Zap,
  Volume2,
  VolumeX,
  Repeat,
  CheckCircle2,
  AlertCircle,
  Barcode,
  Search,
  Check
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { InventoryItem } from '@/src/types';
import { playScanBeep, useBarcodeGunListener } from '@/src/utils/barcode';

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
  const [continuousMode, setContinuousMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // USB/HID Barcode Gun listener
  useBarcodeGunListener(
    (code) => {
      handleBarcodeScan(code);
    },
    isOpen
  );

  const initCameraStream = async () => {
    try {
      let s: MediaStream;
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch (_) {
        s = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
        setCameraActive(true);
      }
    } catch (err) {
      console.warn("Camera feed unavailable or access denied:", err);
      setCameraActive(false);
    }
  };

  // Camera video stream & live decoding loop
  useEffect(() => {
    let animId: number | null = null;

    if (isOpen) {
      initCameraStream();

      // Browser native BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a']
          });

          const detectFrame = async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const detectedCode = barcodes[0].rawValue;
                  if (detectedCode) {
                    handleBarcodeScan(detectedCode);
                  }
                }
              } catch (_) {}
            }
            animId = requestAnimationFrame(detectFrame);
          };
          animId = requestAnimationFrame(detectFrame);
        } catch (_) {}
      }
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBarcodeScan = (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim().toUpperCase();
    if (!cleanCode) return;

    // Search inventory by barcode, SKU, ID, or Name
    const match = inventory.find(
      (item) =>
        (item.barcode && item.barcode.toUpperCase() === cleanCode) ||
        (item.sku && item.sku.toUpperCase() === cleanCode) ||
        item.id.toUpperCase() === cleanCode ||
        item.name.toUpperCase().includes(cleanCode)
    );

    if (match) {
      setScannedItem(match);
      setLastScannedCode(cleanCode);

      setScanHistory((prev) => [
        { code: cleanCode, name: match.name, timestamp: new Date().toLocaleTimeString() },
        ...prev.filter((h) => h.code !== cleanCode).slice(0, 5),
      ]);

      if (soundEnabled) {
        playScanBeep('success');
      }

      if (continuousMode) {
        // In continuous mode, auto-increment item quantity by 1
        const newQty = match.stockQty + 1;
        updateInventoryItem(match.id, { stockQty: newQty });
        showToast('success', '⚡ Continuous Scan Mode (+1)', `Incremented ${match.name} to ${newQty} ${match.unit}`);
      } else {
        showToast('success', 'Barcode Matched!', `Found item: ${match.name} (Qty: ${match.stockQty})`);
      }
    } else {
      setScannedItem(null);
      if (soundEnabled) {
        playScanBeep('error');
      }
      showToast('error', 'Barcode Not Found', `No item matching barcode "${cleanCode}" in master inventory.`);
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide">WebCam & HID Barcode Scanner</h3>
              <p className="text-[10px] text-slate-400 font-mono">USB Barcode Gun Listener Active</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Audio Sound */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Scan Sound' : 'Enable Scan Sound'}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                soundEnabled ? 'bg-slate-800 text-amber-400' : 'bg-slate-900 text-slate-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Toggle Continuous Mode */}
            <button
              onClick={() => setContinuousMode(!continuousMode)}
              title="Continuous Multi-Scan Mode (Auto +1 Stock)"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                continuousMode
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              {continuousMode ? 'Multi-Scan ON' : 'Single'}
            </button>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {/* Camera Viewport & Scan Laser */}
          <div className="relative w-full h-56 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover opacity-90 ${cameraActive ? '' : 'hidden'}`}
            />
            {!cameraActive && (
              <div className="text-center space-y-2 text-slate-500 p-4">
                <Camera className="w-10 h-10 mx-auto text-indigo-400 animate-bounce" />
                <p className="text-xs font-semibold text-slate-300">Point Barcode / USB Scanner Gun at Reader</p>
                <button
                  type="button"
                  onClick={() => initCameraStream()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  📷 Enable WebCam Stream
                </button>
              </div>
            )}

            {/* Pulsing Laser Scan Line */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-lg shadow-rose-500/80 animate-pulse pointer-events-none" />

            {/* Framing Box */}
            <div className="absolute inset-10 border-2 border-dashed border-indigo-400/60 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="text-[10px] font-mono text-indigo-300 bg-slate-950/80 px-2.5 py-1 rounded-md">
                ALIGN BARCODE OR USE USB GUN SCANNER
              </span>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBarcodeScan(manualCode);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Scan or enter Barcode/SKU string (e.g. EL-1, EL-2, EL-10)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Zap className="w-4 h-4" /> Scan
            </button>
          </form>

          {/* Quick Demo Scan Barcode Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="font-bold text-slate-400 uppercase">Quick Barcode Samples:</span>
            {inventory.slice(0, 6).map((item) => {
              const code = item.barcode || item.sku || `EL-${item.id}`;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setManualCode(code);
                    handleBarcodeScan(code);
                  }}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  {code}
                </button>
              );
            })}
          </div>

          {/* Scanned Item Result Card */}
          {scannedItem && (
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {scannedItem.category || 'General'}
                  </span>
                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm">{scannedItem.name}</h4>
                  <div className="text-[10px] font-mono text-slate-500">
                    SKU: {scannedItem.sku || scannedItem.id} • Barcode: {scannedItem.barcode || scannedItem.sku || 'N/A'} • Bin: {scannedItem.binLocation || 'A-01'}
                  </div>
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
                    className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(1)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add 1 Unit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recent Scan History */}
          {scanHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Scan Session:</span>
              <div className="space-y-1">
                {scanHistory.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{h.code}</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[220px]">{h.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{h.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
