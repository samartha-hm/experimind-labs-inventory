'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  ShoppingBag,
  MapPin,
  ShieldCheck,
  Truck,
  ArrowRight,
  Package,
  FileText,
  CheckCircle2,
  Clock,
  LogOut,
  Mail,
  Phone,
  Building,
  Sparkles,
  ExternalLink,
  Search,
  Plus,
  Edit2,
  Trash2,
  Star,
  RefreshCw,
  HelpCircle,
  MessageSquare,
  Lock,
  ChevronRight,
  AlertCircle,
  Printer,
  X,
  Check,
  Share2,
  SlidersHorizontal,
  Box,
  Compass
} from 'lucide-react';
import SafeProductImage from '@/components/SafeProductImage';
import { useCartStore } from '@/store/useCartStore';
import { useCustomerStore } from '@/store/useCustomerStore';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh'
];

interface AddressItem {
  id: string;
  isDefault: boolean;
  name: string;
  phone: string;
  organization?: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  addressType: 'School / ATL Lab' | 'Home' | 'Work / Institution';
}

const DEFAULT_ADDRESSES: AddressItem[] = [
  {
    id: 'addr-1',
    isDefault: true,
    name: 'Dr. Ramesh Sharma',
    phone: '+91 98765 43210',
    organization: 'Vidyaniketan STEM Academy',
    addressLine: 'Plot 42, Electronics City Phase 1, Main Campus',
    landmark: 'Opposite Innovation Hub Gate 2',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560100',
    addressType: 'School / ATL Lab'
  }
];

export default function CustomerAccountPage() {
  // Navigation tabs: 'orders' | 'addresses' | 'profile' | 'warranty' | 'invoices' | 'help'
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile' | 'warranty' | 'invoices' | 'help'>('orders');
  
  // Auth & Profile State
  const [emailInput, setEmailInput] = useState('');
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('Dr. Ramesh Sharma');
  const [customerPhone, setCustomerPhone] = useState('+91 98765 43210');
  const [institutionName, setInstitutionName] = useState('Vidyaniketan STEM Academy');
  const [userRole, setUserRole] = useState('ATL Lab Coordinator');
  const [gstin, setGstin] = useState('29AAACE1234F1Z5');

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderTimeFilter, setOrderTimeFilter] = useState<string>('2026');

  // Addresses State
  const [addresses, setAddresses] = useState<AddressItem[]>(DEFAULT_ADDRESSES);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);
  const [addressForm, setAddressForm] = useState<AddressItem>({
    id: '',
    isDefault: false,
    name: '',
    phone: '',
    organization: '',
    addressLine: '',
    landmark: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
    addressType: 'School / ATL Lab'
  });

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<any | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewHeadline, setReviewHeadline] = useState('');

  // Replacement Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimOrder, setClaimOrder] = useState<any | null>(null);
  const [claimItem, setClaimItem] = useState<any | null>(null);
  const [claimReason, setClaimReason] = useState('Damaged Glassware / Prism');
  const [claimDescription, setClaimDescription] = useState('');
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  // Cart integration for "Buy It Again"
  const addItem = useCartStore((state) => state.addItem);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

  const showToast = (title: string, desc: string) => {
    setToastMessage({ title, desc });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load from local storage on mount
  useEffect(() => {
    try {
      const storedEmail = localStorage.getItem('experimind_customer_email');
      const storedName = localStorage.getItem('experimind_customer_name');
      const storedPhone = localStorage.getItem('experimind_customer_phone');
      const storedInst = localStorage.getItem('experimind_customer_institution');
      const storedRole = localStorage.getItem('experimind_customer_role');
      const storedGstin = localStorage.getItem('experimind_customer_gstin');
      const storedAddresses = localStorage.getItem('experimind_saved_addresses');

      if (storedEmail) setCustomerEmail(storedEmail);
      if (storedName) setCustomerName(storedName);
      if (storedPhone) setCustomerPhone(storedPhone);
      if (storedInst) setInstitutionName(storedInst);
      if (storedRole) setUserRole(storedRole);
      if (storedGstin) setGstin(storedGstin);

      if (storedAddresses) {
        setAddresses(JSON.parse(storedAddresses));
      } else {
        localStorage.setItem('experimind_saved_addresses', JSON.stringify(DEFAULT_ADDRESSES));
      }

      if (storedEmail) {
        fetchCustomerOrders(storedEmail);
      }
    } catch (_) {}
  }, []);

  const fetchCustomerOrders = async (email: string) => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/v1/orders/customer/${encodeURIComponent(email.trim().toLowerCase())}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (_) {
    } finally {
      setLoadingOrders(false);
    }
  };

  const customerStore = useCustomerStore();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    const cleanEmail = emailInput.trim().toLowerCase();
    setCustomerEmail(cleanEmail);
    customerStore.login({
      email: cleanEmail,
      name: customerName,
      phone: customerPhone,
      role: userRole,
      organization: institutionName,
      gstin: gstin
    });
    fetchCustomerOrders(cleanEmail);
    showToast('Signed In', `Welcome back to your ExperiMind Labs portal.`);
  };

  const handleLogout = () => {
    setCustomerEmail(null);
    setOrders([]);
    customerStore.logout();
    showToast('Signed Out', 'You have been signed out of your customer account.');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('experimind_customer_name', customerName);
    localStorage.setItem('experimind_customer_phone', customerPhone);
    localStorage.setItem('experimind_customer_institution', institutionName);
    localStorage.setItem('experimind_customer_role', userRole);
    localStorage.setItem('experimind_customer_gstin', gstin);
    showToast('Profile Updated', 'Your educational account details and GSTIN have been saved.');
  };

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      id: 'addr-' + Date.now(),
      isDefault: addresses.length === 0,
      name: customerName,
      phone: customerPhone,
      organization: institutionName,
      addressLine: '',
      landmark: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '',
      addressType: 'School / ATL Lab'
    });
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: AddressItem) => {
    setEditingAddress(addr);
    setAddressForm({ ...addr });
    setIsAddressModalOpen(true);
  };

  const handleSaveAddressForm = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedList: AddressItem[];

    if (editingAddress) {
      updatedList = addresses.map((a) => (a.id === editingAddress.id ? addressForm : a));
    } else {
      updatedList = [...addresses, addressForm];
    }

    if (addressForm.isDefault) {
      updatedList = updatedList.map((a) => ({
        ...a,
        isDefault: a.id === addressForm.id
      }));
    }

    setAddresses(updatedList);
    localStorage.setItem('experimind_saved_addresses', JSON.stringify(updatedList));
    setIsAddressModalOpen(false);
    showToast('Address Saved', 'Your delivery destination has been saved to your address book.');
  };

  const handleDeleteAddress = (id: string) => {
    const updated = addresses.filter((a) => a.id !== id);
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0].isDefault = true;
    }
    setAddresses(updated);
    localStorage.setItem('experimind_saved_addresses', JSON.stringify(updated));
    showToast('Address Removed', 'The address has been deleted.');
  };

  const handleSetDefaultAddress = (id: string) => {
    const updated = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    setAddresses(updated);
    localStorage.setItem('experimind_saved_addresses', JSON.stringify(updated));
    showToast('Default Updated', 'This address will be auto-selected for future lab orders.');
  };

  const handleBuyAgain = (line: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: line.item_id || line.id,
      name: line.item?.name || line.item_name,
      price: Number(line.unit_price) || 999,
      quantity: 1,
      imageUrl: line.item?.imageUrl
    });
    showToast('Added to Cart', `1x "${line.item?.name || line.item_name}" added for re-order.`);
  };

  const handleOpenReview = (line: any) => {
    setReviewProduct(line);
    setRatingStars(5);
    setReviewHeadline('');
    setReviewText('');
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setIsReviewModalOpen(false);
    showToast('Review Submitted', `Thank you! Your ${ratingStars}-star educator review has been published.`);
  };

  const handleOpenClaim = (order: any, line: any) => {
    setClaimOrder(order);
    setClaimItem(line);
    setClaimReason('Damaged Glassware / Prism');
    setClaimDescription('');
    setClaimSubmitted(false);
    setIsClaimModalOpen(true);
  };

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();
    setClaimSubmitted(true);
    setTimeout(() => {
      setIsClaimModalOpen(false);
      showToast('Claim Registered', `Replacement Request #REP-${Math.floor(100000 + Math.random() * 900000)} approved for dispatch.`);
    }, 1500);
  };

  // Filtered Orders
  const filteredOrders = orders.filter((order) => {
    if (orderStatusFilter !== 'ALL') {
      if (orderStatusFilter === 'dispatched' && order.status !== 'shipped') return false;
      if (orderStatusFilter === 'unfulfilled' && !['created', 'paid', 'packed'].includes(order.status)) return false;
      if (orderStatusFilter === 'delivered' && order.status !== 'delivered') return false;
      if (orderStatusFilter === 'cancelled' && order.status !== 'cancelled') return false;
    }

    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase();
      const matchesId = (order.order_number || order.id || '').toLowerCase().includes(q);
      const matchesItem = (order.lines || []).some((l: any) =>
        (l.item_name || l.item?.name || '').toLowerCase().includes(q)
      );
      if (!matchesId && !matchesItem) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/40 to-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-xs font-black">{toastMessage.title}</div>
            <div className="text-[11px] text-slate-300">{toastMessage.desc}</div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ======================================================== */}
        {/* 1. EXECUTIVE AMAZON/FLIPKART IDENTITY BANNER            */}
        {/* ======================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            {/* Avatar & Greeting */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg shadow-indigo-600/20 shrink-0">
                {customerName ? customerName.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {customerName}
                  </h1>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200/80">
                    Verified STEM Partner
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                  <span>{institutionName}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-700 font-bold">{customerEmail || 'lab@school.edu.in'}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics & Auth Action */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 px-4 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Orders</span>
                  <span className="text-base font-black text-indigo-600">{orders.length}</span>
                </div>
                <div className="w-px h-6 bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Addresses</span>
                  <span className="text-base font-black text-slate-800">{addresses.length}</span>
                </div>
              </div>

              {customerEmail ? (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <form onSubmit={handleLogin} className="flex items-center gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Enter order email..."
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none w-48 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Login
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. THE AMAZON 6-BOX NAVIGATION TILES                    */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: 'orders', label: 'Your Orders', icon: Package, count: orders.length, color: 'text-indigo-600' },
            { id: 'addresses', label: 'Your Addresses', icon: MapPin, count: addresses.length, color: 'text-cyan-600' },
            { id: 'profile', label: 'Login & Profile', icon: User, color: 'text-blue-600' },
            { id: 'warranty', label: 'Lab Warranty', icon: ShieldCheck, color: 'text-emerald-600' },
            { id: 'invoices', label: 'GST Tax Invoices', icon: FileText, color: 'text-amber-600' },
            { id: 'help', label: '24x7 Help Center', icon: MessageSquare, color: 'text-purple-600' }
          ].map((tile) => {
            const Icon = tile.icon;
            const isActive = activeTab === tile.id;
            return (
              <button
                key={tile.id}
                onClick={() => setActiveTab(tile.id as any)}
                className={`p-4 rounded-3xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-28 ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20 scale-[1.02]'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 ' + tile.color
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {tile.count !== undefined && (
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tile.count}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className={`text-xs font-black tracking-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                    {tile.label}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: YOUR ORDERS (AMAZON / FLIPKART STYLE WORKBENCH)   */}
        {/* ======================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Search & Filter Toolbar */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search all orders by kit name, order ID (#EXP...)..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none text-xs">
                {[
                  { id: 'ALL', label: 'All Orders' },
                  { id: 'unfulfilled', label: 'Awaiting Dispatch' },
                  { id: 'dispatched', label: 'In Transit' },
                  { id: 'delivered', label: 'Delivered' }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setOrderStatusFilter(st.id)}
                    className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      orderStatusFilter === st.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Feed */}
            {loadingOrders ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <span className="text-xs font-bold text-slate-500">Loading your laboratory dispatches...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 space-y-4 shadow-sm">
                <ShoppingBag className="w-14 h-14 text-slate-300 mx-auto" />
                <h3 className="text-lg font-black text-slate-900">
                  {orderSearchQuery ? 'No matching orders found' : 'You have no placed orders yet'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When you order STEM kits, Geomagic 3D tools, or optical apparatus, your shipments will appear here with live courier tracking.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <Link
                    href="/catalog"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <span>Explore STEM Catalog</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const status = (order.status || 'created').toLowerCase();
                const isDelivered = status === 'delivered';
                const isShipped = status === 'shipped';
                const isPacked = status === 'packed';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Top Summary Ribbon (The Amazon Order Card Standard) */}
                    <div className="bg-slate-50/80 border-b border-slate-200/80 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
                      
                      <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Order Placed</span>
                          <span className="font-bold text-slate-800">
                            {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Total Amount</span>
                          <span className="font-black text-slate-900">
                            ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Ship To</span>
                          <span className="font-bold text-slate-800 truncate max-w-[160px] block" title={order.customer_address}>
                            {order.customer_name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Order ID</span>
                          <span className="font-mono font-bold text-indigo-600">
                            #{order.order_number || order.id?.slice(0, 8)}
                          </span>
                        </div>

                        <Link
                          href={`/track?orderId=${encodeURIComponent(order.order_number || order.id)}`}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-2xs"
                          title="Print / View Tax Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                      </div>

                    </div>

                    {/* Order Body & Status Headline */}
                    <div className="p-6 space-y-6">
                      
                      {/* Status Headline Banner */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            isDelivered ? 'bg-emerald-500 animate-none' : isShipped ? 'bg-blue-500 animate-pulse' : 'bg-amber-400 animate-pulse'
                          }`} />
                          <h4 className="text-sm font-black text-slate-900">
                            {isDelivered
                              ? 'Delivered safely to campus'
                              : isShipped
                              ? `On the way • Handed to ${order.carrier || 'Delhivery Express'}`
                              : isPacked
                              ? 'Quality Tested & Packed at Karnataka Lab'
                              : 'Order Confirmed • Preparing Lab Apparatus'}
                          </h4>
                        </div>

                        {order.tracking_number && (
                          <div className="text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                            AWB: <strong>{order.tracking_number}</strong>
                          </div>
                        )}
                      </div>

                      {/* Line Items List */}
                      <div className="space-y-4">
                        {(order.lines || []).map((line: any) => (
                          <div
                            key={line.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-2 shrink-0 overflow-hidden shadow-2xs">
                                <SafeProductImage
                                  src={line.item?.imageUrl}
                                  alt={line.item_name}
                                  category="STEM Kits"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="space-y-1 min-w-0">
                                <h5 className="font-bold text-slate-900 text-sm truncate">
                                  {line.item_name || line.item?.name || 'STEM Apparatus'}
                                </h5>
                                <div className="text-xs text-slate-500 font-mono">
                                  Qty: <strong>{line.quantity}</strong> • Unit Price: ₹{Number(line.unit_price).toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>

                            {/* Item Level Action Buttons (Amazon Standard) */}
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                              
                              {/* 1-Click Buy It Again */}
                              <button
                                onClick={(e) => handleBuyAgain(line, e)}
                                className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Buy It Again</span>
                              </button>

                              {/* Rate & Review */}
                              <button
                                onClick={() => handleOpenReview(line)}
                                className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-600 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-500" />
                                <span>Write Review</span>
                              </button>

                              {/* Claim Warranty / Replacement */}
                              <button
                                onClick={() => handleOpenClaim(order, line)}
                                className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Warranty Claim</span>
                              </button>

                              {/* Track Package */}
                              <Link
                                href={`/track?orderId=${encodeURIComponent(order.order_number || order.id)}`}
                                className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Track Package</span>
                              </Link>

                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                );
              })
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: YOUR ADDRESSES (AMAZON MULTI-ADDRESS BOOK)       */}
        {/* ======================================================== */}
        {activeTab === 'addresses' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Your Saved Delivery Addresses</h2>
                <p className="text-xs text-slate-500 mt-0.5">Manage school labs, ATL makerspaces, and campus receiving gates.</p>
              </div>

              <button
                onClick={handleOpenAddAddress}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Address</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* + Add New Address Card Placeholder */}
              <div
                onClick={handleOpenAddAddress}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer hover:bg-indigo-50/20 transition-all min-h-[220px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-slate-900">Add Address</h4>
                <p className="text-xs text-slate-500">Save an additional school lab or campus gate address.</p>
              </div>

              {/* Address Cards */}
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`bg-white rounded-3xl border p-6 flex flex-col justify-between space-y-4 shadow-xs relative ${
                    addr.isDefault ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {addr.addressType}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="font-black text-slate-900 text-sm">{addr.name}</div>
                    {addr.organization && (
                      <div className="text-xs font-bold text-indigo-600">{addr.organization}</div>
                    )}
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {addr.addressLine}
                      {addr.landmark && <span className="block text-slate-400">Near: {addr.landmark}</span>}
                      <span className="block">{addr.city}, {addr.state} - {addr.pincode}</span>
                    </p>
                    <div className="text-xs font-mono font-bold text-slate-700 pt-1">
                      📞 {addr.phone}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleOpenEditAddress(addr)}
                        className="text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>

                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-slate-500 hover:text-indigo-600 cursor-pointer"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>
              ))}

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: LOGIN & PROFILE SECURITY (INSTITUTIONAL B2B)     */}
        {/* ======================================================== */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs max-w-3xl space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-black text-slate-900">Login & Profile Security</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage educational affiliations, billing details, and institutional GSTIN.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name / Lab Coordinator</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Institution / School Name</label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="e.g. Kendriya Vidyalaya / Delhi Public School"
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Educational Role</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none font-bold"
                  >
                    <option value="ATL Lab Coordinator">ATL Lab Coordinator</option>
                    <option value="School Principal / Trustee">School Principal / Trustee</option>
                    <option value="Science / Math Teacher">Science / Math Teacher</option>
                    <option value="STEM Lab Technician">STEM Lab Technician</option>
                    <option value="Parent / Independent Educator">Parent / Independent Educator</option>
                    <option value="Student Innovator">Student Innovator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={customerEmail || 'lab@school.edu.in'}
                    className="w-full p-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Institutional GSTIN <span className="text-slate-400 font-normal">(For B2B Tax Invoices)</span>
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="29AAACE1234F1Z5"
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: LAB WARRANTY & 100% REPLACEMENT GUARANTEE         */}
        {/* ======================================================== */}
        {activeTab === 'warranty' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900">100% Zero-Hassle Educational Guarantee</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ExperiMind Labs guarantees classroom-ready calibration on all physical science apparatus, optical glass prisms, and microcontrollers. If any part arrives damaged or fails during classroom instruction within 7 days of delivery, we dispatch immediate replacements at zero cost.
                </p>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>No questions asked lab replacement policy for educational institutions.</span>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900">How to File a Replacement Claim</h3>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Navigate to <strong>Your Orders</strong> tab above.</li>
                  <li>Click <strong>Warranty Claim</strong> on the affected apparatus line item.</li>
                  <li>Select the issue (Glassware damage, missing fastener, sensor recalibration).</li>
                  <li>Our Karnataka warehouse dispatches express replacement within 24 hours.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: GST TAX INVOICES & INSTITUTIONAL RECORDS         */}
        {/* ======================================================== */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-black text-slate-900">Official GST Tax Invoices</h2>
              <p className="text-xs text-slate-500 mt-0.5">Download 100% compliant tax invoices with HSN 90230000 and Karnataka GSTIN.</p>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No invoices available yet. Tax invoices are generated immediately upon order placement.
                </div>
              ) : (
                orders.map((ord) => (
                  <div key={ord.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 text-xs hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold text-slate-900 block">
                        {ord.invoice_number || `INV-EXP-2026-${ord.id?.slice(0, 5)}`}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Order #{ord.order_number || ord.id?.slice(0, 8)} • Placed {new Date(ord.created_at || Date.now()).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-black text-slate-900 text-sm">
                        ₹{Number(ord.total_amount || 0).toLocaleString('en-IN')}
                      </span>

                      <Link
                        href={`/track?orderId=${encodeURIComponent(ord.order_number || ord.id)}`}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Invoice</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: 24x7 CUSTOMER & LAB HELP CENTER                   */}
        {/* ======================================================== */}
        {activeTab === 'help' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Direct WhatsApp Lab Support</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect directly with our STEM curriculum engineers and dispatch coordinators on WhatsApp for live assembly help, curriculum alignment, or dispatch updates.
              </p>
              <a
                href="https://wa.me/919876543210?text=Hello%20ExperiMind%20Labs%20Team,%20I%20need%20assistance%20with%20my%20STEM%20kits."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Central Lab Support Desk</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our support team is active Monday through Saturday, 9:00 AM – 7:00 PM IST.
              </p>
              <div className="space-y-1.5 text-xs font-mono text-slate-700">
                <div>📞 Helpline: <strong>+91 80 4123 9876</strong></div>
                <div>📧 Lab Email: <strong>support@experimindlabs.com</strong></div>
                <div>📍 Dispatch Center: <strong>Electronics City, Bengaluru</strong></div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* ADDRESS MODAL (+ Add / Edit)                            */}
      {/* ======================================================== */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingAddress ? 'Edit Delivery Destination' : 'Add New Delivery Address'}
              </h3>
              <button onClick={() => setIsAddressModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddressForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number (10 Digits) *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">School / Institution Name (Optional)</label>
                <input
                  type="text"
                  value={addressForm.organization || ''}
                  onChange={(e) => setAddressForm({ ...addressForm, organization: e.target.value })}
                  placeholder="e.g. Vidyaniketan STEM Academy"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Street Address / Campus Gate *</label>
                <input
                  type="text"
                  required
                  value={addressForm.addressLine}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                  placeholder="Flat / Building / Sector / Campus Gate"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PIN Code *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    placeholder="560100"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State *</label>
                  <select
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white outline-none font-bold"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address Type</label>
                <div className="flex items-center gap-2">
                  {(['School / ATL Lab', 'Home', 'Work / Institution'] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setAddressForm({ ...addressForm, addressType: type })}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        addressForm.addressType === type
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="makeDefault"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="makeDefault" className="font-bold text-slate-700">
                  Make this my default address for faster checkout
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RATE & REVIEW MODAL (AMAZON STYLE 5-STAR RATING)        */}
      {/* ======================================================== */}
      {isReviewModalOpen && reviewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Write an Educator Review</h3>
                <p className="text-slate-500 text-[11px] truncate max-w-xs">{reviewProduct.item_name || reviewProduct.item?.name}</p>
              </div>
              <button onClick={() => setIsReviewModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-2">Overall Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRatingStars(star)}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                    >
                      <Star className={`w-7 h-7 ${star <= ratingStars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                  <span className="font-bold text-slate-700 ml-2">({ratingStars} / 5 Stars)</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Headline</label>
                <input
                  type="text"
                  required
                  value={reviewHeadline}
                  onChange={(e) => setReviewHeadline(e.target.value)}
                  placeholder="e.g. Excellent 3D Geomagic kit for 8th grade geometry!"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Written Review</label>
                <textarea
                  rows={3}
                  required
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="How did students interact with the apparatus? What was the classroom outcome?"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 100% WARRANTY REPLACEMENT CLAIM MODAL                   */}
      {/* ======================================================== */}
      {isClaimModalOpen && claimItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Zero-Hassle Lab Replacement</h3>
              </div>
              <button onClick={() => setIsClaimModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {claimSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-black text-slate-900">Replacement Approved!</h4>
                <p className="text-xs text-slate-500">
                  Our Karnataka central lab warehouse has queued a spare part parcel for express courier dispatch.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitClaim} className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Apparatus Item</span>
                  <div className="font-black text-slate-900 text-sm">{claimItem.item_name || claimItem.item?.name}</div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reason for Claim *</label>
                  <select
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white outline-none font-bold"
                  >
                    <option value="Damaged Glassware / Prism">Damaged Glassware / Prism in Transit</option>
                    <option value="Sensor / Microcontroller Issue">Sensor / Microcontroller Fault</option>
                    <option value="Missing Fastener / Component">Missing Fastener / Component in Kit</option>
                    <option value="Calibration Variance">Measurement / Calibration Variance</option>
                    <option value="Other Issue">Other Educational Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Description & Classroom Impact</label>
                  <textarea
                    rows={3}
                    required
                    value={claimDescription}
                    onChange={(e) => setClaimDescription(e.target.value)}
                    placeholder="Describe which part broke or needs replacement..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                  >
                    Submit Replacement Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
