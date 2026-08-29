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
  ChevronDown,
  Edit2,
  Settings,
  PlusCircle,
  RotateCcw,
  Save,
  Tag,
  Square,
  CheckSquare2,
  TrendingUp,
  TrendingDown,
  Copy,
  Filter,
  Download,
  AlertCircle,
  Shield
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { InventoryItem, KitBOM } from '@/src/types';
import { playScanBeep, useBarcodeGunListener } from '@/src/utils/barcode';
import { scanCanvasOrImage, decodeBarcodeFromImageFile } from '@/src/utils/barcodeEngine';

export type ScanOperationMode = 'inspect' | 'inbound' | 'outbound' | 'batch' | 'relocate' | 'kit_picking';

export interface BatchScanItem {
  id: string;
  code: string;
  itemId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  actionType: 'add' | 'deduct' | 'set';
  note?: string;
  timestamp: string;
}

export interface QuickBarcodeChip {
  code: string;
  label?: string;
}

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: ScanOperationMode;
}

const DEFAULT_QUICK_CHIPS: QuickBarcodeChip[] = [
  { code: 'EL-1', label: 'Petri Dish' },
  { code: 'EL-2', label: 'Test Tubes' },
  { code: 'EL-3', label: 'Beaker 250ml' },
  { code: 'EL-4', label: 'Safety Goggles' },
  { code: 'EL-5', label: 'Digital Multimeter' },
  { code: 'EL-6', label: 'Soldering Iron' },
  { code: 'EL-7', label: 'Connecting Wires' },
  { code: 'EL-8', label: 'Copper Tape' },
  { code: 'EL-9', label: 'LED Array' },
  { code: 'EL-10', label: 'Battery 9V' },
];

const DEFAULT_STEP_PRESETS = [1, 5, 10, 25, 50, 100];

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  initialMode = 'inspect'
}: BarcodeScannerModalProps) {
  const { inventory, kits = [], updateInventoryItem, logTransaction, bins = [], lookupSerialNumber } = useData();
  const { showToast } = useToast();

  // Mode Selection
  const [activeMode, setActiveMode] = useState<ScanOperationMode>(initialMode);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inboundNote, setInboundNote] = useState('');
  const [outboundNote, setOutboundNote] = useState('');
  const [matchedSerial, setMatchedSerial] = useState<any | null>(null);

  // 1. CUSTOMIZABLE QUANTITY MULTIPLIERS
  const [stepPresets, setStepPresets] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('experimind_scanner_multiplier_presets_v1');
      return saved ? JSON.parse(saved) : DEFAULT_STEP_PRESETS;
    } catch (_) {
      return DEFAULT_STEP_PRESETS;
    }
  });
  const [customQtyStep, setCustomQtyStep] = useState<number>(stepPresets[0] || 1);
  const [isEditingStepsModal, setIsEditingStepsModal] = useState(false);
  const [stepInputText, setStepInputText] = useState(stepPresets.join(', '));

  // 2. CUSTOMIZABLE QUICK-SCAN BARCODE CHIPS
  const [quickChips, setQuickChips] = useState<QuickBarcodeChip[]>(() => {
    try {
      const saved = localStorage.getItem('experimind_custom_scanner_chips_v2');
      return saved ? JSON.parse(saved) : DEFAULT_QUICK_CHIPS;
    } catch (_) {
      return DEFAULT_QUICK_CHIPS;
    }
  });
  const [isManagingChipsModal, setIsManagingChipsModal] = useState(false);
  const [newChipCode, setNewChipCode] = useState('');
  const [newChipLabel, setNewChipLabel] = useState('');

  const saveQuickChips = (updated: QuickBarcodeChip[]) => {
    setQuickChips(updated);
    try {
      localStorage.setItem('experimind_custom_scanner_chips_v2', JSON.stringify(updated));
    } catch (_) {}
  };

  // 3. IN-MODAL COMPONENT QUICK-EDITOR STATE
  const [isEditingItemModal, setIsEditingItemModal] = useState(false);
  const [editItemName, setEditItemName] = useState('');
  const [editItemCategory, setEditItemCategory] = useState('');
  const [editItemBin, setEditItemBin] = useState('');
  const [editItemCost, setEditItemCost] = useState<number>(0);
  const [editItemStock, setEditItemStock] = useState<number>(0);
  const [editItemThreshold, setEditItemThreshold] = useState<number>(0);
  const [editItemBarcode, setEditItemBarcode] = useState('');
  const [editItemSku, setEditItemSku] = useState('');

  // 4. BATCH MULTI-SELECTION & BULK ACTIONS STATE
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [bulkNoteInput, setBulkNoteInput] = useState('');
  const [bulkQtyInput, setBulkQtyInput] = useState<number>(10);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);

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

  // Add Item to Batch Session with Action Type
  const handleAddToBatch = (item: InventoryItem, qty: number, actionType: 'add' | 'deduct' | 'set' = 'add') => {
    setBatchList(prev => {
      const idx = prev.findIndex(b => b.itemId === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + qty,
          timestamp: new Date().toLocaleTimeString()
        };
        return updated;
      }
      const newItem: BatchScanItem = {
        id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code: item.barcode || `EL-${item.id}`,
        itemId: item.id,
        name: item.name,
        category: item.category,
        quantity: qty,
        unit: item.unit,
        actionType,
        note: '',
        timestamp: new Date().toLocaleTimeString()
      };
      return [newItem, ...prev];
    });
    if (soundEnabled) playScanBeep('click');
    showToast('info', 'Batch Queued', `+${qty} ${item.name} queued in session`);
  };

  // Main Barcode Processing Pipeline
  const handleCodeScanned = useCallback(async (rawCode: string) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

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
          const reqQty = (reqItem as any).qty || (reqItem as any).quantity || 1;
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

    let matchedItem = findItemByCode(cleanCode);
    let foundSerial: any = null;

    if (!matchedItem) {
      foundSerial = await lookupSerialNumber(cleanCode);
      if (foundSerial) {
        matchedItem = foundSerial.inventoryItem || inventory.find(i => i.id === foundSerial.inventoryItemId) || null;
        setMatchedSerial(foundSerial);
      } else {
        setMatchedSerial(null);
      }
    } else {
      foundSerial = await lookupSerialNumber(cleanCode);
      setMatchedSerial(foundSerial || null);
    }

    if (matchedItem) {
      setScannedItem(matchedItem);
      if (soundEnabled) playScanBeep('match');

      // Append to Recent Activity Feed
      setRecentScanLog(prev => [
        { code: cleanCode, name: foundSerial ? `[SN] ${foundSerial.serialNumber} (${matchedItem!.name})` : matchedItem!.name, time: new Date().toLocaleTimeString(), success: true, mode: activeMode.toUpperCase() },
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
        handleAddToBatch(matchedItem, Math.max(1, customQtyStep), 'add');
      } else if (activeMode === 'relocate') {
        setRelocateStep('scan_bin');
        showToast('info', 'Component Identified', `Step 2: Point at destination Bin barcode or select a bin below for "${matchedItem.name}"`);
      } else {
        // Inspect & Monitor Mode
        if (foundSerial) {
          showToast('success', 'Serialized Unit Matched', `Serial: ${foundSerial.serialNumber} (Status: ${foundSerial.status})`);
        } else {
          showToast('success', 'Component Matched', `${matchedItem.name} (Barcode: ${matchedItem.barcode || matchedItem.id})`);
        }
      }
    } else {
      setScannedItem(null);
      setMatchedSerial(null);
      if (soundEnabled) playScanBeep('error');
      setRecentScanLog(prev => [
        { code: cleanCode, name: 'Unrecognized Barcode', time: new Date().toLocaleTimeString(), success: false, mode: activeMode.toUpperCase() },
        ...prev.slice(0, 19)
      ]);
      showToast('error', 'Barcode Not Found', `Decoded code "${cleanCode}", but no matching component or serial unit was found in catalog.`);
    }
  }, [activeMode, relocateStep, scannedItem, findItemByCode, lookupSerialNumber, soundEnabled, customQtyStep, inboundNote, outboundNote, activeKit, inventory]);

  const handleCodeScannedRef = useRef(handleCodeScanned);
  useEffect(() => {
    handleCodeScannedRef.current = handleCodeScanned;
  }, [handleCodeScanned]);

  // Start Camera Stream directly with native getUserMedia and custom frame grabber
  const startCameraStream = useCallback(async (deviceIdToUse?: string) => {
    if (!isOpen || !videoRef.current) return;
    setCameraError(null);
    setIsStartingCamera(true);

    if (!navigator?.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      const isHttps = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const msg = isHttps
        ? 'No camera hardware detected. Use the Mobile Camera Snapper, photo upload, or manual SKU search.'
        : 'Continuous video streaming requires HTTPS. Tap "Snap & Scan Camera" below or switch to HTTPS to enable live scanning.';
      setCameraError(msg);
      setIsStartingCamera(false);
      setIsCameraActive(false);
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      let stream: MediaStream | null = null;
      
      // Stage 1: Try exact or ideal deviceId / environment facing mode
      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: deviceIdToUse
            ? { deviceId: { exact: deviceIdToUse }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1) {
        // Stage 2: Fallback to basic facingMode constraint
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode }
          });
        } catch (err2) {
          // Stage 3: Fallback to any available video stream
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true
          });
        }
      }

      if (!stream) {
        throw new Error('Could not initialize video stream on this device.');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise.catch((e: any) => {
              if (e.name !== 'AbortError') {
                console.warn('Video play exception:', e);
              }
            });
          }
        } catch (_) {}
      }

      setIsCameraActive(true);
      setIsCameraPaused(false);
      setIsStartingCamera(false);

      // Enumerate available hardware cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          const activeTrack = stream.getVideoTracks()[0];
          const activeSettings = activeTrack?.getSettings?.();
          setSelectedCameraId(activeSettings?.deviceId || videoDevices[0].deviceId);
        }
      } catch (_) {}

      // Initialize frame capture canvas
      if (!frameCanvasRef.current) {
        frameCanvasRef.current = document.createElement('canvas');
      }

      // Continuous Scanning Frame Loop (Runs every 150ms)
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      
      let lastFrameDecodeTime = 0;
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || isProcessingFrameRef.current || isCameraPaused) {
          return;
        }

        const now = Date.now();
        if (now - lastFrameDecodeTime < 200) return;

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
              // Trigger haptic vibration on mobile
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(60); } catch (_) {}
              }
              handleCodeScannedRef.current(decodedResult);
            }
          }
        } catch (_) {
        } finally {
          isProcessingFrameRef.current = false;
        }
      }, 150);

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Camera stream initialisation error:', err);
        setCameraError(err.message || 'Camera permission denied or camera not accessible.');
      }
      setIsCameraActive(false);
      setIsStartingCamera(false);
    }
  }, [isOpen, facingMode, selectedCameraId, isCameraPaused]);

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
      setSelectedBatchIds(new Set());
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

  // =========================================================================
  // BATCH & AUDIT VARIANCE CALCULATIONS
  // =========================================================================
  const batchVarianceList = useMemo(() => {
    return batchList.map(b => {
      const item = inventory.find(i => i.id === b.itemId);
      const currentStock = item?.stockQty ?? 0;
      let projectedStock = currentStock;
      let diff = 0;

      if (b.actionType === 'add') {
        projectedStock = currentStock + b.quantity;
        diff = b.quantity;
      } else if (b.actionType === 'deduct') {
        projectedStock = Math.max(0, currentStock - b.quantity);
        diff = -(currentStock - projectedStock);
      } else if (b.actionType === 'set') {
        projectedStock = b.quantity;
        diff = b.quantity - currentStock;
      }

      const unitCost = item?.unitCost ?? item?.basePrice ?? 0;
      const valueImpact = diff * unitCost;

      return {
        ...b,
        item,
        currentStock,
        projectedStock,
        diff,
        unitCost,
        valueImpact
      };
    });
  }, [batchList, inventory]);

  const batchSummary = useMemo(() => {
    const totalItems = batchVarianceList.length;
    const totalUnits = batchVarianceList.reduce((acc, b) => acc + b.quantity, 0);
    const netVarianceUnits = batchVarianceList.reduce((acc, b) => acc + b.diff, 0);
    const netValueImpact = batchVarianceList.reduce((acc, b) => acc + b.valueImpact, 0);
    const surplusCount = batchVarianceList.filter(b => b.diff > 0).length;
    const shortageCount = batchVarianceList.filter(b => b.diff < 0).length;
    const exactCount = batchVarianceList.filter(b => b.diff === 0).length;

    return {
      totalItems,
      totalUnits,
      netVarianceUnits,
      netValueImpact,
      surplusCount,
      shortageCount,
      exactCount
    };
  }, [batchVarianceList]);

  // Bulk Actions on Selected (or All) Items
  const targetBatchItems = useMemo(() => {
    if (selectedBatchIds.size > 0) {
      return batchList.filter(b => selectedBatchIds.has(b.id));
    }
    return batchList;
  }, [batchList, selectedBatchIds]);

  const handleBulkChangeAction = (action: 'add' | 'deduct' | 'set') => {
    if (batchList.length === 0) return;
    const targetIds = selectedBatchIds.size > 0 ? selectedBatchIds : new Set(batchList.map(b => b.id));
    setBatchList(prev => prev.map(b => targetIds.has(b.id) ? { ...b, actionType: action } : b));
    showToast('success', 'Batch Action Updated', `Set ${targetIds.size} items to "${action === 'add' ? '+ Add Stock' : action === 'deduct' ? '- Deduct Stock' : '= Physical Count'}"`);
  };

  const handleBulkSetQty = (qty: number) => {
    if (batchList.length === 0 || qty < 1) return;
    const targetIds = selectedBatchIds.size > 0 ? selectedBatchIds : new Set(batchList.map(b => b.id));
    setBatchList(prev => prev.map(b => targetIds.has(b.id) ? { ...b, quantity: qty } : b));
    showToast('success', 'Batch Quantities Updated', `Set quantity to ${qty} for ${targetIds.size} items.`);
  };

  const handleBulkAdjustQty = (delta: number) => {
    if (batchList.length === 0) return;
    const targetIds = selectedBatchIds.size > 0 ? selectedBatchIds : new Set(batchList.map(b => b.id));
    setBatchList(prev => prev.map(b => targetIds.has(b.id) ? { ...b, quantity: Math.max(1, b.quantity + delta) } : b));
    showToast('info', 'Batch Adjusted', `Adjusted quantity by ${delta > 0 ? '+' : ''}${delta} for ${targetIds.size} items.`);
  };

  const handleBulkApplyNote = (noteText: string) => {
    if (batchList.length === 0 || !noteText.trim()) return;
    const targetIds = selectedBatchIds.size > 0 ? selectedBatchIds : new Set(batchList.map(b => b.id));
    setBatchList(prev => prev.map(b => targetIds.has(b.id) ? { ...b, note: noteText.trim() } : b));
    showToast('success', 'Batch Note Applied', `Applied note to ${targetIds.size} items.`);
    setBulkNoteInput('');
  };

  const handleBulkDelete = () => {
    if (selectedBatchIds.size === 0) {
      setBatchList([]);
      showToast('info', 'Batch Cleared', 'Cleared all items in session.');
    } else {
      setBatchList(prev => prev.filter(b => !selectedBatchIds.has(b.id)));
      showToast('info', 'Batch Items Deleted', `Removed ${selectedBatchIds.size} selected items.`);
      setSelectedBatchIds(new Set());
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedBatchIds.size === batchList.length) {
      setSelectedBatchIds(new Set());
    } else {
      setSelectedBatchIds(new Set(batchList.map(b => b.id)));
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedBatchIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Commit Batch Session to Database (Supporting Add, Deduct, and Set)
  const handleCommitBatch = async () => {
    if (batchList.length === 0) return;
    for (const b of batchVarianceList) {
      const item = b.item;
      if (item) {
        if (b.actionType === 'set') {
          // Direct physical count override
          const oldQty = b.currentStock;
          await updateInventoryItem(item.id, { stockQty: b.quantity });
          await logTransaction({
            id: `tx_${Date.now()}_${b.id}`,
            timestamp: new Date().toISOString(),
            type: 'adjust',
            description: b.note || `Physical Cycle Count Override (${oldQty} → ${b.quantity} ${item.unit})`,
            items: [{ componentId: item.id, componentName: item.name, qtyDiff: b.diff }],
            diffs: [{ field: 'stockQty', oldValue: oldQty, newValue: b.quantity }]
          });
        } else {
          const delta = b.actionType === 'deduct' ? -b.quantity : b.quantity;
          await handleAdjustStock(item, delta, b.note || `Batch Scan Audit (${delta > 0 ? '+' : ''}${delta} ${item.unit})`);
        }
      }
    }
    showToast('success', 'Batch Session Committed', `Successfully processed audit for ${batchList.length} components.`);
    setBatchList([]);
    setSelectedBatchIds(new Set());
  };

  // Export Comprehensive Audit CSV
  const handleExportBatchCSV = () => {
    if (batchVarianceList.length === 0) return;
    const rows = [
      ['Barcode', 'Item Name', 'Category', 'Action Type', 'Current Stock', 'Projected Stock', 'Variance Diff', 'Unit Cost (INR)', 'Valuation Impact (INR)', 'Unit', 'Notes', 'Timestamp'],
      ...batchVarianceList.map(b => [
        b.code,
        b.name,
        b.category,
        b.actionType.toUpperCase(),
        b.currentStock,
        b.projectedStock,
        b.diff > 0 ? `+${b.diff}` : b.diff,
        b.unitCost.toFixed(2),
        b.valueImpact.toFixed(2),
        b.unit,
        b.note || '',
        b.timestamp
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_audit_session_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'CSV Exported', 'Downloaded complete batch audit record with variance.');
  };

  // Catalog search filtering for manual add
  const filteredCatalogItems = useMemo(() => {
    if (!catalogSearchQuery.trim()) return [];
    const q = catalogSearchQuery.toLowerCase();
    return inventory.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.barcode && i.barcode.toLowerCase().includes(q)) ||
      (i.sku && i.sku.toLowerCase().includes(q)) ||
      i.category.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [inventory, catalogSearchQuery]);

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

  // Open In-Modal Quick Component Editor
  const handleOpenEditItemModal = () => {
    if (!scannedItem) return;
    setEditItemName(scannedItem.name);
    setEditItemCategory(scannedItem.category);
    setEditItemBin(scannedItem.binLocation || '');
    setEditItemCost(scannedItem.unitCost ?? scannedItem.basePrice ?? 0);
    setEditItemStock(scannedItem.stockQty);
    setEditItemThreshold(scannedItem.threshold ?? (scannedItem as any).minSafetyStock ?? 0);
    setEditItemBarcode(scannedItem.barcode || `EL-${scannedItem.id}`);
    setEditItemSku(scannedItem.sku || scannedItem.id);
    setIsEditingItemModal(true);
  };

  const handleSaveItemEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedItem) return;

    const updatedData: Partial<InventoryItem> = {
      name: editItemName.trim(),
      category: editItemCategory.trim(),
      binLocation: editItemBin.trim() || undefined,
      unitCost: Number(editItemCost) || 0,
      basePrice: Number(editItemCost) || 0,
      stockQty: Number(editItemStock) || 0,
      threshold: Number(editItemThreshold) || 0,
      barcode: editItemBarcode.trim() || undefined,
      sku: editItemSku.trim() || undefined,
    };

    await updateInventoryItem(scannedItem.id, updatedData);
    setScannedItem(prev => (prev ? { ...prev, ...updatedData } : prev));
    setIsEditingItemModal(false);
    showToast('success', 'Component Updated', `Updated specifications for "${editItemName}".`);
  };

  // Custom Quick Chips Management
  const handleAddQuickChip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChipCode.trim()) return;

    const chip: QuickBarcodeChip = {
      code: newChipCode.trim(),
      label: newChipLabel.trim() || undefined
    };
    const updated = [...quickChips, chip];
    saveQuickChips(updated);
    setNewChipCode('');
    setNewChipLabel('');
    setIsManagingChipsModal(false);
    showToast('success', 'Quick SKU Added', `Pinned "${chip.code}" to quick test chips.`);
  };

  const handleDeleteQuickChip = (code: string) => {
    const updated = quickChips.filter(c => c.code !== code);
    saveQuickChips(updated);
  };

  const handleResetQuickChips = () => {
    saveQuickChips(DEFAULT_QUICK_CHIPS);
    showToast('info', 'Chips Reset', 'Restored default quick-scan barcode samples.');
  };

  // Custom Quantity Steps Management
  const handleSaveSteps = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = stepInputText
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0);

    if (parsed.length > 0) {
      setStepPresets(parsed);
      setCustomQtyStep(parsed[0]);
      try {
        localStorage.setItem('experimind_scanner_multiplier_presets_v1', JSON.stringify(parsed));
      } catch (_) {}
      setIsEditingStepsModal(false);
      showToast('success', 'Multipliers Updated', `Configured steps: ${parsed.join(', ')}`);
    }
  };

  // Parent composite kits requiring this part
  const parentKits = useMemo(() => {
    if (!scannedItem) return [];
    return kits.filter(k => (k.items || []).some(req => req.componentId === scannedItem.id));
  }, [scannedItem, kits]);

  if (!isOpen) return null;

  const isCurrentHttp = typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-1.5 sm:p-3 md:p-6 overflow-y-auto animate-fadeIn select-none">
      <div className="relative my-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* ========================================================================= */}
        {/* TOP HEADER (COMPACT & MOBILE POLISHED) */}
        {/* ========================================================================= */}
        <div className="px-3.5 py-2.5 sm:px-5 sm:py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20 shrink-0">
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Universal Barcode & QR Scanner Hub
                </h2>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  WASM PRO
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px] sm:max-w-none">
                Real-time Multi-Mode Inventory & Batch Audit Workstation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}
              title={soundEnabled ? 'Scanner Audio Beep Active' : 'Scanner Audio Muted'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Manage Quick Chips */}
            <button
              type="button"
              onClick={() => setIsManagingChipsModal(true)}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              title="Customize pinned quick test barcodes"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
            </button>

            {/* Recent History Toggle */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                isHistoryOpen
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log</span>
              <span className="px-1 py-0.2 rounded text-[9px] sm:text-[10px] bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-mono">
                {recentScanLog.length}
              </span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RESPONSIVE 6-MODE SEGMENTED NAVIGATION BAR */}
        {/* ========================================================================= */}
        <div className="px-3 py-2 sm:px-5 sm:py-2 bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-0.5 sm:p-1 bg-slate-100/80 dark:bg-slate-950/80 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800">
            {[
              { mode: 'inspect', label: 'Inspect', icon: Search, color: 'text-indigo-500' },
              { mode: 'inbound', label: 'Inbound (+)', icon: Plus, color: 'text-emerald-500' },
              { mode: 'outbound', label: 'Outbound (-)', icon: Minus, color: 'text-rose-500' },
              { mode: 'batch', label: 'Batch Audit', icon: FileSpreadsheet, color: 'text-amber-500' },
              { mode: 'relocate', label: 'Bin Putaway', icon: MapPin, color: 'text-cyan-500' },
              { mode: 'kit_picking', label: 'Kit Pick', icon: ClipboardList, color: 'text-purple-500' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeMode === tab.mode;

              return (
                <button
                  key={tab.mode}
                  type="button"
                  onClick={() => {
                    setActiveMode(tab.mode as ScanOperationMode);
                    setRelocateStep('scan_item');
                  }}
                  className={`py-1.5 px-1 sm:py-2 sm:px-2 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs transition-all flex items-center justify-center gap-1 cursor-pointer text-center truncate ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-xs ring-1 ring-slate-200/80 dark:ring-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : tab.color}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN SCROLLABLE CONTENT BODY */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-4 md:p-5 overflow-y-auto space-y-3 sm:space-y-4 custom-scrollbar flex-1">
          
          {/* Mode Context Description & Customizable Qty Step Bar */}
          <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                {activeMode === 'inspect' && '🔍 Inspect Mode: Component Specs & Real-Time Stock Health'}
                {activeMode === 'inbound' && '📥 Inbound Mode: Quick Intake & Goods Receiving (+ Stock)'}
                {activeMode === 'outbound' && '📤 Outbound Mode: Dispatch Picking & Material Deduction (- Stock)'}
                {activeMode === 'batch' && '📋 Batch Audit: Multi-Scan Session & Valuation Diff Ledger'}
                {activeMode === 'relocate' && '📍 Putaway Mode: Facility Bin Slotting & Relocation'}
                {activeMode === 'kit_picking' && '🧰 Kit BOM Mode: Assembly Picking & Verification Checklist'}
              </span>
            </div>

            {/* Quick Step Quantity Multipliers */}
            {(activeMode === 'inbound' || activeMode === 'outbound' || activeMode === 'batch') && (
              <div className="flex items-center gap-1">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Step:</span>
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
                  {stepPresets.map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setCustomQtyStep(step)}
                      className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        customQtyStep === step
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      +{step}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setStepInputText(stepPresets.join(', '));
                      setIsEditingStepsModal(true);
                    }}
                    className="px-1 py-0.2 text-slate-400 hover:text-indigo-600 text-[9px] cursor-pointer"
                    title="Customize quantity multiplier steps"
                  >
                    <Settings className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Kit Selector for Kit BOM Picking Mode */}
            {activeMode === 'kit_picking' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Target Kit:</span>
                <select
                  value={selectedKitId}
                  onChange={(e) => {
                    setSelectedKitId(e.target.value);
                    setScannedKitItems({});
                  }}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  {kits.map(k => (
                    <option key={k.id} value={k.id}>{k.name} ({k.items?.length || 0} Parts)</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* AUTHENTIC INDUSTRIAL LASER SCANNER HUD & VIEWFINDER */}
          {/* ========================================================================= */}
          <div className="space-y-1.5">
            
            {/* Viewfinder Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {isCameraActive ? 'Live Scanner Active' : 'Optical Viewfinder:'}
                </span>
                
                {/* Camera Switcher Dropdown */}
                {availableCameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      startCameraStream(e.target.value);
                    }}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[160px] truncate"
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
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Switch between front and back camera"
                >
                  <FlipHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Flip
                </button>

                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isTorchOn
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Toggle hardware flashlight"
                >
                  <Flashlight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {isTorchOn ? 'Torch ON' : 'Torch'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsCameraPaused(!isCameraPaused)}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isCameraPaused
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isCameraPaused ? <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                  {isCameraPaused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>

            {/* Video Viewfinder Container with Realistic Scanner HUD */}
            <div className={`relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 border-2 transition-all shadow-xl h-[190px] sm:h-[230px] md:h-[260px] flex items-center justify-center ${
              scanPulse ? 'border-emerald-400 ring-4 ring-emerald-500/40' : 'border-slate-800'
            }`}>
              
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Realistic Industrial Scanner Targeting Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                <div className="w-[72%] max-w-[360px] h-[65%] max-h-[170px] border-2 border-dashed border-indigo-400/50 rounded-2xl relative flex items-center justify-center backdrop-contrast-125">
                  {/* Glowing Corner Brackets */}
                  <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-3 border-l-3 border-cyan-400 rounded-tl-md shadow-[0_0_8px_#22d3ee]" />
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-3 border-r-3 border-cyan-400 rounded-tr-md shadow-[0_0_8px_#22d3ee]" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-3 border-l-3 border-cyan-400 rounded-bl-md shadow-[0_0_8px_#22d3ee]" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-3 border-r-3 border-cyan-400 rounded-br-md shadow-[0_0_8px_#22d3ee]" />

                  {/* Center Optical Crosshair */}
                  <div className="w-6 h-6 flex items-center justify-center opacity-70">
                    <div className="w-full h-0.5 bg-cyan-400/80" />
                    <div className="h-full w-0.5 bg-cyan-400/80 absolute" />
                  </div>

                  {/* Animated High-Intensity Red Laser Sweep Line */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_#f43f5e] animate-pulse" />

                  {/* Target Guide Badge */}
                  <div className="absolute -bottom-3 px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-slate-700 text-[9px] font-mono font-bold text-cyan-300 shadow-lg tracking-wider">
                    {activeMode === 'relocate' && relocateStep === 'scan_bin'
                      ? '🎯 AIM AT DESTINATION BIN'
                      : '🎯 AIM BARCODE / QR HERE'}
                  </div>
                </div>
              </div>

              {/* Camera Loading Overlay */}
              {isStartingCamera && (
                <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center text-white space-y-2 z-10">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs font-bold">Initializing Optical Engine...</span>
                </div>
              )}

              {/* Camera Error / Permission Fallback with 1-Click Mobile Snapper & HTTPS Trigger */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 sm:p-6 text-center text-white space-y-2.5 z-10 animate-fadeIn">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-300 max-w-sm font-medium leading-tight">{cameraError}</p>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {/* Native Mobile Camera Instant Shutter */}
                    <label className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5 transform active:scale-95 transition-all">
                      <Camera className="w-4 h-4 text-cyan-300" />
                      <span>📸 Snap & Scan Camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {/* HTTPS Switcher Button if currently on plain HTTP */}
                    {isCurrentHttp && (
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = window.location.href.replace('http:', 'https:');
                        }}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1"
                        title="Switch to HTTPS to unlock live continuous video scanning"
                      >
                        <Shield className="w-3.5 h-3.5" /> Unlock HTTPS Stream
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => startCameraStream()}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* UNIFIED MANUAL CODE LOOKUP & PHOTO UPLOAD BAR (COMPACT) */}
          {/* ========================================================================= */}
          <div className="p-1 sm:p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
            
            {/* Manual Text Barcode / SKU Input */}
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Scan or type SKU / Barcode (e.g. EL-1, EL-2)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualCode.trim()) {
                    handleCodeScanned(manualCode);
                    setManualCode('');
                  }
                }}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (manualCode.trim()) {
                    handleCodeScanned(manualCode);
                    setManualCode('');
                  }
                }}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg sm:rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
              >
                <Search className="w-3.5 h-3.5" /> Lookup
              </button>

              {/* Photo Barcode Uploader */}
              <label className="flex-1 sm:flex-none py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0">
                <UploadCloud className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{isProcessingFile ? 'Decoding...' : 'Photo Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CUSTOMIZABLE QUICK TEST SAMPLES BAR (COMPACT & HORIZONTALLY SCROLLABLE) */}
          {/* ========================================================================= */}
          <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-500" />
                Quick Test Pinned SKUs ({quickChips.length})
              </span>

              <button
                type="button"
                onClick={() => setIsManagingChipsModal(true)}
                className="text-[9px] sm:text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <PlusCircle className="w-3 h-3" /> + Manage
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 flex-nowrap sm:flex-wrap">
              {quickChips.map((chip) => (
                <button
                  key={chip.code}
                  type="button"
                  onClick={() => handleCodeScanned(chip.code)}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-800 dark:text-slate-200 hover:text-indigo-600 font-mono text-[10px] sm:text-[11px] font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer flex items-center gap-1 group shrink-0"
                >
                  <span>{chip.code}</span>
                  {chip.label && (
                    <span className="text-[9px] text-slate-400 group-hover:text-indigo-500 font-sans">
                      ({chip.label})
                    </span>
                  )}
                </button>
              ))}
            </div>
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
                type="button"
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
          {/* SCANNED ITEM CARD (WITH 1-CLICK COMPONENT QUICK-EDITOR) */}
          {/* ========================================================================= */}
          {scannedItem && (
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-lg space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
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

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Stock</span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {scannedItem.stockQty} {scannedItem.unit}
                    </span>
                  </div>

                  {/* Quick Edit Component Button */}
                  <button
                    type="button"
                    onClick={handleOpenEditItemModal}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Edit component specifications directly in modal"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-500" /> Edit Specs
                  </button>
                </div>
              </div>

              {/* Matched Serialized Unit DNA Banner */}
              {matchedSerial && (
                <div className="p-3.5 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white tracking-wide">
                          SN: {matchedSerial.serialNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {matchedSerial.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Location: {matchedSerial.warehouseId} / {matchedSerial.binId || 'Unassigned'} • Batch: {matchedSerial.batchNumber || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px]">
                    <span className="text-slate-400 block">Unit Cost: ₹{Number(matchedSerial.unitCost || 0).toLocaleString('en-IN')}</span>
                    <span className="text-emerald-400 font-medium">
                      {matchedSerial.warrantyExpiry ? `Warranty to ${new Date(matchedSerial.warrantyExpiry).toLocaleDateString()}` : 'Standard Warranty'}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Storage Bin</span>
                  <strong className="text-slate-900 dark:text-white font-mono flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{scannedItem.binLocation || 'Not Assigned'}</span>
                  </strong>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Unit Cost</span>
                  <strong className="text-slate-900 dark:text-white font-mono flex items-center gap-1 mt-0.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ₹{(scannedItem.unitCost ?? scannedItem.basePrice ?? 0).toFixed(2)}
                  </strong>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Safety Stock</span>
                  <strong className="text-slate-900 dark:text-white font-mono mt-0.5 block">
                    {scannedItem.threshold ?? (scannedItem as any).minSafetyStock ?? 0} {scannedItem.unit}
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
                    <span className="font-bold text-xs text-emerald-950 dark:text-emerald-200">
                      Inbound Goods Intake: +{customQtyStep} {scannedItem.unit}
                    </span>
                    <button
                      type="button"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}

              {activeMode === 'outbound' && (
                <div className="p-4 bg-rose-50/70 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-rose-950 dark:text-rose-200">
                      Outbound Picking Deduct: -{customQtyStep} {scannedItem.unit}
                    </span>
                    <button
                      type="button"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
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
                      type="button"
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
          {/* MODE 4: ADVANCED BATCH OPERATIONS & LIVE AUDIT SUITE */}
          {/* ========================================================================= */}
          {activeMode === 'batch' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Batch Financial Impact & Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Unique SKUs</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {batchSummary.totalItems} <span className="text-xs font-normal text-slate-400">items</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Units</span>
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {batchSummary.totalUnits} <span className="text-xs font-normal text-slate-400">pcs</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Stock Variance</span>
                  <span className={`text-xl font-black font-mono flex items-center gap-1 ${
                    batchSummary.netVarianceUnits > 0
                      ? 'text-emerald-500'
                      : batchSummary.netVarianceUnits < 0
                      ? 'text-rose-500'
                      : 'text-slate-400'
                  }`}>
                    {batchSummary.netVarianceUnits > 0 ? `+${batchSummary.netVarianceUnits}` : batchSummary.netVarianceUnits} pcs
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Valuation Diff</span>
                  <span className={`text-xl font-black font-mono flex items-center gap-1 ${
                    batchSummary.netValueImpact > 0
                      ? 'text-emerald-500'
                      : batchSummary.netValueImpact < 0
                      ? 'text-rose-500'
                      : 'text-slate-400'
                  }`}>
                    {batchSummary.netValueImpact >= 0 ? `+₹${batchSummary.netValueImpact.toFixed(2)}` : `-₹${Math.abs(batchSummary.netValueImpact).toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Main Batch Audit Container */}
              <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-lg space-y-4">
                
                {/* Header & Main Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                      Interactive Batch Multi-Scan Queue ({batchList.length} items)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Select items or use bulk controls to edit quantities, switch actions, and add notes before committing:
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCatalogPicker(!showCatalogPicker)}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add from Catalog
                    </button>

                    <button
                      type="button"
                      onClick={handleExportBatchCSV}
                      disabled={batchList.length === 0}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> CSV
                    </button>

                    <button
                      type="button"
                      onClick={handleCommitBatch}
                      disabled={batchList.length === 0}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" /> Commit Updates
                    </button>
                  </div>
                </div>

                {/* Manual In-Queue Catalog Component Picker */}
                {showCatalogPicker && (
                  <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-indigo-600" />
                        Search & Add Components to Batch Session:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCatalogPicker(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Type component name, barcode, SKU, or category to add..."
                      value={catalogSearchQuery}
                      onChange={(e) => setCatalogSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                    />

                    {filteredCatalogItems.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                        {filteredCatalogItems.map(item => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-900 dark:text-white block truncate">{item.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Stock: {item.stockQty} {item.unit} • {item.barcode || item.sku || item.id}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddToBatch(item, Math.max(1, customQtyStep), 'add');
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] shrink-0 cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add (+{customQtyStep})
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Bulk Action Bar */}
                {batchList.length > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          {selectedBatchIds.size === batchList.length ? (
                            <CheckSquare2 className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                          <span>
                            {selectedBatchIds.size === 0
                              ? `All Items (${batchList.length})`
                              : `${selectedBatchIds.size} of ${batchList.length} Selected`}
                          </span>
                        </button>
                      </div>

                      {/* Bulk Mode Switchers */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Set Action:</span>
                        <button
                          type="button"
                          onClick={() => handleBulkChangeAction('add')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg text-[11px] border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                        >
                          + Set All Add
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkChangeAction('deduct')}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 font-bold rounded-lg text-[11px] border border-rose-200 dark:border-rose-800 cursor-pointer"
                        >
                          - Set All Deduct
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkChangeAction('set')}
                          className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/80 text-cyan-700 dark:text-cyan-300 font-bold rounded-lg text-[11px] border border-cyan-200 dark:border-cyan-800 cursor-pointer"
                        >
                          = Set All Count
                        </button>
                      </div>
                    </div>

                    {/* Bulk Quantity Adjusters & Note Applier */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-700 text-xs">
                      
                      {/* Bulk Quantity Adjusters */}
                      <div className="sm:col-span-6 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Bulk Qty:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleBulkAdjustQty(+1)}
                            className="px-2 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono font-bold cursor-pointer"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkAdjustQty(+5)}
                            className="px-2 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono font-bold cursor-pointer"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkAdjustQty(+10)}
                            className="px-2 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono font-bold cursor-pointer"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkAdjustQty(-1)}
                            className="px-2 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono font-bold cursor-pointer text-rose-500"
                          >
                            -1
                          </button>
                        </div>
                      </div>

                      {/* Bulk Note & Delete Controls */}
                      <div className="sm:col-span-6 flex items-center justify-end gap-1.5">
                        <input
                          type="text"
                          placeholder="Apply PO / audit tag to batch..."
                          value={bulkNoteInput}
                          onChange={(e) => setBulkNoteInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && bulkNoteInput.trim()) {
                              handleBulkApplyNote(bulkNoteInput);
                            }
                          }}
                          className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleBulkApplyNote(bulkNoteInput)}
                          disabled={!bulkNoteInput.trim()}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-[11px] cursor-pointer shrink-0"
                        >
                          Apply Tag
                        </button>

                        <button
                          type="button"
                          onClick={handleBulkDelete}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg cursor-pointer shrink-0"
                          title={selectedBatchIds.size > 0 ? "Delete selected items" : "Clear all items"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Queue Items Table */}
                {batchVarianceList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <Package className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="font-bold">No items in current batch session.</p>
                    <p className="text-[11px]">Aim your camera scanner, use hardware USB gun, or click "+ Add from Catalog".</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto custom-scrollbar">
                    {batchVarianceList.map((item, idx) => {
                      const isSelected = selectedBatchIds.has(item.id);

                      return (
                        <div
                          key={item.id || idx}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                            isSelected
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {/* Left: Selection + Title + Barcode + Live Variance Badge */}
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectItem(item.id)}
                              className="mt-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare2 className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-slate-900 dark:text-white text-xs">{item.name}</span>
                                <span className="font-mono text-slate-400 text-[10px]">({item.code})</span>

                                {/* Live Projected Variance Diff Badge */}
                                <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] flex items-center gap-1 ${
                                  item.diff > 0
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : item.diff < 0
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                }`}>
                                  {item.diff > 0 && <TrendingUp className="w-2.5 h-2.5" />}
                                  {item.diff < 0 && <TrendingDown className="w-2.5 h-2.5" />}
                                  <span>
                                    {item.currentStock} ➔ {item.projectedStock} ({item.diff > 0 ? `+${item.diff}` : item.diff} {item.unit})
                                  </span>
                                </span>
                              </div>

                              {/* Editable Line Note Input */}
                              <input
                                type="text"
                                placeholder="Add PO / Lot / Discrepancy note for this line..."
                                value={item.note || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchList(prev => prev.map((b, i) => i === idx ? { ...b, note: val } : b));
                                }}
                                className="w-full md:w-72 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>

                          {/* Right: Mode Selector + Inline Stepper + Line Valuation */}
                          <div className="flex items-center gap-2.5 flex-wrap justify-end">
                            
                            {/* Action Type Dropdown */}
                            <select
                              value={item.actionType}
                              onChange={(e) => {
                                const val = e.target.value as 'add' | 'deduct' | 'set';
                                setBatchList(prev => prev.map((b, i) => i === idx ? { ...b, actionType: val } : b));
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                item.actionType === 'add'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                  : item.actionType === 'deduct'
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                                  : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700'
                              }`}
                            >
                              <option value="add">+ Add Stock</option>
                              <option value="deduct">- Deduct Stock</option>
                              <option value="set">= Set Physical Count</option>
                            </select>

                            {/* Quantity Stepper */}
                            <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 shadow-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setBatchList(prev => prev.map((b, i) => i === idx ? { ...b, quantity: Math.max(1, b.quantity - 1) } : b));
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  setBatchList(prev => prev.map((b, i) => i === idx ? { ...b, quantity: val } : b));
                                }}
                                className="w-12 text-center font-mono font-bold text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setBatchList(prev => prev.map((b, i) => i === idx ? { ...b, quantity: b.quantity + 1 } : b));
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Financial Impact Label */}
                            <span className="font-mono text-[11px] text-slate-400 w-16 text-right">
                              {item.valueImpact >= 0 ? `+₹${item.valueImpact.toFixed(0)}` : `-₹${Math.abs(item.valueImpact).toFixed(0)}`}
                            </span>

                            {/* Remove Item */}
                            <button
                              type="button"
                              onClick={() => setBatchList(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                              title="Remove item from batch queue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 6: KIT BOM PICKING & ASSEMBLY CHECKLIST CARD */}
          {/* ========================================================================= */}
          {activeMode === 'kit_picking' && activeKit && (
            <div className="p-4 sm:p-5 bg-purple-50/70 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800/80 space-y-4 animate-fadeIn">
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
                  const requiredQty = (req as any).qty || (req as any).quantity || 1;
                  const isPicked = (scannedKitItems[req.componentId] || 0) >= requiredQty;
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
                          Bin: {item?.binLocation || 'Unassigned'} • Req: {requiredQty} {item?.unit || 'pcs'}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold shrink-0 ${
                        isPicked
                          ? 'bg-emerald-500 text-white'
                          : 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                      }`}>
                        {pickedQty}/{requiredQty}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* RECENT SCAN LOG DRAWER */}
          {/* ========================================================================= */}
          {isHistoryOpen && (
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-500" />
                  Recent Scan History & Audit Trail
                </h4>
                <button
                  type="button"
                  onClick={() => setRecentScanLog([])}
                  className="text-[10px] text-slate-400 hover:text-rose-500 font-bold cursor-pointer"
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

      {/* ========================================================================= */}
      {/* 1. IN-MODAL COMPONENT QUICK-EDITOR MODAL */}
      {/* ========================================================================= */}
      {isEditingItemModal && scannedItem && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[100000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                Edit Component Specifications
              </h3>
              <button
                onClick={() => setIsEditingItemModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Component Name *</label>
                <input
                  type="text"
                  required
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={editItemCategory}
                    onChange={(e) => setEditItemCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Storage Bin</label>
                  <input
                    type="text"
                    value={editItemBin}
                    onChange={(e) => setEditItemBin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={editItemCost}
                    onChange={(e) => setEditItemCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={editItemStock}
                    onChange={(e) => setEditItemStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Min Threshold</label>
                  <input
                    type="number"
                    min={0}
                    value={editItemThreshold}
                    onChange={(e) => setEditItemThreshold(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Barcode Code</label>
                  <input
                    type="text"
                    value={editItemBarcode}
                    onChange={(e) => setEditItemBarcode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">SKU</label>
                  <input
                    type="text"
                    value={editItemSku}
                    onChange={(e) => setEditItemSku(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingItemModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save Component
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* 2. MANAGE QUICK TEST BARCODE CHIPS MODAL */}
      {/* ========================================================================= */}
      {isManagingChipsModal && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[100000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                Customize Quick Test Chips
              </h3>
              <button
                onClick={() => setIsManagingChipsModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Chip Form */}
            <form onSubmit={handleAddQuickChip} className="space-y-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white block">+ Pin New Quick SKU / Barcode:</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Barcode Code (e.g. EL-99)"
                  value={newChipCode}
                  onChange={(e) => setNewChipCode(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Label (e.g. Servo Motor)"
                  value={newChipLabel}
                  onChange={(e) => setNewChipLabel(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Pin to Quick Bar
              </button>
            </form>

            {/* Existing Chips List with Delete */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Quick Chips ({quickChips.length}):</span>
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar">
                {quickChips.map((chip) => (
                  <div
                    key={chip.code}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <strong className="text-slate-900 dark:text-white">{chip.code}</strong>
                      {chip.label && <span className="text-slate-400 truncate">({chip.label})</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteQuickChip(chip.code)}
                      className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={handleResetQuickChips}
                className="text-slate-400 hover:text-amber-500 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
              >
                <RotateCcw className="w-3 h-3" /> Reset Defaults
              </button>
              <button
                type="button"
                onClick={() => setIsManagingChipsModal(false)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* 3. CUSTOMIZE QUANTITY MULTIPLIERS MODAL */}
      {/* ========================================================================= */}
      {isEditingStepsModal && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[100000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                Customize Quantity Multipliers
              </h3>
              <button
                onClick={() => setIsEditingStepsModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSteps} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Quantity Step Multipliers (Comma Separated) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1, 6, 12, 24, 48, 100, 500"
                  value={stepInputText}
                  onChange={(e) => setStepInputText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Configure common carton, case, or reel counts (e.g. 1, 10, 50, 100).
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingStepsModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save Steps
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>,
    document.body
  );
}
