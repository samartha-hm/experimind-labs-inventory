'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Truck,
  Search,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  MessageSquare,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Printer,
  ChevronRight,
  Phone,
  Mail,
  Box,
  Calendar,
  User
} from 'lucide-react';
import SafeProductImage from '@/components/SafeProductImage';
import { useCustomerStore } from '@/store/useCustomerStore';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const customer = useCustomerStore((state) => state.customer);
  const isLoggedIn = useCustomerStore((state) => state.isLoggedIn);

  useEffect(() => {
    const queryOrderId = searchParams.get('orderId') || searchParams.get('id');
    const queryContact = searchParams.get('contact') || searchParams.get('email') || searchParams.get('phone');

    if (queryOrderId) {
      setOrderIdInput(queryOrderId);
      if (queryContact) setContactInput(queryContact);
      fetchTrackingData(queryOrderId, queryContact || '');
    }

    // Load recent orders from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('experimind_recent_orders') || '[]');
      setRecentOrders(saved);
    } catch (_) {}
  }, [searchParams]);

  const fetchTrackingData = async (orderId: string, contact: string) => {
    if (!orderId.trim()) {
      setError('Please enter a valid Order Number or Order ID.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/v1/orders/track?orderId=${encodeURIComponent(orderId.trim())}&contact=${encodeURIComponent(contact.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No matching order found for the provided details. Please verify your order number.');
      }

      setOrder(data);

      // Save order to recent orders history
      try {
        const saved = JSON.parse(localStorage.getItem('experimind_recent_orders') || '[]');
        if (!saved.some((o: any) => o.id === data.id || o.order_number === data.order_number)) {
          const updated = [{ id: data.id, order_number: data.order_number, date: data.created_at, total: data.total_amount }, ...saved];
          localStorage.setItem('experimind_recent_orders', JSON.stringify(updated.slice(0, 10)));
          setRecentOrders(updated.slice(0, 10));
        }
      } catch (_) {}
    } catch (e: any) {
      setOrder(null);
      setError(e.message || 'Order lookup failed. Please verify your details or contact customer care.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrackingData(orderIdInput, contactInput);
  };

  // Helper to determine status step
  const getStepIndex = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') return 4;
    if (s === 'out_for_delivery') return 3;
    if (s === 'shipped') return 2;
    if (s === 'packed') return 1;
    return 0; // 'created' or 'paid'
  };

  const currentStep = order ? getStepIndex(order.status) : 0;

  const steps = [
    {
      title: 'Order Confirmed',
      desc: 'Registered in Central Inventory OS',
      date: order?.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Pending',
      done: currentStep >= 0,
      active: currentStep === 0
    },
    {
      title: 'Pack in Lab',
      desc: 'Calibrated & Packaged at Karnataka Lab',
      date: currentStep >= 1 ? 'Completed' : 'Upcoming',
      done: currentStep >= 1,
      active: currentStep === 1
    },
    {
      title: 'Dispatched & Handed Over',
      desc: order?.carrier ? `Courier: ${order.carrier}` : 'Assigned to Courier Partner',
      date: currentStep >= 2 ? (order?.tracking_number ? `AWB: ${order.tracking_number}` : 'In Transit') : 'Upcoming',
      done: currentStep >= 2,
      active: currentStep === 2
    },
    {
      title: 'Out for Delivery',
      desc: 'Courier out for final delivery to consignee',
      date: currentStep >= 3 ? 'In Progress' : 'Upcoming',
      done: currentStep >= 3,
      active: currentStep === 3
    },
    {
      title: 'Delivered',
      desc: 'Package received at institution or home',
      date: currentStep >= 4 ? 'Delivered' : 'Estimated',
      done: currentStep >= 4,
      active: currentStep === 4
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 text-left">
      
      {/* Header Banner */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold border border-indigo-100">
          <Truck className="w-4 h-4 text-indigo-600" />
          <span>Real-Time Courier Fulfillment Tracker</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Track Your STEM Kit Order
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter your Order Number (from your email confirmation or invoice) to view live fulfillment progress directly from our central lab warehouse.
        </p>
      </div>

      {/* Order Search Form */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 max-w-3xl mx-auto">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Order Number / ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. EXP-2026-4891 or Order ID"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Email or Mobile Number <span className="text-slate-400 font-normal">(Optional Verification)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. educator@school.edu.in or Mobile"
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Searching Lab Fulfillment...' : 'Track Order Status'}</span>
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Quick Tracking of Recent Orders */}
        {recentOrders.length > 0 && !order && (
          <div className="pt-6 mt-6 border-t border-slate-100 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Recent Orders on this Device
            </span>
            <div className="flex flex-wrap gap-2">
              {recentOrders.slice(0, 3).map((ro: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    setOrderIdInput(ro.order_number || ro.id);
                    fetchTrackingData(ro.order_number || ro.id, '');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  <span>#{ro.order_number || ro.id.slice(0, 8)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Order Tracking Report */}
      {order && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          
          {/* Order Status Header */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-lg sm:text-2xl font-black font-mono tracking-tight text-white">
                  #{order.order_number || order.id?.slice(0, 8)}
                </span>
                <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  order.status === 'delivered'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : order.status === 'shipped' || order.status === 'out_for_delivery'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {order.status?.replace(/_/g, ' ') || 'Processing'}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            <div className="text-right flex items-center gap-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Amount</span>
                <span className="text-2xl font-black text-white">₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
              {steps.map((step, idx) => (
                <div key={idx} className="flex sm:flex-col items-center sm:text-center gap-3 relative">
                  {/* Step Icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all shrink-0 z-10 ${
                    step.done
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : step.active
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {step.done ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-black truncate ${step.done ? 'text-slate-900' : 'text-slate-500'}`}>
                      {step.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{step.desc}</p>
                    <span className="text-[9px] font-mono font-bold text-indigo-600 block mt-0.5">{step.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left: Consignee & Shipping Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Delivery & Consignee Information</span>
              </h4>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Recipient</span>
                  <span className="font-bold text-slate-900 text-sm">{order.customer_name || 'Valued Educator'}</span>
                </div>
                {order.customer_email && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Email Address</span>
                    <span className="text-slate-700">{order.customer_email}</span>
                  </div>
                )}
                {order.customer_phone && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Contact Mobile</span>
                    <span className="text-slate-700 font-mono">{order.customer_phone}</span>
                  </div>
                )}
                {order.customer_address && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Delivery Address</span>
                    <span className="text-slate-700 leading-relaxed">{order.customer_address}</span>
                  </div>
                )}
                {order.carrier && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Logistics Partner</span>
                    <span className="font-bold text-indigo-600">{order.carrier}</span>
                    {order.tracking_number && (
                      <span className="text-slate-600 block font-mono text-[11px]">AWB Tracking: {order.tracking_number}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Ordered Kit Items */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Box className="w-4 h-4 text-indigo-600" />
                <span>Items in this Shipment ({order.lines?.length || 0})</span>
              </h4>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                {order.lines && order.lines.length > 0 ? (
                  order.lines.map((line: any, idx: number) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{line.item_name || 'STEM Apparatus Kit'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Qty: {line.quantity}</span>
                      </div>
                      <span className="font-black text-slate-900 shrink-0">
                        ₹{(Number(line.unit_price) * Number(line.quantity)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">Standard STEM Kit Order</div>
                )}
              </div>

              {/* Need Help Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-indigo-900 block">Need Help with this Shipment?</span>
                  <span className="text-slate-500 text-[11px]">Contact ExperiMind Customer Support</span>
                </div>
                <a
                  href={`https://wa.me/919876543210?text=Hello%20ExperiMind%20Labs,%20I%20need%20assistance%20with%20Order%20%23${order.order_number || order.id}.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shrink-0"
                >
                  WhatsApp Support
                </a>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-xs text-slate-400">
        Loading real-time tracking console...
      </div>
    }>
      <TrackOrderContent />
    </Suspense>
  );
}
