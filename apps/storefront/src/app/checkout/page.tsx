'use client';
import { useCartStore } from "@/store/useCartStore";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShoppingBag, ShieldCheck, ArrowRight, ArrowLeft, Lock, Truck, AlertCircle, Phone, Mail, User, MapPin, Building2, CreditCard } from "lucide-react";
import Link from "next/link";

const INDIAN_STATES = [
  "Karnataka", "Maharashtra", "Tamil Nadu", "Kerala", "Telangana", "Andhra Pradesh",
  "Delhi", "Gujarat", "Rajasthan", "Uttar Pradesh", "West Bengal", "Madhya Pradesh",
  "Punjab", "Haryana", "Bihar", "Odisha", "Assam", "Goa", "Himachal Pradesh", "Uttarakhand"
];

export default function CheckoutPage() {
  const { items, total, clearCart, updateQuantity } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [orderConfirmed, setOrderConfirmed] = useState<any | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
    notes: '',
    paymentMethod: 'cod',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (items.length === 0 && !orderConfirmed) {
    router.push('/cart');
    return null;
  }

  const subtotal = total();
  const isFreeShipping = subtotal >= 999;
  const shippingFee = isFreeShipping ? 0 : 99;
  const orderTotal = subtotal + shippingFee;

  // Validation Rules
  const isNameValid = formData.name.trim().length >= 3 && /^[a-zA-Z\s.]+$/.test(formData.name.trim());
  const isEmailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim());
  const isPhoneValid = /^[6-9]\d{9}$/.test(formData.phone.replace(/[\s-+]/g, ''));
  const isAddressValid = formData.address.trim().length >= 8;
  const isCityValid = formData.city.trim().length >= 2;
  const isPincodeValid = /^[1-9][0-9]{5}$/.test(formData.pincode.trim());

  const isFormValid = isNameValid && isEmailValid && isPhoneValid && isAddressValid && isCityValid && isPincodeValid;

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
    });

    if (!isFormValid) {
      setServerError('Please correct the highlighted fields in the delivery form before proceeding.');
      return;
    }

    setLoading(true);
    setServerError(null);

    const cleanPhone = formData.phone.replace(/[\s-+]/g, '');
    const fullAddress = `${formData.address.trim()}, ${formData.city.trim()}, ${formData.state} - ${formData.pincode.trim()}${formData.notes ? ` (Notes: ${formData.notes.trim()})` : ''}`;

    try {
      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.name.trim(),
          customerEmail: formData.email.trim().toLowerCase(),
          customerPhone: cleanPhone,
          customerAddress: fullAddress,
          items: items.map((i) => ({
            itemId: i.id,
            quantity: i.quantity,
          })),
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to process order. Please verify your details.');
      }

      setOrderConfirmed(resData || { id: 'ORD-' + Math.floor(100000 + Math.random() * 900000) });
      clearCart();
    } catch (err: any) {
      setServerError(err.message || 'An unexpected error occurred while placing the order.');
    } finally {
      setLoading(false);
    }
  };

  if (orderConfirmed) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-8 animate-fadeIn">
        <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10 border border-emerald-100">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        </div>
        
        <div className="space-y-3">
          <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider border border-indigo-200/60">
            Order Confirmed & Registered
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Thank you for ordering with ExperiMind Labs!
          </h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Your STEM kit order has been recorded in our central inventory ERP. Our lab technicians in Karnataka will prepare your parcel for dispatch.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-left space-y-4 text-xs">
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Customer Name</span>
            <span className="font-bold text-slate-900 text-sm">{formData.name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Email Confirmation</span>
            <span className="font-bold text-slate-900">{formData.email}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Contact Mobile</span>
            <span className="font-bold text-slate-900">+91 {formData.phone.replace(/[\s-+]/g, '')}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Shipping Destination</span>
            <span className="font-bold text-slate-900 text-right max-w-sm">{formData.address}, {formData.city}, {formData.state} - {formData.pincode}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-slate-700 font-bold text-sm">Total Order Value (GST Included)</span>
            <span className="font-black text-indigo-600 text-xl">₹{orderTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="pt-4 flex justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-4 px-8 rounded-2xl transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40"
          >
            <span>Return to Storefront</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Secure Checkout</h1>
          <p className="text-xs text-slate-500 mt-1">Direct laboratory dispatch from Experimind Labs (Karnataka, India).</p>
        </div>
        <Link href="/cart" className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700 gap-1.5 bg-indigo-50 px-3.5 py-2 rounded-xl border border-indigo-200/60">
          <ArrowLeft className="h-4 w-4" />
          <span>Review Cart</span>
        </Link>
      </div>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-shake">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Order Submission Error:</span>
            <span>{serverError}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Checkout Form Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">1. Shipping & Educator Details</h3>
                <p className="text-[11px] text-slate-500">Provide accurate contact details for tracking updates.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full Name / Institution Contact <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Dr. Ramesh Rao"
                      value={formData.name}
                      onBlur={() => handleBlur('name')}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 focus:bg-white outline-none transition-all ${
                        touched.name && !isNameValid
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                          : touched.name && isNameValid
                          ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                          : 'border-slate-200 focus:ring-2 focus:ring-indigo-100'
                      }`}
                    />
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  {touched.name && !isNameValid && (
                    <p className="text-[11px] text-red-500 mt-1 font-semibold">Please enter a valid full name (at least 3 letters).</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="e.g. principal@school.edu.in"
                      value={formData.email}
                      onBlur={() => handleBlur('email')}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 focus:bg-white outline-none transition-all ${
                        touched.email && !isEmailValid
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                          : touched.email && isEmailValid
                          ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                          : 'border-slate-200 focus:ring-2 focus:ring-indigo-100'
                      }`}
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  {touched.email && !isEmailValid && (
                    <p className="text-[11px] text-red-500 mt-1 font-semibold">Please enter a valid email address (e.g. name@domain.com).</p>
                  )}
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  10-Digit Mobile Number (India) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 border-r border-slate-200 pr-2 flex items-center gap-1">
                    <span>🇮🇳 +91</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    maxLength={10}
                    value={formData.phone}
                    onBlur={() => handleBlur('phone')}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    className={`w-full bg-slate-50 border rounded-xl pl-24 pr-4 py-3 text-xs text-slate-900 focus:bg-white outline-none transition-all font-mono font-medium ${
                      touched.phone && !isPhoneValid
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                        : touched.phone && isPhoneValid
                        ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                        : 'border-slate-200 focus:ring-2 focus:ring-indigo-100'
                    }`}
                  />
                </div>
                {touched.phone && !isPhoneValid && (
                  <p className="text-[11px] text-red-500 mt-1 font-semibold">Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Street Address / School Campus / Lab Location <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Door / Building No., Street, Landmark, Area..."
                  value={formData.address}
                  onBlur={() => handleBlur('address')}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full bg-slate-50 border rounded-xl p-3 text-xs text-slate-900 focus:bg-white outline-none transition-all resize-none ${
                    touched.address && !isAddressValid
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                      : touched.address && isAddressValid
                      ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                      : 'border-slate-200 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
                {touched.address && !isAddressValid && (
                  <p className="text-[11px] text-red-500 mt-1 font-semibold">Please enter a complete delivery address (at least 8 characters).</p>
                )}
              </div>

              {/* City, State, PIN Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    City / Town <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru"
                    value={formData.city}
                    onBlur={() => handleBlur('city')}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`w-full bg-slate-50 border rounded-xl p-3 text-xs text-slate-900 focus:bg-white outline-none transition-all ${
                      touched.city && !isCityValid
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                        : 'border-slate-200 focus:ring-2 focus:ring-indigo-100'
                    }`}
                  />
                  {touched.city && !isCityValid && (
                    <p className="text-[11px] text-red-500 mt-1 font-semibold">City is required.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 560001"
                    maxLength={6}
                    value={formData.pincode}
                    onBlur={() => handleBlur('pincode')}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                    className={`w-full bg-slate-50 border rounded-xl p-3 text-xs text-slate-900 focus:bg-white outline-none transition-all font-mono font-medium ${
                      touched.pincode && !isPincodeValid
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                        : touched.pincode && isPincodeValid
                        ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                        : 'border-slate-200 focus:ring-2 focus:ring-indigo-100'
                    }`}
                  />
                  {touched.pincode && !isPincodeValid && (
                    <p className="text-[11px] text-red-500 mt-1 font-semibold">Valid 6-digit PIN code required.</p>
                  )}
                </div>
              </div>

              {/* Delivery Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Order / Laboratory Instruction Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deliver to Science Department / Gate 2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-4 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5"
              >
                <Lock className="h-4 w-4" />
                <span>{loading ? 'Processing Order...' : `Confirm & Place Order (₹${orderTotal.toLocaleString('en-IN')})`}</span>
              </button>

            </form>
          </div>
        </div>

        {/* Order Summary Column */}
        <div className="lg:col-span-5 sticky top-28 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Order Summary ({items.length} items)</span>
              <span className="text-xs text-emerald-600 font-semibold">100% Guaranteed</span>
            </h3>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto space-y-3 pr-1">
              {items.map((item) => (
                <div key={item.id} className="pt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-lg">📦</span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 truncate max-w-[180px]">{item.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Qty: {item.quantity} × ₹{item.price}
                      </div>
                    </div>
                  </div>
                  <div className="font-black text-slate-900">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Shipping</span>
                <span className={`font-bold ${isFreeShipping ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {isFreeShipping ? 'FREE' : `₹${shippingFee}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST / Taxes</span>
                <span className="font-bold text-slate-900">Included (₹0 Extra)</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-100">
                <span>Total Amount</span>
                <span className="text-xl font-black text-indigo-600">₹{orderTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Direct dispatch from ExperiMind Central Warehouse</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Pan-India tracked courier delivery</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
