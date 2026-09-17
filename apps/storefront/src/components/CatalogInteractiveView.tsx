'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Box,
  Sparkles,
  Star,
  Award,
  SlidersHorizontal,
  ArrowUpDown,
  ShoppingBag,
  Eye,
  CheckCircle2,
  Filter,
  X,
  Truck,
  RotateCcw,
  Tag,
  ShieldCheck,
  Check,
  ChevronDown,
  LayoutGrid,
  List
} from 'lucide-react';
import QuickViewModal from './QuickViewModal';
import SafeProductImage from './SafeProductImage';
import { useCartStore } from '@/store/useCartStore';

interface CatalogInteractiveViewProps {
  products: any[];
  categories: any[];
  activeCategory: string;
  searchQuery: string;
}

export default function CatalogInteractiveView({
  products,
  categories,
  activeCategory,
  searchQuery
}: CatalogInteractiveViewProps) {
  // Sidebar Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    activeCategory !== 'all' ? [activeCategory.toLowerCase()] : []
  );
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest'>('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Interactive Modals & Cart
  const [selectedQuickViewProduct, setSelectedQuickViewProduct] = useState<any | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  const handleQuickAdd = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.basePrice || product.price || 999,
      imageUrl: product.imageUrl,
      category: product.category,
      quantity: 1
    });

    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  const handleCategoryToggle = (catName: string) => {
    const key = catName.toLowerCase();
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const handleGradeToggle = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const handlePriceToggle = (range: string) => {
    setSelectedPriceRanges((prev) =>
      prev.includes(range) ? prev.filter((r) => r !== range) : [...prev, range]
    );
  };

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSelectedGrades([]);
    setSelectedPriceRanges([]);
    setMinRating(0);
    setInStockOnly(false);
  };

  const formatCategoryName = (cat: string) => {
    if (cat.toLowerCase() === 'maths kits') return '3D Geometry & Math';
    if (cat.toLowerCase() === 'prastuti science') return 'Demonstration Science';
    if (cat.toLowerCase() === 'stem kits') return 'Flagship STEM Kits';
    if (cat.toLowerCase() === 'robotics & iot') return 'Robotics & Sensors';
    if (cat.toLowerCase() === 'anubhav') return 'Sensory Science (Grades 1-5)';
    if (cat.toLowerCase() === 'chemicals') return 'Lab Chemistry Sets';
    return cat;
  };

  // Filter & Sort Pipeline
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // 1. Category Filter
    if (selectedCategories.length > 0) {
      list = list.filter((p) => {
        const pCat = (p.category || '').toLowerCase();
        return selectedCategories.some((c) => pCat.includes(c) || c.includes(pCat));
      });
    }

    // 2. Grade Level Filter
    if (selectedGrades.length > 0) {
      list = list.filter((p) => {
        const pGrade = (p.gradeLevel || '').toLowerCase();
        return selectedGrades.some((g) => pGrade.includes(g.toLowerCase()));
      });
    }

    // 3. Price Filter
    if (selectedPriceRanges.length > 0) {
      list = list.filter((p) => {
        const price = Number(p.basePrice || p.price || 0);
        return selectedPriceRanges.some((r) => {
          if (r === 'under-500') return price < 500;
          if (r === '500-1000') return price >= 500 && price <= 1000;
          if (r === '1000-2500') return price >= 1000 && price <= 2500;
          if (r === 'above-2500') return price > 2500;
          return true;
        });
      });
    }

    // 4. Rating Filter
    if (minRating > 0) {
      list = list.filter((p) => Number(p.rating || 4.8) >= minRating);
    }

    // 5. In Stock Only
    if (inStockOnly) {
      list = list.filter((p) => (p.stockQty || 1) > 0);
    }

    // 6. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      );
    }

    // 7. Sort Order
    if (sortBy === 'price-asc') {
      list.sort((a, b) => (a.basePrice || a.price || 0) - (b.basePrice || b.price || 0));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => (b.basePrice || b.price || 0) - (a.basePrice || a.price || 0));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return list;
  }, [products, selectedCategories, selectedGrades, selectedPriceRanges, minRating, inStockOnly, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-indigo-50/30 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Experiential STEM Learning Collection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'All STEM Kits, Apparatus & Labware'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Showing {filteredProducts.length} research-engineered apparatus for classrooms & ATL labs.
          </p>
        </div>

        {/* Mobile Filter Toggle Button */}
        <button
          onClick={() => setMobileFilterOpen(true)}
          className="lg:hidden px-4 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 self-start"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters & Sort ({selectedCategories.length + selectedGrades.length + selectedPriceRanges.length})</span>
        </button>
      </div>

      {/* Main Dual-Column Layout (Amazon/Flipkart Standard) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ======================================================== */}
        {/* LEFT FACETED FILTER SIDEBAR (AMAZON STYLE)               */}
        {/* ======================================================== */}
        <aside className="hidden lg:block lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6 sticky top-28 text-left">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <span>Filters</span>
            </div>
            {(selectedCategories.length > 0 || selectedGrades.length > 0 || selectedPriceRanges.length > 0 || minRating > 0 || inStockOnly) && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {/* 1. Category Facets */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Categories</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {categories.map((cat: any) => {
                const isSelected = selectedCategories.includes(cat.name.toLowerCase());
                return (
                  <label
                    key={cat.name}
                    className="flex items-center justify-between text-xs text-slate-700 hover:text-indigo-600 cursor-pointer select-none p-1 rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleCategoryToggle(cat.name)}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="truncate">{formatCategoryName(cat.name)}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">({cat.count})</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 2. Educational Grade Level */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Grade Level</h4>
            <div className="space-y-1.5">
              {[
                { id: 'Grades 1–5', label: 'Grades 1–5 (Early STEM)' },
                { id: 'Grades 6–8', label: 'Grades 6–8 (Middle School)' },
                { id: 'Grades 9–10', label: 'Grades 9–10 (Secondary)' },
                { id: 'Grades 11–12', label: 'Grades 11–12 (Higher Secondary)' },
                { id: 'ATL', label: 'Ages 10+ / ATL Tinkering Labs' }
              ].map((g) => {
                const isSelected = selectedGrades.includes(g.id);
                return (
                  <label
                    key={g.id}
                    className="flex items-center gap-2 text-xs text-slate-700 hover:text-indigo-600 cursor-pointer select-none p-1 rounded-lg hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleGradeToggle(g.id)}
                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="truncate">{g.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. Price Range Filter */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Price (₹)</h4>
            <div className="space-y-1.5">
              {[
                { id: 'under-500', label: 'Under ₹500' },
                { id: '500-1000', label: '₹500 to ₹1,000' },
                { id: '1000-2500', label: '₹1,000 to ₹2,500' },
                { id: 'above-2500', label: 'Above ₹2,500' }
              ].map((p) => {
                const isSelected = selectedPriceRanges.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-xs text-slate-700 hover:text-indigo-600 cursor-pointer select-none p-1 rounded-lg hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handlePriceToggle(p.id)}
                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>{p.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 4. Customer Rating Filter (Amazon 4 Stars & Up) */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Customer Rating</h4>
            <div className="space-y-1.5">
              {[4, 3].map((stars) => (
                <button
                  key={stars}
                  onClick={() => setMinRating(minRating === stars ? 0 : stars)}
                  className={`flex items-center gap-2 w-full p-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                    minRating === stars ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(stars)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span>& Up</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. In Stock Filter */}
          <div className="pt-3 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
              />
              <span>In Stock for Same-Day Dispatch</span>
            </label>
          </div>

        </aside>

        {/* ======================================================== */}
        {/* RIGHT PRODUCT GRID (AMAZON / FLIPKART PRODUCT CARDS)     */}
        {/* ======================================================== */}
        <main className="lg:col-span-9 space-y-6">
          
          {/* Top Sort & Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 px-5 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="text-slate-500 font-semibold">
              Showing <strong className="text-slate-900">{filteredProducts.length}</strong> items
            </div>

            <div className="flex items-center gap-3">
              {/* Sort Selector */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold hidden sm:inline">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="featured">Featured First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Top Customer Ratings</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'list' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Cards Feed */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 space-y-4">
              <Box className="w-14 h-14 text-slate-300 mx-auto" />
              <h3 className="text-lg font-black text-slate-900">No products match your selected filters</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try resetting some category, grade level, or price range filters to view more STEM kits.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {filteredProducts.map((product) => {
                const basePrice = Number(product.basePrice || product.price || 999);
                const mrp = Math.round(basePrice * 1.3);
                const discount = Math.round(((mrp - basePrice) / mrp) * 100);

                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group relative ${
                      viewMode === 'list' ? 'sm:flex-row sm:items-center p-4 gap-6' : ''
                    }`}
                  >
                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                      {product.badge ? (
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                          {product.badge}
                        </span>
                      ) : (
                        <span className="bg-slate-900/85 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                          {product.gradeLevel || 'Grades 6–10'}
                        </span>
                      )}

                      {/* Quick View Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedQuickViewProduct(product);
                        }}
                        title="Quick View Specs"
                        className="pointer-events-auto w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-indigo-600 shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Product Image */}
                    <Link
                      href={`/product/${product.id}`}
                      className={`block bg-gradient-to-b from-slate-50 to-white overflow-hidden relative ${
                        viewMode === 'list' ? 'w-44 h-44 shrink-0 rounded-2xl border border-slate-100 p-4' : 'aspect-square p-8 border-b border-slate-100'
                      }`}
                    >
                      <SafeProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        category={product.category}
                        className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-500"
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="p-5 flex-grow flex flex-col justify-between space-y-4 text-left">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-bold text-indigo-600 uppercase tracking-wider">
                            {product.category || 'STEM Kit'}
                          </span>
                          <div className="flex items-center gap-1 font-bold text-amber-500">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span>{product.rating || '4.9'}</span>
                          </div>
                        </div>

                        <Link href={`/product/${product.id}`} className="block">
                          <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {product.description || 'Hands-on experiential apparatus engineered for classrooms & ATL innovation spaces.'}
                        </p>
                      </div>

                      {/* Pricing & Free Delivery Promise */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black text-slate-900">₹{basePrice.toLocaleString('en-IN')}</span>
                            <span className="text-xs text-slate-400 line-through">₹{mrp.toLocaleString('en-IN')}</span>
                            <span className="text-[10px] text-emerald-600 font-bold">{discount}% OFF</span>
                          </div>
                          <span className="text-[10px] text-emerald-600 font-bold block">Free Pan-India Delivery</span>
                        </div>

                        <button
                          onClick={(e) => handleQuickAdd(product, e)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            addedIds[product.id]
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{addedIds[product.id] ? 'Added!' : 'Add'}</span>
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>

      {/* Quick View Modal */}
      {selectedQuickViewProduct && (
        <QuickViewModal
          product={selectedQuickViewProduct}
          onClose={() => setSelectedQuickViewProduct(null)}
        />
      )}

    </div>
  );
}
