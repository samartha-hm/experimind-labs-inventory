'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  FileText,
  Sparkles,
  CheckCircle2,
  Download,
  Printer,
  Calculator,
  ShieldCheck,
  Send,
  HelpCircle,
  Clock,
  MapPin,
  Mail,
  Phone,
  ArrowRight,
  BookOpen,
  Award,
} from 'lucide-react';

interface KitItem {
  id: string;
  code: string;
  name: string;
  description: string;
  hsnCode: string;
  unitPrice: number;
  minOrderQty: number;
  category: string;
  targetAudience: string;
}

const FLAGSHIP_KITS: KitItem[] = [
  {
    id: 'kit-psl',
    code: 'PSL',
    name: 'Portable STEM Lab (PSL) Complete Station',
    description: 'All-in-one modular mobile physics, chemistry & electronics laboratory apparatus.',
    hsnCode: '9023',
    unitPrice: 28500,
    minOrderQty: 1,
    category: 'Turnkey Laboratory',
    targetAudience: 'Grades 6–12 & Engineering Labs',
  },
  {
    id: 'kit-pra',
    code: 'PRA',
    name: 'Prastuti Demonstration Kits (Grades 8–10 NCERT)',
    description: 'Hands-on experiential demonstration models aligned strictly with NCERT science curriculum.',
    hsnCode: '9023',
    unitPrice: 14500,
    minOrderQty: 2,
    category: 'Classroom Demonstration',
    targetAudience: 'Middle & High Schools (CBSE / ICSE / State)',
  },
  {
    id: 'kit-anb',
    code: 'ANB',
    name: 'Anubhav Kits (Robotics & AI, STEM Explorer)',
    description: 'ESP32 & sensor-powered project kit with visual block coding, IoT telemetry, and AI vision.',
    hsnCode: '9023',
    unitPrice: 4200,
    minOrderQty: 5,
    category: 'Robotics & AI Innovation',
    targetAudience: 'Atal Tinkering Labs (ATLs) & STEM Clubs',
  },
  {
    id: 'kit-geo',
    code: 'GEO',
    name: 'Geo-Magic 3D Geometry Discovery Kits',
    description: 'Tactile stereometric manipulation tools for 3D geometry, coordinate proofs, and trigonometry.',
    hsnCode: '9023',
    unitPrice: 3200,
    minOrderQty: 5,
    category: 'Mathematics Lab',
    targetAudience: 'Grades 4–10 Math Labs',
  },
  {
    id: 'kit-shk',
    code: 'SHK',
    name: 'Shiksha Robot Autonomous STEM Platform',
    description: 'Classroom rover with line tracking, obstacle avoidance, ultrasonic mapping, and Python SDK.',
    hsnCode: '9023',
    unitPrice: 8500,
    minOrderQty: 2,
    category: 'Educational Robotics',
    targetAudience: 'Secondary Schools & Makerspaces',
  },
];

const INDIAN_STATES = [
  { code: '29', name: 'Karnataka (Home State)', isHome: true },
  { code: '27', name: 'Maharashtra', isHome: false },
  { code: '07', name: 'Delhi NCR', isHome: false },
  { code: '33', name: 'Tamil Nadu', isHome: false },
  { code: '32', name: 'Kerala', isHome: false },
  { code: '36', name: 'Telangana', isHome: false },
  { code: '37', name: 'Andhra Pradesh', isHome: false },
  { code: '24', name: 'Gujarat', isHome: false },
  { code: '09', name: 'Uttar Pradesh', isHome: false },
  { code: '19', name: 'West Bengal', isHome: false },
  { code: '08', name: 'Rajasthan', isHome: false },
  { code: '23', name: 'Madhya Pradesh', isHome: false },
  { code: '03', name: 'Punjab', isHome: false },
  { code: '06', name: 'Haryana', isHome: false },
  { code: '21', name: 'Odisha', isHome: false },
  { code: '10', name: 'Bihar', isHome: false },
  { code: '18', name: 'Assam', isHome: false },
  { code: '02', name: 'Himachal Pradesh', isHome: false },
  { code: '05', name: 'Uttarakhand', isHome: false },
  { code: '30', name: 'Goa', isHome: false },
];

export default function InstitutionalQuotePage() {
  // Institutional Form State
  const [institutionType, setInstitutionType] = useState<'ATL' | 'SCHOOL' | 'COLLEGE' | 'NGO'>('ATL');
  const [institutionName, setInstitutionName] = useState('');
  const [atlId, setAtlId] = useState('');
  const [contactName, setContactName] = useState('');
  const [designation, setDesignation] = useState('ATL In-Charge / STEM Coordinator');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stateCode, setStateCode] = useState('29'); // Default: Karnataka
  const [campusAddress, setCampusAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');
  const [deliveryTimeline, setDeliveryTimeline] = useState('Within 15 Days (Urgent Grant Utilization)');
  const [notes, setNotes] = useState('');

  // Selected quantities for each kit
  const [quantities, setQuantities] = useState<Record<string, number>>({
    'kit-psl': 1,
    'kit-pra': 2,
    'kit-anb': 10,
    'kit-geo': 5,
    'kit-shk': 2,
  });

  const [submitted, setSubmitted] = useState(false);
  const [quoteNumber] = useState(() => `EXP-QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Helper to update quantity
  const handleQtyChange = (id: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleQtyInput = (id: string, value: string) => {
    const parsed = parseInt(value, 10);
    setQuantities((prev) => ({
      ...prev,
      [id]: isNaN(parsed) ? 0 : Math.max(0, parsed),
    }));
  };

  // Calculations
  const calculation = useMemo(() => {
    let subtotal = 0;
    const lineItems: Array<{
      kit: KitItem;
      qty: number;
      lineTotal: number;
    }> = [];

    FLAGSHIP_KITS.forEach((kit) => {
      const qty = quantities[kit.id] || 0;
      if (qty > 0) {
        const lineTotal = kit.unitPrice * qty;
        subtotal += lineTotal;
        lineItems.push({
          kit,
          qty,
          lineTotal,
        });
      }
    });

    const isIntraState = stateCode === '29'; // Karnataka
    const gstRate = 0.18; // 18% standard for HSN 9023
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isIntraState) {
      cgst = Math.round(subtotal * 0.09);
      sgst = Math.round(subtotal * 0.09);
    } else {
      igst = Math.round(subtotal * gstRate);
    }

    const totalGst = cgst + sgst + igst;
    const grandTotal = subtotal + totalGst;

    return {
      subtotal,
      lineItems,
      isIntraState,
      cgst,
      sgst,
      igst,
      totalGst,
      grandTotal,
      totalItemsCount: lineItems.reduce((acc, i) => acc + i.qty, 0),
    };
  }, [quantities, stateCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName.trim() || !contactName.trim() || !email.trim() || !phone.trim()) {
      alert('Please fill in Institution Name, Contact Person, Email, and Phone.');
      return;
    }
    if (calculation.lineItems.length === 0) {
      alert('Please select at least 1 kit for quotation.');
      return;
    }
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-indigo-900/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>B2B Institutional Quotation Hub • NEP 2020 & NCERT Aligned</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Official Quotations & Proforma Invoices for Schools & ATLs
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Designed specifically for Atal Tinkering Labs (NITI Aayog ATLs), Kendriya Vidyalayas, Navodaya Vidyalayas, and Private STEM Academies. Generate instant GST proforma invoices (HSN 9023) for grant approvals and official procurement sanction.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-medium text-slate-300">
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                <Award className="w-4 h-4 text-amber-400" />
                <span>AIC Nitte Incubated</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% Tax Deductible (HSN 9023)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Instant PDF Proforma</span>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation State if submitted */}
        {submitted ? (
          <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-xl space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-xl mx-auto">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Official Sanction Request #{quoteNumber}
              </span>
              <h2 className="text-2xl font-bold text-slate-900">Quotation Generated Successfully!</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Thank you, <strong>{contactName}</strong>. An official proforma invoice and technical compliance sheet for <strong>{institutionName}</strong> has been prepared. Our institutional relationship officer will reach out within 4 business hours.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>View & Print Official Proforma Invoice</span>
              </button>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Create Another Quotation
              </button>
            </div>
          </div>
        ) : (
          /* Main Interactive Layout */
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Form & Product Selection (8 cols) */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Step 1: Institutional Profile */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">1. Institution & Procurement Entity</h2>
                      <p className="text-xs text-slate-500">Provide details for invoicing and official delivery challan.</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    Step 1 of 2
                  </span>
                </div>

                {/* Institution Type Pill Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Category of Educational Institution</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { type: 'ATL', label: 'Atal Tinkering Lab' },
                      { type: 'SCHOOL', label: 'School (K-12)' },
                      { type: 'COLLEGE', label: 'College / Polytechnic' },
                      { type: 'NGO', label: 'Foundation / CSR' },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setInstitutionType(item.type as any)}
                        className={`p-3 rounded-2xl text-xs font-bold border transition text-center cursor-pointer ${
                          institutionType === item.type
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-semibold text-slate-700">
                      Full Institution Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. National Public School / NMAMIT Campus / Govt High School Nitte"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>

                  {institutionType === 'ATL' && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="font-semibold text-indigo-700 flex items-center gap-1">
                        <span>AIM / NITI Aayog Unique ATL ID (If Assigned)</span>
                        <span className="text-[10px] text-slate-400 font-normal">(e.g. ATL-KA-2024-XXXX)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ATL-12345"
                        value={atlId}
                        onChange={(e) => setAtlId(e.target.value)}
                        className="w-full p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">
                      Contact Person Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh K / Prof. Sunita"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Official Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Principal / ATL In-Charge / HOD"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">
                      Institutional Email ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. principal@school.edu.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">
                      Mobile / Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  {/* Place of Supply / State */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">
                      Place of Supply (State) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st.code} value={st.code}>
                          {st.name} (Code {st.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* GSTIN (Optional) */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">
                      Institution GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 29AAAAA0000A1Z5"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-semibold text-slate-700">Campus Delivery Address & PIN Code</label>
                    <input
                      type="text"
                      placeholder="e.g. AIC Nitte Building, NMAMIT Campus, Nitte, Karkala - 574110"
                      value={campusAddress}
                      onChange={(e) => setCampusAddress(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Flagship Product Selection */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">2. Select Experimind STEM Apparatus & Kits</h2>
                      <p className="text-xs text-slate-500">Configure quantities required for your academic session.</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    Step 2 of 2
                  </span>
                </div>

                {/* Kits Grid */}
                <div className="space-y-4">
                  {FLAGSHIP_KITS.map((kit) => {
                    const qty = quantities[kit.id] || 0;
                    return (
                      <div
                        key={kit.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          qty > 0
                            ? 'bg-indigo-50/20 border-indigo-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          
                          {/* Left Details */}
                          <div className="space-y-1 max-w-md">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">{kit.name}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Code: EXP-{kit.code}-26
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                HSN {kit.hsnCode} (18% GST)
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed font-normal">{kit.description}</p>
                            <div className="text-[11px] text-slate-400">
                              <span>Target: <strong>{kit.targetAudience}</strong></span>
                            </div>
                          </div>

                          {/* Right Price & Quantity Counter */}
                          <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <div className="text-left sm:text-right">
                              <div className="text-xs text-slate-400">Institutional Rate</div>
                              <div className="text-sm font-black text-slate-900">
                                ₹{kit.unitPrice.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-500">/ unit</span>
                              </div>
                            </div>

                            {/* Quantity Stepper */}
                            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl p-1 shadow-xs">
                              <button
                                type="button"
                                onClick={() => handleQtyChange(kit.id, -1)}
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={qty}
                                onChange={(e) => handleQtyInput(kit.id, e.target.value)}
                                className="w-12 text-center text-sm font-bold text-slate-900 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleQtyChange(kit.id, 1)}
                                className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center transition cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            {/* Line Total */}
                            <div className="w-24 text-right hidden sm:block">
                              <div className="text-[10px] text-slate-400">Line Subtotal</div>
                              <div className="text-xs font-black text-indigo-900">
                                ₹{(kit.unitPrice * qty).toLocaleString('en-IN')}
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Additional Notes / Special Instructions */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <label className="font-semibold text-slate-700">
                    Grant Reference / Special Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Kindly mention ATL Grant Sanction No. 2024-25 in the quotation header."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-base sm:text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

            </div>

            {/* Right Column: Financial Summary & Proforma Actions (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg space-y-5 sticky top-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    <span>Official Quotation Summary</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 font-bold">
                    {calculation.totalItemsCount} units
                  </span>
                </div>

                {/* Calculation Rows */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Base Equipment Price</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{calculation.subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {calculation.isIntraState ? (
                    <>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>CGST (9%) - Karnataka</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{calculation.cgst.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>SGST (9%) - Karnataka</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{calculation.sgst.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>IGST (18%) - Inter-State</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{calculation.igst.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Nationwide Tracked Courier</span>
                    <span className="font-bold text-emerald-600">FREE / Waived</span>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-black text-slate-900 text-base">Landed Net Total</div>
                      <div className="text-[10px] text-slate-400">Includes 18% GST (HSN 9023)</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-indigo-700">
                        ₹{calculation.grandTotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="bg-indigo-50/50 rounded-2xl p-3 border border-indigo-100 space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 text-indigo-800 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Experimind Procurement Assurance</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500">
                    Official Quotation valid for 45 calendar days. Includes 1-year replacement warranty, teacher manual, and video onboarding sessions.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={calculation.totalItemsCount === 0}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit & Request Official Quotation</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    disabled={calculation.totalItemsCount === 0}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Preview Printable Proforma Invoice</span>
                  </button>
                </div>

                <div className="text-center pt-2">
                  <a
                    href="https://wa.me/919876543210?text=Hello%20ExperiMind%20Labs,%20we%20require%20an%20urgent%20institutional%20quotation%20for%20our%20school%20lab."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1"
                  >
                    <span>💬 Direct WhatsApp Support with Lab Officer</span>
                  </a>
                </div>

              </div>

            </div>

          </form>
        )}

      </div>

      {/* Proforma Invoice Print Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 text-left border border-slate-200 print:m-0 print:p-0 print:border-none">
            
            {/* Modal Actions Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-slate-900 text-sm">Official GST Proforma Invoice Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save as PDF
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="space-y-6 text-xs text-slate-800 font-sans">
              
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                <div className="space-y-1">
                  <div className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="text-indigo-600">Experimind Labs</span>
                    <span className="text-xs font-normal text-slate-500">Private Limited</span>
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm">
                    Incubated at AIC Nitte, NMAMIT Campus, Nitte, Karkala, Udupi Dist, Karnataka - 574110
                  </p>
                  <div className="text-[11px] text-slate-600 font-mono">
                    <span>GSTIN: 29AABCE1234F1Z8</span> • <span>CIN: U80903KA2024PTC123456</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <span>Email: institutional@experimindlabs.com</span> • <span>Web: www.experimindlabs.com</span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs inline-block">
                    PROFORMA INVOICE
                  </span>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-1">{quoteNumber}</div>
                  <div className="text-slate-500 text-[11px]">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div className="text-slate-500 text-[11px]">Valid Until: {new Date(Date.now() + 45 * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>

              {/* Billed To / Shipped To */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">PROFORMA ISSUED TO:</div>
                  <div className="font-bold text-slate-900">{institutionName || 'Institutional Customer'}</div>
                  {atlId && <div className="text-[11px] font-mono text-indigo-700 font-semibold">ATL ID: {atlId}</div>}
                  <div className="text-slate-600">{contactName} ({designation})</div>
                  <div className="text-slate-600">{email} • {phone}</div>
                  {gstin && <div className="text-slate-600 font-mono">GSTIN: {gstin}</div>}
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">PLACE OF SUPPLY & DELIVERY:</div>
                  <div className="text-slate-800">{campusAddress || 'Campus Delivery Address as confirmed'}</div>
                  <div className="text-slate-600">
                    State: {INDIAN_STATES.find((s) => s.code === stateCode)?.name} (Code: {stateCode})
                  </div>
                  <div className="text-slate-600 font-medium mt-1">
                    Timeline: {deliveryTimeline}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-2">HSN</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {calculation.lineItems.map((item, idx) => (
                      <tr key={item.kit.id}>
                        <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">{item.kit.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Model: EXP-{item.kit.code}-26 • Serial standard compliant</div>
                        </td>
                        <td className="py-2 px-2 font-mono text-slate-600">{item.kit.hsnCode}</td>
                        <td className="py-2 px-2 text-center font-bold">{item.qty}</td>
                        <td className="py-2 px-3 text-right font-mono">{item.kit.unitPrice.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-bold font-mono">{item.lineTotal.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan={5} className="py-2 px-3 text-right text-slate-600">Equipment Taxable Value:</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">₹{calculation.subtotal.toLocaleString('en-IN')}</td>
                    </tr>
                    {calculation.isIntraState ? (
                      <>
                        <tr>
                          <td colSpan={5} className="py-1.5 px-3 text-right text-slate-600">CGST @ 9%:</td>
                          <td className="py-1.5 px-3 text-right font-mono">₹{calculation.cgst.toLocaleString('en-IN')}</td>
                        </tr>
                        <tr>
                          <td colSpan={5} className="py-1.5 px-3 text-right text-slate-600">SGST @ 9%:</td>
                          <td className="py-1.5 px-3 text-right font-mono">₹{calculation.sgst.toLocaleString('en-IN')}</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-1.5 px-3 text-right text-slate-600">IGST @ 18%:</td>
                        <td className="py-1.5 px-3 text-right font-mono">₹{calculation.igst.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    <tr className="border-t border-slate-300 bg-indigo-50/50 text-sm font-black text-indigo-950">
                      <td colSpan={5} className="py-3 px-3 text-right">Net Landed Amount Payable:</td>
                      <td className="py-3 px-3 text-right font-mono">₹{calculation.grandTotal.toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Terms & Conditions + Authorized Signatory */}
              <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-200">
                <div className="space-y-1 text-[10px] text-slate-500">
                  <div className="font-bold text-slate-700 uppercase">Statutory Terms & Conditions:</div>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>100% replacement warranty against manufacturing defects for 12 months.</li>
                    <li>Delivery fulfilled via insured courier dispatch from Karnataka warehouse.</li>
                    <li>Payment terms: 100% upon invoice submission or official institutional PO.</li>
                    <li>All dispute jurisdictions subject to Karkala / Udupi courts.</li>
                  </ol>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-[10px] text-slate-500">For Experimind Labs Private Limited</div>
                  <div className="h-12" />
                  <div className="font-bold text-slate-900">Authorized Signatory</div>
                  <div className="text-[10px] text-slate-400">AIC Nitte Technology Incubator</div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
