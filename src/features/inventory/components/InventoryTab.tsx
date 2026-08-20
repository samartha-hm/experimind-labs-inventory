import React, { useState, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { InventoryItem, KitBOM } from '@/src/types';
import EditPartModal from '@/src/features/inventory/components/EditPartModal';
import { uploadImage } from '@/src/utils/storage';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortKey, setSortKey] = useState<string>('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [stepSize, setStepSize] = useState<number>(1);
  const [drawerItem, setDrawerItem] = useState<InventoryItem | null>(null);

  // New Component Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [newStock, setNewStock] = useState('0');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newThreshold, setNewThreshold] = useState('10');
  const [newAssignedKitName, setNewAssignedKitName] = useState('');
  const [newIsCommon, setNewIsCommon] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

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

  const filteredAndSortedInventory = useMemo(() => {
    const filtered = inventory.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory =
        selectedCategory === 'All' || selectedCategory === 'ALL' ||
        (item.category && item.category.trim().toLowerCase() === selectedCategory.toLowerCase());
      return matchesSearch && matchesCategory;
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
  }, [inventory, searchTerm, selectedCategory, sortKey]);

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
    setNewAssignedKitName('');
    setNewIsCommon(false);
    setNewImageFile(null);
  };

  return (
    <div className="space-y-6 relative w-full">
      {/* Top Banner */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/80">
              <Box className="w-5 h-5" />
            </div>
            Items & Master Catalog
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage components, differentiated stock states, safety limits, and bin locations.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <div className="bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid Cards"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">Differentiated Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Compact Table"
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">Compact Table</span>
            </button>
          </div>

          {onOpenBarcodeScanner && (
            <button
              onClick={onOpenBarcodeScanner}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-2xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer text-xs shrink-0"
            >
              <QrCode className="w-4 h-4 text-indigo-400" />
              <span>Scan Barcode</span>
            </button>
          )}

          {onOpenBarcodeStudio && (
            <button
              onClick={onOpenBarcodeStudio}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2.5 rounded-2xl border border-indigo-200/80 transition-all flex items-center gap-1.5 cursor-pointer text-xs shrink-0"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Label Studio</span>
            </button>
          )}

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold px-5 py-2.5 rounded-2xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer text-xs"
          >
            <Plus className="w-4 h-4" /> {isAdding ? 'Close Form' : 'Add New Item'}
          </button>
        </div>
      </div>

      {/* Category Pills & Search & Sort */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search items by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
            {/* Step Size Selector (±1, ±5, ±10, ±25, ±50, ±100) */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-1 rounded-2xl text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 px-2 text-[11px]">Step:</span>
              {[1, 5, 10, 25, 50, 100].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setStepSize(step)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    stepSize === step
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title={`Adjust stock by ±${step} units per click`}
                >
                  ±{step}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 py-2 rounded-2xl text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-bold text-slate-600 dark:text-slate-300 shrink-0 hidden sm:inline">Sort:</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer w-full"
              >
                <option value="name-asc">Name (A → Z)</option>
                <option value="name-desc">Name (Z → A)</option>
                <option value="stock-asc">Stock Qty (Low → High)</option>
                <option value="stock-desc">Stock Qty (High → Low)</option>
                <option value="price-asc">Price (Low → High)</option>
                <option value="price-desc">Price (High → Low)</option>
                <option value="category-asc">Category</option>
                <option value="sku-asc">SKU / Barcode</option>
                <option value="low-stock">Low Stock Warning</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 border border-slate-200/60'
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
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 border border-slate-200/60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${catStyle.dot}`} />
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add New Item Form */}
      {isAdding && (
        <form onSubmit={handleCreateComponent} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
          <h3 className="text-base font-bold text-slate-900 mb-4">Create New Master Catalog Item</h3>
          
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-32 h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center shrink-0 overflow-hidden relative group">
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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Item Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. ESP32-S3 Microcontroller"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
              <input
                type="text"
                placeholder="e.g. Boards & Controllers"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Qty</label>
              <input
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reorder Threshold</label>
              <input
                type="number"
                value={newThreshold}
                onChange={(e) => setNewThreshold(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Unit</label>
              <input
                type="text"
                placeholder="pcs, sets"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Associated Kit (Optional)</label>
              <input
                type="text"
                list="create-kit-options-list"
                placeholder="e.g. Prastuti Science Experiment Set"
                value={newAssignedKitName}
                onChange={(e) => setNewAssignedKitName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <datalist id="create-kit-options-list">
                {kits.map((k) => (
                  <option key={k.id} value={k.name} />
                ))}
                <option value="Prastuti Science Experiment Set" />
                <option value="Electronics Innovation Kit" />
                <option value="Prastuti Maths Activity Set" />
              </datalist>
            </div>
          </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-md transition-all cursor-pointer"
            >
              Save Item
            </button>
          </div>
        </form>
      )}

      {/* Grid Cards View with Differentiated Cell Layouts */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedInventory.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200/80 text-center text-slate-400 font-medium">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              No components found matching your filter.
            </div>
          ) : (
            filteredAndSortedInventory.map((item) => {
              const isZero = item.stockQty === 0 && !item.isCommon;
              const isLow = item.stockQty < item.threshold && !item.isCommon && !isZero;
              const isCommon = !!item.isCommon;
              const catStyle = getCategoryBadgeStyle(item.category);

              // 🔴 OUT OF STOCK CELL LAYOUT
              if (isZero) {
                return (
                  <div
                    key={item.id}
                    onClick={() => setDrawerItem(item)}
                    className="bg-gradient-to-b from-rose-50/70 via-white to-white rounded-3xl border-2 border-rose-300 shadow-md shadow-rose-500/10 hover:shadow-xl hover:border-rose-400 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group space-y-3 overflow-hidden"
                  >
                    {/* Danger Header Banner */}
                    <div className="bg-rose-600 text-white px-4 py-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-white animate-pulse" /> OUT OF STOCK
                      </span>
                      <span>CRITICAL SHORTAGE</span>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100/80 border border-rose-200 flex items-center justify-center shrink-0 overflow-hidden text-rose-600">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <AlertCircle className="w-6 h-6" />
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${catStyle.bg}`}>
                          {item.category || 'Uncategorized'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-rose-600 transition-colors line-clamp-1">
                          {item.name}
                        </h4>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">SKU-{item.id.substring(0, 8)}</div>
                      </div>

                      <div className="p-2.5 bg-rose-100/60 rounded-2xl border border-rose-200/80 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-rose-700 tracking-wider">Stock Qty</span>
                        <span className="text-sm font-black text-rose-700">0 / {item.threshold} {item.unit}</span>
                      </div>
                    </div>

                    <div className="p-4 pt-0 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="text-xs font-bold text-slate-900">${(item.basePrice || 3.50).toFixed(2)}</div>
                      <button
                        onClick={() => onUpdateStock(item.id, item.stockQty + 1)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Reorder 1
                      </button>
                    </div>
                  </div>
                );
              }

              // 🟡 LOW STOCK CELL LAYOUT
              if (isLow) {
                const progressPct = Math.min(100, (item.stockQty / item.threshold) * 100);
                return (
                  <div
                    key={item.id}
                    onClick={() => setDrawerItem(item)}
                    className="bg-gradient-to-b from-amber-50/50 via-white to-white rounded-3xl border-2 border-amber-300 shadow-md shadow-amber-500/5 hover:shadow-xl hover:border-amber-400 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group space-y-3 overflow-hidden"
                  >
                    {/* Warning Header Banner */}
                    <div className="bg-amber-500 text-white px-4 py-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-white" /> LOW STOCK WARNING
                      </span>
                      <span>REORDER LEVEL</span>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100/80 border border-amber-200 flex items-center justify-center shrink-0 overflow-hidden text-amber-700">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Box className="w-6 h-6" />
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${catStyle.bg}`}>
                          {item.category || 'Uncategorized'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-amber-600 transition-colors line-clamp-1">
                          {item.name}
                        </h4>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">SKU-{item.id.substring(0, 8)}</div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-amber-800 uppercase tracking-wider text-[9px]">Below Safety Limit</span>
                          <span className="text-amber-800 font-extrabold">{item.stockQty} / {item.threshold} {item.unit}</span>
                        </div>
                        <div className="w-full bg-amber-100 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.max(8, progressPct)}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="text-xs font-bold text-slate-900">${(item.basePrice || 3.50).toFixed(2)}</div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateStock(item.id, Math.max(0, item.stockQty - stepSize))}
                          title={`Subtract ${stepSize} ${item.unit}`}
                          className="p-1 px-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 hover:bg-amber-200 font-bold text-xs flex items-center gap-0.5 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                          {stepSize > 1 && <span className="text-[10px]">{stepSize}</span>}
                        </button>
                        <button
                          onClick={() => onUpdateStock(item.id, item.stockQty + stepSize)}
                          title={`Add ${stepSize} ${item.unit}`}
                          className="p-1 px-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {stepSize > 1 && <span className="text-[10px]">{stepSize}</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // 🔵 UNLIMITED / COMMON PART CELL LAYOUT
              if (isCommon) {
                return (
                  <div
                    key={item.id}
                    onClick={() => setDrawerItem(item)}
                    className="bg-slate-50/90 rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-200/80 border border-slate-300 flex items-center justify-center shrink-0 overflow-hidden text-slate-600">
                          <InfinityIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1">
                          <InfinityIcon className="w-3 h-3 text-indigo-600" /> Constant Stock
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {item.name}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border mt-1 inline-block ${catStyle.bg}`}>
                          {item.category || 'Hardware'}
                        </span>
                      </div>

                      <div className="p-2 bg-slate-200/50 rounded-xl text-center text-xs font-bold text-slate-600">
                        Unlimited Consumable Hardware
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">SKU-{item.id.substring(0, 8)}</span>
                      <button onClick={() => setEditingItem(item)} className="p-1 text-slate-400 hover:text-indigo-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              // 🟢 HEALTHY STOCK CELL LAYOUT
              const progressPct = Math.min(100, (item.stockQty / (item.threshold * 2 || 1)) * 100);
              return (
                <div
                  key={item.id}
                  onClick={() => setDrawerItem(item)}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-lg hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Box className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> In Stock
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catStyle.bg}`}>
                          {item.category || 'Uncategorized'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">SKU-{item.id.substring(0, 6)}</span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-400 uppercase tracking-wider text-[9px]">Available Stock</span>
                        <span className="text-slate-900">{item.stockQty} / {item.threshold} {item.unit}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(5, progressPct)}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <div className="text-xs font-bold text-slate-900">${(item.basePrice || 3.50).toFixed(2)}</div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateStock(item.id, Math.max(0, item.stockQty - stepSize))}
                        title={`Subtract ${stepSize} ${item.unit}`}
                        className="p-1 px-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-0.5 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                        {stepSize > 1 && <span className="text-[10px]">{stepSize}</span>}
                      </button>
                      <button
                        onClick={() => onUpdateStock(item.id, item.stockQty + stepSize)}
                        title={`Add ${stepSize} ${item.unit}`}
                        className="p-1 px-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {stepSize > 1 && <span className="text-[10px]">{stepSize}</span>}
                      </button>
                      <button onClick={() => setEditingItem(item)} className="p-1 text-slate-400 hover:text-indigo-600">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Table View with Differentiated Row Tinting */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 select-none">
                  <th
                    onClick={() => setSortKey(sortKey === 'name-asc' ? 'name-desc' : 'name-asc')}
                    className="py-4 px-6 cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    Part Information {sortKey === 'name-asc' ? '↑' : sortKey === 'name-desc' ? '↓' : ''}
                  </th>
                  <th
                    onClick={() => setSortKey(sortKey === 'category-asc' ? 'name-asc' : 'category-asc')}
                    className="py-4 px-6 cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    Category {sortKey === 'category-asc' ? '↑' : ''}
                  </th>
                  <th className="py-4 px-6 font-bold">
                    Barcode / Bin
                  </th>
                  <th
                    onClick={() => setSortKey(sortKey === 'low-stock' ? 'name-asc' : 'low-stock')}
                    className="py-4 px-6 text-center cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    Status {sortKey === 'low-stock' ? '⚠️' : ''}
                  </th>
                  <th
                    onClick={() => setSortKey(sortKey === 'stock-asc' ? 'stock-desc' : 'stock-asc')}
                    className="py-4 px-6 text-center w-44 cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    Stock Qty {sortKey === 'stock-asc' ? '↑' : sortKey === 'stock-desc' ? '↓' : ''}
                  </th>
                  <th className="py-4 px-6 text-center w-36">Reorder Limit</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {filteredAndSortedInventory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      No components found.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedInventory.map((item) => {
                    const isZero = item.stockQty === 0 && !item.isCommon;
                    const isLow = item.stockQty < item.threshold && !item.isCommon && !isZero;
                    const catStyle = getCategoryBadgeStyle(item.category);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setDrawerItem(item)}
                        className={`transition-colors group cursor-pointer ${
                          isZero ? 'bg-rose-50/40 hover:bg-rose-50/80' : isLow ? 'bg-amber-50/40 hover:bg-amber-50/80' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <Box className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">SKU-{item.id.substring(0, 8)}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${catStyle.bg}`}>
                            {item.category || 'Uncategorized'}
                          </span>
                        </td>

                        <td className="py-4 px-6 font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md font-bold text-slate-800">
                              {item.barcode || item.sku || `EL-${item.id}`}
                            </span>
                          </div>
                          {item.binLocation && (
                            <div className="text-[10px] text-slate-400 font-sans mt-0.5">{item.binLocation}</div>
                          )}
                        </td>

                        <td className="py-4 px-6 text-center">
                          {isZero ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              In Stock
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onUpdateStock(item.id, Math.max(0, item.stockQty - stepSize))}
                              title={`Subtract ${stepSize} ${item.unit}`}
                              className="p-1 px-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-0.5 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                              {stepSize > 1 && <span className="text-[10px]">{stepSize}</span>}
                            </button>
                            <span className="font-bold text-slate-900 dark:text-slate-100 w-12 text-center">{item.stockQty}</span>
                            <button
                              onClick={() => onUpdateStock(item.id, item.stockQty + stepSize)}
                              title={`Add ${stepSize} ${item.unit}`}
                              className="p-1 px-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-0.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {stepSize > 1 && <span className="text-[10px]">{stepSize}</span>}
                            </button>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-center font-bold text-slate-600">
                          {item.threshold} {item.unit}
                        </td>

                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete ${item.name}?`)) onDeleteComponent(item.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side Drawer Preview */}
      {drawerItem && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-slate-200/80 z-50 p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Box className="w-5 h-5 text-indigo-600" /> Item Details
            </h3>
            <button
              onClick={() => setDrawerItem(null)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {drawerItem.imageUrl ? (
                  <img src={drawerItem.imageUrl} alt={drawerItem.name} className="w-full h-full object-cover" />
                ) : (
                  <Box className="w-6 h-6 text-indigo-600" />
                )}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">{drawerItem.name}</h4>
                <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                  {drawerItem.category || 'Uncategorized'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Stock</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{drawerItem.stockQty} {drawerItem.unit}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reorder Threshold</div>
                <div className="text-xl font-bold text-amber-600 mt-1">{drawerItem.threshold} {drawerItem.unit}</div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Part SKU</span>
                <span className="font-mono font-bold text-slate-900">SKU-{drawerItem.id.substring(0, 10)}</span>
              </div>

              {drawerItem.assignedKitName && (
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-600 uppercase tracking-wider text-[10px]">Associated Kit</span>
                  <span className="font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-lg text-[11px]">
                    📦 {drawerItem.assignedKitName}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Estimated Price</span>
                <span className="font-bold text-slate-900">${(drawerItem.basePrice || 3.50).toFixed(2)} / unit</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Total Stock Value</span>
                <span className="font-bold text-emerald-700">
                  ${(drawerItem.stockQty * (drawerItem.basePrice || 3.50)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => {
                  setEditingItem(drawerItem);
                  setDrawerItem(null);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Edit Item
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
