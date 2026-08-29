'use client';
import { useCartStore } from "@/store/useCartStore";
import Link from "next/link";
import { Trash2, ArrowRight, ShoppingBag, ShieldCheck, Truck, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCartStore();
  const [mounted, setMounted] = useState(false);

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
            Discover award-winning STEM kits and laboratory apparatus from Experimind Labs.
          </p>
        </div>
        <div>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-8 py-4 rounded-2xl transition-all shadow-md shadow-indigo-600/20"
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
  const orderTotal = subtotal + shippingFee;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Shopping Cart</h1>
          <p className="text-xs text-slate-500 mt-1">Review your selected STEM kits and educational supplies.</p>
        </div>
        <Link href="/catalog" className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700 gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {items.map((item) => (
              <div key={item.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                
                {/* Item Thumbnail */}
                <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center p-2">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-3xl">📦</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{item.sku}</span>
                  <h4 className="text-base font-bold text-slate-900 truncate">
                    <Link href={`/product/${item.id}`} className="hover:text-indigo-600">
                      {item.name}
                    </Link>
                  </h4>
                  <div className="text-sm font-bold text-slate-900">
                    ₹{Number(item.price).toLocaleString('en-IN')} <span className="text-xs text-slate-400 font-normal">/ unit</span>
                  </div>
                </div>

                {/* Quantity Controls & Total */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto">
                  <div className="flex flex-col items-end sm:items-center gap-1">
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="w-8 h-8 rounded-lg bg-white text-slate-700 hover:bg-slate-200 font-bold text-sm flex items-center justify-center shadow-xs cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-bold text-slate-900 text-xs">{item.quantity}</span>
                      <button
                        onClick={() => {
                          const maxStock = typeof item.maxStock === 'number' ? item.maxStock : 99;
                          if (item.quantity < maxStock) {
                            updateQuantity(item.id, item.quantity + 1);
                          }
                        }}
                        disabled={item.quantity >= (item.maxStock || 99)}
                        className={`w-8 h-8 rounded-lg font-bold text-sm flex items-center justify-center shadow-xs transition-colors ${
                          item.quantity >= (item.maxStock || 99)
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-white text-slate-700 hover:bg-slate-200 cursor-pointer'
                        }`}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    {item.quantity >= (item.maxStock || 99) && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Max Stock ({item.maxStock || item.quantity})
                      </span>
                    )}
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

          {/* Shipping Notification Banner */}
          <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 ${
            isFreeShipping 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}>
            <Truck className="h-5 w-5 shrink-0" />
            {isFreeShipping ? (
              <span>🎉 Congratulations! You have unlocked <strong>Free Pan-India Delivery</strong>.</span>
            ) : (
              <span>Add <strong>₹{(freeShippingThreshold - subtotal).toLocaleString('en-IN')}</strong> more to unlock Free Delivery!</span>
            )}
          </div>
        </div>

        {/* Order Summary Column */}
        <div className="lg:col-span-4 sticky top-28 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Order Summary</h3>

            <div className="space-y-3 text-xs divide-y divide-slate-100">
              <div className="flex justify-between text-slate-600 pt-2">
                <span>Subtotal ({items.length} items)</span>
                <span className="font-bold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-3">
                <span>Estimated Shipping</span>
                <span className={`font-bold ${isFreeShipping ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {isFreeShipping ? 'FREE' : `₹${shippingFee}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 pt-3">
                <span>Taxes & GST (Included)</span>
                <span className="font-bold text-slate-900">₹0.00 (All Inclusive)</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-4">
                <span>Total Amount</span>
                <span className="text-xl font-black text-indigo-600">₹{orderTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-4 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-600/25"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Directly registered in Experimind Central ERP</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Tracked courier shipment from Karnataka Lab</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
