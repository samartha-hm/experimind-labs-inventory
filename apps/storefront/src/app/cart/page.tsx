'use client';
import { useCartStore } from "@/store/useCartStore";
import Link from "next/link";
import {
  Trash2,
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
  Truck,
  ArrowLeft,
  Tag,
  CheckCircle2,
  X,
  Sparkles,
  Percent,
  Check
} from "lucide-react";
import { useEffect, useState } from "react";
import SafeProductImage from "@/components/SafeProductImage";

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);

  // Promo Code Engine
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Your Cart is Empty</h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Discover award-winning STEM kits and laboratory apparatus from ExperiMind Labs.
          </p>
        </div>
        <div>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-8 py-4 rounded-2xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <span>Explore Catalog</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = total();
  const freeShippingThreshold = 999;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingFee = isFreeShipping ? 0 : 99;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  // Calculate discount if coupon applied
  const discountAmount = appliedCoupon ? Math.round((subtotal * appliedCoupon.discountPercent) / 100) : 0;
  const orderTotal = subtotal - discountAmount + shippingFee;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponInput.trim().toUpperCase();
    if (clean === 'EXPERIMIND10') {
      setAppliedCoupon({ code: 'EXPERIMIND10', discountPercent: 10 });
      setCouponError(null);
    } else if (clean === 'ATL2026') {
      setAppliedCoupon({ code: 'ATL2026', discountPercent: 15 });
      setCouponError(null);
    } else {
      setCouponError('Invalid coupon code. Try EXPERIMIND10 for 10% off.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Shopping Cart</h1>
          <p className="text-xs text-slate-500 mt-1">Review your selected STEM apparatus and classroom sets.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={clearCart}
            className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
          >
            Clear Cart
          </button>
          <Link href="/catalog" className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700 gap-1 bg-indigo-50 px-3.5 py-2 rounded-xl">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: ITEMS & FREE SHIPPING PROGRESS BAR         */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Amazon Free Shipping Threshold Progress Meter */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>
                  {isFreeShipping
                    ? '🎉 You have unlocked Free Pan-India Delivery!'
                    : `Add ₹${(freeShippingThreshold - subtotal).toLocaleString('en-IN')} more to unlock FREE Express Air Delivery!`}
                </span>
              </div>
              <span className="font-mono text-indigo-600">{progressPercent}%</span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFreeShipping ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {items.map((item) => (
              <div key={item.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                
                {/* Item Thumbnail */}
                <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center p-2">
                  <SafeProductImage
                    src={item.imageUrl}
                    alt={item.name}
                    category={item.category}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{item.sku || 'STEM Kit'}</span>
                  <h4 className="text-base font-bold text-slate-900 truncate">
                    <Link href={`/product/${item.id}`} className="hover:text-indigo-600">
                      {item.name}
                    </Link>
                  </h4>
                  <div className="text-sm font-bold text-slate-900">
                    ₹{Number(item.price).toLocaleString('en-IN')} <span className="text-xs text-slate-400 font-normal">/ unit</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold block">In Stock • Dispatch in 24 Hours</span>
                </div>

                {/* Quantity Controls & Total */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto">
                  <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="w-8 h-8 rounded-xl bg-white text-slate-700 hover:bg-slate-200 font-bold text-sm flex items-center justify-center shadow-xs cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold text-slate-900 text-xs">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-xl bg-white text-slate-700 hover:bg-slate-200 font-bold text-sm flex items-center justify-center shadow-xs cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right min-w-[80px]">
                    <div className="text-base font-black text-slate-900">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-slate-400 hover:text-red-500 p-2 rounded-xl transition-colors cursor-pointer"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

              </div>
            ))}
          </div>

        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: STICKY ORDER SUMMARY & COUPON ENGINE       */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 sticky top-28 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Order Summary</h3>

            {/* Promo Code Input */}
            <form onSubmit={handleApplyCoupon} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter Coupon Code (e.g. EXPERIMIND10)"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white uppercase outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {appliedCoupon && (
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center justify-between">
                  <span>Coupon {appliedCoupon.code} applied ({appliedCoupon.discountPercent}% off)</span>
                  <button onClick={() => setAppliedCoupon(null)} className="text-emerald-700 hover:underline">
                    Remove
                  </button>
                </div>
              )}

              {couponError && (
                <div className="text-[11px] text-red-600 font-medium">{couponError}</div>
              )}
            </form>

            <div className="space-y-3 text-xs divide-y divide-slate-100 pt-2">
              <div className="flex justify-between text-slate-600 pt-2">
                <span>Subtotal ({items.length} items)</span>
                <span className="font-bold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 pt-3 font-bold">
                  <span>Coupon Discount ({appliedCoupon.discountPercent}%)</span>
                  <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 pt-3">
                <span>Estimated Shipping</span>
                <span className={`font-bold ${isFreeShipping ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {isFreeShipping ? 'FREE' : `₹${shippingFee}`}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 pt-3">
                <span>18% GST (Included in MRP)</span>
                <span className="font-bold text-slate-900">₹0.00 (All-Inclusive)</span>
              </div>

              <div className="flex justify-between text-base font-black text-slate-900 pt-4">
                <span>Total Amount</span>
                <span className="text-2xl font-black text-indigo-600">₹{orderTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-4 px-6 rounded-2xl transition-all shadow-xl shadow-indigo-600/25 cursor-pointer hover:scale-[1.02]"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Quality Assured STEM Apparatus</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Tracked Express Courier Delivery</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
