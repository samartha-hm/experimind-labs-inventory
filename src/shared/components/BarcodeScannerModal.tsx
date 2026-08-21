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
  ArrowRight,
  ImageIcon,
  FlipHorizontal,
  Flashlight,
  Pause,
  Play,
  ClipboardList,
  CheckSquare,
  History,
  Layers,
  Truck,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { InventoryItem, Kit } from '@/src/types';
import { playScanBeep, useBarcodeGunListener } from '@/src/utils/barcode';
import { scanCanvasOrImage, decodeBarcodeFromImageFile } from '@/src/utils/barcodeEngine';

export type ScanOperationMode = 'inspect' | 'inbound' | 'outbound' | 'batch' | 'relocate' | 'kit_picking';

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
  const { inventory, kits = [], updateInventoryItem, logTransaction, bins = [] } = useData();
  const { showToast } = useToast();

  // Mode Selection
  const [activeMode, setActiveMode] = useState<ScanOperationMode>(initialMode);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customQtyStep, setCustomQtyStep] = useState<number>(1);
  const [inboundNote, setInboundNote] = useState('');
  const [outboundNote, setOutboundNote] = useState('');

  // Scanner Hardware & Stream State
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const isProcessingFrameRef = useRef<boolean>(false);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraPaused, setIsCameraPaused] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanPulse, setScanPulse] = useState(false);

  // Uploaded Photo State & Visual Preview
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadedPhotoPreview, setUploadedPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoCode, setUploadedPhotoCode] = useState<string | null>(null);

  // Input & Scanned State
  const [manualCode, setManualCode] = useState('');
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [relocateBinTarget, setRelocateBinTarget] = useState<string>('');
  const [relocateStep, setRelocateStep] = useState<'scan_item' | 'scan_bin'>('scan_item');
  
  // Kit BOM Picking Mode State
  const [selectedKitId, setSelectedKitId] = useState<string>(kits[0]?.id || '');
  const [scannedKitItems, setScannedKitItems] = useState<Record<string, number>>({});

  // Batch Multi-Scan Storage & History Drawer
  const [batchList, setBatchList] = useState<BatchScanItem[]>([]);
  const [recentScanLog, setRecentScanLog] = useState<{ code: string; name: string; time: string; success: boolean; mode: string }[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Active Kit for BOM Picking
  const activeKit = useMemo(() => {
    return kits.find(k => k.id === selectedKitId) || kits[0] || null;
  }, [kits, selectedKitId]);

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
    setIsTorchOn(false);
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

  // Flash Green HUD Pulse on Successful Scan
  const triggerScanPulse = () => {
    setScanPulse(true);
    setTimeout(() => setScanPulse(false), 800);
  };

  // Main Barcode Processing Pipeline
  const handleCodeScanned = useCallback(async (rawCode: string) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    // Trigger visual green pulse
    triggerScanPulse();

    // 1. Relocate Mode Step 2: Destination Bin scan
    if (activeMode === 'relocate' && relocateStep === 'scan_bin' && scannedItem) {
      await handleExecuteBinRelocation(scannedItem.id, cleanCode);
      return;
    }

    // 2. Kit Picking Mode Workflow
    if (activeMode === 'kit_picking' && activeKit) {
      const matchedItem = findItemByCode(cleanCode);
      if (matchedItem) {
        const reqItem = (activeKit.items || []).find(r => r.componentId === matchedItem.id);
        if (reqItem) {
          setScannedKitItems(prev => {
            const cur = prev[matchedItem.id] || 0;
            const updated = { ...prev, [matchedItem.id]: cur + 1 };
            return updated;
          });
          setScannedItem(matchedItem);
          if (soundEnabled) playScanBeep('match');
          setRecentScanLog(prev => [
            { code: cleanCode, name: `${matchedItem.name} (BOM Picked)`, time: new Date().toLocaleTimeString(), success: true, mode: 'Kit BOM Pick' },
            ...prev.slice(0, 19)
          ]);
          showToast('success', 'BOM Component Picked', `Checked off 1x ${matchedItem.name} for kit "${activeKit.name}"`);
          return;
        } else {
          if (soundEnabled) playScanBeep('warning');
          showToast('error', 'Component Not in BOM', `"${matchedItem.name}" is not required for kit "${activeKit.name}".`);
          return;
        }
      }
    }

    const matchedItem = findItemByCode(cleanCode);

    if (matchedItem) {
      setScannedItem(matchedItem);
      if (soundEnabled) playScanBeep('match');

      // Append to Recent Activity Feed
      setRecentScanLog(prev => [
        { code: cleanCode, name: matchedItem.name, time: new Date().toLocaleTimeString(), success: true, mode: activeMode.toUpperCase() },
        ...prev.slice(0, 19)
      ]);

      // Mode-specific Automatic Workflow Execution
      if (activeMode === 'inbound') {
        const delta = Math.max(1, customQtyStep);
        await handleAdjustStock(matchedItem, delta, inboundNote || `Inbound receipt (+${delta} ${matchedItem.unit}) via Barcode`);
      } else if (activeMode === 'outbound') {
        const delta = -Math.max(1, customQtyStep);
        await handleAdjustStock(matchedItem, delta, outboundNote || `Outbound dispatch (-${Math.abs(delta)} ${matchedItem.unit}) via Barcode`);
      } else if (activeMode === 'batch') {
        handleAddToBatch(matchedItem, Math.max(1, customQtyStep));
      } else if (activeMode === 'relocate') {
        setRelocateStep('scan_bin');
        showToast('info', 'Component Identified', `Step 2: Point at destination Bin barcode or select a bin below for "${matchedItem.name}"`);
      } else {
        // Inspect & Monitor Mode
        showToast('success', 'Component Matched', `${matchedItem.name} (Barcode: ${matchedItem.barcode || matchedItem.id})`);
      }
    } else {
      setScannedItem(null);
      if (soundEnabled) playScanBeep('error');
      setRecentScanLog(prev => [
        { code: cleanCode, name: 'Unrecognized Barcode', time: new Date().toLocaleTimeString(), success: false, mode: activeMode.toUpperCase() },
        ...prev.slice(0, 19)
      ]);
      showToast('error', 'Barcode Not Found', `Decoded code "${cleanCode}", but no matching component was found in catalog.`);
    }
  }, [activeMode, relocateStep, scannedItem, findItemByCode, soundEnabled, customQtyStep, inboundNote, outboundNote, activeKit]);

  // Start Camera Stream directly with native getUserMedia and custom frame grabber
  const startCameraStream = useCallback(async (deviceIdToUse?: string) => {
    if (!isOpen || !videoRef.current) return;
    setCameraError(null);
    setIsStartingCamera(true);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceIdToUse
          ? { deviceId: { exact: deviceIdToUse }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setIsCameraPaused(false);
      setIsStartingCamera(false);

      // Enumerate available hardware cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        const activeTrack = stream.getVideoTracks()[0];
        const activeSettings = activeTrack.getSettings();
        setSelectedCameraId(activeSettings.deviceId || videoDevices[0].deviceId);
      }

      // Initialize frame capture canvas
      if (!frameCanvasRef.current) {
        frameCanvasRef.current = document.createElement('canvas');
      }

      // Continuous Scanning Frame Loop (Runs every 160ms)
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      
      let lastFrameDecodeTime = 0;
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || isProcessingFrameRef.current || isCameraPaused) {
          return;
        }

        const now = Date.now();
        if (now - lastFrameDecodeTime < 250) return;

        isProcessingFrameRef.current = true;
        try {
          const video = videoRef.current;
          const canvas = frameCanvasRef.current!;
          
          const targetWidth = Math.min(640, video.videoWidth || 640);
          const targetHeight = Math.min(480, video.videoHeight || 480);
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            const decodedResult = await scanCanvasOrImage(canvas);
            
            if (decodedResult && decodedResult.trim()) {
              lastFrameDecodeTime = now;
              handleCodeScanned(decodedResult);
            }
          }
        } catch (_) {
        } finally {
          isProcessingFrameRef.current = false;
        }
      }, 160);

    } catch (err: any) {
      console.warn('Camera stream initialisation error:', err);
      setIsCameraActive(false);
      setIsStartingCamera(false);
      setCameraError(err.message || 'Camera permission denied or camera not accessible.');
    }
  }, [isOpen, facingMode, selectedCameraId, handleCodeScanned, isCameraPaused]);

  // Toggle Torch / Flashlight
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities: any = track.getCapabilities?.() || {};
        if (capabilities.torch) {
          const next = !isTorchOn;
          await (track as any).applyConstraints({ advanced: [{ torch: next }] });
          setIsTorchOn(next);
        } else {
          showToast('info', 'Torch Not Supported', 'Flashlight hardware is not available on this camera.');
        }
      } catch (err) {
        showToast('error', 'Torch Error', 'Unable to toggle camera flashlight.');
      }
    }
  };

  // Flip Camera between Front & Environment
  const handleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    stopCameraStream();
    setTimeout(() => startCameraStream(), 100);
  };

  // Lifecycle on modal open/close
  useEffect(() => {
    if (isOpen) {
      startCameraStream();
    } else {
      stopCameraStream();
      setScannedItem(null);
      setUploadedPhotoPreview(null);
      setUploadedPhotoCode(null);
      setRelocateBinTarget('');
      setRelocateStep('scan_item');
    }
  }, [isOpen, startCameraStream, stopCameraStream]);

  // Decode Image File Upload using Multi-Pass WASM Decoder with Instant Preview
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsProcessingFile(true);
    setUploadedPhotoCode(null);

    const previewUrl = URL.createObjectURL(file);
    setUploadedPhotoPreview(previewUrl);

    try {
      const decodedText = await decodeBarcodeFromImageFile(file);
      if (decodedText) {
        setUploadedPhotoCode(decodedText);
        showToast('success', 'Barcode Decoded From Photo', `Read Code: "${decodedText}"`);
        handleCodeScanned(decodedText);
      } else {
        setUploadedPhotoCode(null);
        showToast('error', 'Barcode Not Detected', 'Could not decode barcode from this photo. Ensure the barcode is clear, well-lit, and in focus.');
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
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-[9999] overflow-y-auto animate-fadeIn select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh] my-auto relative">
        
        {/* ========================================================================= */}
        {/* TOP HEADER */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Universal Barcode & QR Scanner Hub
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  WASM & HARDWARE ACCELERATED
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                ZXing-C++ WebAssembly • Code 128 / Code 39 / EAN / UPC / QR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}
              title={soundEnabled ? 'Scanner Beep Active' : 'Scanner Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Recent History Toggle */}
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                isHistoryOpen
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Log ({recentScanLog.length})</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RESPONSIVE 6-MODE OPERATION NAVIGATION BAR */}
        {/* ========================================================================= */}
        <div className="px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { mode: 'inspect', label: '1. Inspect & Monitor', icon: Search, color: 'text-indigo-500' },
              { mode: 'inbound', label: '2. Inbound (+ Receive)', icon: Plus, color: 'text-emerald-500' },
              { mode: 'outbound', label: '3. Outbound (- Pick)', icon: Minus, color: 'text-rose-500' },
              { mode: 'batch', label: '4. Batch Audit Session', icon: FileSpreadsheet, color: 'text-amber-500' },
              { mode: 'relocate', label: '5. Bin Putaway / Relocate', icon: MapPin, color: 'text-cyan-500' },
              { mode: 'kit_picking', label: '6. Kit BOM Checklist', icon: ClipboardList, color: 'text-purple-500' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeMode === tab.mode;

              return (
                <button
                  key={tab.mode}
                  onClick={() => {
                    setActiveMode(tab.mode as ScanOperationMode);
                    setRelocateStep('scan_item');
                  }}
                  className={`px-3 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.color}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN SCROLLABLE CONTENT BODY */}
        {/* ========================================================================= */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          
          {/* Mode Context Description Banner */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {activeMode === 'inspect' && '🔍 Mode 1: Component Inspection & Real-time Stock Health'}
                {activeMode === 'inbound' && '📥 Mode 2: Inbound Goods Receiving & Intake (+ Stock)'}
                {activeMode === 'outbound' && '📤 Mode 3: Outbound Picking & Dispatch Deduct (- Stock)'}
                {activeMode === 'batch' && '📋 Mode 4: High-Speed Batch Audit & Cycle Count Session'}
                {activeMode === 'relocate' && '📍 Mode 5: Storage Bin Putaway & Slot Relocation'}
                {activeMode === 'kit_picking' && '🧰 Mode 6: Kit BOM Assembly & Picking Checklist'}
              </span>
            </div>

            {/* Quick Step Quantity Controller for Inbound / Outbound / Batch */}
            {(activeMode === 'inbound' || activeMode === 'outbound' || activeMode === 'batch') && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Qty Multiplier:</span>
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
                  {STEP_PRESETS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setCustomQtyStep(step)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        customQtyStep === step
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      +{step}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Kit Selector for Kit BOM Picking Mode */}
            {activeMode === 'kit_picking' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Target Kit:</span>
                <select
                  value={selectedKitId}
                  onChange={(e) => {
                    setSelectedKitId(e.target.value);
                    setScannedKitItems({});
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  {kits.map(k => (
                    <option key={k.id} value={k.id}>{k.name} ({k.items?.length || 0} Parts)</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* CAMERA VIEWFINDER & HARDWARE HUD */}
          {/* ========================================================================= */}
          <div className="space-y-2">
            
            {/* Viewfinder Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-400 text-[11px] flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-500" />
                  Live Camera Feed:
                </span>
                
                {/* Readable Camera Switcher Dropdown */}
                {availableCameras.length > 0 && (
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      startCameraStream(e.target.value);
                    }}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[200px] truncate"
                  >
                    {availableCameras.map((cam, idx) => (
                      <option key={cam.deviceId} value={cam.deviceId}>
                        {cam.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Hardware Quick Action Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Switch between front and back camera"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" /> Flip
                </button>

                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isTorchOn
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Toggle hardware flashlight"
                >
                  <Flashlight className="w-3.5 h-3.5" /> {isTorchOn ? 'Torch ON' : 'Torch'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsCameraPaused(!isCameraPaused)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isCameraPaused
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isCameraPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  {isCameraPaused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>

            {/* Video Viewfinder Container */}
            <div className={`relative rounded-3xl overflow-hidden bg-slate-950 border-2 transition-all shadow-2xl h-[260px] md:h-[300px] flex items-center justify-center ${
              scanPulse ? 'border-emerald-400 ring-4 ring-emerald-500/30' : 'border-slate-800'
            }`}>
              
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Reticle & Laser Sweep Animation */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                
                {/* Center Scan Reticle Box */}
                <div className="w-[75%] h-[60%] border-2 border-dashed border-indigo-400/70 rounded-2xl relative flex items-center justify-center backdrop-contrast-125">
                  
                  {/* Corner Accent Brackets */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />

                  {/* Animated Red Laser Sweep Line */}
                  <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse" />

                  {/* Target Guide Text */}
                  <div className="absolute px-3 py-1 rounded-full bg-slate-950/85 border border-slate-700 text-[10px] font-mono font-bold text-white shadow-lg tracking-wider">
                    {activeMode === 'relocate' && relocateStep === 'scan_bin'
                      ? '🎯 ALIGN DESTINATION BIN BARCODE'
                      : '🎯 ALIGN BARCODE / QR HERE'}
                  </div>
                </div>
              </div>

              {/* Camera Loading Overlay */}
              {isStartingCamera && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-white space-y-2 z-10">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs font-bold">Initializing WASM Video Feed...</span>
                </div>
              )}

              {/* Camera Error / Permission Fallback */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-white space-y-3 z-10">
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                  <p className="text-xs text-slate-300 max-w-md">{cameraError}</p>
                  <button
                    onClick={() => startCameraStream()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Camera Access
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MANUAL CODE & PHOTO UPLOAD BAR */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            
            {/* Manual Text Barcode / SKU Input */}
            <div className="md:col-span-8 flex items-center gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Scan or type Barcode / SKU (e.g. EL-1, EL-2, RACK-01)..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualCode.trim()) {
                      handleCodeScanned(manualCode);
                      setManualCode('');
                    }
                  }}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (manualCode.trim()) {
                    handleCodeScanned(manualCode);
                    setManualCode('');
                  }
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Search className="w-4 h-4" /> Lookup
              </button>
            </div>

            {/* Photo Barcode Uploader */}
            <div className="md:col-span-4">
              <label className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer truncate">
                <UploadCloud className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="truncate">{isProcessingFile ? 'Decoding Photo...' : 'Upload Barcode Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Quick Catalog Sample Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Quick Test Samples:</span>
            {QUICK_BARCODES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleCodeScanned(code)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-mono text-[11px] font-bold transition-all border border-slate-200/80 dark:border-slate-700 cursor-pointer"
              >
                {code}
              </button>
            ))}
          </div>

          {/* Photo Decode Preview Card */}
          {uploadedPhotoPreview && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <img
                  src={uploadedPhotoPreview}
                  alt="Scanned preview"
                  className="w-12 h-12 object-cover rounded-xl border border-slate-300 dark:border-slate-600"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Decoded Image Barcode</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 text-[11px]">
                    {uploadedPhotoCode ? `Code: "${uploadedPhotoCode}"` : 'Processing or No Code Detected'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setUploadedPhotoPreview(null);
                  setUploadedPhotoCode(null);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 6: KIT BOM PICKING & ASSEMBLY CHECKLIST CARD */}
          {/* ========================================================================= */}
          {activeMode === 'kit_picking' && activeKit && (
            <div className="p-5 bg-purple-50/70 dark:bg-purple-950/40 rounded-3xl border border-purple-200 dark:border-purple-800/80 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-purple-950 dark:text-purple-200 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Kit Assembly Picking Checklist: {activeKit.name}
                  </h3>
                  <p className="text-xs text-purple-700 dark:text-purple-300 font-medium mt-0.5">
                    Scan each required BOM component to verify and mark off inventory:
                  </p>
                </div>

                <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-black text-xs">
                  {Object.keys(scannedKitItems).length} / {activeKit.items?.length || 0} Picked
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-purple-200 dark:bg-purple-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-600 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (Object.keys(scannedKitItems).length / (activeKit.items?.length || 1)) * 100)}%`
                  }}
                />
              </div>

              {/* BOM Items Checklist Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {(activeKit.items || []).map((req) => {
                  const item = inventory.find(i => i.id === req.componentId);
                  const isPicked = (scannedKitItems[req.componentId] || 0) >= req.quantity;
                  const pickedQty = scannedKitItems[req.componentId] || 0;

                  return (
                    <div
                      key={req.componentId}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                        isPicked
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                          : 'bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="flex items-center gap-1.5">
                          {isPicked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Boxes className="w-4 h-4 text-purple-500 shrink-0" />
                          )}
                          <span className="font-bold truncate">{item?.name || req.componentId}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block pl-5">
                          Bin: {item?.binLocation || 'Unassigned'} • Req: {req.quantity} {item?.unit || 'pcs'}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold shrink-0 ${
                        isPicked
                          ? 'bg-emerald-500 text-white'
                          : 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                      }`}>
                        {pickedQty}/{req.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCANNED ITEM CARD (MODES 1, 2, 3, 5) */}
          {/* ========================================================================= */}
          {scannedItem && (
            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px]">
                      {scannedItem.category}
                    </span>
                    <span className="text-slate-400 text-xs font-mono">
                      SKU: {scannedItem.sku || scannedItem.id}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {scannedItem.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-right">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Stock</span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {scannedItem.stockQty} {scannedItem.unit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Storage Bin</span>
                  <strong className="text-slate-900 dark:text-white font-mono flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    {scannedItem.binLocation || 'Not Assigned'}
                  </strong>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Unit Cost</span>
                  <strong className="text-slate-900 dark:text-white font-mono flex items-center gap-1 mt-0.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    ₹{scannedItem.unitCost.toFixed(2)}
                  </strong>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Safety Stock</span>
                  <strong className="text-slate-900 dark:text-white font-mono mt-0.5 block">
                    {scannedItem.minSafetyStock} {scannedItem.unit}
                  </strong>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Barcode ID</span>
                  <strong className="text-slate-900 dark:text-white font-mono mt-0.5 block truncate">
                    {scannedItem.barcode || `EL-${scannedItem.id}`}
                  </strong>
                </div>
              </div>

              {/* Mode-specific Direct Action Controls */}
              {activeMode === 'inbound' && (
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                      Inbound Goods Intake: +{customQtyStep} {scannedItem.unit}
                    </span>
                    <button
                      onClick={() => handleAdjustStock(scannedItem, customQtyStep, inboundNote)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Confirm Receive (+{customQtyStep})
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Optional Inbound PO / Invoice / Lot reference..."
                    value={inboundNote}
                    onChange={(e) => setInboundNote(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}

              {activeMode === 'outbound' && (
                <div className="p-4 bg-rose-50/70 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-rose-900 dark:text-rose-200">
                      Outbound Picking Deduct: -{customQtyStep} {scannedItem.unit}
                    </span>
                    <button
                      onClick={() => handleAdjustStock(scannedItem, -customQtyStep, outboundNote)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Confirm Deduct (-{customQtyStep})
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Optional Outbound Order / Dispatch allocation note..."
                    value={outboundNote}
                    onChange={(e) => setOutboundNote(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}

              {activeMode === 'relocate' && (
                <div className="p-4 bg-cyan-50/70 dark:bg-cyan-950/40 rounded-2xl border border-cyan-200 dark:border-cyan-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-cyan-950 dark:text-cyan-200">
                      Relocate Slot: Current Bin "{scannedItem.binLocation || 'None'}"
                    </span>
                    <span className="text-[10px] text-cyan-700 dark:text-cyan-300 font-mono font-bold">
                      Scan Target Bin Barcode OR Select Below:
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={relocateBinTarget}
                      onChange={(e) => setRelocateBinTarget(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="">-- Choose Target Facility Bin --</option>
                      {bins.map(b => (
                        <option key={b.id} value={b.code}>{b.code} ({b.description || b.warehouseCode})</option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        if (relocateBinTarget) handleExecuteBinRelocation(scannedItem.id, relocateBinTarget);
                      }}
                      disabled={!relocateBinTarget}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Move to Bin
                    </button>
                  </div>
                </div>
              )}

              {/* Composite Kit Dependencies */}
              {parentKits.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Used In {parentKits.length} Composite Kit BOMs:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {parentKits.map(k => (
                      <span
                        key={k.id}
                        className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold"
                      >
                        {k.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 4: BATCH SCAN AUDIT QUEUE */}
          {/* ========================================================================= */}
          {activeMode === 'batch' && (
            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                    Batch Multi-Scan Queue ({batchList.length} items)
                  </h3>
                  <p className="text-xs text-slate-400">Keep scanning components non-stop. Quantities will automatically aggregate.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportBatchCSV}
                    disabled={batchList.length === 0}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Export CSV
                  </button>

                  <button
                    onClick={handleCommitBatch}
                    disabled={batchList.length === 0}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md disabled:opacity-40 cursor-pointer"
                  >
                    Commit Stock Updates
                  </button>
                </div>
              </div>

              {batchList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No items in current batch session. Aim your scanner or use USB gun to populate.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {batchList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[10px]">{item.timestamp}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs">
                          {item.quantity} {item.unit}
                        </span>
                        <button
                          onClick={() => setBatchList(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
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

          {/* ========================================================================= */}
          {/* RECENT SCAN LOG DRAWER */}
          {/* ========================================================================= */}
          {isHistoryOpen && (
            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-500" />
                  Recent Scan History & Audit Trail
                </h4>
                <button
                  onClick={() => setRecentScanLog([])}
                  className="text-[10px] text-slate-400 hover:text-rose-500 font-bold"
                >
                  Clear History
                </button>
              </div>

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar text-xs font-mono">
                {recentScanLog.length === 0 ? (
                  <p className="text-slate-400 text-[11px] py-2">No scans recorded in this session yet.</p>
                ) : (
                  recentScanLog.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${log.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-slate-400">{log.time}</span>
                        <strong className="text-slate-900 dark:text-white">{log.name}</strong>
                      </div>
                      <span className="text-slate-500">{log.code}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
