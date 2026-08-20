import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  QrCode,
  Camera,
  X,
  Plus,
  Minus,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Search,
  Check,
  Package,
  MapPin,
  FileSpreadsheet,
  Trash2,
  UploadCloud,
  RefreshCw,
  Boxes,
  Zap,
  Info,
  Sliders,
  DollarSign,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { InventoryItem } from '@/src/types';
import { playScanBeep, useBarcodeGunListener } from '@/src/utils/barcode';
import { scanCanvasOrImage, decodeBarcodeFromImageFile } from '@/src/utils/barcodeEngine';

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
const STEP_PRESETS = [1, 5, 10, 25, 50, 100];

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
  const [customQtyStep, setCustomQtyStep] = useState<number>(1);

  // Scanner Hardware & Stream State
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const isProcessingFrameRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<string>('');
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

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

  // Safely stop video stream and scanning loop
  const stopCameraStream = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsStartingCamera(false);
  }, []);

  // Find matching catalog item by exact barcode, SKU, or ID
  const findItemByCode = useCallback((code: string): InventoryItem | undefined => {
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
  }, [inventory]);

  // Main Barcode Processing Pipeline
  const handleCodeScanned = useCallback(async (rawCode: string) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    // Relocate Mode Step 2: Destination Bin scan
    if (activeMode === 'relocate' && relocateStep === 'scan_bin' && scannedItem) {
      await handleExecuteBinRelocation(scannedItem.id, cleanCode);
      return;
    }

    const matchedItem = findItemByCode(cleanCode);

    if (matchedItem) {
      setScannedItem(matchedItem);
      if (soundEnabled) playScanBeep('match');

      // Append to Recent Activity Feed
      setRecentScanLog(prev => [
        { code: cleanCode, name: matchedItem.name, time: new Date().toLocaleTimeString(), success: true },
        ...prev.slice(0, 19)
      ]);

      // Mode-specific Automatic Workflow Execution
      if (activeMode === 'inbound') {
        const delta = Math.max(1, customQtyStep);
        await handleAdjustStock(matchedItem, delta, inboundNote || `Inbound receipt (+${delta} ${matchedItem.unit}) via Barcode`);
      } else if (activeMode === 'outbound') {
        const delta = -Math.max(1, customQtyStep);
        await handleAdjustStock(matchedItem, delta, `Outbound dispatch (-${Math.abs(delta)} ${matchedItem.unit}) via Barcode`);
      } else if (activeMode === 'batch') {
        handleAddToBatch(matchedItem, Math.max(1, customQtyStep));
      } else if (activeMode === 'relocate') {
        setRelocateStep('scan_bin');
        showToast('info', 'Component Identified', `Step 2: Point at destination Bin barcode for "${matchedItem.name}"`);
      } else {
        // Inspect & Monitor Mode
        showToast('success', 'Component Matched', `${matchedItem.name} (Barcode: ${matchedItem.barcode || matchedItem.id})`);
      }
    } else {
      setScannedItem(null);
      if (soundEnabled) playScanBeep('error');
      setRecentScanLog(prev => [
        { code: cleanCode, name: 'Unrecognized Barcode', time: new Date().toLocaleTimeString(), success: false },
        ...prev.slice(0, 19)
      ]);
      showToast('error', 'Barcode Not Found', `No item matching "${cleanCode}" in master catalog.`);
    }
  }, [activeMode, relocateStep, scannedItem, findItemByCode, soundEnabled, customQtyStep, inboundNote]);

  // Start Camera Stream directly with native getUserMedia and custom frame grabber
  const startCameraStream = useCallback(async (deviceIdToUse?: string) => {
    if (!isOpen || !videoRef.current) return;
    setCameraError(null);
    setIsStartingCamera(true);

    try {
      stopCameraStream();

      // Enumerate available video inputs
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          setAvailableCameras(videoDevices);
          if (!deviceIdToUse && videoDevices.length > 0) {
            const backCam = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
            deviceIdToUse = backCam ? backCam.deviceId : videoDevices[0].deviceId;
            setSelectedCameraId(deviceIdToUse);
          }
        }
      } catch (devErr) {
        console.warn('Camera device listing note:', devErr);
      }

      const constraints: MediaStreamConstraints = {
        video: deviceIdToUse
          ? { deviceId: { exact: deviceIdToUse }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }

      setIsCameraActive(true);
      setIsStartingCamera(false);

      // Start custom frame grabber polling loop (120ms interval)
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || isProcessingFrameRef.current) return;
        isProcessingFrameRef.current = true;

        try {
          const video = videoRef.current;
          const w = video.videoWidth || 640;
          const h = video.videoHeight || 480;

          if (!frameCanvasRef.current) {
            frameCanvasRef.current = document.createElement('canvas');
          }
          const canvas = frameCanvasRef.current;
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const detectedCode = await scanCanvasOrImage(canvas);
            if (detectedCode && detectedCode !== lastScannedCodeRef.current) {
              lastScannedCodeRef.current = detectedCode;
              // Reset debounce after 1.5 seconds
              setTimeout(() => {
                lastScannedCodeRef.current = '';
              }, 1500);
              handleCodeScanned(detectedCode);
            }
          }
        } catch (_) {
          // Silent polling
        } finally {
          isProcessingFrameRef.current = false;
        }
      }, 120);

    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(err.message || 'Camera permission denied or camera device busy.');
      setIsCameraActive(false);
      setIsStartingCamera(false);
    }
  }, [isOpen, stopCameraStream, handleCodeScanned]);

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startCameraStream();
      }, 100);
      return () => {
        clearTimeout(timer);
        stopCameraStream();
      };
    } else {
      stopCameraStream();
      setScannedItem(null);
      setRelocateBinTarget('');
      setRelocateStep('scan_item');
    }
  }, [isOpen, startCameraStream, stopCameraStream]);

  // Decode Image File Upload using Multi-Pass Super Decoder
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsProcessingFile(true);

    try {
      const decodedText = await decodeBarcodeFromImageFile(file);
      if (decodedText) {
        showToast('success', 'Barcode Decoded From Photo', `Read Code: ${decodedText}`);
        handleCodeScanned(decodedText);
      } else {
        showToast('error', 'Barcode Not Detected', 'Could not decode barcode from this photo. Ensure the barcode is clear and in focus.');
      }
    } catch (err: any) {
      console.warn('File decode exception:', err);
      showToast('error', 'Decode Error', 'Failed to process image file.');
    } finally {
      setIsProcessingFile(false);
      if (e.target) e.target.value = '';
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
      description: noteReason || (delta > 0 ? `Inbound +${delta} via Barcode Scanner` : `Outbound ${delta} via Barcode Scanner`),
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
    showToast('info', 'Batch Queued', `+${qty} ${item.name} queued in session`);
  };

  // Commit Batch Session to Database
  const handleCommitBatch = async () => {
    if (batchList.length === 0) return;
    for (const b of batchList) {
      const item = inventory.find(i => i.id === b.itemId);
      if (item) {
        await handleAdjustStock(item, b.quantity, `Batch Audit Scan (${b.quantity} ${b.unit})`);
      }
    }
    showToast('success', 'Batch Session Committed', `Updated ${batchList.length} components in inventory.`);
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
    link.setAttribute('download', `inventory_batch_scan_${Date.now()}.csv`);
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
      description: `Relocated ${item.name} to Bin "${newBinCode}" via Barcode Scanner`,
      items: [{ componentId: item.id, componentName: item.name, qtyDiff: 0 }],
      diffs: [{ field: 'binLocation', oldValue: item.binLocation || null, newValue: newBinCode }]
    });

    if (soundEnabled) playScanBeep('success');
    showToast('success', 'Bin Location Updated', `Moved "${item.name}" to Bin "${newBinCode}"`);
  };

  // Parent composite kits requiring this part
  const parentKits = useMemo(() => {
    if (!scannedItem) return [];
    return kits.filter(k => (k.items || []).some(req => req.componentId === scannedItem.id));
  }, [scannedItem, kits]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-[9999] overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] my-auto relative">
        
        {/* Top Header Bar */}
        <div className="p-4 md:px-6 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm md:text-base font-black tracking-tight text-white">
                  Universal Barcode & QR Scanner Hub
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  USB Gun & Camera Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">ZXing Engine • Code 128 / Code 39 / EAN / UPC / QR</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Scan Sound' : 'Enable Scan Sound'}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                soundEnabled ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'
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

        {/* 5 Distinct Industrial Operation Modes (Styled Navigation) */}
        <div className="bg-slate-900/95 border-b border-slate-800 px-3 md:px-6 py-2.5 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
          
          {/* Mode 1: Inspect & Monitor */}
          <button
            type="button"
            onClick={() => setActiveMode('inspect')}
            className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeMode === 'inspect'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>1. Inspect & Monitor</span>
          </button>

          {/* Mode 2: Inbound */}
          <button
            type="button"
            onClick={() => setActiveMode('inbound')}
            className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeMode === 'inbound'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>2. Inbound (+ Add Stock)</span>
          </button>

          {/* Mode 3: Outbound */}
          <button
            type="button"
            onClick={() => setActiveMode('outbound')}
            className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeMode === 'outbound'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
            <span>3. Outbound (- Deduct)</span>
          </button>

          {/* Mode 4: Batch Session */}
          <button
            type="button"
            onClick={() => setActiveMode('batch')}
            className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeMode === 'batch'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>4. Batch Session {batchList.length > 0 && `(${batchList.length})`}</span>
          </button>

          {/* Mode 5: Bin Relocate */}
          <button
            type="button"
            onClick={() => {
              setActiveMode('relocate');
              setRelocateStep('scan_item');
            }}
            className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeMode === 'relocate'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>5. Bin Relocate</span>
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
          
          {/* Active Mode Description & Quick Step Configurator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl text-white ${
                activeMode === 'inspect' ? 'bg-indigo-600' :
                activeMode === 'inbound' ? 'bg-emerald-600' :
                activeMode === 'outbound' ? 'bg-rose-600' :
                activeMode === 'batch' ? 'bg-purple-600' : 'bg-amber-600'
              }`}>
                {activeMode === 'inspect' && <Search className="w-4 h-4" />}
                {activeMode === 'inbound' && <Plus className="w-4 h-4" />}
                {activeMode === 'outbound' && <Minus className="w-4 h-4" />}
                {activeMode === 'batch' && <Boxes className="w-4 h-4" />}
                {activeMode === 'relocate' && <MapPin className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                  {activeMode === 'inspect' && 'Mode 1: Component Inspection & Real-time Stock Monitor'}
                  {activeMode === 'inbound' && 'Mode 2: Fast Inbound Stock Receipt (+ Add)'}
                  {activeMode === 'outbound' && 'Mode 3: Fast Outbound Stock Picking & Dispatch (- Deduct)'}
                  {activeMode === 'batch' && 'Mode 4: Multi-Scan Continuous Batch Audit Session'}
                  {activeMode === 'relocate' && 'Mode 5: Warehouse Bin Location Relocation Transfer'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {activeMode === 'inspect' && 'Instant lookup of part specs, storage bin, stock health, and composite kit dependencies.'}
                  {activeMode === 'inbound' && 'Scanned barcode immediately adds step quantity to inventory and creates receipt audit log.'}
                  {activeMode === 'outbound' && 'Scanned barcode deducts step quantity with negative stock prevention.'}
                  {activeMode === 'batch' && 'Continuously accumulate scans into a batch list with CSV export and bulk commit.'}
                  {activeMode === 'relocate' && 'Step 1: Scan Component -> Step 2: Scan Target Bin to update storage location.'}
                </p>
              </div>
            </div>

            {/* Step Quantity Selector */}
            {(activeMode === 'inbound' || activeMode === 'outbound' || activeMode === 'batch') && (
              <div className="flex items-center gap-1.5 self-end sm:self-auto bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase px-1">Step:</span>
                {STEP_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomQtyStep(preset)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                      customQtyStep === preset
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  value={customQtyStep}
                  onChange={(e) => setCustomQtyStep(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-12 text-center py-0.5 px-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-xs font-bold text-slate-900 dark:text-white"
                  title="Custom step amount"
                />
              </div>
            )}
          </div>

          {/* Camera Viewport & Stream Box (Direct React Video Ref) */}
          <div className="relative w-full h-60 bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center">
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* High-Tech Animated Laser Line */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-lg shadow-rose-500/80 animate-pulse pointer-events-none z-10" />

            {/* Framing Reticle */}
            <div className="absolute inset-x-12 inset-y-8 border-2 border-dashed border-indigo-400/70 rounded-2xl pointer-events-none flex items-center justify-center z-10">
              <span className="text-[10px] font-mono text-indigo-200 bg-slate-950/85 px-3 py-1 rounded-lg border border-indigo-500/40 uppercase tracking-widest shadow-md">
                {activeMode === 'relocate' && relocateStep === 'scan_bin'
                  ? 'TARGET: SCAN DESTINATION BIN/SHELF'
                  : 'ALIGN BARCODE / QR HERE'}
              </span>
            </div>

            {/* Top-Right Camera Switcher */}
            {availableCameras.length > 1 && (
              <div className="absolute top-3 right-3 z-20">
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    startCameraStream(e.target.value);
                  }}
                  className="text-[11px] font-bold bg-slate-900/90 text-slate-200 border border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none shadow-lg cursor-pointer"
                >
                  {availableCameras.map(c => (
                    <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${c.deviceId.slice(0, 6)}`}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Camera Overlay when initializing or error */}
            {(!isCameraActive || isStartingCamera) && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center space-y-3 z-30">
                <Camera className="w-10 h-10 text-indigo-400 animate-bounce" />
                <p className="text-xs font-semibold text-slate-300">
                  {cameraError || (isStartingCamera ? 'Connecting Camera Stream...' : 'Camera Stream Paused')}
                </p>
                <button
                  type="button"
                  onClick={() => startCameraStream()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reconnect WebCam
                </button>
              </div>
            )}
          </div>

          {/* Manual Input Search Bar & Image File Picker */}
          <div className="flex flex-col sm:flex-row gap-2.5">
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
                placeholder="Scan or type Barcode / SKU (e.g. EL-1, EL-2, EL-10)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full pl-10 pr-24 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" /> Lookup
              </button>
            </form>

            <label className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs">
              <UploadCloud className="w-4 h-4 text-indigo-500" />
              <span>{isProcessingFile ? 'Decoding Photo...' : 'Upload Barcode Photo'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isProcessingFile}
                className="hidden"
              />
            </label>
          </div>

          {/* Quick Demo Barcode Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Quick Catalog Samples:</span>
              <span className="text-indigo-500 font-mono">Click to test instant lookup</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_BARCODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleCodeScanned(code)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-xl text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {/* MODE 1: INSPECT & MONITOR DETAILED PART CARD */}
          {scannedItem && (
            <div className="p-5 bg-white dark:bg-slate-800/90 border border-indigo-200 dark:border-indigo-800/80 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  {scannedItem.imageUrl ? (
                    <img
                      src={scannedItem.imageUrl}
                      alt={scannedItem.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xl border border-indigo-200">
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

                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Available Stock</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {scannedItem.stockQty} <span className="text-xs font-normal text-slate-400">{scannedItem.unit}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${scannedItem.stockQty < scannedItem.threshold ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {scannedItem.stockQty < scannedItem.threshold ? '⚠️ Below Threshold' : '✓ Normal Stock'}
                  </span>
                </div>
              </div>

              {/* Storage Bin & Composite Kit Dependencies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/80 text-[11px]">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-700 flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Storage Bin Location:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{scannedItem.binLocation || 'Rack 1, Shelf A (Default)'}</strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-700 flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-purple-500 shrink-0" />
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Associated Kits (BOM):</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {parentKits.length > 0 ? `${parentKits.length} Kits (${parentKits.map(k => k.name).slice(0, 2).join(', ')})` : 'Standalone Component'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Direct Quantity Adjust in Card View */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/80">
                <span className="text-xs text-slate-500 font-medium">Quick Adjust Quantity:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(scannedItem, -customQtyStep)}
                    disabled={scannedItem.stockQty <= 0}
                    className="px-3.5 py-1.5 bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 text-rose-700 dark:text-rose-300 rounded-xl font-bold transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <Minus className="w-3.5 h-3.5" /> -{customQtyStep}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(scannedItem, customQtyStep)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> +{customQtyStep}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 4: BATCH MULTI-SCAN SESSION TABLE */}
          {activeMode === 'batch' && (
            <div className="space-y-3 animate-fadeIn p-4 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                    Continuous Multi-Scan Batch ({batchList.length} unique items)
                  </h4>
                  <p className="text-[10px] text-slate-400">Items accumulate automatically as you scan with the camera or USB gun.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportBatchCSV}
                    disabled={batchList.length === 0}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitBatch}
                    disabled={batchList.length === 0}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors disabled:opacity-40 cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Commit All Batch ({batchList.reduce((sum, b) => sum + b.quantity, 0)} units)
                  </button>
                </div>
              </div>

              {batchList.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 text-xs">
                  No items in batch yet. Scan barcodes continuously to accumulate counts.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {batchList.map((b) => (
                    <div key={b.itemId} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{b.code}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{b.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          +{b.quantity} {b.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBatchList(prev => prev.filter(x => x.itemId !== b.itemId))}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
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
            <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-3xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-600" />
                <div>
                  <h4 className="font-bold text-amber-950 dark:text-amber-300 text-xs">
                    {relocateStep === 'scan_item'
                      ? 'Step 1: Scan Component Barcode to Move'
                      : `Step 2: Scan Destination Bin for "${scannedItem?.name}"`}
                  </h4>
                  <p className="text-[10px] text-amber-800 dark:text-amber-400">
                    {relocateStep === 'scan_item'
                      ? 'Point the camera or scan the part sticker to select the item.'
                      : 'Scan the shelf/bin sticker or enter the new location below.'}
                  </p>
                </div>
              </div>

              {relocateStep === 'scan_bin' && scannedItem && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Enter or scan target bin barcode (e.g. Rack 2, Shelf 3)..."
                    value={relocateBinTarget}
                    onChange={(e) => setRelocateBinTarget(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => handleExecuteBinRelocation(scannedItem.id, relocateBinTarget)}
                    disabled={!relocateBinTarget.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-40 cursor-pointer"
                  >
                    Confirm Relocate
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Recent Live Scan Session Feed */}
          {recentScanLog.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Activity Feed:</span>
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
