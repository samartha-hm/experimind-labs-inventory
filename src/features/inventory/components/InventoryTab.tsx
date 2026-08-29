import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Plus,
  Minus,
  AlertTriangle,
  FolderOpen,
  Trash2,
  Upload,
  Image as ImageIcon,
  Edit2,
  X,
  Box,
  DollarSign,
  MapPin,
  Tag,
  Layers,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronRight,
  TrendingDown,
  AlertCircle,
  Infinity as InfinityIcon,
  ShoppingCart,
  CheckCircle2,
  QrCode,
  Printer,
  Copy,
  Barcode,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { InventoryItem, KitBOM } from '@/src/types';
import EditPartModal from '@/src/features/inventory/components/EditPartModal';
import SerialNumbersModal from '@/src/features/inventory/components/SerialNumbersModal';
import { BulkImportModal } from '@/src/features/inventory/components/BulkImportModal';
import ItemImage from '@/src/shared/components/ItemImage';
import { uploadImage } from '@/src/utils/storage';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

interface InventoryTabProps {
  inventory: InventoryItem[];
  kits?: KitBOM[];
  onUpdateStock: (id: string, newQty: number) => void;
  onUpdateThreshold: (id: string, newThreshold: number) => void;
  onAddComponent: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  onUpdateComponent: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  onDeleteComponent: (id: string) => void;
  onResetInventory: () => void;
  onOpenBarcodeStudio?: () => void;
  onOpenBarcodeScanner?: () => void;
}

export default function InventoryTab({
  inventory,
  kits = [],
  onUpdateStock,
  onUpdateThreshold,
  onAddComponent,
  onUpdateComponent,
  onDeleteComponent,
  onResetInventory,
  onOpenBarcodeStudio,
  onOpenBarcodeScanner,
}: InventoryTabProps) {
  const { bins = [], logTransaction } = useData() as any;
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [sortKey, setSortKey] = useState<string>('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [drawerItem, setDrawerItem] = useState<InventoryItem | null>(null);

  // New Component Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [newStock, setNewStock] = useState('0');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newThreshold, setNewThreshold] = useState('10');
  const [newBinLocation, setNewBinLocation] = useState('');
  const [newAssignedKitName, setNewAssignedKitName] = useState('');
  const [newIsCommon, setNewIsCommon] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
  const [serialModalItemId, setSerialModalItemId] = useState<string | undefined>(undefined);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [itemSteps, setItemSteps] = useState<Record<string, number>>({});

  // Quick Relocate Modal State
  const [quickRelocateItem, setQuickRelocateItem] = useState<InventoryItem | null>(null);
  const [targetBinLocation, setTargetBinLocation] = useState<string>('');

  const getItemStep = (id: string) => itemSteps[id] ?? 1;
  const setItemStep = (id: string, val: number) => {
    setItemSteps(prev => ({ ...prev, [id]: Math.max(1, isNaN(val) ? 1 : val) }));
  };

  const PREDEFINED_CATEGORIES = useMemo(() => [
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
  ], []);

  const getCategoryBadgeStyle = (category?: string) => {
    switch (category) {
      case 'Prastuti Science':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' };
      case 'Electronics':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80', dot: 'bg-indigo-500' };
      case 'Stationary':
        return { bg: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500' };
      case 'Chemicals':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' };
      case 'Box':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200/80', dot: 'bg-blue-500' };
      case 'Prastuti Maths':
        return { bg: 'bg-sky-50 text-sky-700 border-sky-200/80', dot: 'bg-sky-500' };
      case 'Anubhav':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200/80', dot: 'bg-purple-500' };
      case 'kits':
        return { bg: 'bg-teal-50 text-teal-700 border-teal-200/80', dot: 'bg-teal-500' };
      case 'IQNAAX':
        return { bg: 'bg-yellow-50 text-yellow-800 border-yellow-200/80', dot: 'bg-yellow-500' };
      case 'Maths kits':
        return { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200/80', dot: 'bg-cyan-500' };
      case 'others':
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200/80', dot: 'bg-slate-500' };
      default:
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200/80', dot: 'bg-slate-400' };
    }
  };

  const allExistingCategories = useMemo(() => {
    const cats = new Set<string>(PREDEFINED_CATEGORIES);
    inventory.forEach((item) => {
      if (item.category && item.category.trim() !== '') {
        cats.add(item.category.trim());
      }
    });
    return Array.from(cats);
  }, [inventory, PREDEFINED_CATEGORIES]);

  const allBinLocations = useMemo(() => {
    const locs = new Set<string>();
    bins.forEach((b: any) => locs.add(b.code));
    inventory.forEach((i) => {
      if (i.binLocation && i.binLocation.trim() !== '') {
        locs.add(i.binLocation.trim());
      }
    });
    return Array.from(locs);
  }, [bins, inventory]);

  const filteredAndSortedInventory = useMemo(() => {
    const filtered = inventory.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.binLocation && item.binLocation.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' || selectedCategory === 'ALL' ||
        (item.category && item.category.trim().toLowerCase() === selectedCategory.toLowerCase());

      const matchesLocation =
        selectedLocation === 'All' || selectedLocation === 'ALL' ||
        (selectedLocation === 'Unassigned' && (!item.binLocation || item.binLocation.trim() === '')) ||
        (item.binLocation && item.binLocation.trim().toLowerCase() === selectedLocation.toLowerCase());

      return matchesSearch && matchesCategory && matchesLocation;
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'stock-asc':
          return a.stockQty - b.stockQty;
        case 'stock-desc':
          return b.stockQty - a.stockQty;
        case 'price-asc':
          return (a.basePrice || 0) - (b.basePrice || 0);
        case 'price-desc':
          return (b.basePrice || 0) - (a.basePrice || 0);
        case 'category-asc':
          return (a.category || '').localeCompare(b.category || '');
        case 'bin-asc':
          return (a.binLocation || '').localeCompare(b.binLocation || '');
        case 'sku-asc':
          return (a.barcode || a.id || '').localeCompare(b.barcode || b.id || '');
        case 'low-stock': {
          const aRatio = a.threshold > 0 ? a.stockQty / a.threshold : a.stockQty;
          const bRatio = b.threshold > 0 ? b.stockQty / b.threshold : b.stockQty;
          return aRatio - bRatio;
        }
        default:
          return 0;
      }
    });
  }, [inventory, searchTerm, selectedCategory, selectedLocation, sortKey]);

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    let imageUrl = '';
    if (newImageFile) {
      try {
        imageUrl = await uploadImage(newImageFile, `inventory/${Date.now()}_${newImageFile.name}`);
      } catch (err) {
        console.error("Failed to upload image:", err);
      }
    }

    await onAddComponent({
      name: newName.trim(),
      category: newCategory.trim() || 'Uncategorized',
      stockQty: parseInt(newStock) || 0,
      unit: newUnit.trim() || 'pcs',
      threshold: parseInt(newThreshold) || 10,
      binLocation: newBinLocation.trim() || undefined,
      assignedKitName: newAssignedKitName.trim() || undefined,
      isCommon: newIsCommon,
      imageUrl: imageUrl || undefined,
    });

    setIsAdding(false);
    setNewName('');
    setNewCategory('');
    setNewStock('0');
    setNewUnit('pcs');
    setNewThreshold('10');
    setNewBinLocation('');
    setNewAssignedKitName('');
    setNewIsCommon(false);
    setNewImageFile(null);
    showToast('success', 'Component Added', `Created "${newName.trim()}"`);
  };

  const handleSaveQuickRelocate = async () => {
    if (!quickRelocateItem) return;
    const cleanBin = targetBinLocation.trim() || undefined;
    const oldBin = quickRelocateItem.binLocation;

    await onUpdateComponent(quickRelocateItem.id, { binLocation: cleanBin });

    if (logTransaction) {
      await logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'adjust',
        description: `Relocated "${quickRelocateItem.name}" from [${oldBin || 'Unassigned'}] to [${cleanBin || 'Unassigned'}]`,
        items: [{ componentId: quickRelocateItem.id, componentName: quickRelocateItem.name, qtyDiff: 0 }],
        diffs: [{ field: 'binLocation', oldValue: oldBin || null, newValue: cleanBin || null }]
      });
    }

    showToast('success', 'Storage Location Updated', `Moved "${quickRelocateItem.name}" to ${cleanBin || 'Unassigned'}`);
    setQuickRelocateItem(null);
  };

  return (
    <div className="space-y-6 relative w-full animate-fadeIn max-w-full overflow-hidden">
      {/* Top Banner */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100/80 dark:border-indigo-800 shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <span>Items & Master Catalog</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage components, stock math, safety limits, and physical warehouse bin storage locations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Grid Cards"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Compact Table"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {onOpenBarcodeScanner && (
            <button
              onClick={onOpenBarcodeScanner}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2.5 rounded-2xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-xs shrink-0"
              title="Scan Barcode / QR with Camera or Gun"
            >
              <QrCode className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>
          )}

          <button
            onClick={() => {
              setSerialModalItemId(undefined);
              setIsSerialModalOpen(true);
            }}
            className="bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold px-3.5 py-2.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800 transition-all flex items-center gap-1.5 cursor-pointer text-xs shrink-0"
            title="Individual Serial Numbers & Pedigree"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Serials</span>
          </button>

          {onOpenBarcodeStudio && (
            <button
              onClick={onOpenBarcodeStudio}
              className="bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold px-3.5 py-2.5 rounded-2xl border border-indigo-200/80 dark:border-indigo-800 transition-all flex items-center gap-1.5 cursor-pointer text-xs shrink-0"
              title="Print Industrial Barcode Labels"
            >
              <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Label Studio</span>
            </button>
          )}

          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold px-3.5 py-2.5 rounded-2xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer text-xs shrink-0"
            title="Import Product Catalog & Opening Balances via CSV"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">CSV Import</span>
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold px-4 sm:px-5 py-2.5 rounded-2xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer text-xs shrink-0"
          >
            <Plus className="w-4 h-4" /> <span>{isAdding ? 'Close Form' : 'Add Item'}</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Search & Location Filter Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search items by name, SKU, category, or bin location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
            {/* Storage Bin Location Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 py-2 rounded-2xl text-xs">
              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-bold text-slate-600 dark:text-slate-400 shrink-0 hidden sm:inline">Bin:</span>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-xs"
              >
                <option value="All">All Locations</option>
                <option value="Unassigned">Unassigned Only</option>
                {allBinLocations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 py-2 rounded-2xl text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-bold text-slate-600 dark:text-slate-400 shrink-0 hidden sm:inline">Sort:</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-xs"
              >
                <option value="name-asc">Name (A → Z)</option>
                <option value="name-desc">Name (Z → A)</option>
                <option value="stock-asc">Stock Qty (Low → High)</option>
                <option value="stock-desc">Stock Qty (High → Low)</option>
                <option value="price-asc">Price (Low → High)</option>
                <option value="price-desc">Price (High → Low)</option>
                <option value="bin-asc">Storage Bin Location</option>
                <option value="category-asc">Category</option>
                <option value="sku-asc">SKU / Barcode</option>
                <option value="low-stock">Low Stock Warning</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 border border-slate-200/60 dark:border-slate-700'
            }`}
          >
            All Items ({inventory.length})
          </button>
          {allExistingCategories.map((cat) => {
            const catStyle = getCategoryBadgeStyle(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 border border-slate-200/60 dark:border-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${catStyle.dot}`} />
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add New Item Form Panel */}
      {isAdding && (
        <form onSubmit={handleCreateComponent} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md space-y-4 animate-fadeIn">
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">Create New Master Catalog Item</h3>
          
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-32 h-32 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shrink-0 overflow-hidden relative group">
              {newImageFile ? (
                <img src={URL.createObjectURL(newImageFile)} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
              )}
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/90 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-white cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </button>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setNewImageFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ESP32-S3 Microcontroller"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                <input
                  type="text"
                  list="add-category-options"
                  placeholder="e.g. Electronics, Stationary..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <datalist id="add-category-options">
                  {allExistingCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* Storage Bin Location */}
              <div>
                <label className="block text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-500" /> Storage Bin Location
                </label>
                <input
                  type="text"
                  list="create-bin-options"
                  placeholder="e.g. Rack - Shelf 1, BIN-A1-01..."
                  value={newBinLocation}
                  onChange={(e) => setNewBinLocation(e.target.value)}
                  className="w-full bg-amber-50/50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <datalist id="create-bin-options">
                  {bins.map((b: any) => (
                    <option key={b.id} value={b.code}>{b.code} ({b.description})</option>
                  ))}
                  <option value="Rack - Shelf 1" />
                  <option value="Rack - Shelf 2" />
                  <option value="Rack 1, Shelf A" />
                  <option value="Bin A-01" />
                  <option value="Chemical Cabinet" />
                </datalist>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Stock Qty</label>
                <input
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reorder Safety Threshold</label>
                <input
                  type="number"
                  min="0"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unit</label>
                <input
                  type="text"
                  placeholder="pcs, sets, rolls"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
            >
              Save Item
            </button>
          </div>
        </form>
      )}

      {/* Grid Mode View (Modern Large Visual Showcase) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredAndSortedInventory.map((item) => {
            const isZero = item.stockQty === 0 && !item.isCommon;
            const isLow = item.stockQty < item.threshold && !item.isCommon && !isZero;
            const isCommon = item.isCommon;
            const catStyle = getCategoryBadgeStyle(item.category);
            const progressPct = Math.min(100, (item.stockQty / (item.threshold * 2 || 1)) * 100);

            return (
              <div
                key={item.id}
                onClick={() => setDrawerItem(item)}
                className={`rounded-3xl border shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between cursor-pointer group overflow-hidden ${
                  isZero
                    ? 'bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-800/80 ring-1 ring-rose-400/20'
                    : isLow
                    ? 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800/80 ring-1 ring-amber-400/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {/* 1. Large High-Clarity Visual Showcase Header */}
                <div className="w-full h-44 sm:h-48 bg-gradient-to-b from-slate-50 via-slate-100/90 to-slate-200/60 dark:from-slate-800/90 dark:via-slate-800 dark:to-slate-850 relative overflow-hidden flex items-center justify-center p-3 group/img">
                  {item.imageUrl ? (
                    <ItemImage
                      src={item.imageUrl}
                      alt={item.name}
                      category={item.category}
                      className="w-full h-full object-contain filter drop-shadow-sm group-hover/img:scale-108 transition-transform duration-300"
                    />
                  ) : isCommon ? (
                    <InfinityIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400 opacity-80" />
                  ) : (
                    <Box className="w-12 h-12 text-indigo-500/70 dark:text-indigo-400/60" />
                  )}

                  {/* Floating Stock Status Badge (Top-Right) */}
                  <div className="absolute top-2.5 right-2.5">
                    {isZero ? (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-rose-600 text-white shadow-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        Out of Stock
                      </span>
                    ) : isLow ? (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-500 text-white shadow-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Low Stock
                      </span>
                    ) : isCommon ? (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-slate-900/80 text-white shadow-sm backdrop-blur-md">
                        Unlimited
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-600/90 text-white shadow-sm backdrop-blur-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-200" />
                        In Stock
                      </span>
                    )}
                  </div>

                  {/* Floating Category Badge (Top-Left) */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shadow-xs backdrop-blur-md border ${catStyle.bg}`}>
                      {item.category || 'General'}
                    </span>
                  </div>

                  {/* Floating Storage Bin Location Badge (Bottom-Right) */}
                  <div className="absolute bottom-2.5 right-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickRelocateItem(item);
                        setTargetBinLocation(item.binLocation || '');
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-950 dark:text-amber-200 bg-white/95 dark:bg-slate-900/95 hover:bg-amber-50 dark:hover:bg-slate-800 border border-amber-300 dark:border-amber-700/80 px-2.5 py-1 rounded-xl shadow-xs backdrop-blur-md cursor-pointer transition-all hover:scale-105"
                      title="Click to relocate to a different warehouse bin"
                    >
                      <MapPin className="w-3 h-3 text-amber-600" />
                      <span>{item.binLocation || 'Rack - Shelf 1'}</span>
                    </button>
                  </div>

                  {/* Floating SKU Pill (Bottom-Left) */}
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-slate-950/70 text-slate-200 backdrop-blur-md">
                      {item.barcode || `EL-${item.id}`}
                    </span>
                  </div>
                </div>

                {/* 2. Product Information & Health Body */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {item.name}
                    </h4>
                  </div>

                  {/* Stock Gauge Meter */}
                  {!isCommon && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400 uppercase tracking-wider text-[10px]">Stock Level</span>
                        <span className="text-slate-900 dark:text-white font-mono">
                          {item.stockQty} / {item.threshold} {item.unit}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isZero ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(5, progressPct)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 3. Footer Price & Stock Stepper Actions */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Unit Cost</span>
                      <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                        ₹{Number(item.unitCost ?? item.basePrice ?? 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateStock(item.id, Math.max(0, item.stockQty - getItemStep(item.id)))}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                        title={`Deduct ${getItemStep(item.id)} ${item.unit}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={getItemStep(item.id)}
                        onChange={(e) => setItemStep(item.id, parseInt(e.target.value, 10))}
                        className="w-10 text-center py-1 px-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        title="Step value"
                      />
                      <button
                        onClick={() => onUpdateStock(item.id, item.stockQty + getItemStep(item.id))}
                        className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors shadow-xs"
                        title={`Add ${getItemStep(item.id)} ${item.unit}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg ml-1 cursor-pointer"
                        title="Edit Item Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Mode View */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Barcode / SKU</th>
                  <th className="py-3 px-4">Storage Bin Location</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Stock Level</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAndSortedInventory.map((item) => {
                  const isZero = item.stockQty === 0 && !item.isCommon;
                  const isLow = item.stockQty < item.threshold && !item.isCommon && !isZero;
                  const catStyle = getCategoryBadgeStyle(item.category);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setDrawerItem(item)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catStyle.bg}`}>
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                        {item.barcode || `EL-${item.id}`}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickRelocateItem(item);
                            setTargetBinLocation(item.binLocation || '');
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 border border-amber-200/80 dark:border-amber-800/80 px-2.5 py-1 rounded-xl cursor-pointer transition-colors"
                          title="Click to relocate bin"
                        >
                          <MapPin className="w-3 h-3 text-amber-600" />
                          <span>{item.binLocation || 'Rack - Shelf 1'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isZero ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {item.stockQty} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete ${item.name}?`)) onDeleteComponent(item.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK RELOCATE STORAGE BIN MODAL */}
      {quickRelocateItem && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                Relocate Storage Bin
              </h3>
              <button
                type="button"
                onClick={() => setQuickRelocateItem(null)}
                className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="font-bold text-slate-900 dark:text-white text-xs">{quickRelocateItem.name}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                Current Location: <strong className="text-indigo-600 dark:text-indigo-400">{quickRelocateItem.binLocation || 'Unassigned'}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select or Enter New Storage Bin Location:
              </label>
              <input
                type="text"
                list="quick-relocate-options"
                placeholder="e.g. Rack - Shelf 1, Rack 1, Shelf B..."
                value={targetBinLocation}
                onChange={(e) => setTargetBinLocation(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <datalist id="quick-relocate-options">
                {bins.map((b: any) => (
                  <option key={b.id} value={b.code}>{b.code} ({b.description})</option>
                ))}
                <option value="Rack - Shelf 1" />
                <option value="Rack - Shelf 2" />
                <option value="Rack - Shelf 3" />
                <option value="Rack 1, Shelf A" />
                <option value="Rack 1, Shelf B" />
                <option value="Bin A-01" />
                <option value="Bin A-02" />
                <option value="Chemical Cabinet" />
              </datalist>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setQuickRelocateItem(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickRelocate}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" /> Save Location
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Side Drawer Details */}
      {drawerItem && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] pointer-events-none">
          <div 
            onClick={() => setDrawerItem(null)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs pointer-events-auto animate-fadeIn"
          />
          <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/80 dark:border-slate-800 p-6 overflow-y-auto space-y-6 pointer-events-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-600" /> Item Details & Bin
              </h3>
              <button
                onClick={() => setDrawerItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Large Product Hero Showcase */}
              <div className="w-full h-52 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-850 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center p-3 overflow-hidden relative group/img shadow-xs">
                {drawerItem.imageUrl ? (
                  <ItemImage
                    src={drawerItem.imageUrl}
                    alt={drawerItem.name}
                    category={drawerItem.category}
                    className="w-full h-full object-contain filter drop-shadow-md group-hover/img:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Box className="w-14 h-14 text-indigo-500/70 dark:text-indigo-400/60" />
                )}
                <div className="absolute top-2.5 left-2.5">
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-white/90 dark:bg-slate-900/90 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-xs backdrop-blur-md">
                    {drawerItem.category || 'General'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">{drawerItem.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  SKU: {drawerItem.sku || drawerItem.barcode || `EL-${drawerItem.id}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Stock</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{drawerItem.stockQty} {drawerItem.unit}</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reorder Threshold</div>
                  <div className="text-xl font-bold text-amber-600 mt-1">{drawerItem.threshold} {drawerItem.unit}</div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Storage Bin</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    📍 {drawerItem.binLocation || 'Rack - Shelf 1'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Barcode / SKU</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{drawerItem.barcode || `EL-${drawerItem.id}`}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Base Price</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{Number(drawerItem.unitCost ?? drawerItem.basePrice ?? 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <button
                  onClick={() => {
                    setEditingItem(drawerItem);
                    setDrawerItem(null);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                >
                  Edit Item & Properties
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Component Modal */}
      {editingItem && (
        <EditPartModal
          item={editingItem}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSave={onUpdateComponent}
          existingCategories={allExistingCategories}
          kits={kits}
        />
      )}

      {/* Serial Numbers Unit Tracking Modal */}
      <SerialNumbersModal
        isOpen={isSerialModalOpen}
        onClose={() => setIsSerialModalOpen(false)}
        preselectedItemId={serialModalItemId}
      />

      {/* Bulk CSV Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => {
          if (useData) {
            // refresh data
            window.location.reload();
          }
        }}
      />
    </div>
  );
}
