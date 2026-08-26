import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ShoppingBag,
  Search,
  ShoppingCart,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  Box,
  Tag,
  ArrowRight,
  QrCode,
  Sparkles,
  Info,
  Layers,
  Plus,
  Minus,
  Globe,
  ExternalLink,
  ShieldCheck,
  FlaskConical,
  Cpu,
  PenTool,
  Package,
  Calculator,
  Award,
  Wrench,
  Lightbulb,
  Grid,
  SlidersHorizontal,
  ArrowUpDown,
  LayoutGrid,
  List,
  Eye,
  Heart,
  Share2,
  Check,
  Truck,
  Percent,
  RefreshCw,
  Zap
} from 'lucide-react';
import { InventoryItem } from '@/src/types';
import { useToast } from '@/src/contexts/ToastContext';
import ItemImage from '@/src/shared/components/ItemImage';

interface ShopTabProps {
  inventory: InventoryItem[];
  onPlaceOrder?: (orderData: any) => void;
}

// Fixed standard category structure requested by user with custom icon, colors and description
const PREDEFINED_CATEGORIES: { id: string; name: string; icon: any; color: string; bg: string; border: string; desc: string }[] = [
  { id: 'ALL', name: 'ALL', icon: LayoutGrid, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800', desc: 'Browse all store products' },
  { id: 'Prastuti Science', name: 'Prastuti Science', icon: FlaskConical, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', desc: 'Science lab equipment & glass' },
  { id: 'Electronics', name: 'Electronics', icon: Cpu, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800', desc: 'Microcontrollers, sensors & components' },
  { id: 'Stationary', name: 'Stationary', icon: PenTool, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', desc: 'Lab notebooks, papers & stationery' },
  { id: 'others', name: 'others', icon: Package, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/40', border: 'border-slate-200 dark:border-slate-700', desc: 'General hardware & accessories' },
  { id: 'Chemicals', name: 'Chemicals', icon: Sparkles, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800', desc: 'Lab reagents, solvents & salts' },
  { id: 'Box', name: 'Box', icon: Box, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', desc: 'Storage bins, trays & packaging' },
  { id: 'Prastuti Maths', name: 'Prastuti Maths', icon: Calculator, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800', desc: 'Mathematical learning kits' },
  { id: 'Anubhav', name: 'Anubhav', icon: Award, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800', desc: 'Experiential learning modules' },
  { id: 'kits', name: 'kits', icon: Wrench, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-200 dark:border-teal-800', desc: 'Complete STEM kit packages' },
  { id: 'IQNAAX', name: 'IQNAAX', icon: Lightbulb, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/40', border: 'border-yellow-200 dark:border-yellow-800', desc: 'IQ & cognitive puzzle products' },
  { id: 'Maths kits', name: 'Maths kits', icon: Grid, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800', desc: 'Comprehensive math kit sets' },
];

export default function ShopTab({ inventory, onPlaceOrder }: ShopTabProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK'>('ALL');
  const [sortBy, setSortBy] = useState<'RECOMMENDED' | 'PRICE_LOW' | 'PRICE_HIGH' | 'STOCK_HIGH' | 'NAME_AZ'>('RECOMMENDED');
  const [viewMode, setViewMode] = useState<'GRID' | 'COMPACT'>('GRID');

  // Interactive Drawers & Modals
  const [selectedAsset, setSelectedAsset] = useState<InventoryItem | null>(null);
  const [cart, setCart] = useState<{ item: InventoryItem; qty: number }[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'UPI'>('UPI');
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Form State for Checkout
  const [orderType, setOrderType] = useState<'PURCHASE' | 'INTERNAL'>('PURCHASE');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGSTIN, setCustomerGSTIN] = useState('');
  const [address, setAddress] = useState('');
  const [purpose, setPurpose] = useState('');
  const [honeypotWebsite, setHoneypotWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const UPI_ID = 'adarshdevadiga@fifederal';
  const FREE_SHIPPING_THRESHOLD = 1000;

  // Extract all categories dynamically and merge with predefined list
  const categoryList = useMemo(() => {
    const existingCats = new Set<string>(PREDEFINED_CATEGORIES.map((c) => c.name));
    inventory.forEach((item) => {
      if (item.category && item.category.trim() !== '') {
        existingCats.add(item.category.trim());
      }
    });

    return Array.from(existingCats).map((catName) => {
      const found = PREDEFINED_CATEGORIES.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase()
      );
      const count = inventory.filter(
        (i) => catName === 'ALL' || (i.category && i.category.trim().toLowerCase() === catName.toLowerCase())
      ).length;

      if (found) {
        return { ...found, count };
      }
      return {
        id: catName,
        name: catName,
        icon: Package,
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        border: 'border-indigo-200 dark:border-indigo-800',
        desc: `Items in ${catName}`,
        count,
      };
    });
  }, [inventory]);

  // Filtered & Sorted Product Items
  const filteredAssets = useMemo(() => {
    let result = inventory.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory =
        selectedCategory === 'ALL' ||
        (item.category && item.category.trim().toLowerCase() === selectedCategory.toLowerCase());

      const matchesStock =
        stockFilter === 'ALL'
          ? true
          : stockFilter === 'IN_STOCK'
          ? item.stockQty > 0
          : item.stockQty > 0 && item.stockQty <= (item.threshold || 5);

      return matchesSearch && matchesCategory && matchesStock;
    });

    // Apply Sorting
    return result.sort((a, b) => {
      const priceA = a.basePrice || 10.0;
      const priceB = b.basePrice || 10.0;
      if (sortBy === 'PRICE_LOW') return priceA - priceB;
      if (sortBy === 'PRICE_HIGH') return priceB - priceA;
      if (sortBy === 'STOCK_HIGH') return b.stockQty - a.stockQty;
      if (sortBy === 'NAME_AZ') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [inventory, searchTerm, selectedCategory, stockFilter, sortBy]);

  // Cart operations
  const addToCart = (item: InventoryItem, qty: number = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, qty: Math.min(item.stockQty, c.qty + qty) } : c
        );
      }
      return [...prev, { item, qty: Math.min(item.stockQty, qty) }];
    });
    showToast('success', `Added to Cart: ${item.name}`, `Quantity: ${qty}`);
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const updateCartQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.item.id === itemId ? { ...c, qty: Math.min(c.item.stockQty, newQty) } : c))
    );
  };

  const toggleWishlist = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const cartSubtotal = cart.reduce(
    (sum, c) => sum + c.qty * Number(c.item.unitCost ?? c.item.basePrice ?? 10.0),
    0
  );

  const cartItemCount = cart.reduce((s, c) => s + c.qty, 0);
  const gstAmount = cartSubtotal * 0.18; // 18% GST estimate
  const finalTotal = cartSubtotal + (cartSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 50);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypotWebsite) {
      alert('Spam bot submission blocked.');
      return;
    }
    if (!customerName || cart.length === 0) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const orderObj = {
        orderId: `ORD-${Date.now()}`,
        customerName,
        customerEmail,
        phone: customerPhone,
        customerGSTIN,
        address,
        type: orderType,
        purpose,
        paymentMethod,
        subtotal: cartSubtotal,
        gstAmount,
        totalAmount: finalTotal,
        items: cart.map((c) => ({
          assetId: c.item.id,
          name: c.item.name,
          quantity: c.qty,
          price: Number(c.item.unitCost ?? c.item.basePrice ?? 10.0),
        })),
        createdAt: new Date().toISOString(),
      };

      if (onPlaceOrder) onPlaceOrder(orderObj);

      setIsSubmitting(false);
      setIsCheckoutOpen(false);
      setIsCartDrawerOpen(false);
      setCart([]);
      setOrderSuccessMsg(`Order #${orderObj.orderId} successfully registered in NexaInventory ERP!`);
      showToast('success', 'Order Placed & Reserved', `Registered Sales Order #${orderObj.orderId} for ${customerName}`);
      setTimeout(() => setOrderSuccessMsg(null), 8000);
    }, 1200);
  };

  return (
    <div className="space-y-6 w-full relative animate-fadeIn pb-12">
      {/* Premium Hero Storefront Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-2xl border border-slate-800 glow-card-indigo">
        {/* Ambient Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-emerald-400" /> shop.experimindlabs.com
              </span>
              <span className="text-slate-400 text-xs font-medium">• Official B2B & Educational Storefront</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30 text-[10px] font-bold">
                <Zap className="w-3 h-3 text-amber-400" /> Fast Dispatch
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Experimind Labs Storefront
            </h1>

            <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
              Order STEM kits, science lab glass, sensors, microcontrollers, mathematical learning modules, and customized raw materials directly synced with our NexaInventory ERP.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300 pt-1">
              <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-indigo-400" /> Free Shipping above ₹1,000</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> GST Tax Compliant</span>
              <span className="flex items-center gap-1.5"><QrCode className="w-4 h-4 text-amber-400" /> Instant UPI & Razorpay</span>
            </div>
          </div>

          {/* Quick Cart Trigger Pill */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-3 cursor-pointer text-xs group"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <span>View Cart</span>
              <span className="font-mono text-emerald-300 border-l border-indigo-400/40 pl-2 text-sm">
                ₹{cartSubtotal.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {orderSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{orderSuccessMsg}</span>
          </div>
          <button onClick={() => setOrderSuccessMsg(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modern Pinterest-Inspired Category Quick Scroll Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-500" /> Explore Store Categories ({categoryList.length})
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">Select category to filter catalog</span>
        </div>

        {/* Scrollable Category Chips Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {categoryList.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-3 relative overflow-hidden group ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-800 dark:text-slate-200 hover:shadow-xs'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-white/20 text-white' : `${cat.bg} ${cat.color}`}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold truncate">{cat.name}</div>
                  <div className={`text-[10px] font-medium font-mono ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {cat.count} items
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Storefront Toolbar: Search, Filters & View Switcher */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or category (e.g. Wash bottles, ESP32, Petri dish)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Stock Filter Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN_STOCK">In Stock Only</option>
              <option value="LOW_STOCK">Low Stock Alert</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="RECOMMENDED">Sort: Featured</option>
              <option value="PRICE_LOW">Price: Low to High</option>
              <option value="PRICE_HIGH">Price: High to Low</option>
              <option value="STOCK_HIGH">Stock: Highest First</option>
              <option value="NAME_AZ">Name: A to Z</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('COMPACT')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'COMPACT' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Compact List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[10px]">
          <span className="font-bold text-slate-400 uppercase tracking-wider">Quick Suggestions:</span>
          {['Prastuti Science', 'Electronics', 'Chemicals', 'kits', 'Stationary'].map((chip) => (
            <button
              key={chip}
              onClick={() => setSelectedCategory(chip)}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg font-medium transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Results Header */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
          Showing <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{filteredAssets.length}</span> products
          {selectedCategory !== 'ALL' && <span> in <strong className="text-slate-900 dark:text-slate-100">{selectedCategory}</strong></span>}
        </div>
      </div>

      {/* Products Display (Grid View vs Compact View) */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No items found matching your filter</h4>
            <p className="text-xs text-slate-400">Try clearing search terms or selecting "ALL" categories.</p>
          </div>
          <button
            onClick={() => { setSelectedCategory('ALL'); setSearchTerm(''); setStockFilter('ALL'); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition-all cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'GRID' ? (
        /* Pinterest-Style Rich Card Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => {
            const isOutOfStock = asset.stockQty === 0;
            const isLowStock = asset.stockQty > 0 && asset.stockQty <= (asset.threshold || 5);
            const isWishlisted = wishlist.includes(asset.id);

            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200 flex flex-col justify-between space-y-3 group cursor-pointer relative"
              >
                {/* Thumbnail Header with Badges */}
                <div className="space-y-3">
                  <div className="w-full h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group/img">
                    {asset.imageUrl ? (
                      <ItemImage
                        src={asset.imageUrl}
                        alt={asset.name}
                        category={asset.category}
                        className="w-full h-full object-cover group-hover/img:scale-108 transition-transform duration-300"
                      />
                    ) : (
                      <Box className="w-10 h-10 text-indigo-400" />
                    )}

                    {/* Stock Status Badge */}
                    {isOutOfStock ? (
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-rose-600 text-white text-[10px] font-black uppercase rounded-lg shadow-sm">
                        Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-amber-500 text-white text-[10px] font-black uppercase rounded-lg shadow-sm animate-pulse">
                        Only {asset.stockQty} Left
                      </span>
                    ) : (
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-emerald-600/90 text-white text-[10px] font-black uppercase rounded-lg shadow-sm backdrop-blur-md">
                        {asset.stockQty} {asset.unit}
                      </span>
                    )}

                    {/* Wishlist Icon Button */}
                    <button
                      onClick={(e) => toggleWishlist(asset.id, e)}
                      className={`absolute top-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md transition-all ${
                        isWishlisted
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-white/80 dark:bg-slate-900/80 text-slate-400 hover:text-rose-500'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  {/* Product Metadata */}
                  <div>
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                      <span>{asset.category || 'General'}</span>
                      {asset.binLocation && <span className="font-mono text-slate-400">Bin: {asset.binLocation}</span>}
                    </div>
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 mt-0.5">
                      {asset.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {asset.description || 'Experimind Labs verified component item.'}
                    </p>
                  </div>
                </div>

                {/* Price & Action Button Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <div className="text-[9px] font-bold uppercase text-slate-400">Standard Price</div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                      ₹{Number(asset.unitCost ?? asset.basePrice ?? 10.0).toFixed(2)}
                    </div>
                  </div>

                  <button
                    disabled={isOutOfStock}
                    onClick={(e) => addToCart(asset, 1, e)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                      isOutOfStock
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact List View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAssets.map((asset) => {
              const isOutOfStock = asset.stockQty === 0;
              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {asset.imageUrl ? (
                        <ItemImage src={asset.imageUrl} alt={asset.name} category={asset.category} className="w-full h-full object-cover" />
                      ) : (
                        <Box className="w-5 h-5 text-indigo-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">{asset.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{asset.category}</span>
                        <span>• SKU: {asset.id}</span>
                        {asset.binLocation && <span>• Bin: {asset.binLocation}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="text-right">
                      <div className="font-black text-slate-900 dark:text-slate-100 text-sm font-mono">
                        ₹{Number(asset.unitCost ?? asset.basePrice ?? 10.0).toFixed(2)}
                      </div>
                      <div className="text-[10px] font-bold">
                        {isOutOfStock ? (
                          <span className="text-rose-500">Out of Stock</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">{asset.stockQty} in stock</span>
                        )}
                      </div>
                    </div>

                    <button
                      disabled={isOutOfStock}
                      onClick={(e) => addToCart(asset, 1, e)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer ${
                        isOutOfStock
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Asset Detail Quick View Modal */}
      {selectedAsset && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  {selectedAsset.category || 'General'}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{selectedAsset.name}</h3>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full h-56 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
              {selectedAsset.imageUrl ? (
                <ItemImage src={selectedAsset.imageUrl} alt={selectedAsset.name} category={selectedAsset.category} className="w-full h-full object-cover" />
              ) : (
                <Box className="w-12 h-12 text-indigo-400" />
              )}
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700 font-mono">
                <div>SKU Code: <strong className="text-slate-900 dark:text-slate-100">{selectedAsset.id}</strong></div>
                <div>Available: <strong className="text-emerald-600 dark:text-emerald-400">{selectedAsset.stockQty} {selectedAsset.unit}</strong></div>
                <div>Storage Bin: <strong className="text-slate-900 dark:text-slate-100">{selectedAsset.binLocation || 'N/A'}</strong></div>
                <div>Barcode: <strong className="text-slate-900 dark:text-slate-100">{selectedAsset.barcode || 'EL-STD'}</strong></div>
              </div>

              <div className="flex items-baseline justify-between pt-2">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                  ₹{(selectedAsset.basePrice || 10.0).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400">Exclusive of 18% GST</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  addToCart(selectedAsset);
                  setSelectedAsset(null);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add to Cart
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Slide-Over Quick Cart Drawer */}
      {isCartDrawerOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/60 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            {/* Cart Header */}
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-300" /> Shopping Cart ({cartItemCount})
              </h3>
              <button onClick={() => setIsCartDrawerOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {/* Free Shipping Meter */}
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-indigo-950 dark:text-indigo-200">
                  <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-indigo-600" /> Express Lab Shipping</span>
                  <span>{cartSubtotal >= FREE_SHIPPING_THRESHOLD ? 'FREE' : `₹${(FREE_SHIPPING_THRESHOLD - cartSubtotal).toFixed(2)} away`}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (cartSubtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                  />
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-3 text-slate-400">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-xs font-medium">Your storefront cart is empty.</p>
                </div>
              ) : (
                cart.map((c) => (
                  <div key={c.item.id} className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{c.item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">₹{(c.item.basePrice || 10.0).toFixed(2)} each</div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
                        <button
                          onClick={() => updateCartQty(c.item.id, c.qty - 1)}
                          className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs w-5 text-center font-mono">{c.qty}</span>
                        <button
                          onClick={() => updateCartQty(c.item.id, c.qty + 1)}
                          className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-black text-xs font-mono text-slate-900 dark:text-slate-100 w-14 text-right">
                        ₹{(c.qty * (c.item.basePrice || 10.0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18% Estimated):</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-slate-900 dark:text-slate-100 text-sm pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>Total Amount:</span>
                    <span className="text-indigo-600 dark:text-indigo-400">₹{finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => { setIsCartDrawerOpen(false); setIsCheckoutOpen(true); }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Complete Checkout Modal */}
      {isCheckoutOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" /> Experimind Storefront Checkout
              </h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300 custom-scrollbar">
              {/* Order Purpose & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider mb-1">Order Purpose</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium text-xs"
                  >
                    <option value="PURCHASE">B2B Commercial Order</option>
                    <option value="INTERNAL">Internal Lab Reservation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider mb-1">Payment Gateway</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium text-xs"
                  >
                    <option value="UPI">Instant UPI Direct Pay (QR)</option>
                    <option value="RAZORPAY">Razorpay Gateway (Cards/NetBanking)</option>
                  </select>
                </div>
              </div>

              {/* Anti-Bot Honeypot */}
              <div style={{ display: 'none' }} aria-hidden="true">
                <input type="text" name="website_url_hp" value={honeypotWebsite} onChange={(e) => setHoneypotWebsite(e.target.value)} />
              </div>

              {/* Customer Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Customer / Org Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adarsh Devadiga"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">GSTIN (Optional for Tax Claim)</label>
                  <input
                    type="text"
                    placeholder="29ABCDE1234F1Z5"
                    value={customerGSTIN}
                    onChange={(e) => setCustomerGSTIN(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="adarsh@experimindlabs.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Delivery Address</label>
                  <input
                    type="text"
                    placeholder="Experimind Labs, Nitte Lab Block B"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Info Card */}
              {paymentMethod === 'UPI' ? (
                <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs">
                      <QrCode className="w-4 h-4 text-indigo-600" />
                      <span>Instant UPI Direct Payment</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded-md">
                      Zero Gateway Fees
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Pay directly to UPI ID: <strong className="font-mono text-indigo-700 dark:text-indigo-400">{UPI_ID}</strong>
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-xs">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Razorpay Payment Gateway</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Supports Corporate Credit Cards, Debit Cards, NetBanking, and Wallets with automated GST e-invoice generation.
                  </p>
                </div>
              )}

              {/* Submit Section */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Total Amount Payable</div>
                  <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">₹{finalTotal.toFixed(2)}</div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !customerName}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3.5 rounded-2xl text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? 'Processing Order...' : 'Pay & Reserve Order'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
