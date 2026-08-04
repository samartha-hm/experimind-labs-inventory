import React, { useState, useMemo } from 'react';
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
  Upload,
  QrCode,
  Sparkles,
  Info,
  Layers,
  Plus,
  Minus,
  Globe,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { InventoryItem } from '@/src/types';
import { useToast } from '@/src/contexts/ToastContext';

interface ShopTabProps {
  inventory: InventoryItem[];
  onPlaceOrder?: (orderData: any) => void;
}

export default function ShopTab({ inventory, onPlaceOrder }: ShopTabProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedAsset, setSelectedAsset] = useState<InventoryItem | null>(null);
  const [cart, setCart] = useState<{ item: InventoryItem; qty: number }[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'UPI'>('UPI');
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Form State
  const [orderType, setOrderType] = useState<'PURCHASE' | 'INTERNAL'>('PURCHASE');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [purpose, setPurpose] = useState('');
  const [honeypotWebsite, setHoneypotWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const UPI_ID = 'adarshdevadiga@fifederal';

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    inventory.forEach((item) => {
      if (item.category && item.category.trim() !== '') {
        cats.add(item.category.trim());
      }
    });
    return ['ALL', ...Array.from(cats).sort()];
  }, [inventory]);

  const filteredAssets = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'ALL' ||
        (item.category && item.category.trim() === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, selectedCategory]);

  const addToCart = (item: InventoryItem, qty: number = 1) => {
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
    setSelectedAsset(null);
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

  const cartSubtotal = cart.reduce(
    (sum, c) => sum + c.qty * (c.item.basePrice || 10.0),
    0
  );

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
        address,
        type: orderType,
        purpose,
        paymentMethod,
        totalAmount: cartSubtotal,
        items: cart.map((c) => ({
          assetId: c.item.id,
          name: c.item.name,
          quantity: c.qty,
          price: c.item.basePrice || 10.0,
        })),
        createdAt: new Date().toISOString(),
      };

      if (onPlaceOrder) onPlaceOrder(orderObj);

      setIsSubmitting(false);
      setIsCheckoutOpen(false);
      setCart([]);
      setOrderSuccessMsg(`Order #${orderObj.orderId} submitted & reserved in ERP!`);
      showToast('success', 'Order Placed Successfully', `Registered Sales Order #${orderObj.orderId} for ${customerName}`);
      setTimeout(() => setOrderSuccessMsg(null), 6000);
    }, 1000);
  };

  return (
    <div className="space-y-6 w-full relative animate-fadeIn">
      {/* Top Storefront Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden glow-card-indigo">
        <div className="space-y-2 max-w-xl z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-emerald-400" /> shop.experimindlabs.com
            </span>
            <span className="text-slate-400 text-xs font-medium">• Official Storefront Portal</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Experimind Labs B2B Storefront</h2>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            Direct online ordering for hardware components, sensors, microcontrollers, science kitting, and custom lab raw materials with Razorpay & instant UPI checkout.
          </p>
        </div>

        {/* Cart Counter & Checkout trigger */}
        <div className="flex items-center gap-4 z-10 shrink-0">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="relative bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-3 cursor-pointer text-xs"
          >
            <ShoppingBag className="w-5 h-5 text-amber-300" />
            <span>Cart ({cart.reduce((s, c) => s + c.qty, 0)})</span>
            {cart.length > 0 && (
              <span className="font-mono text-emerald-300 border-l border-indigo-400/40 pl-2">
                ₹{cartSubtotal.toFixed(2)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {orderSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{orderSuccessMsg}</span>
          </div>
          <button onClick={() => setOrderSuccessMsg(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Category Filter Pills */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search storefront catalog by SKU, name, or category (e.g. Wash bottles, Petri Dish, ESP32)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Storefront Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAssets.map((asset) => {
          const isOutOfStock = asset.stockQty === 0;
          return (
            <div
              key={asset.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200 flex flex-col justify-between space-y-3 group cursor-pointer"
              onClick={() => setSelectedAsset(asset)}
            >
              <div className="space-y-3">
                <div className="w-full h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center overflow-hidden relative">
                  {asset.imageUrl ? (
                    <img
                      src={asset.imageUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Box className="w-8 h-8 text-indigo-400" />
                  )}

                  {isOutOfStock ? (
                    <span className="absolute top-2 right-2 px-2.5 py-1 bg-rose-600 text-white text-[10px] font-black uppercase rounded-lg shadow-sm">
                      Out of Stock
                    </span>
                  ) : (
                    <span className="absolute top-2 right-2 px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg shadow-sm">
                      {asset.stockQty} in stock
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {asset.category || 'General'}
                  </div>
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {asset.name}
                  </h4>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    SKU: {asset.id} {asset.binLocation ? `• Bin: ${asset.binLocation}` : ''}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                  ₹{(asset.basePrice || 10.0).toFixed(2)}
                </div>

                <button
                  disabled={isOutOfStock}
                  onClick={() => addToCart(asset, 1)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    isOutOfStock
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedAsset.name}</h3>
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">SKU: {selectedAsset.id}</span>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full h-48 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
              {selectedAsset.imageUrl ? (
                <img src={selectedAsset.imageUrl} alt={selectedAsset.name} className="w-full h-full object-cover" />
              ) : (
                <Box className="w-10 h-10 text-indigo-400" />
              )}
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p>Category: <strong className="text-slate-900 dark:text-slate-100">{selectedAsset.category}</strong></p>
              <p>Available Stock: <strong className="text-emerald-600 dark:text-emerald-400">{selectedAsset.stockQty} {selectedAsset.unit}</strong></p>
              {selectedAsset.binLocation && <p>Storage Bin: <strong className="font-mono text-slate-900 dark:text-slate-100">{selectedAsset.binLocation}</strong></p>}
              {selectedAsset.description && <p className="text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">{selectedAsset.description}</p>}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-lg font-black text-slate-900 dark:text-slate-100">₹{(selectedAsset.basePrice || 10.0).toFixed(2)}</span>
              <button
                disabled={selectedAsset.stockQty === 0}
                onClick={() => addToCart(selectedAsset, 1)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart & Razorpay / UPI Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" /> Experimind Storefront Checkout
              </h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
              {/* Order Items Summary */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wider">Order Items ({cart.length})</h4>
                {cart.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    Your cart is empty. Add items from the catalog.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {cart.map((c) => (
                      <div key={c.item.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{c.item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">₹{(c.item.basePrice || 10.0).toFixed(2)} each</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateCartQty(c.item.id, c.qty - 1)}
                              className="p-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold w-6 text-center">{c.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(c.item.id, c.qty + 1)}
                              className="p-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs w-16 text-right font-mono">
                            ₹{(c.qty * (c.item.basePrice || 10.0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <>
                  {/* Order Type & Payment Gateway Selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider mb-1">Order Purpose</label>
                      <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
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
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
                      >
                        <option value="UPI">Instant UPI Direct Pay</option>
                        <option value="RAZORPAY">Razorpay Gateway (Cards/NetBanking)</option>
                      </select>
                    </div>
                  </div>

                  {/* Anti-Bot Honeypot */}
                  <div style={{ display: 'none' }} aria-hidden="true">
                    <input
                      type="text"
                      name="website_url_hp"
                      value={honeypotWebsite}
                      onChange={(e) => setHoneypotWebsite(e.target.value)}
                    />
                  </div>

                  {/* Customer Information Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Customer / Organization Name *</label>
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
                      <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="customer@experimindlabs.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Shipping Address</label>
                      <input
                        type="text"
                        placeholder="Lab Block B, Nitte"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment Gateway Render */}
                  {paymentMethod === 'UPI' ? (
                    <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold">
                        <QrCode className="w-4 h-4 text-indigo-600" />
                        <span>Instant UPI Direct Payment</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Scan & Pay via UPI ID: <strong className="font-mono text-indigo-700 dark:text-indigo-400">{UPI_ID}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span>Razorpay Secure Gateway</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Supports Credit Cards, Debit Cards, NetBanking, and Corporate Cards.
                      </p>
                    </div>
                  )}

                  {/* Total & Submit Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Total Payable</div>
                      <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">₹{cartSubtotal.toFixed(2)}</div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !customerName}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      {isSubmitting ? 'Processing...' : 'Pay & Reserve Order'} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
