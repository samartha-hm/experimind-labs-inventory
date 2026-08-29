'use client';
import Link from 'next/link';
import { ShoppingBag, Search, Sparkles, Award, Menu, X, Compass, Cpu, Atom, BookOpen, Layers } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const itemCount = useCartStore((state) => state.itemCount());

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/catalog');
    }
  };

  return (
    <header className="sticky top-0 z-50 shadow-xs backdrop-blur-md bg-white/95 border-b border-slate-200/80 transition-all">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white text-[11px] sm:text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2 tracking-wide">
        <Award className="h-4 w-4 text-amber-400 shrink-0" />
        <span>Honored with <strong>Grassroots STEM Innovator Recognition</strong> | Free Pan-India Delivery over ₹999</span>
      </div>

      {/* Main Navigation Bar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 gap-4">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                ExperiMind <span className="text-indigo-600 font-black">Shop</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Hands-on STEM Innovation
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-6 relative">
            <input
              type="text"
              placeholder="Search STEM kits, Geomagic, physics labs, sensors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 hover:bg-slate-100/90 focus:bg-white text-slate-900 placeholder:text-slate-400 pl-11 pr-4 py-2.5 rounded-full border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </form>

          {/* Customer Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
            <Link href="/catalog" className="hover:text-indigo-600 transition-colors">All Kits</Link>
            <Link href="/catalog?category=STEM%20Kits" className="hover:text-indigo-600 transition-colors text-indigo-600 font-black">Flagship Kits</Link>
            <Link href="/catalog?category=Maths%20kits" className="hover:text-indigo-600 transition-colors">3D Math</Link>
            <Link href="/catalog?category=Prastuti%20Science" className="hover:text-indigo-600 transition-colors">Science Demos</Link>
            <Link href="/catalog?category=Robotics%20%26%20IoT" className="hover:text-indigo-600 transition-colors">Robotics</Link>
          </div>

          {/* Cart Button */}
          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2.5 rounded-full transition-all border border-indigo-200/60 shadow-xs group"
            >
              <ShoppingBag className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline text-xs font-bold">Cart</span>
              {mounted && itemCount > 0 && (
                <span className="bg-indigo-600 text-white text-xs font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-xs">
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
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search STEM kits, Geomagic, sensors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 text-slate-900 placeholder:text-slate-400 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </form>
          
          <div className="flex flex-col gap-1 font-semibold text-slate-800 text-sm">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-3 rounded-lg hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3">
              <Compass className="h-4 w-4 text-indigo-500" />
              <span>Home</span>
            </Link>
            <Link href="/catalog" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-3 rounded-lg hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span>All Educational Kits</span>
            </Link>
            <Link href="/catalog?category=STEM%20Kits" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-3 rounded-lg hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 font-bold text-indigo-600">
              <Award className="h-4 w-4 text-indigo-600" />
              <span>Flagship STEM Kits (Geomagic, PSL, Prastuti)</span>
            </Link>
            <Link href="/catalog?category=Maths%20kits" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-3 rounded-lg hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-cyan-500" />
              <span>3D Geometry & Visual Math</span>
            </Link>
            <Link href="/catalog?category=Prastuti%20Science" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-3 rounded-lg hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3">
              <Atom className="h-4 w-4 text-emerald-500" />
              <span>Classroom Science Demonstrations</span>
            </Link>
            <Link href="/catalog?category=Robotics%20%26%20IoT" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-3 rounded-lg hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3">
              <Cpu className="h-4 w-4 text-violet-500" />
              <span>Robotics, Coding & Sensors</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
