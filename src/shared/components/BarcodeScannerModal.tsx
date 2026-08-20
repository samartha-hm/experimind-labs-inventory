import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  QrCode,
  Camera,
  X,
  Plus,
  Minus,
  Volume2,
  VolumeX,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Search,
  Check,
  Package,
  Layers,
  MapPin,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  ArrowRight,
  UploadCloud,
  Zap,
  Info,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { InventoryItem } from '@/src/types';
import { playScanBeep, useBarcodeGunListener } from '@/src/utils/barcode';

export type ScanOperationMode = 'inspect' | 'inbound' | 'outbound' | 'batch' | 'relocate';

interface BatchScanItem {
  code: string;
  itemId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  timestamp: string;
}

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: ScanOperationMode;
}

const QUICK_BARCODES = ['EL-1', 'EL-2', 'EL-3', 'EL-4', 'EL-5', 'EL-6', 'EL-7', 'EL-8', 'EL-9', 'EL-10'];

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  initialMode = 'inspect'
}: BarcodeScannerModalProps) {
  const { inventory, kits = [], updateInventoryItem, logTransaction } = useData();
  const { showToast } = useToast();

  // Mode Selection
  const [activeMode, setActiveMode] = useState<ScanOperationMode>(initialMode);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const [customQtyStep, setCustomQtyStep] = useState<number>(1);

  // Scanner Hardware & Stream State
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Input & Scanned State
  const [manualCode, setManualCode] = useState('');
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [relocateBinTarget, setRelocateBinTarget] = useState<string>('');
  const [relocateStep, setRelocateStep] = useState<'scan_item' | 'scan_bin'>('scan_item');
  const [inboundNote, setInboundNote] = useState('');
  
  // Batch Multi-Scan Storage
  const [batchList, setBatchList] = useState<BatchScanItem[]>([]);
  const [recentScanLog, setRecentScanLog] = useState<{ code: string; name: string; time: string; success: boolean }[]>([]);

  // Hardware USB/HID Gun Scanner Listener
  useBarcodeGunListener(
    (barcode) => {
      handleCodeScanned(barcode);
    },
    isOpen
  );

  // Stop camera helper
  const stopCameraStream = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop();
        }
        await scannerInstanceRef.current.clear();
      } catch (_) {}
      scannerInstanceRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start Html5Qrcode Scanner
  const startCameraStream = async (cameraIdToUse?: string) => {
    setCameraError(null);
    try {
      await stopCameraStream();

      // Enumerate cameras if not already populated
      let targetCamId = cameraIdToUse || selectedCameraId;
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras.map(c => ({ id: c.id, label: c.label || `Camera ${c.id.slice(0, 5)}` })));
          if (!targetCamId) {
            // Prefer environment / back camera if on mobile, or first camera
            const backCam = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
            targetCamId = backCam ? backCam.id : cameras[0].id;
            setSelectedCameraId(targetCamId);
          }
        }
      } catch (camErr) {
        console.warn("Camera enumeration note:", camErr);
      }

      const scanner = new Html5Qrcode("html5-barcode-viewport", {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ]
      });

      scannerInstanceRef.current = scanner;

      const config = {
        fps: 25,
        qrbox: { width: 340, height: 160 },
        aspectRatio: 1.777778, // 16:9 widescreen
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      const cameraConstraint = targetCamId ? { deviceId: { exact: targetCamId } } : { facingMode: "environment" };

      await scanner.start(
        cameraConstraint,
        config,
        (decodedText) => {
          if (decodedText) {
            handleCodeScanned(decodedText);
          }
        },
        () => {
          // Frame not detected (silent polling)
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("Camera start failed, trying fallback constraints:", err);
      try {
        if (scannerInstanceRef.current) {
          await scannerInstanceRef.current.start(
            { facingMode: "user" },
            { fps: 20, qrbox: { width: 300, height: 150 } },
            (decodedText) => handleCodeScanned(decodedText),
            () => {}
          );
          setIsCameraActive(true);
          return;
        }
      } catch (fallbackErr: any) {
        setCameraError(fallbackErr.message || "Camera access permission denied or device busy.");
        setIsCameraActive(false);
      }
    }
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      // Delay camera start slightly for modal DOM mount
      const t = setTimeout(() => {
        startCameraStream();
      }, 150);
      return () => {
        clearTimeout(t);
        stopCameraStream();
      };
    } else {
      stopCameraStream();
      setScannedItem(null);
      setRelocateBinTarget('');
      setRelocateStep('scan_item');
    }
  }, [isOpen]);

  // Decode Image File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        const html5QrCode = new Html5Qrcode("html5-file-decoder-temp");
        const decodedText = await html5QrCode.scanFile(file, true);
        if (decodedText) {
          handleCodeScanned(decodedText);
        }
        await html5QrCode.clear();
      } catch (err: any) {
        showToast('error', 'Barcode Scan Failed', 'Could not decode a clear barcode from the uploaded image.');
      }
    }
  };

  // Find matching catalog item by exact barcode, SKU, or ID
  const findItemByCode = (code: string): InventoryItem | undefined => {
    const clean = code.trim().toLowerCase();
    return inventory.find((item) => {
      const itemBarcode = (item.barcode || '').trim().toLowerCase();
      const itemSku = (item.sku || '').trim().toLowerCase();
      const itemId = (item.id || '').trim().toLowerCase();
      const rawNum = itemBarcode.replace('el-', '');
      const cleanNum = clean.replace('el-', '');

      return (
        itemBarcode === clean ||
        itemSku === clean ||
        itemId === clean ||
        (cleanNum && rawNum === cleanNum) ||
        (item.barcode && item.barcode.toLowerCase() === `el-${clean}`)
      );
    });
  };

  // Main Barcode Processing Pipeline
  const handleCodeScanned = async (rawCode: string) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    // Relocate Mode Step 2: Bin scan
    if (activeMode === 'relocate' && relocateStep === 'scan_bin' && scannedItem) {
      await handleExecuteBinRelocation(scannedItem.id, cleanCode);
      return;
    }

    const matchedItem = findItemByCode(cleanCode);

    if (matchedItem) {
      setScannedItem(matchedItem);
      if (soundEnabled) playScanBeep('match');

      // Append to Recent Scans
      setRecentScanLog(prev => [
        { code: cleanCode, name: matchedItem.name, time: new Date().toLocaleTimeString(), success: true },
        ...prev.slice(0, 19)
      ]);

      // Mode-specific Automatic Execution
      if (activeMode === 'inbound') {
        const delta = Math.max(1, customQtyStep);
        await handleAdjustStock(matchedItem, delta, 'Inbound scan receipt');
      } else if (activeMode === 'outbound') {
        const delta = -Math.max(1, customQtyStep);
        await handleAdjustStock(matchedItem, delta, 'Outbound scan dispatch');
      } else if (activeMode === 'batch') {
        handleAddToBatch(matchedItem, Math.max(1, customQtyStep));
      } else if (activeMode === 'relocate') {
        setRelocateStep('scan_bin');
        showToast('info', 'Item Identified', `Now scan or select target Bin location for "${matchedItem.name}"`);
      } else {
        // Inspect Mode
        showToast('success', 'Component Identified', `${matchedItem.name} (Barcode: ${matchedItem.barcode || matchedItem.id})`);
      }
    } else {
      setScannedItem(null);
      if (soundEnabled) playScanBeep('error');
      setRecentScanLog(prev => [
        { code: cleanCode, name: 'Unrecognized Barcode', time: new Date().toLocaleTimeString(), success: false },
        ...prev.slice(0, 19)
      ]);
      showToast('error', 'Barcode Not In Catalog', `No component matches "${cleanCode}".`);
    }
  };

  // Stock Adjustment Execution
  const handleAdjustStock = async (item: InventoryItem, delta: number, noteReason?: string) => {
    const oldQty = item.stockQty;
    const newQty = Math.max(0, oldQty + delta);
    
    await updateInventoryItem(item.id, { stockQty: newQty });
    setScannedItem(prev => (prev && prev.id === item.id ? { ...prev, stockQty: newQty } : prev));

    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: delta > 0 ? 'add_stock' : 'adjust',
      description: noteReason || (delta > 0 ? `Inbound +${delta} via Barcode Gun` : `Outbound ${delta} via Barcode Gun`),
      items: [{ componentId: item.id, componentName: item.name, qtyDiff: delta }],
      diffs: [{ field: 'stockQty', oldValue: oldQty, newValue: newQty }]
    });

    if (soundEnabled) playScanBeep('success');
    showToast(
      delta > 0 ? 'success' : 'info',
      delta > 0 ? 'Stock Received' : 'Stock Dispatched',
      `${item.name}: ${oldQty} → ${newQty} ${item.unit}`
    );
  };

  // Add Item to Batch Session
  const handleAddToBatch = (item: InventoryItem, qty: number) => {
    setBatchList(prev => {
      const idx = prev.findIndex(b => b.itemId === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty, timestamp: new Date().toLocaleTimeString() };
        return updated;
      }
      return [
        {
          code: item.barcode || `EL-${item.id}`,
          itemId: item.id,
          name: item.name,
          category: item.category,
          quantity: qty,
          unit: item.unit,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ];
    });
    if (soundEnabled) playScanBeep('click');
    showToast('info', 'Batch Added', `+${qty} ${item.name} queued in session`);
  };

  // Commit Batch Session to Database
  const handleCommitBatch = async () => {
    if (batchList.length === 0) return;
    for (const b of batchList) {
      const item = inventory.find(i => i.id === b.itemId);
      if (item) {
        await handleAdjustStock(item, b.quantity, `Batch Inbound Audit Scan (${b.quantity} ${b.unit})`);
      }
    }
    showToast('success', 'Batch Session Committed', `Updated ${batchList.length} component stock levels.`);
    setBatchList([]);
  };

  // Export Batch Session to CSV
  const handleExportBatchCSV = () => {
    if (batchList.length === 0) return;
    const rows = [
      ['Barcode', 'Item Name', 'Category', 'Quantity', 'Unit', 'Timestamp'],
      ...batchList.map(b => [b.code, b.name, b.category, b.quantity, b.unit, b.timestamp])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `barcode_batch_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bin Relocation Execution
  const handleExecuteBinRelocation = async (itemId: string, newBinCode: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    await updateInventoryItem(itemId, { binLocation: newBinCode });
    setScannedItem(prev => (prev ? { ...prev, binLocation: newBinCode } : prev));
    setRelocateStep('scan_item');
    setRelocateBinTarget('');

    await logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'adjust',
      description: `Relocated ${item.name} from "${item.binLocation || 'Unassigned'}" to "${newBinCode}" via Barcode Scanner`,
      items: [{ componentId: item.id, componentName: item.name, qtyDiff: 0 }],
      diffs: [{ field: 'binLocation', oldValue: item.binLocation || null, newValue: newBinCode }]
    });

    if (soundEnabled) playScanBeep('success');
    showToast('success', 'Location Updated', `Moved "${item.name}" to Bin "${newBinCode}"`);
  };

  // Parent composite kits requiring this part
  const parentKits = useMemo(() => {
    if (!scannedItem) return [];
    return kits.filter(k => (k.items || []).some(req => req.componentId === scannedItem.id));
  }, [scannedItem, kits]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-[9999] overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto relative">
        
        {/* Top Header Bar */}
        <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 rounded-2xl text-indigo-400 border border-indigo-500/40 shadow-inner">
              <QrCode className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-wide text-white">Universal Barcode & QR Scanner Hub</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold uppercase">
                  Hardware Gun Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">ZXing Engine • 1D Linear + 2D Matrix Live Decoder</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Audio Chime' : 'Enable Audio Chime'}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                soundEnabled ? 'bg-slate-800 text-amber-400' : 'bg-slate-900 text-slate-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Scanner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Operational Mode Navigation Tabs */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveMode('inspect')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeMode === 'inspect'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" /> 1. Inspect & Monitor
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('inbound')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeMode === 'inbound'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> 2. Inbound (+ Add Stock)
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('outbound')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeMode === 'outbound'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Minus className="w-3.5 h-3.5" /> 3. Outbound (- Deduct)
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('batch')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeMode === 'batch'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> 4. Batch Session {batchList.length > 0 && `(${batchList.length})`}
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('relocate')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeMode === 'relocate'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> 5. Bin Relocate
          </button>
        </div>

        {/* Main Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
          
          {/* Camera Viewport & Stream Status */}
          <div className="relative w-full h-56 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
            
            {/* Html5Qrcode Mounted DOM Container */}
            <div id="html5-barcode-viewport" className="w-full h-full object-cover" />
            <div id="html5-file-decoder-temp" className="hidden" />

            {/* Pulsing Laser Alignment Guide */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-lg shadow-rose-500/80 animate-pulse pointer-events-none z-10" />

            {/* Aiming Reticle Box */}
            <div className="absolute inset-x-12 inset-y-8 border-2 border-dashed border-indigo-400/70 rounded-xl pointer-events-none flex items-center justify-center z-10">
              <span className="text-[10px] font-mono text-indigo-200 bg-slate-950/85 px-3 py-1 rounded-md border border-indigo-500/40 uppercase tracking-wider">
                {activeMode === 'relocate' && relocateStep === 'scan_bin'
                  ? '🎯 SCAN DESTINATION BIN/SHELF'
                  : '🎯 ALIGN BARCODE / QR IN BOX'}
              </span>
            </div>

            {/* Top-Right Camera Switcher & Status */}
            {availableCameras.length > 1 && (
              <div className="absolute top-2 right-2 z-20">
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    startCameraStream(e.target.value);
                  }}
                  className="text-[10px] bg-slate-900/90 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
                >
                  {availableCameras.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Error or Start Button Overlay */}
            {!isCameraActive && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center space-y-3 z-30">
                <Camera className="w-10 h-10 text-indigo-400 animate-bounce" />
                <p className="text-xs font-semibold text-slate-300">
                  {cameraError || 'WebCam Stream Initializing...'}
                </p>
                <button
                  type="button"
                  onClick={() => startCameraStream()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Start / Reconnect Camera
                </button>
              </div>
            )}
          </div>

          {/* Manual Barcode Input & Image Upload Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCodeScanned(manualCode);
              }}
              className="relative flex-1"
            >
              <Barcode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Scan or enter Barcode/SKU string (e.g. EL-1, EL-2, EL-10)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full pl-10 pr-24 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono font-bold"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3 h-3" /> Lookup
              </button>
            </form>

            <label className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
              <UploadCloud className="w-4 h-4 text-indigo-500" />
              <span>Scan Photo</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Quick Barcode Demo Samples */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Quick Catalog Samples:</span>
              <span className="text-indigo-500 font-mono">Click to test instant match</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_BARCODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleCodeScanned(code)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-lg text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {/* MODE 1: INSPECT & MONITOR DETAILED PART CARD */}
          {scannedItem && activeMode === 'inspect' && (
            <div className="p-4 bg-white dark:bg-slate-800/90 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  {scannedItem.imageUrl ? (
                    <img
                      src={scannedItem.imageUrl}
                      alt={scannedItem.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-lg border border-indigo-200">
                      {scannedItem.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-base">{scannedItem.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {scannedItem.barcode || `EL-${scannedItem.id}`}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {scannedItem.category}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        Unit Price: <strong className="text-slate-900 dark:text-white font-mono">${(scannedItem.basePrice || 3.50).toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Available Stock</span>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {scannedItem.stockQty} <span className="text-xs font-normal text-slate-400">{scannedItem.unit}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${scannedItem.stockQty < scannedItem.threshold ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {scannedItem.stockQty < scannedItem.threshold ? '⚠️ Below Threshold' : '✓ Normal Level'}
                  </span>
                </div>
              </div>

              {/* Storage & Parent Kits Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/80 text-[11px]">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Storage Bin / Shelf:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{scannedItem.binLocation || 'Rack 1, Shelf A (Default)'}</strong>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700 flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-500 shrink-0" />
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Kit Assemblies Using Part:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {parentKits.length > 0 ? `${parentKits.length} Kits (${parentKits.map(k => k.name).slice(0, 2).join(', ')})` : 'Standalone Component'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Quick Actions in Inspect Mode */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500 font-medium">Quick Quantity Adjust:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(scannedItem, -1)}
                    disabled={scannedItem.stockQty <= 0}
                    className="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 text-rose-700 dark:text-rose-300 rounded-xl font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    <Minus className="w-3.5 h-3.5" /> -1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(scannedItem, 1)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> +1
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: INBOUND / STOCK RECEIVING PANEL */}
          {activeMode === 'inbound' && (
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Inbound Receiving Configuration
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-bold">Step Qty:</span>
                  <input
                    type="number"
                    min="1"
                    value={customQtyStep}
                    onChange={(e) => setCustomQtyStep(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 text-center py-1 px-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Every scanned barcode will automatically increment stock by <strong>+{customQtyStep} units</strong> and write an audited Inbound receiving transaction.
              </p>
            </div>
          )}

          {/* MODE 3: OUTBOUND / DISPATCH PANEL */}
          {activeMode === 'outbound' && (
            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-800 dark:text-rose-300 text-xs flex items-center gap-1.5">
                  <Minus className="w-4 h-4" /> Outbound Dispatch Configuration
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-bold">Step Qty:</span>
                  <input
                    type="number"
                    min="1"
                    value={customQtyStep}
                    onChange={(e) => setCustomQtyStep(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 text-center py-1 px-1 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400">
                Every scanned barcode will deduct <strong>-{customQtyStep} units</strong> with automatic safety limit warnings.
              </p>
            </div>
          )}

          {/* MODE 4: BATCH MULTI-SCAN SESSION TABLE */}
          {activeMode === 'batch' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Accumulated Batch Session ({batchList.length} items)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportBatchCSV}
                    disabled={batchList.length === 0}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-[11px] transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitBatch}
                    disabled={batchList.length === 0}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition-colors disabled:opacity-40 cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Commit All Batch ({batchList.reduce((sum, b) => sum + b.quantity, 0)} units)
                  </button>
                </div>
              </div>

              {batchList.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 text-xs">
                  Scan barcodes with the camera or USB gun to accumulate items into this batch session.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                  {batchList.map((b) => (
                    <div key={b.itemId} className="p-2.5 bg-white dark:bg-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{b.code}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{b.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                          +{b.quantity} {b.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBatchList(prev => prev.filter(x => x.itemId !== b.itemId))}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MODE 5: BIN RELOCATION PANEL */}
          {activeMode === 'relocate' && (
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-amber-900 dark:text-amber-300 text-xs">
                  {relocateStep === 'scan_item' ? 'Step 1: Scan Component Barcode' : `Step 2: Scan Target Bin for "${scannedItem?.name}"`}
                </span>
              </div>
              {relocateStep === 'scan_bin' && scannedItem && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter or scan target bin barcode (e.g. Rack 2, Shelf 3)..."
                    value={relocateBinTarget}
                    onChange={(e) => setRelocateBinTarget(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => handleExecuteBinRelocation(scannedItem.id, relocateBinTarget)}
                    disabled={!relocateBinTarget.trim()}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs disabled:opacity-40 cursor-pointer"
                  >
                    Confirm Move
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Recent Live Scan Session Feed */}
          {recentScanLog.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Scan Feed:</span>
              <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                {recentScanLog.map((s, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-xl text-[11px] ${
                      s.success ? 'bg-slate-50 dark:bg-slate-800/60' : 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{s.code}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[240px]">{s.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{s.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
