'use client';
import Link from 'next/link';
import {
  ShoppingBag,
  Search,
  Sparkles,
  Award,
  Menu,
  X,
  Truck,
  User,
  MapPin,
  Tag,
  ShieldCheck,
  Check,
  ArrowRight,
  LogOut,
  Package,
  FileText,
  Building
} from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import SafeProductImage from './SafeProductImage';
import CustomerAuthModal from './CustomerAuthModal';

const POPULAR_SEARCH_KEYWORDS = [
  'Geomagic 3D Geometry',
  'Anubhav Early STEM',
  'Optical Prism & Lens Bench',
  'Pulley & Friction Lab',
  'Sensory Science Kit',
  'Robotics & IoT Sensors',
  'Classroom Demonstration Models'
];

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchCategory, setSelectedSearchCategory] = useState('All');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Customer Auth State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const customer = useCustomerStore((state) => state.customer);
  const isLoggedIn = useCustomerStore((state) => state.isLoggedIn);
  const logout = useCustomerStore((state) => state.logout);

  // Delivery PIN code state (Amazon Deliver To)
  const [pincodeModalOpen, setPincodeModalOpen] = useState(false);
  const [currentPincode, setCurrentPincode] = useState('560100');
  const [currentCity, setCurrentCity] = useState('Bengaluru');
  const [tempPincodeInput, setTempPincodeInput] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);

  // Announcement state
  const [cmsAnnouncement, setCmsAnnouncement] = useState({
    isVisible: true,
    text: "🎉 National Science Day: Activity Workbooks included with all STEM Kits!",
    discountCode: "EXPERIMIND10",
    linkUrl: "/catalog"
  });

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const itemCount = useCartStore((state) => state.itemCount());
  const cartTotal = useCartStore((state) => state.total());

  useEffect(() => {
    setMounted(true);

    try {
      const savedPin = localStorage.getItem('experimind_delivery_pincode');
      const savedCity = localStorage.getItem('experimind_delivery_city');
      if (savedPin) setCurrentPincode(savedPin);
      if (savedCity) setCurrentCity(savedCity);
    } catch (_) {}

    // Fetch dynamic announcement from CMS API
    fetch('/api/public/storefront/cms')
      .then((res) => res.json())
      .then((data) => {
        if (data?.announcement) {
          setCmsAnnouncement(data.announcement);
        }
      })
      .catch((_) => {});

    // Close dropdowns on outside click
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live auto-suggest search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        let url = `/api/public/storefront/catalog?q=${encodeURIComponent(searchQuery.trim())}`;
        if (selectedSearchCategory !== 'All') {
          url += `&category=${encodeURIComponent(selectedSearchCategory)}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data.slice(0, 6) : []);
          setShowSearchDropdown(true);
        }
      } catch (_) {
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedSearchCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSearchDropdown(false);
    let targetUrl = '/catalog';
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedSearchCategory !== 'All') params.set('category', selectedSearchCategory);

    const qs = params.toString();
    if (qs) targetUrl += `?${qs}`;
    router.push(targetUrl);
  };

  const handlePincodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tempPincodeInput.trim();
    if (/^[1-9][0-9]{5}$/.test(clean)) {
      let resolvedCity = 'India';
      if (clean.startsWith('56')) resolvedCity = 'Bengaluru';
      else if (clean.startsWith('11')) resolvedCity = 'New Delhi';
      else if (clean.startsWith('40')) resolvedCity = 'Mumbai';
      else if (clean.startsWith('50')) resolvedCity = 'Hyderabad';
      else if (clean.startsWith('60')) resolvedCity = 'Chennai';
      else if (clean.startsWith('70')) resolvedCity = 'Kolkata';
      else if (clean.startsWith('38')) resolvedCity = 'Ahmedabad';
      else if (clean.startsWith('57')) resolvedCity = 'Karnataka (Districts)';
      else resolvedCity = 'Your Location';

      setCurrentPincode(clean);
      setCurrentCity(resolvedCity);
      try {
        localStorage.setItem('experimind_delivery_pincode', clean);
        localStorage.setItem('experimind_delivery_city', resolvedCity);
      } catch (_) {}

      setPincodeStatus(`Verified: Delivery Available to ${resolvedCity} (${clean})`);
      setTimeout(() => {
        setPincodeModalOpen(false);
        setPincodeStatus(null);
      }, 900);
    } else {
      setPincodeStatus('Please enter a valid 6-digit Indian postal PIN code.');
    }
  };

  const firstName = mounted && isLoggedIn && customer?.name
    ? customer.name.split(' ')[0]
    : 'Sign In';

  return (
    <header className="sticky top-0 z-40 shadow-xs bg-white border-b border-slate-200 transition-all">
      
      {/* 1. TOP ANNOUNCEMENT RIBBON */}
      {cmsAnnouncement.isVisible && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white text-[11px] sm:text-xs py-1.5 px-4 text-center font-semibold flex items-center justify-center gap-2 tracking-wide border-b border-indigo-900/40">
          <Award className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span>{cmsAnnouncement.text}</span>
          {cmsAnnouncement.discountCode && (
            <span className="hidden md:inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded text-[10px] ml-1 border border-amber-400/30">
              <Tag className="w-2.5 h-2.5" /> Use Code: <strong>{cmsAnnouncement.discountCode}</strong>
            </span>
          )}
        </div>
      )}

      {/* 2. PRIMARY HEADER BAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 gap-4">
          
          {/* Brand Logo & Tagline */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                ExperiMind Labs <span className="text-indigo-600 font-black">Store</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Hands-on STEM Kits & Labware
              </span>
            </div>
          </Link>

          {/* Deliver to Location Selector */}
          <button
            onClick={() => {
              setTempPincodeInput(currentPincode);
              setPincodeModalOpen(true);
            }}
            className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-2xl hover:bg-slate-100/80 transition-colors text-left text-xs cursor-pointer border border-transparent hover:border-slate-200"
            title="Click to change your delivery PIN code"
          >
            <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="leading-tight">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Deliver to</span>
              <span className="font-black text-slate-900 block truncate max-w-[120px]">
                {currentCity} {currentPincode}
              </span>
            </div>
          </button>

          {/* High-Power Search Bar */}
          <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-xl mx-2 relative">
            <form onSubmit={handleSearch} className="w-full flex items-center bg-slate-100 hover:bg-slate-100/90 rounded-2xl border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
              
              <select
                value={selectedSearchCategory}
                onChange={(e) => setSelectedSearchCategory(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-600 py-2.5 pl-3 pr-2 border-r border-slate-200 outline-none cursor-pointer shrink-0"
              >
                <option value="All">All Categories</option>
                <option value="STEM Kits">Flagship Kits</option>
                <option value="Maths kits">3D Math & Geometry</option>
                <option value="Prastuti Science">Demonstration Models</option>
                <option value="Robotics & IoT">Robotics & Sensors</option>
              </select>

              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search STEM kits, Geomagic 3D, physics benches, sensors..."
                  value={searchQuery}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchDropdown(true);
                  }}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 pl-3 pr-8 py-2.5 outline-none text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchDropdown(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                title="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>

            {/* Auto-suggest Search Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                  <span>Product Suggestions</span>
                  <span>{searchResults.length} items found</span>
                </div>

                <div className="p-2 divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {searchResults.map((item) => (
                    <Link
                      key={item.id}
                      href={`/product/${item.id}`}
                      onClick={() => setShowSearchDropdown(false)}
                      className="flex items-center gap-3 p-2.5 hover:bg-indigo-50/70 rounded-2xl transition-colors group"
                    >
                      <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        <SafeProductImage
                          src={item.imageUrl}
                          alt={item.name}
                          category={item.category}
                          className="w-full h-full object-contain p-0.5"
                        />
                      </div>
                      <div className="flex-grow min-w-0 text-left">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{item.category}</span>
                          <span>•</span>
                          <span className="text-slate-900 font-black">₹{Number(item.basePrice).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </div>

                <div className="bg-slate-50 p-3 border-t border-slate-100 text-xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 text-left">
                    Popular Searches
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SEARCH_KEYWORDS.slice(0, 4).map((kw) => (
                      <button
                        key={kw}
                        onClick={() => {
                          setSearchQuery(kw);
                          router.push(`/catalog?q=${encodeURIComponent(kw)}`);
                          setShowSearchDropdown(false);
                        }}
                        className="text-[11px] font-semibold bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* 1. Track Order Shortcut */}
            <Link
              href="/track"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-2xl hover:bg-slate-100 text-slate-700 hover:text-indigo-600 transition-colors text-xs font-bold"
              title="Track Package & Fulfillment Stepper"
            >
              <Truck className="w-4 h-4 text-indigo-600" />
              <div className="text-left leading-tight">
                <span className="text-[10px] text-slate-400 block font-normal">Real-Time</span>
                <span>Track Order</span>
              </div>
            </Link>

            {/* 2. Customer Authentication & Account Hub */}
            <div ref={userDropdownRef} className="relative">
              {mounted && isLoggedIn ? (
                <div>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl hover:bg-slate-100 text-slate-700 hover:text-indigo-600 transition-colors text-xs font-bold cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                      {customer?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="text-left leading-tight hidden sm:block">
                      <span className="text-[10px] text-slate-400 block font-normal">Hello, {firstName}</span>
                      <span className="text-slate-900 font-bold">Account & Orders</span>
                    </div>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-3xl border border-slate-200 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 text-left">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5 mb-2">
                        <div className="font-black text-slate-900 text-xs truncate">{customer?.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{customer?.email}</div>
                        <span className="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-1">
                          {customer?.role}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs font-bold text-slate-700">
                        <Link
                          href="/account"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 hover:text-indigo-600"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          <span>Your Account Dashboard</span>
                        </Link>
                        <Link
                          href="/account"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 hover:text-indigo-600"
                        >
                          <Package className="w-4 h-4 text-slate-400" />
                          <span>Your Orders & History</span>
                        </Link>
                        <Link
                          href="/track"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 hover:text-indigo-600"
                        >
                          <Truck className="w-4 h-4 text-slate-400" />
                          <span>Track Active Shipments</span>
                        </Link>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            logout();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl text-red-600 hover:bg-red-50 font-bold text-xs cursor-pointer transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl hover:bg-slate-100 text-slate-700 hover:text-indigo-600 transition-colors text-xs font-bold cursor-pointer"
                >
                  <User className="w-4 h-4 text-indigo-600" />
                  <div className="text-left leading-tight hidden sm:block">
                    <span className="text-[10px] text-slate-400 block font-normal">Hello, Educator</span>
                    <span>Sign In / Register</span>
                  </div>
                </button>
              )}
            </div>

            {/* 3. Cart with Amount Indicator */}
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl transition-all shadow-md shadow-indigo-600/20 group cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <div className="text-left leading-tight hidden sm:block">
                <span className="text-[10px] text-indigo-200 block font-normal">Cart</span>
                <span className="text-xs font-black">₹{mounted ? cartTotal.toLocaleString('en-IN') : '0'}</span>
              </div>
              {mounted && itemCount > 0 && (
                <span className="bg-amber-400 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-xs">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

          </div>

        </div>
      </div>

      {/* 3. SECONDARY CATEGORY NAVIGATION RIBBON */}
      <div className="bg-slate-900 text-slate-200 text-xs font-bold border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between overflow-x-auto scrollbar-none py-2 gap-4">
          
          <div className="flex items-center gap-6 shrink-0">
            <Link
              href="/catalog"
              className="flex items-center gap-1.5 text-white hover:text-indigo-400 transition-colors uppercase tracking-wider text-[11px]"
            >
              <Menu className="w-3.5 h-3.5" />
              <span>All Categories</span>
            </Link>

            <Link href="/catalog?category=STEM%20Kits" className="hover:text-white transition-colors text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Flagship STEM Kits</span>
            </Link>

            <Link href="/catalog?category=Maths%20kits" className="hover:text-white transition-colors">
              3D Geomagic Math
            </Link>

            <Link href="/catalog?category=Prastuti%20Science" className="hover:text-white transition-colors">
              Demonstration Science
            </Link>

            <Link href="/catalog?category=Robotics%20%26%20IoT" className="hover:text-white transition-colors">
              Robotics & Sensors
            </Link>

            <Link
              href="/institutional-quote"
              className="hover:text-cyan-300 transition-colors text-cyan-400 flex items-center gap-1 font-bold"
            >
              <Building className="w-3.5 h-3.5 text-cyan-400" />
              <span>B2B / School Quotation</span>
            </Link>

            <Link
              href="/catalog?badge=Deal"
              className="hover:text-amber-300 transition-colors text-amber-400 flex items-center gap-1 font-black"
            >
              <span>⚡ Deals of the Day</span>
            </Link>
          </div>

          <div className="hidden xl:flex items-center gap-5 shrink-0 text-[11px] text-slate-400 font-semibold">
            <span className="flex items-center gap-1">
              <Truck className="w-3 h-3 text-indigo-400" />
              <span>Nationwide Courier Shipping</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Quality Assured STEM Apparatus</span>
            </span>
          </div>

        </div>
      </div>

      {/* 4. MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 text-left">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search STEM kits, Geomagic, sensors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 text-slate-900 pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </form>

          <div className="flex flex-col space-y-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-xl">Home</Link>
            <Link href="/catalog" onClick={() => setMobileMenuOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-xl">All Kits & Labware</Link>
            <Link href="/institutional-quote" onClick={() => setMobileMenuOpen(false)} className="p-2.5 hover:bg-cyan-50 text-cyan-700 rounded-xl font-black flex items-center gap-2">
              <Building className="w-4 h-4 text-cyan-600" />
              <span>B2B / School Quotation Hub</span>
            </Link>
            <Link href="/catalog?category=STEM%20Kits" onClick={() => setMobileMenuOpen(false)} className="p-2.5 hover:bg-indigo-50 text-indigo-600 rounded-xl font-black">Flagship STEM Kits</Link>
            <Link href="/catalog?category=Maths%20kits" onClick={() => setMobileMenuOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-xl">3D Geomagic Math</Link>
            <Link href="/catalog?category=Prastuti%20Science" onClick={() => setMobileMenuOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-xl">Demonstration Science</Link>
            <Link href="/catalog?category=Robotics%20%26%20IoT" onClick={() => setMobileMenuOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-xl">Robotics & Sensors</Link>
            
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/track"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold"
              >
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Track Your Order</span>
              </Link>
              {isLoggedIn ? (
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-2.5 bg-red-50 text-red-700 rounded-xl font-bold text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>Sign Out ({customer?.name})</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-2.5 bg-slate-100 text-slate-800 rounded-xl font-bold text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-600" />
                  <span>Sign In / Create Account</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. CUSTOMER AUTH MODAL */}
      <CustomerAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* 6. PINCODE DELIVERY MODAL */}
      {mounted && pincodeModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setPincodeModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 text-xs text-left my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Choose Your Delivery Location</h3>
              </div>
              <button
                type="button"
                onClick={() => setPincodeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your 6-digit Indian PIN code to check shipping eligibility and dispatch estimates.
            </p>

            <form onSubmit={handlePincodeSubmit} className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="e.g. 560100"
                  value={tempPincodeInput}
                  onChange={(e) => setTempPincodeInput(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 font-mono font-bold text-sm outline-none text-center tracking-widest"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Verify
                </button>
              </div>

              {pincodeStatus && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  pincodeStatus.startsWith('Verified') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {pincodeStatus.startsWith('Verified') ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-red-500" />}
                  <span>{pincodeStatus}</span>
                </div>
              )}
            </form>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>📍 Dispatched from Karnataka</span>
              <span>⚡ Reliable Courier Shipping</span>
            </div>
          </div>
        </div>,
        document.body
      )}

    </header>
  );
}
