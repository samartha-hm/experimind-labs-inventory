'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  ShieldCheck,
  Truck,
  CheckCircle2,
  MapPin,
  Tag,
  Building,
  Sparkles,
  Award,
  BookOpen,
  Layers,
  ChevronRight,
  Plus,
  Minus,
  ShoppingBag,
  Zap,
  Check,
  X,
  FileText,
  MessageSquare,
  Clock,
  RotateCcw,
  Share2
} from 'lucide-react';
import SafeProductImage from './SafeProductImage';
import { useCartStore } from '@/store/useCartStore';

interface ProductDetailInteractiveViewProps {
  product: any;
}

export default function ProductDetailInteractiveView({ product }: ProductDetailInteractiveViewProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [pincodeInput, setPincodeInput] = useState('560100');
  const [pincodeResult, setPincodeResult] = useState<{
    verified: boolean;
    city: string;
    date: string;
    freeShipping: boolean;
    codAvailable: boolean;
  }>({
    verified: true,
    city: 'Bengaluru',
    date: 'Delivery by Thursday',
    freeShipping: true,
    codAvailable: true
  });

  // Bulk Quote Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkBatchSize, setBulkBatchSize] = useState(25);
  const [bulkDiscountTier, setBulkDiscountTier] = useState(15);
  const [bulkQuoteSuccess, setBulkQuoteSuccess] = useState(false);

  // Active Tab: 'specs' | 'curriculum' | 'reviews' | 'faq'
  const [activeTab, setActiveTab] = useState<'specs' | 'curriculum' | 'reviews' | 'faq'>('specs');
  const [addedToCartToast, setAddedToCartToast] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  const basePrice = Number(product.basePrice || product.price || 1499);
  const mrp = Math.round(basePrice * 1.3);
  const savings = mrp - basePrice;
  const discountPercent = Math.round((savings / mrp) * 100);

  const galleryImages = [
    product.imageUrl || "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80"
  ];

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pincodeInput.trim();
    if (/^[1-9][0-9]{5}$/.test(clean)) {
      let city = 'India (Pan-India Express)';
      if (clean.startsWith('56')) city = 'Bengaluru, Karnataka';
      else if (clean.startsWith('11')) city = 'New Delhi';
      else if (clean.startsWith('40')) city = 'Mumbai, Maharashtra';
      else if (clean.startsWith('50')) city = 'Hyderabad, Telangana';
      else if (clean.startsWith('60')) city = 'Chennai, Tamil Nadu';

      setPincodeResult({
        verified: true,
        city: city,
        date: 'Express Air Delivery in 3–5 Business Days',
        freeShipping: basePrice >= 999,
        codAvailable: true
      });
    } else {
      setPincodeResult({
        verified: false,
        city: 'Invalid PIN Code',
        date: 'Please enter a valid 6-digit postal PIN code',
        freeShipping: false,
        codAvailable: false
      });
    }
  };

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: basePrice,
      imageUrl: product.imageUrl,
      category: product.category,
      quantity: quantity
    });

    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(null as any), 3000);
  };

  return (
    <div className="space-y-12">
      
      {/* Toast Notification */}
      {addedToCartToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-xs font-black">{quantity}x Added to Cart!</div>
            <div className="text-[11px] text-slate-300">"{product.name}" is in your cart.</div>
          </div>
          <Link
            href="/cart"
            className="ml-3 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
          >
            View Cart
          </Link>
        </div>
      )}

      {/* Main PDP Showcase (Amazon 2-Column Standard) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* ======================================================== */}
        {/* LEFT MEDIA COLUMN: THUMBNAILS + MAIN PRODUCT IMAGE       */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-28">
          
          {/* Main Visual Frame */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs aspect-square flex items-center justify-center relative overflow-hidden group">
            <SafeProductImage
              src={galleryImages[selectedImageIndex]}
              alt={product.name}
              category={product.category}
              className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-500"
            />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-amber-300" />
                <span>{product.badge || 'ExperiMind Choice'}</span>
              </span>
              <span className="bg-slate-900/85 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm backdrop-blur-xs">
                {product.gradeLevel || 'Grades 6–10 (NEP 2020)'}
              </span>
            </div>
          </div>

          {/* Thumbnail Gallery Strip */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`w-20 h-20 rounded-2xl bg-white border p-2 shrink-0 transition-all cursor-pointer overflow-hidden ${
                  selectedImageIndex === idx
                    ? 'border-indigo-600 ring-2 ring-indigo-200 shadow-sm'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <SafeProductImage
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  category={product.category}
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
          </div>

        </div>

        {/* ======================================================== */}
        {/* RIGHT DETAILS COLUMN: TITLE, PRICE, PIN CHECK, ACTIONS   */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 space-y-6 text-left">
          
          {/* Header & Badges */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                {product.category || 'STEM Apparatus'}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                SKU: {product.sku || product.id}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {product.name}
            </h1>

            {/* Rating Bar Summary */}
            <div className="flex items-center gap-3 pt-1 text-xs">
              <div className="flex items-center gap-1 font-bold text-amber-500 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{product.rating || '4.9'}</span>
              </div>
              <span className="text-slate-500 font-semibold">(142 verified school lab reviews)</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">50+ bought this month</span>
            </div>
          </div>

          {/* Pricing & GST Breakdown Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl sm:text-4xl font-black text-slate-900">
                ₹{basePrice.toLocaleString('en-IN')}
              </span>
              <span className="text-sm text-slate-400 line-through">
                ₹{mrp.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {discountPercent}% OFF (Save ₹{savings.toLocaleString('en-IN')})
              </span>
            </div>

            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700">Inclusive of All Applicable Taxes</span>
              <span>•</span>
              <span className="font-semibold text-indigo-600">Institutional Invoices Available</span>
            </div>
          </div>

          {/* Amazon/Flipkart Delivery PIN Code Checker */}
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Delivery & Transit Options</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Nationwide Dispatch</span>
            </div>

            <form onSubmit={handleCheckPincode} className="flex items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  value={pincodeInput}
                  onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit PIN code..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:border-indigo-500 outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Check
              </button>
            </form>

            {pincodeResult.verified && (
              <div className="space-y-1 text-xs text-slate-600 pt-1">
                <div className="font-bold text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{pincodeResult.date} ({pincodeResult.city})</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {pincodeResult.freeShipping ? '✅ Free Shipping on this order' : 'Standard courier shipping'} • Tracked Delivery
                </div>
              </div>
            )}
          </div>

          {/* Quantity Selector & Primary Buy Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-slate-200 bg-white rounded-2xl p-1 shadow-2xs">
                <button
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-black text-sm text-slate-900 px-4">{quantity}</span>
                <button
                  onClick={() => setQuantity((prev) => prev + 1)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-2xl border border-emerald-100">
                In Stock at Karnataka Central Lab
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Add to Cart</span>
              </button>

              <Link
                href="/cart"
                onClick={handleAddToCart}
                className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span>Buy Now with 1-Click</span>
              </Link>
            </div>
          </div>

          {/* Institutional Bulk School Lab Quotation Modal Launcher */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-cyan-50 border border-indigo-100 flex items-center justify-between gap-4 text-xs">
            <div className="space-y-0.5">
              <span className="font-black text-indigo-900 block">Procuring for School or ATL Lab?</span>
              <span className="text-slate-600 text-[11px]">Get instant institutional pricing tiers for 10+ student batches.</span>
            </div>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold border border-indigo-200 transition-all shrink-0 cursor-pointer shadow-2xs"
            >
              Bulk Lab Quote
            </button>
          </div>

          {/* Assurance Trust Seals */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 text-center">
            <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-1">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto" />
              <span className="text-[10px] font-bold text-slate-800 block">Quality Assured STEM Gear</span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-1">
              <Truck className="w-5 h-5 text-indigo-600 mx-auto" />
              <span className="text-[10px] font-bold text-slate-800 block">Nationwide Courier Shipping</span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-1">
              <FileText className="w-5 h-5 text-amber-600 mx-auto" />
              <span className="text-[10px] font-bold text-slate-800 block">Institutional Invoices</span>
            </div>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* SECONDARY SPECS, CURRICULUM, REVIEWS & FAQ TABS          */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden text-left">
        
        {/* Tab Headers */}
        <div className="flex items-center gap-2 border-b border-slate-200 p-3 bg-slate-50/70 overflow-x-auto scrollbar-none">
          {[
            { id: 'specs', label: 'Technical Specifications & BOM', icon: Layers },
            { id: 'curriculum', label: 'Curriculum & NEP 2020 Outcomes', icon: BookOpen },
            { id: 'reviews', label: 'Verified Educator Reviews (142)', icon: Star },
            { id: 'faq', label: 'Classroom Assembly & FAQ', icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8">
          
          {/* TAB 1: TECHNICAL SPECS */}
          {activeTab === 'specs' && (
            <div className="space-y-6 text-xs animate-in fade-in duration-150">
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {[
                  { label: 'Category', value: product.category || 'Experiential STEM Kit' },
                  { label: 'Target Age & Grade', value: product.gradeLevel || 'Grades 6 to 10 (Ages 11–16)' },
                  { label: 'Board Alignment', value: 'CBSE, ICSE, Cambridge IGCSE, State Boards' },
                  { label: 'Material Calibration', value: 'High-durability ABS polymer + Lab-grade optical glass' },
                  { label: 'Safety Certifications', value: 'Non-toxic, lead-free classroom certified (EN71 compliant)' },
                  { label: 'Warranty & Replacement', value: '100% Zero-Hassle 7-Day Free Replacement Guarantee' },
                  { label: 'Country of Origin', value: 'Engineered & Assembled in Karnataka, India' }
                ].map((row, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row p-3 sm:p-4 hover:bg-slate-50">
                    <span className="font-bold text-slate-500 sm:w-1/3">{row.label}</span>
                    <span className="font-semibold text-slate-900 sm:w-2/3">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CURRICULUM OUTCOMES */}
          {activeTab === 'curriculum' && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150 leading-relaxed text-slate-700">
              <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2">
                <h4 className="font-black text-indigo-900 text-sm">Constructivist Cognitive Learning Framework</h4>
                <p>
                  ExperiMind Labs kits are designed around inquiry-driven spatial discovery. Rather than memorizing abstract formulas from 2D textbook pages, students manipulate tangible 3D geometry and physical forces to formulate empirical intuition.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h5 className="font-bold text-slate-900">Key Competencies Developed:</h5>
                  <ul className="space-y-1 list-disc list-inside text-slate-600">
                    <li>3D Spatial Reasoning & Polyhedral Construction</li>
                    <li>Empirical Measurement & Scientific Data Logging</li>
                    <li>Critical Hypothesis Testing & Error Analysis</li>
                    <li>Collaborative Team Laboratory Work</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h5 className="font-bold text-slate-900">Educator Activity Cards:</h5>
                  <ul className="space-y-1 list-disc list-inside text-slate-600">
                    <li>12 Guided Classroom Lesson Plans</li>
                    <li>Student Self-Assessment Worksheets</li>
                    <li>Teacher Answer Keys & Discussion Prompts</li>
                    <li>Digital QR Access to Interactive Video Simulations</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VERIFIED EDUCATOR REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 text-xs animate-in fade-in duration-150">
              
              {/* Rating Bar Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-slate-100 pb-6">
                <div className="md:col-span-4 text-center space-y-1">
                  <div className="text-5xl font-black text-slate-900">4.9</div>
                  <div className="flex items-center justify-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-slate-500 font-semibold text-xs block">Based on 142 school lab reviews</span>
                </div>

                <div className="md:col-span-8 space-y-2">
                  {[
                    { stars: '5 Star', pct: '88%' },
                    { stars: '4 Star', pct: '10%' },
                    { stars: '3 Star', pct: '2%' },
                    { stars: '2 Star', pct: '0%' },
                    { stars: '1 Star', pct: '0%' }
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="w-12 text-slate-600 font-bold">{row.stars}</span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: row.pct }} />
                      </div>
                      <span className="w-10 text-slate-400 font-mono text-[11px] text-right">{row.pct}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Reviews */}
              <div className="space-y-4">
                {[
                  {
                    title: "Best investment for our middle school ATL lab",
                    review: "The apparatus is robust, snaps together intuitively, and gave our 7th graders an immediate visual understanding of polyhedral vertices and faces.",
                    author: "Dr. Ramesh Sharma",
                    role: "ATL Lab Coordinator, Bengaluru",
                    rating: 5,
                    date: "Aug 2026"
                  },
                  {
                    title: "Exceptional durability and classroom engagement",
                    review: "We used these kits across 6 sections of 8th grade. Not a single part broke or got deformed. Truly classroom grade.",
                    author: "Meenakshi Sundaram",
                    role: "Senior Physics Teacher, Chennai",
                    rating: 5,
                    date: "July 2026"
                  }
                ].map((rev, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-400">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                      <span className="text-slate-400 text-[10px]">{rev.date}</span>
                    </div>
                    <div className="font-black text-slate-900 text-sm">{rev.title}</div>
                    <p className="text-slate-600 leading-relaxed font-normal">{rev.review}</p>
                    <div className="text-[11px] text-slate-500 font-bold pt-1">
                      {rev.author} • <span className="text-indigo-600">{rev.role}</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 4: FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150 text-left">
              {[
                {
                  q: "Are replacement parts available if a student loses a component?",
                  a: "Yes! ExperiMind Labs offers individual spare parts and component replenishment packs directly from our Karnataka warehouse."
                },
                {
                  q: "Can we get an official GST invoice with our school's GSTIN?",
                  a: "Absolutely. During checkout or in your Customer Account portal, you can input your institution's GSTIN to generate a 100% compliant tax invoice with HSN 90230000."
                },
                {
                  q: "What is the typical delivery timeframe for school orders?",
                  a: "All orders are dispatched within 24 hours via express air courier (Delhivery/BlueDart), reaching most schools across India within 3 to 5 business days."
                }
              ].map((faq, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <h5 className="font-black text-slate-900 text-sm">Q: {faq.q}</h5>
                  <p className="text-slate-600 leading-relaxed">A: {faq.a}</p>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ======================================================== */}
      {/* INSTITUTIONAL BULK LAB QUOTE MODAL                      */}
      {/* ======================================================== */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-slate-200 text-xs text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Institutional School Bulk Quote</h3>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Apparatus Kit</span>
                <div className="font-black text-slate-900 text-sm">{product.name}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Student Batch Size</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { count: 10, discount: 10 },
                    { count: 25, discount: 15 },
                    { count: 50, discount: 20 },
                    { count: 100, discount: 25 }
                  ].map((tier) => (
                    <button
                      type="button"
                      key={tier.count}
                      onClick={() => {
                        setBulkBatchSize(tier.count);
                        setBulkDiscountTier(tier.discount);
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        bulkBatchSize === tier.count
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-black text-sm block">{tier.count} Kits</span>
                      <span className="text-[10px] font-bold block">{tier.discount}% Off</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimate Breakdown */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Standard Price ({bulkBatchSize} Units)</span>
                  <span>₹{(basePrice * bulkBatchSize).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Institutional Discount ({bulkDiscountTier}%)</span>
                  <span>- ₹{Math.round((basePrice * bulkBatchSize * bulkDiscountTier) / 100).toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm">
                  <span>Estimated Total (Incl. GST)</span>
                  <span className="text-indigo-600">
                    ₹{Math.round(basePrice * bulkBatchSize * (1 - bulkDiscountTier / 100)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Close
                </button>
                <a
                  href={`https://wa.me/919876543210?text=Hello%20ExperiMind%20Labs,%20I%20request%20an%20official%20institutional%20quotation%20for%20${bulkBatchSize}%20units%20of%20${encodeURIComponent(product.name)}.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                >
                  Generate Official Quote
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
