'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  Award,
  Sparkles,
  BookOpen,
  Star,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  Clock,
  Compass,
  Cpu,
  Atom,
  Layers,
  Zap,
  Eye,
  Percent,
  Check,
  Building,
  Users,
  FileText,
  Shapes,
  Orbit,
  FlaskConical,
  Scale
} from 'lucide-react';
import QuickViewModal from './QuickViewModal';
import SafeProductImage from './SafeProductImage';
import { useCartStore } from '@/store/useCartStore';

const CATEGORY_STRIP = [
  { name: 'Flagship Kits', category: 'STEM Kits', icon: Award, color: 'from-amber-500 to-orange-500', badge: 'Featured' },
  { name: '3D Geometry', category: 'Maths kits', icon: Shapes, color: 'from-cyan-500 to-blue-600', badge: 'Top Math' },
  { name: 'Sensory STEM', category: 'Anubhav', icon: Sparkles, color: 'from-indigo-500 to-purple-600', badge: 'Grades 1-5' },
  { name: 'Robotics & IoT', category: 'Robotics & IoT', icon: Cpu, color: 'from-emerald-500 to-teal-600', badge: 'Sensors' },
  { name: 'Physics Labs', category: 'STEM Kits', icon: Orbit, color: 'from-blue-600 to-indigo-700', badge: 'ATL Lab' },
  { name: 'Demo Science', category: 'Prastuti Science', icon: FlaskConical, color: 'from-pink-500 to-rose-600', badge: 'Teachers' },
  { name: 'Balance & Scales', category: 'STEM Kits', icon: Scale, color: 'from-violet-500 to-purple-700', badge: 'Precision' }
];

const HERO_SLIDES = [
  {
    id: 1,
    tag: "🔬 National Science Day 2026 Celebration",
    title: "Transform Abstract Science & Math into Tangible Discovery",
    description: "Research-engineered by cognitive scientists at ExperiMind Labs. Trusted by 250+ premier ATL schools, makerspaces, and curious students across India.",
    primaryCtaText: "Shop Flagship STEM Kits",
    primaryCtaLink: "/catalog?category=STEM%20Kits",
    secondaryCtaText: "Browse 3D Geomagic",
    secondaryCtaLink: "/catalog?category=Maths%20kits",
    badge: "100% NEP 2020 Aligned",
    bgColor: "from-slate-900 via-indigo-950 to-slate-900",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    highlightCard: {
      title: "Geomagic 3D Geometry Kit",
      rating: "5.0 (140+ Reviews)",
      price: 1499,
      mrp: 1999,
      discount: "25% OFF"
    }
  },
  {
    id: 2,
    tag: "📐 Revolutionary Mathematics Pedagogy",
    title: "Geomagic 3D Visual Geometry & Spatial Mechanics",
    description: "Construct 3D Polyhedra, explore Euler formulas, and touch abstract coordinate geometry in real space with snap-lock precision engineering.",
    primaryCtaText: "Explore 3D Math Kit",
    primaryCtaLink: "/catalog?category=Maths%20kits",
    secondaryCtaText: "View Teacher Guide",
    secondaryCtaLink: "/catalog",
    badge: "Flagship STEM",
    bgColor: "from-slate-900 via-cyan-950 to-slate-900",
    image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
    highlightCard: {
      title: "Geomagic Middle School Edition",
      rating: "4.9 (95+ Reviews)",
      price: 1499,
      mrp: 1999,
      discount: "Save ₹500"
    }
  },
  {
    id: 3,
    tag: "🏫 Atal Tinkering Labs (ATL) Mandate Setup",
    title: "Classroom-Ready Physics & Robotics Workstations",
    description: "Complete hands-on physical science apparatus: motorized wave benches, harmonic pendulums, optical benches, and non-toxic calibrated glassware.",
    primaryCtaText: "Explore ATL Packages",
    primaryCtaLink: "/catalog?category=STEM%20Kits",
    secondaryCtaText: "Get Institutional Quote",
    secondaryCtaLink: "/account",
    badge: "ATL Standard",
    bgColor: "from-slate-900 via-blue-950 to-slate-900",
    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
    highlightCard: {
      title: "PSL Physics & Mechanics Lab",
      rating: "4.9 (110+ Reviews)",
      price: 2299,
      mrp: 2999,
      discount: "Special B2B Price"
    }
  }
];

const LIGHTNING_DEALS = [
  {
    id: "EXP-KIT-GEO",
    name: "Geomagic 3D Geometry & Visual Math Kit",
    category: "Maths kits",
    gradeLevel: "Grades 6–10",
    rating: 5.0,
    reviewsCount: 142,
    price: 1499,
    mrp: 1999,
    discount: "25% OFF",
    claimedPercent: 82,
    imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "EXP-KIT-ANUBHAV",
    name: "Anubhav Foundational Sensory Science Kit",
    category: "STEM Kits",
    gradeLevel: "Grades 1–5",
    rating: 4.9,
    reviewsCount: 88,
    price: 1199,
    mrp: 1599,
    discount: "25% OFF",
    claimedPercent: 74,
    imageUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "EXP-KIT-PSL",
    name: "PSL Physical Science & Problem Solving Lab",
    category: "STEM Kits",
    gradeLevel: "Grades 8–12",
    rating: 4.9,
    reviewsCount: 65,
    price: 2299,
    mrp: 2999,
    discount: "23% OFF",
    claimedPercent: 91,
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "EXP-KIT-PRASTUTI",
    name: "Prastuti Demonstration Science Models Set",
    category: "Prastuti Science",
    gradeLevel: "Grades 6–10",
    rating: 4.8,
    reviewsCount: 43,
    price: 3499,
    mrp: 4499,
    discount: "22% OFF",
    claimedPercent: 68,
    imageUrl: "https://images.unsplash.com/photo-1603555501671-8f96b3fce8b4?auto=format&fit=crop&w=800&q=80"
  }
];

interface HomeInteractiveViewProps {
  cms: any;
  featuredProducts: any[];
}

export default function HomeInteractiveView({ cms, featuredProducts }: HomeInteractiveViewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedQuickViewProduct, setSelectedQuickViewProduct] = useState<any | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [countdownTime, setCountdownTime] = useState({ hours: 7, minutes: 24, seconds: 18 });

  const addItem = useCartStore((state) => state.addItem);

  // Auto carousel slide timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  // Lightning deals countdown timer
  useEffect(() => {
    const countdown = setInterval(() => {
      setCountdownTime((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 8, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  const handleQuickAdd = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price || product.basePrice || 1499,
      imageUrl: product.imageUrl,
      category: product.category,
      quantity: 1
    });

    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div className="space-y-10 pb-16">
      
      {/* ======================================================== */}
      {/* 1. FLIPKART-STYLE TOP CATEGORY CIRCULAR STRIP            */}
      {/* ======================================================== */}
      <section className="bg-white border-b border-slate-200/80 shadow-2xs py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto scrollbar-none gap-4 sm:gap-6 py-1">
            {CATEGORY_STRIP.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={idx}
                  href={`/catalog?category=${encodeURIComponent(cat.category)}`}
                  className="flex flex-col items-center gap-2 group shrink-0 text-center min-w-[76px]"
                >
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-md shadow-slate-300/40 group-hover:scale-110 group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-300 relative`}>
                    <Icon className="w-7 h-7" />
                    {cat.badge && (
                      <span className="absolute -top-1 -right-1 bg-slate-950 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs border border-white">
                        {cat.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. HERO MEGA-BANNER CAROUSEL (AMAZON/FLIPKART STYLE)    */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`relative bg-gradient-to-br ${slide.bgColor} rounded-3xl p-8 sm:p-12 text-white shadow-2xl overflow-hidden transition-all duration-700`}>
          
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-5 text-left">
              
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black tracking-wide border border-white/20">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{slide.tag}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                {slide.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                {slide.description}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href={slide.primaryCtaLink}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/30 text-xs sm:text-sm hover:scale-105"
                >
                  <span>{slide.primaryCtaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href={slide.secondaryCtaLink}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-4 rounded-2xl transition-all border border-white/20 text-xs sm:text-sm"
                >
                  <span>{slide.secondaryCtaText}</span>
                </Link>
              </div>

              {/* Trust Metrics */}
              <div className="pt-6 border-t border-white/15 grid grid-cols-3 gap-4 text-left">
                <div>
                  <div className="text-xl sm:text-2xl font-black">250+</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ATL School Labs</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black">320+</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Precision Tools</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black">100%</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quality Tested STEM</div>
                </div>
              </div>

            </div>

            {/* Right Interactive Showcase Box */}
            <div className="lg:col-span-5 relative">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl space-y-4 max-w-md mx-auto">
                <div className="aspect-square rounded-2xl bg-white p-6 flex items-center justify-center overflow-hidden relative shadow-inner">
                  <SafeProductImage
                    src={slide.image}
                    alt={slide.title}
                    category="Maths kits"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    {slide.badge}
                  </div>
                </div>

                <div className="text-left space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">{slide.highlightCard.title}</span>
                    <span className="text-[11px] text-emerald-400 font-bold">{slide.highlightCard.discount}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">₹{slide.highlightCard.price.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-slate-400 line-through">₹{slide.highlightCard.mrp.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium pt-1 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{slide.highlightCard.rating}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Carousel Slide Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. ⚡ TODAY'S LIGHTNING DEALS (AMAZON/FLIPKART FLASH)    */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          
          {/* Header with Live Countdown */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 fill-amber-500" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Today's Lightning Deals & Lab Specials
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Special educational subsidies for verified school labs & curious home experimenters.
              </p>
            </div>

            {/* Countdown Box */}
            <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-2xl text-xs font-mono font-bold shadow-xs">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-400 font-sans text-[11px]">Ends in:</span>
              <span className="text-amber-400">
                {String(countdownTime.hours).padStart(2, '0')}h : {String(countdownTime.minutes).padStart(2, '0')}m : {String(countdownTime.seconds).padStart(2, '0')}s
              </span>
            </div>
          </div>

          {/* Deals Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LIGHTNING_DEALS.map((deal) => (
              <div
                key={deal.id}
                className="bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group relative"
              >
                {/* Discount Badge */}
                <div className="absolute top-3 left-3 z-10 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  <span>{deal.discount}</span>
                </div>

                {/* Product Image */}
                <Link
                  href={`/product/${deal.id}`}
                  className="block aspect-square bg-gradient-to-b from-slate-50 to-white p-6 overflow-hidden border-b border-slate-100 relative"
                >
                  <SafeProductImage
                    src={deal.imageUrl}
                    alt={deal.name}
                    category={deal.category}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>

                {/* Details */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4 text-left">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-indigo-600 uppercase tracking-wider">{deal.category}</span>
                      <div className="flex items-center gap-1 font-bold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{deal.rating}</span>
                      </div>
                    </div>

                    <Link href={`/product/${deal.id}`} className="block">
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {deal.name}
                      </h3>
                    </Link>

                    {/* Stock Claimed Bar (Amazon Flash Sale Bar) */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                        <span>Claimed {deal.claimedPercent}%</span>
                        <span className="text-amber-600">⚡ Limited Units</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                          style={{ width: `${deal.claimedPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-slate-900">₹{deal.price.toLocaleString('en-IN')}</span>
                        <span className="text-xs text-slate-400 line-through">₹{deal.mrp.toLocaleString('en-IN')}</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold block">Free Pan-India Delivery</span>
                    </div>

                    <button
                      onClick={(e) => handleQuickAdd(deal, e)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                        addedIds[deal.id]
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{addedIds[deal.id] ? 'Added!' : 'Add'}</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. AMAZON 4-BOX FEATURE MULTI-GRIDS                     */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Box 1: Explore by Grade Level */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4 text-left">
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">Curated by Grade Level</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Grades 1–5', sub: 'Sensory STEM', cat: 'Anubhav' },
                  { label: 'Grades 6–8', sub: 'Discovery Labs', cat: 'STEM Kits' },
                  { label: 'Grades 9–10', sub: 'Board Practicals', cat: 'Maths kits' },
                  { label: 'Grades 11–12', sub: 'Precision Physics', cat: 'STEM Kits' }
                ].map((g, idx) => (
                  <Link
                    key={idx}
                    href={`/catalog?category=${encodeURIComponent(g.cat)}`}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 transition-colors group"
                  >
                    <span className="font-black text-slate-900 text-xs block group-hover:text-indigo-600">{g.label}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{g.sub}</span>
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/catalog" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-2">
              <span>View all grade curricula</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Box 2: ATL Atal Tinkering Lab Package */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4 text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  ATL Standard
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900">Atal Tinkering Labs Package</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Complete hands-on workstations including robotics breadboards, 3D coordinate grids, and optical diffraction visors.
              </p>
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-xs font-bold text-indigo-900">
                Official B2B Tax Invoice with School GSTIN support
              </div>
            </div>
            <Link href="/catalog?category=STEM%20Kits" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-2">
              <span>Explore ATL setups</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Box 3: Top Rated in 250+ Schools */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4 text-left">
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">Top Rated in Premier Schools</h3>
              <div className="space-y-2.5">
                {[
                  { name: 'Geomagic 3D Geometry Kit', rating: '5.0', price: '₹1,499' },
                  { name: 'Anubhav Sensory Optics Set', rating: '4.9', price: '₹1,199' },
                  { name: 'PSL Harmonic Mechanics Bench', rating: '4.9', price: '₹2,299' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-xs">
                    <span className="font-bold text-slate-800 truncate max-w-[140px]">{item.name}</span>
                    <span className="font-black text-slate-900">{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
            <Link href="/catalog?badge=Top%20Rated" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-2">
              <span>Browse top rated</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Box 4: Quality Tested & Classroom Proven */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between space-y-4 text-left">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-amber-300" />
              </div>
              <h3 className="text-base font-black">Quality Tested STEM Gear</h3>
              <p className="text-xs text-indigo-100 leading-relaxed">
                All apparatus kits are research-engineered for durability, student safety, and repeatable hands-on discovery.
              </p>
            </div>
            <Link href="/account" className="text-xs font-bold text-amber-300 hover:underline flex items-center gap-1 pt-2">
              <span>Learn about our lab standards</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. B2B INSTITUTIONAL BULK QUOTE BANNER                  */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 text-left relative overflow-hidden">
          <div className="space-y-2 relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-400/30">
              <Building className="w-3.5 h-3.5" />
              <span>Institutional B2B Quotations</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Procuring for 50+ Students or Setting Up a New ATL Hub?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              We provide formal GST purchase orders, institutional pricing tiers, and customized curriculum mapping for educational trusts.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="https://wa.me/919876543210?text=Hello%20ExperiMind%20Labs,%20I%20would%20like%20an%20institutional%20quotation%20for%20our%20school%20STEM%20lab."
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition-all"
            >
              Instant WhatsApp Lab Quote
            </a>
            <Link
              href="/catalog"
              className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all"
            >
              Browse Full Catalog
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. EDUCATOR REVIEWS & TESTIMONIALS                     */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 shadow-xs space-y-8 text-left">
          <div>
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
              Endorsed by Master Educators
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              What School Lab Heads Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "The Geomagic 3D Geometry kit completely transformed our 8th grade math lab. Students who struggled with 2D drawings built icosahedra in 10 minutes.",
                author: "Dr. Ananya Sen",
                role: "Senior Math Coordinator, Delhi Public School",
                rating: 5
              },
              {
                quote: "ExperiMind Labs sets the benchmark for educational durability. Their optical benches survived 400+ student practicals without calibration drift.",
                author: "Prof. Raghavendra K.",
                role: "ATL In-charge, National Public Academy, Bengaluru",
                rating: 5
              },
              {
                quote: "Fastest lab replacement policy in India. When a student accidentally dropped a prism, our replacement arrived within 48 hours with zero hassle.",
                author: "Sr. Mary Joseph",
                role: "Science Head, St. Xavier's High School, Mumbai",
                rating: 5
              }
            ].map((t, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal italic">
                    "{t.quote}"
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-200/60">
                  <div className="font-black text-slate-900 text-xs">{t.author}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
