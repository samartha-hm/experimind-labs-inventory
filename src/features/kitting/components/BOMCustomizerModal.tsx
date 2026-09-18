import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Save, Sparkles, Upload, Image as ImageIcon, Search, Settings, Clock, Palette, Link as LinkIcon, ZoomIn, Crop } from 'lucide-react';
import { InventoryItem, KitBOM, BOMRequirement } from '@/src/types';
import { uploadImage } from '@/src/utils/storage';
import { useData } from '@/src/DataContext';
import DiffViewer from '@/src/components/DiffViewer';
import SmartSelect from '@/src/shared/components/SmartSelect';
import ItemImage from '@/src/shared/components/ItemImage';
import ImagePreviewModal from '@/src/shared/components/ImagePreviewModal';
import ImageCropStudioModal from '@/src/shared/components/ImageCropStudioModal';
import { STEM_PRESET_IMAGES } from '@/src/utils/itemThumbnailHelper';
import { MASTER_PRODUCTION_ITEMS } from '@/src/data/productionDataset';

interface BOMCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit: KitBOM;
  inventory: InventoryItem[];
  onSaveBOM: (kitId: string, updatedRequirements: BOMRequirement[], updatedKit?: Partial<KitBOM>) => void;
}

export default function BOMCustomizerModal({
  isOpen,
  onClose,
  kit,
  inventory,
  onSaveBOM,
}: BOMCustomizerModalProps) {
  const [requirements, setRequirements] = useState<BOMRequirement[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const { transactions, addInventoryItem } = useData();
  
  const [isUploading, setIsUploading] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showPresetGallery, setShowPresetGallery] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showCropStudio, setShowCropStudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search and Category Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Zoom Lightbox Modal
  const [zoomItem, setZoomItem] = useState<{
    imageUrl?: string;
    title: string;
    category?: string;
    stockQty?: number;
    unit?: string;
  } | null>(null);

  // Reset state when kit changes
  useEffect(() => {
    if (isOpen && kit) {
      setRequirements([...(kit.items || [])]);
      setName(kit.name || '');
      setDescription(kit.description || '');
      setPreviewUrl(kit.imageUrl || null);
      setNewImageFile(null);
      setCustomUrlInput('');
      setShowPresetGallery(false);
      setShowUrlInput(false);
      setSearchTerm('');
      setSelectedCategory('all');
      setSelectedPartId('');
    }
  }, [isOpen, kit]);

  if (!isOpen) return null;

  const handleQtyChange = (componentId: string, newQtyVal: number) => {
    setRequirements((prev) =>
      prev.map((req) =>
        req.componentId === componentId
          ? { ...req, qty: Math.max(1, newQtyVal) }
          : req
      )
    );
  };

  const handleRemovePart = (componentId: string) => {
    setRequirements((prev) => prev.filter((req) => req.componentId !== componentId));
  };

  const handleAddPart = async (partId: string) => {
    if (!partId) return;

    if (requirements.some((req) => req.componentId === partId)) {
      alert('This component is already in the Bill of Materials!');
      return;
    }

    // Check if it exists in live inventory or is from master production catalog
    let actualPartId = partId;
    const existsInInv = inventory.some(i => i.id === partId);

    if (!existsInInv && partId.startsWith('master_')) {
      const masterId = partId.replace('master_', '');
      const masterItem = MASTER_PRODUCTION_ITEMS.find(m => m.id === masterId);
      if (masterItem) {
        // Auto-provision or register in inventory
        const newId = await addInventoryItem({
          name: masterItem.materialName,
          category: masterItem.pouchCategory || 'General Components',
          stockQty: 50,
          unit: masterItem.unit || 'pcs',
          threshold: 10,
          basePrice: masterItem.unitCost || 0,
          isCommon: false
        });
        if (newId) actualPartId = newId;
      }
    }

    setRequirements((prev) => [
      ...prev,
      { componentId: actualPartId, qty: Math.max(1, parseInt(partQty) || 1) },
    ]);

    setSelectedPartId('');
    setPartQty('1');
    setSearchTerm('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setNewImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setShowPresetGallery(false);
      setShowUrlInput(false);
    }
  };

  const handleSelectPreset = (url: string) => {
    setPreviewUrl(url);
    setNewImageFile(null);
    setShowPresetGallery(false);
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      setPreviewUrl(customUrlInput.trim());
      setNewImageFile(null);
      setShowUrlInput(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return alert('Kit name is required.');
    setIsUploading(true);
    try {
      let imageUrl = previewUrl || kit.imageUrl;
      if (newImageFile) {
        imageUrl = await uploadImage(newImageFile, `kits/${Date.now()}_${newImageFile.name}`);
      }
      onSaveBOM(kit.id, requirements, { name: name.trim(), description: description.trim(), imageUrl });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save changes.");
    } finally {
      setIsUploading(false);
    }
  };

  const PREDEFINED_CATS = [
    'Prastuti Science',
    'Electronics',
    'Stationary',
    'others',
    'Chemicals',
    'Box',
    'Prastuti Maths',
    'Anubhav',
    'kits',
    'IQNAAX',
    'Maths kits'
  ];

  const categories = Array.from(
    new Set([...PREDEFINED_CATS, ...inventory.map((inv) => inv.category).filter(Boolean)])
  );

  // Combined inventory + Master Production Items
  const allCatalogOptions = useMemo(() => {
    const list: { id: string; name: string; category: string; stockQty: number; unit: string; imageUrl?: string; isMaster?: boolean }[] = [];

    inventory.forEach(inv => {
      if (!requirements.some(r => r.componentId === inv.id)) {
        list.push({
          id: inv.id,
          name: inv.name,
          category: inv.category,
          stockQty: inv.stockQty,
          unit: inv.unit,
          imageUrl: inv.imageUrl,
          isMaster: false
        });
      }
    });

    (MASTER_PRODUCTION_ITEMS || []).forEach(m => {
      const alreadyInInv = inventory.some(i => i.name.toLowerCase() === m.materialName.toLowerCase());
      if (!alreadyInInv && !requirements.some(r => r.componentId === `master_${m.id}`)) {
        list.push({
          id: `master_${m.id}`,
          name: m.materialName,
          category: m.pouchCategory,
          stockQty: 0,
          unit: m.unit || 'pcs',
          isMaster: true
        });
      }
    });

    return list;
  }, [inventory, requirements]);

  const filteredParts = allCatalogOptions.filter((part) => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' ||
      selectedCategory === 'ALL' ||
      (part.category && part.category.trim().toLowerCase() === selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-4xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-0">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">Customize Bill of Materials (BOM)</h2>
              <p className="text-xs text-slate-500 font-medium">{kit.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-bold text-xs transition-colors cursor-pointer ${
              activeTab === 'editor' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-white dark:bg-slate-900' : 'text-slate-500 hover:bg-slate-100/60'
            }`}
          >
            <Settings className="w-4 h-4" /> BOM Structure & Properties
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-bold text-xs transition-colors cursor-pointer ${
              activeTab === 'history' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-white dark:bg-slate-900' : 'text-slate-500 hover:bg-slate-100/60'
            }`}
          >
            <Clock className="w-4 h-4" /> Revision History
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'editor' && (
            <div className="space-y-6">
              {/* Section 1: Kit Metadata Profile */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl relative group">
                  <div
                    className="w-24 h-24 rounded-2xl bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shadow-xs relative cursor-pointer"
                    onClick={() => {
                      if (previewUrl) {
                        setZoomItem({
                          imageUrl: previewUrl,
                          title: name || kit.name,
                          category: 'Composite Kit Profile',
                          stockQty: undefined
                        });
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    title="Click to zoom high-res photo"
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    )}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                      {previewUrl ? 'Zoom / Edit' : 'Upload'}
                    </div>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageChange}
                  />

                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                    {previewUrl && (
                      <button
                        type="button"
                        onClick={() => setShowCropStudio(true)}
                        className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-lg transition-colors cursor-pointer hover:bg-emerald-100"
                        title="Crop, rotate, and enhance kit photo"
                      >
                        <Crop className="w-3 h-3" /> Crop
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowPresetGallery(!showPresetGallery);
                        setShowUrlInput(false);
                      }}
                      className="flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Palette className="w-3 h-3" /> Presets
                    </button>
                  </div>

                  {/* Preset Gallery */}
                  {showPresetGallery && (
                    <div className="mt-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 w-full z-10 shadow-lg animate-fadeIn">
                      <div className="text-[9px] font-bold text-slate-500 uppercase">STEM Preset</div>
                      <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto">
                        {STEM_PRESET_IMAGES.map((preset) => (
                          <div
                            key={preset.id}
                            onClick={() => handleSelectPreset(preset.url)}
                            className="group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-indigo-500 cursor-pointer relative aspect-square shadow-2xs"
                            title={preset.name}
                          >
                            <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-8 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Kit Profile Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Description / Assembly Guidelines
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Component Catalog Finder */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Add Component from Inventory & Curriculum Catalog ({allCatalogOptions.length} items available)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-4">
                    <SmartSelect
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                      options={[
                        { value: 'all', label: 'All Categories' },
                        ...categories.map((c) => ({ value: c, label: c })),
                      ]}
                      size="sm"
                      placeholder="All Categories"
                      aria-label="Filter parts by category"
                    />
                  </div>
                  <div className="sm:col-span-5 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search parts by name, SKU, or master curriculum..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3 flex gap-1.5">
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Qty</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={partQty}
                        onChange={(e) => setPartQty(e.target.value)}
                        className="w-12 bg-transparent py-2 text-center text-xs focus:outline-none font-mono font-bold text-slate-700 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!selectedPartId}
                      onClick={() => handleAddPart(selectedPartId)}
                      className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-xs ${
                        selectedPartId
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>

                {/* Catalog items with 40x40 thumbnails */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredParts.length > 0 ? (
                    filteredParts.map((part) => (
                      <div
                        key={part.id}
                        onClick={() => setSelectedPartId(part.id)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors gap-3 ${
                          selectedPartId === part.id ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-l-4 border-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden relative cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomItem({
                                imageUrl: part.imageUrl,
                                title: part.name,
                                category: part.category,
                                stockQty: part.stockQty,
                                unit: part.unit
                              });
                            }}
                            title="Click to zoom image"
                          >
                            <ItemImage
                              src={part.imageUrl}
                              alt={part.name}
                              category={part.category}
                              className="w-full h-full object-contain p-0.5"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                              <span>{part.name}</span>
                              {part.isMaster && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  Curriculum Master
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              {part.category}
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 font-medium shrink-0">
                          {part.isMaster ? (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">Standard Catalog</span>
                          ) : (
                            <>Stock: <span className="font-mono font-bold">{part.stockQty}</span> {part.unit}</>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No matching parts available in the catalog.
                    </div>
                  )}
                </div>
              </div>
              
              {/* Active BOM list with thumbnails */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Composite Bill of Materials List ({requirements.length} parts)
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {requirements.length > 0 ? (
                    requirements.map((req) => {
                      const part = inventory.find((inv) => inv.id === req.componentId);
                      const partName = part ? part.name : `Component #${req.componentId}`;
                      const partCat = part?.category || 'General';
                      const partImg = part?.imageUrl;

                      return (
                        <div key={req.componentId} className="p-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shadow-2xs">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden relative cursor-pointer group"
                              onClick={() => {
                                setZoomItem({
                                  imageUrl: partImg,
                                  title: partName,
                                  category: partCat,
                                  stockQty: part?.stockQty,
                                  unit: part?.unit
                                });
                              }}
                              title="Click to zoom image"
                            >
                              <ItemImage
                                src={partImg}
                                alt={partName}
                                category={partCat}
                                className="w-full h-full object-contain p-0.5"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <ZoomIn className="w-3.5 h-3.5" />
                              </div>
                            </div>

                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">{partName}</span>
                              <span className="text-[9px] font-mono text-slate-400">{partCat}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-medium">Needed:</span>
                              <input
                                type="number"
                                min="1"
                                value={req.qty}
                                onChange={(e) => handleQtyChange(req.componentId, parseInt(e.target.value) || 1)}
                                className="w-14 text-center font-mono text-xs font-bold text-slate-700 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 focus:outline-none"
                              />
                            </div>
                            <button onClick={() => handleRemovePart(req.componentId)} className="p-1.5 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-slate-400 py-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                      No parts selected. Use the search finder above to add parts to this composite kit.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              {transactions
                .filter(tx => (tx.kitName === kit.name || tx.description.toLowerCase().includes(kit.name.toLowerCase())) && tx.diffs && tx.diffs.length > 0)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map(tx => (
                  <div key={tx.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-slate-800">{tx.description}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-slate-700">{tx.userName || 'Guest Administrator'}</span>
                          <span className="text-[9px] uppercase px-1 rounded bg-indigo-100 text-indigo-800 font-bold">{tx.userRole || 'admin'}</span>
                          <span>•</span>
                          <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {tx.diffs?.map((diff, idx) => {
                        let fieldName = diff.field;
                        let oldV = diff.oldValue;
                        let newV = diff.newValue;
                        if (fieldName === 'added_component' && newV) {
                          const part = inventory.find(i => i.id === newV);
                          fieldName = 'Added Component';
                          newV = part ? part.name : newV;
                        } else if (fieldName === 'removed_component' && oldV) {
                          const part = inventory.find(i => i.id === oldV);
                          fieldName = 'Removed Component';
                          oldV = part ? part.name : oldV;
                        } else if (fieldName.startsWith('qty_')) {
                          const partId = fieldName.replace('qty_', '');
                          const part = inventory.find(i => i.id === partId);
                          fieldName = `Quantity of ${part ? part.name : partId}`;
                        }
                        return (
                          <DiffViewer 
                            key={idx}
                            label={fieldName}
                            oldValue={oldV}
                            newValue={newV}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              {transactions.filter(tx => (tx.kitName === kit.name || tx.description.toLowerCase().includes(kit.name.toLowerCase())) && tx.diffs && tx.diffs.length > 0).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No revision history found for this kit's BOM.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === 'editor' && (
          <div className="border-t border-slate-100 bg-white p-5 flex items-center justify-between sticky bottom-0">
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-slate-400 uppercase tracking-widest">{requirements.length} Components</span>
              <span className="font-mono text-indigo-600 font-black">
                Total Material Cost: ₹{requirements.reduce((sum, req) => {
                  const part = inventory.find((inv) => inv.id === req.componentId);
                  const cost = Number(part?.unitCost ?? part?.basePrice ?? 0);
                  return sum + (cost * req.qty);
                }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                {isUploading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Configuration
              </button>
            </div>
          </div>
        )}
      </div>

      {zoomItem && (
        <ImagePreviewModal
          isOpen={!!zoomItem}
          onClose={() => setZoomItem(null)}
          imageUrl={zoomItem.imageUrl}
          title={zoomItem.title}
          category={zoomItem.category}
          stockQty={zoomItem.stockQty}
          unit={zoomItem.unit}
          editable={true}
          onSaveImage={(newUrl) => {
            setPreviewUrl(newUrl);
            setNewImageFile(null);
          }}
        />
      )}

      {showCropStudio && previewUrl && (
        <ImageCropStudioModal
          isOpen={showCropStudio}
          onClose={() => setShowCropStudio(false)}
          imageSrc={previewUrl}
          itemName={name || kit.name || 'Kit Profile Photo'}
          itemCategory="STEM Composite Kit"
          initialAspect={16 / 9}
          onSave={(croppedUrl) => {
            setPreviewUrl(croppedUrl);
            setNewImageFile(null);
            setShowCropStudio(false);
          }}
        />
      )}
    </div>,
    document.body
  );
}
