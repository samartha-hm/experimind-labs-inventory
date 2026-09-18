import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Image as ImageIcon, Package, Clock, Settings, MapPin, Cpu, Sparkles, ZoomIn, Link as LinkIcon, Check, Crop } from 'lucide-react';
import { InventoryItem, KitBOM } from '@/src/types';
import { uploadImage } from '@/src/utils/storage';
import { useData } from '@/src/DataContext';
import DiffViewer from '@/src/components/DiffViewer';
import ItemImage from '@/src/shared/components/ItemImage';
import ImagePreviewModal from '@/src/shared/components/ImagePreviewModal';
import ImageCropStudioModal from '@/src/shared/components/ImageCropStudioModal';
import { STEM_PRESET_IMAGES, getItemThumbnailUrl } from '@/src/utils/itemThumbnailHelper';
import { MASTER_PRODUCTION_ITEMS } from '@/src/data/productionDataset';

interface EditPartModalProps {
  item: InventoryItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  existingCategories: string[];
  kits?: KitBOM[];
}

export default function EditPartModal({
  item,
  isOpen,
  onClose,
  onSave,
  existingCategories,
  kits = [],
}: EditPartModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const { transactions, bins = [], warehouses = [], inventory = [] } = useData() as any;

  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [stock, setStock] = useState(item.stockQty.toString());
  const [unitCost, setUnitCost] = useState((item.unitCost ?? item.basePrice ?? 0).toString());
  const [unit, setUnit] = useState(item.unit);
  const [threshold, setThreshold] = useState(item.threshold.toString());
  const [binLocation, setBinLocation] = useState(item.binLocation || '');
  const [assignedKitName, setAssignedKitName] = useState(item.assignedKitName || '');
  const [isCommon, setIsCommon] = useState(item.isCommon || false);
  const [imageUrl, setImageUrl] = useState(item.imageUrl || '');
  const [mpn, setMpn] = useState(item.mpn || '');
  const [manufacturer, setManufacturer] = useState(item.manufacturer || '');
  const [packageFootprint, setPackageFootprint] = useState(item.package_footprint || item.packageFootprint || '');
  const [mountingType, setMountingType] = useState(item.mounting_type || item.mountingType || 'SMD');
  const [mslRating, setMslRating] = useState(item.msl_rating || item.mslRating || 'MSL 1');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [showCropStudio, setShowCropStudio] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Standard item suggestions from curriculum + inventory
  const standardItemSuggestions = useMemo(() => {
    const map = new Map<string, { name: string; category?: string; unit?: string; unitCost?: number; bin?: string }>();
    MASTER_PRODUCTION_ITEMS.forEach(p => {
      if (p.materialName && !map.has(p.materialName)) {
        map.set(p.materialName, {
          name: p.materialName,
          category: p.pouchCategory ? p.pouchCategory.replace('_', ' ') : 'STEM Activity',
          unit: p.unit || 'pcs',
          unitCost: p.unitCost || 0,
          bin: p.warehouseBin || ''
        });
      }
    });
    inventory.forEach((inv: InventoryItem) => {
      if (inv.name && !map.has(inv.name)) {
        map.set(inv.name, {
          name: inv.name,
          category: inv.category,
          unit: inv.unit,
          unitCost: inv.unitCost ?? inv.basePrice,
          bin: inv.binLocation
        });
      }
    });
    return Array.from(map.values());
  }, [inventory]);

  const handleSelectSuggestion = (sug: { name: string; category?: string; unit?: string; unitCost?: number; bin?: string }) => {
    setName(sug.name);
    if (sug.category && (!category || category === 'Uncategorized')) setCategory(sug.category);
    if (sug.unit) setUnit(sug.unit);
    if (sug.unitCost) setUnitCost(sug.unitCost.toString());
    if (sug.bin && !binLocation) setBinLocation(sug.bin);
    if (!imageUrl && !imageFile) {
      setImageUrl(getItemThumbnailUrl({ name: sug.name, category: sug.category }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      setName(item.name);
      setCategory(item.category);
      setStock(item.stockQty.toString());
      setUnitCost((item.unitCost ?? item.basePrice ?? 0).toString());
      setUnit(item.unit);
      setThreshold(item.threshold.toString());
      setBinLocation(item.binLocation || '');
      setAssignedKitName(item.assignedKitName || '');
      setIsCommon(item.isCommon || false);
      setMpn(item.mpn || '');
      setManufacturer(item.manufacturer || '');
      setPackageFootprint(item.package_footprint || item.packageFootprint || '');
      setMountingType(item.mounting_type || item.mountingType || 'SMD');
      setMslRating(item.msl_rating || item.mslRating || 'MSL 1');
      setImageUrl(item.imageUrl || '');
      setImageFile(null);
      setShowPresets(false);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      let finalImageUrl = imageUrl || item.imageUrl || '';
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile, `inventory/${Date.now()}_${imageFile.name}`);
      }

      await onSave(item.id, {
        name: name.trim(),
        category,
        stockQty: Math.max(0, parseInt(stock) || 0),
        unitCost: Math.max(0, parseFloat(unitCost) || 0),
        basePrice: Math.max(0, parseFloat(unitCost) || 0),
        unit: unit || 'pcs',
        threshold: Math.max(0, parseInt(threshold) || 0),
        binLocation: binLocation.trim() || undefined,
        assignedKitName: assignedKitName.trim() || undefined,
        isCommon,
        imageUrl: finalImageUrl || undefined,
        mpn: mpn.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        package_footprint: packageFootprint.trim() || undefined,
        packageFootprint: packageFootprint.trim() || undefined,
        mounting_type: mountingType || undefined,
        mountingType: mountingType || undefined,
        msl_rating: mslRating || undefined,
        mslRating: mslRating || undefined,
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] border border-slate-200 dark:border-slate-800 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-0">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Edit Component Properties
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-100 bg-slate-50/60">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-bold text-xs transition-colors cursor-pointer ${
              activeTab === 'details' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:bg-slate-100/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            Properties & Storage Location
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-bold text-xs transition-colors cursor-pointer ${
              activeTab === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:bg-slate-100/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            Revision History
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 space-y-6">
          {activeTab === 'details' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer"
                    onClick={() => setIsZoomOpen(true)}
                    title="Click to zoom image"
                  >
                    {imageFile ? (
                      <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                    ) : imageUrl ? (
                      <ItemImage src={imageUrl} alt={name || item.name} category={category || item.category} className="w-full h-full object-cover" />
                    ) : (
                      <ItemImage src={item.imageUrl} alt={name || item.name} category={category || item.category} className="w-full h-full object-cover" />
                    )}

                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="bg-white/90 text-slate-900 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-white cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsZoomOpen(true);
                        }}
                        className="bg-indigo-600 text-white text-[10px] font-bold p-1 rounded-lg hover:bg-indigo-700 cursor-pointer"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setImageFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => setShowPresets(!showPresets)}
                      className="flex-1 py-1 px-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border border-indigo-200"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      Presets
                    </button>
                    {(imageUrl || imageFile || item.imageUrl) && (
                      <button
                        type="button"
                        onClick={() => setShowCropStudio(true)}
                        className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border border-slate-300"
                        title="Crop and tune component photo"
                      >
                        <Crop className="w-3 h-3 text-indigo-600" />
                        Crop
                      </button>
                    )}
                    {(imageUrl || imageFile) && (
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImageUrl('');
                        }}
                        className="py-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-rose-200"
                        title="Reset to default auto-thumbnail"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  {/* STEM Preset Image Selector Panel */}
                  {showPresets && (
                    <div className="p-3 bg-slate-50 border border-indigo-200 rounded-2xl space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-900 uppercase">Select Standard STEM Photo</span>
                        <button
                          type="button"
                          onClick={() => setShowPresets(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto pr-1">
                        {STEM_PRESET_IMAGES.map((preset) => (
                          <div
                            key={preset.id}
                            onClick={() => {
                              setImageUrl(preset.url);
                              setImageFile(null);
                              setShowPresets(false);
                            }}
                            className={`group relative rounded-xl border p-1 cursor-pointer transition-all hover:scale-105 ${
                              imageUrl === preset.url ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <img src={preset.url} alt={preset.name} className="w-full h-10 object-cover rounded-lg" />
                            <div className="text-[9px] font-bold text-slate-700 truncate mt-1 text-center">{preset.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Part Name * (Standard Suggestions Available)
                      </label>
                      <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Auto-fill on select
                      </span>
                    </div>
                    <input
                      type="text"
                      list="edit-part-name-suggestions"
                      value={name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setName(val);
                        const match = standardItemSuggestions.find(s => s.name.toLowerCase() === val.toLowerCase());
                        if (match) {
                          handleSelectSuggestion(match);
                        }
                      }}
                      placeholder="Type or select standard STEM material..."
                      className="w-full text-xs font-bold text-slate-800 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                    />
                    <datalist id="edit-part-name-suggestions">
                      {standardItemSuggestions.map((sug, idx) => (
                        <option key={`${sug.name}-${idx}`} value={sug.name}>
                          {sug.category ? `[${sug.category}]` : ''} {sug.unitCost ? `(₹${sug.unitCost}/${sug.unit || 'pcs'})` : ''}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        list="edit-category-options"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-bold"
                      />
                      <datalist id="edit-category-options">
                        {existingCategories.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Unit Cost (₹ INR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                        className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-bold font-mono"
                      />
                    </div>
                  </div>

                  {/* Image URL Direct Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <LinkIcon className="w-3 h-3 text-slate-400" />
                      Image Web URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... or cloud image URL"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setImageFile(null);
                      }}
                      className="w-full text-xs text-slate-700 border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dedicated Storage Bin Location Selector */}
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2.5">
                <label className="block text-[10px] font-bold text-amber-950 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    Storage Bin Location (Warehouse Shelf / Rack)
                  </span>
                  <span className="text-[10px] text-amber-700 font-mono font-normal">Physical Stock Location</span>
                </label>
                <input
                  type="text"
                  list="warehouse-bin-options"
                  placeholder="e.g. Rack - Shelf 1, Rack A - Bin 02, Shelf 3-B..."
                  value={binLocation}
                  onChange={(e) => setBinLocation(e.target.value)}
                  className="w-full text-xs font-bold text-slate-900 border border-amber-300 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <datalist id="warehouse-bin-options">
                  {bins.map((b: any) => (
                    <option key={b.id} value={b.code}>{b.code} ({b.description || b.warehouseCode})</option>
                  ))}
                  <option value="Rack - Shelf 1" />
                  <option value="Rack - Shelf 2" />
                  <option value="Rack - Shelf 3" />
                  <option value="Rack 1, Shelf A" />
                  <option value="Rack 1, Shelf B" />
                  <option value="Rack 2, Shelf A" />
                  <option value="Bin A-01" />
                  <option value="Bin A-02" />
                  <option value="Chemical Storage Cabinet" />
                  <option value="Electronics Cleanroom Rack" />
                </datalist>
                <p className="text-[10px] text-amber-800">
                  Select from configured bins or enter a custom shelf location identifier.
                </p>
              </div>

              {/* Associated Composite Kit Option */}
              <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
                <label className="block text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-purple-600" />
                  Associated Composite Kit (Optional)
                </label>
                <input
                  type="text"
                  list="kit-options-list"
                  placeholder="e.g. Prastuti Science Experiment Set, Electronics Innovation Kit..."
                  value={assignedKitName}
                  onChange={(e) => setAssignedKitName(e.target.value)}
                  className="w-full text-xs text-slate-800 border border-purple-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-bold"
                />
                <datalist id="kit-options-list">
                  {kits.map((k) => (
                    <option key={k.id} value={k.name} />
                  ))}
                  <option value="Prastuti Science Experiment Set" />
                  <option value="Electronics Innovation Kit" />
                  <option value="Prastuti Maths Activity Set" />
                </datalist>
              </div>

              {/* Hardware & Electronics Engineering Specs (IPC / JEDEC Standards) */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl space-y-3">
                <label className="block text-[10px] font-bold text-indigo-950 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    Hardware & Electronics Specs (IPC / JEDEC)
                  </span>
                  <span className="text-[10px] text-indigo-700 font-mono font-normal">PCBA & SMT Parameters</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      MPN (Mfg Part Number)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ESP32-WROOM-32E, STM32F401, RC0603..."
                      value={mpn}
                      onChange={(e) => setMpn(e.target.value)}
                      className="w-full text-xs font-mono font-bold text-slate-800 border border-indigo-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Espressif, STMicroelectronics, TI, Yageo..."
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 border border-indigo-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Package / Footprint
                    </label>
                    <input
                      type="text"
                      list="footprint-options"
                      placeholder="e.g. 0402, 0603, QFN-32..."
                      value={packageFootprint}
                      onChange={(e) => setPackageFootprint(e.target.value)}
                      className="w-full text-xs font-mono font-bold text-slate-800 border border-indigo-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <datalist id="footprint-options">
                      <option value="0201" />
                      <option value="0402" />
                      <option value="0603" />
                      <option value="0805" />
                      <option value="1206" />
                      <option value="SOT-23" />
                      <option value="SOIC-8" />
                      <option value="SOIC-16" />
                      <option value="QFN-16" />
                      <option value="QFN-32" />
                      <option value="LQFP-48" />
                      <option value="LQFP-64" />
                      <option value="DIP-8" />
                      <option value="DIP-16" />
                      <option value="TO-220" />
                      <option value="MODULE" />
                      <option value="HEADER-2.54mm" />
                      <option value="CHASSIS" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Mounting Type
                    </label>
                    <select
                      value={mountingType}
                      onChange={(e) => setMountingType(e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 border border-indigo-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="SMD">SMD (Surface Mount)</option>
                      <option value="THT">THT (Through-Hole)</option>
                      <option value="CHASSIS">Chassis Mount</option>
                      <option value="PANEL">Panel Mount</option>
                      <option value="OTHER">Other / Mechanical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      MSL Rating
                    </label>
                    <select
                      value={mslRating}
                      onChange={(e) => setMslRating(e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 border border-indigo-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="MSL 1">MSL 1 (Unlimited)</option>
                      <option value="MSL 2">MSL 2 (1 Year)</option>
                      <option value="MSL 2a">MSL 2a (4 Weeks)</option>
                      <option value="MSL 3">MSL 3 (168 Hours)</option>
                      <option value="MSL 4">MSL 4 (72 Hours)</option>
                      <option value="MSL 5">MSL 5 (48 Hours)</option>
                      <option value="MSL 5a">MSL 5a (24 Hours)</option>
                      <option value="MSL 6">MSL 6 (Mandatory Bake)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Current Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full text-xs font-mono text-slate-800 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Safety Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full text-xs font-mono text-slate-800 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isCommon}
                  onChange={(e) => setIsCommon(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Unlimited / Common Part</div>
                  <div className="text-[11px] text-slate-500">
                    Enable this if stock quantity does not need to be strictly decremented in kits.
                  </div>
                </div>
              </label>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              {transactions
                .filter((tx: any) => (tx.items?.some((i: any) => i.componentId === item.id) || tx.description?.toLowerCase().includes(item.name.toLowerCase())) && tx.diffs && tx.diffs.length > 0)
                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((tx: any) => (
                  <div key={tx.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{tx.description}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                          <span className="font-bold text-slate-700">{tx.userName || 'Staff'}</span>
                          <span>•</span>
                          <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {tx.diffs?.map((diff: any, idx: number) => (
                        <DiffViewer 
                          key={idx}
                          label={diff.field}
                          oldValue={diff.oldValue}
                          newValue={diff.newValue}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              {transactions.filter((tx: any) => (tx.items?.some((i: any) => i.componentId === item.id) || tx.description?.toLowerCase().includes(item.name.toLowerCase())) && tx.diffs && tx.diffs.length > 0).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  No property revisions recorded for this item.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span> : null}
            Save Changes
          </button>
        </div>
      </div>

      {isZoomOpen && (
        <ImagePreviewModal
          isOpen={isZoomOpen}
          onClose={() => setIsZoomOpen(false)}
          imageUrl={imageFile ? URL.createObjectURL(imageFile) : imageUrl || item.imageUrl}
          title={name || item.name}
          category={category || item.category}
          stockQty={parseInt(stock) || item.stockQty}
          unit={unit || item.unit}
          binLocation={binLocation || item.binLocation}
          editable={true}
          onSaveImage={(newImg) => {
            setImageUrl(newImg);
            setImageFile(null);
          }}
        />
      )}

      {showCropStudio && (
        <ImageCropStudioModal
          isOpen={showCropStudio}
          onClose={() => setShowCropStudio(false)}
          imageSrc={imageFile ? URL.createObjectURL(imageFile) : imageUrl || item.imageUrl || ''}
          itemName={name || item.name}
          itemCategory={category || item.category}
          onSave={(croppedUrl) => {
            setImageUrl(croppedUrl);
            setImageFile(null);
            setShowCropStudio(false);
          }}
        />
      )}
    </div>,
    document.body
  );
}
