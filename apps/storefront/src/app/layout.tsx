import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  Truck,
  RefreshCw,
  Award,
  Heart,
  Mail,
  Phone,
  MapPin,
  Building,
  FileText,
  CreditCard,
  CheckCircle2,
  Lock,
  ArrowUp,
  MessageSquare
} from "lucide-react";

export const metadata: Metadata = {
  title: "ExperiMind Labs Store - Hands-on STEM Kits & Experiential Learning Tools",
  description: "Shop award-winning experiential science kits, Geomagic math tools, PSL physics labs, robotics, and classroom demonstration models by ExperiMind Labs.",
  keywords: ["STEM kits India", "Geomagic kit", "PSL physics lab", "Prastuti science models", "experiential learning", "ATL lab kits", "science kits for schools", "ExperiMind Labs"],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
        <Header />
        
        <main className="flex-grow">
          {children}
        </main>

        {/* Global Value Pillars (Amazon/Flipkart Trust Strip) */}
        <section className="border-t border-slate-200/80 bg-white py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Award-Winning Pedagogy</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Recognized for Grassroots STEM Innovation & NEP 2020 alignment.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600 shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Nationwide Courier Shipping</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Dispatched securely from our central Karnataka lab warehouse.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Quality Assured STEM Kits</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Rigorously tested and calibrated for classroom and home discovery.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Direct Institutional Invoices</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Transparent educational receipts and official tax invoices for schools.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Amazon/Flipkart E-Commerce Footer */}
        <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-left">
          
          {/* Back to Top Bar */}
          <div className="border-b border-slate-800/80 bg-slate-900 text-center py-3">
            <a href="#" className="text-xs font-bold text-slate-300 hover:text-white transition-colors inline-flex items-center gap-1">
              <ArrowUp className="w-3.5 h-3.5" /> Back to Top
            </a>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
              
              {/* Col 1: About ExperiMind Labs */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-black text-white tracking-tight">ExperiMind Labs</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  ExperiMind Labs Private Limited is a research-first edu-tech organization dedicated to revolutionizing STEM education through experiential learning apparatus and tangible 3D discovery.
                </p>
                <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5 bg-amber-400/10 p-2.5 rounded-xl border border-amber-400/20">
                  <Award className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Incubated at AIC Nitte (Karnataka)</span>
                </div>
              </div>

              {/* Col 2: Flagship Curricula */}
              <div>
                <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Flagship STEM Kits</h4>
                <ul className="space-y-2 text-xs">
                  <li><Link href="/catalog?category=Maths%20kits" className="hover:text-white transition-colors">Geomagic 3D Geometry Kit</Link></li>
                  <li><Link href="/catalog?category=STEM%20Kits" className="hover:text-white transition-colors">PSL Problem Solving Physics Lab</Link></li>
                  <li><Link href="/catalog?category=Prastuti%20Science" className="hover:text-white transition-colors">Prastuti Classroom Models</Link></li>
                  <li><Link href="/catalog?category=Anubhav" className="hover:text-white transition-colors">Anubhav Early Science Box (Grades 1-5)</Link></li>
                  <li><Link href="/catalog?category=Robotics%20%26%20IoT" className="hover:text-white transition-colors">Robotics & IoT Sensors</Link></li>
                </ul>
              </div>

              {/* Col 3: Customer & School Lab Care */}
              <div>
                <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Customer & Lab Services</h4>
                <ul className="space-y-2 text-xs">
                  <li><Link href="/account" className="hover:text-white transition-colors">Your Customer Account</Link></li>
                  <li><Link href="/institutional-quote" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">B2B Quotation Hub (Schools & ATLs)</Link></li>
                  <li><Link href="/track" className="hover:text-white transition-colors">Track Real-Time Order Status</Link></li>
                  <li><Link href="/account" className="hover:text-white transition-colors">Download Official Invoices</Link></li>
                  <li><Link href="/account" className="hover:text-white transition-colors">Lab Support & Inquiries</Link></li>
                  <li><a href="https://inventory.experimindlabs.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 font-bold">Admin Inventory ERP &rarr;</a></li>
                </ul>
              </div>

              {/* Col 4: Registered Office & Helpdesk */}
              <div>
                <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Registered Lab & Support</h4>
                <ul className="space-y-3 text-xs">
                  <li className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>ExperiMind Labs Pvt Ltd, Electronics City, Bengaluru, Karnataka, India</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                    <a href="mailto:contact@experimindlabs.com" className="hover:text-white">contact@experimindlabs.com</a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>+91 80 4123 9876 (Mon–Sat, 9AM–7PM)</span>
                  </li>
                  <li className="pt-1">
                    <a
                      href="https://wa.me/919876543210?text=Hello%20ExperiMind%20Labs,%20I%20need%20support%20with%20our%20STEM%20kits."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat on WhatsApp</span>
                    </a>
                  </li>
                </ul>
              </div>

            </div>

            {/* Payment & Logistics Badges Bar */}
            <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-400 text-[11px]">100% Secure Payment Partners:</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-mono text-[10px] border border-slate-800">UPI / QR</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-mono text-[10px] border border-slate-800">RuPay</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-mono text-[10px] border border-slate-800">Visa / Mastercard</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-mono text-[10px] border border-slate-800">NetBanking</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-mono text-[10px] border border-slate-800">Cash on Delivery</span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-bold text-slate-400">Logistics:</span>
                <span className="text-slate-300">Tracked Courier Partner Network</span>
              </div>
            </div>

            {/* Legal & Copyright */}
            <div className="pt-6 mt-6 border-t border-slate-900/60 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
              <div>
                &copy; {new Date().getFullYear()} ExperiMind Labs Private Limited. GSTIN: <strong className="text-slate-400 font-mono">29AAACE1234F1Z5</strong>. All rights reserved.
              </div>
              <div className="flex items-center gap-6 text-[11px]">
                <Link href="/catalog" className="hover:text-slate-300">Store Catalog</Link>
                <Link href="/track" className="hover:text-slate-300">Track Orders</Link>
                <Link href="/account" className="hover:text-slate-300">My Account</Link>
                <Link href="/cart" className="hover:text-slate-300">Shopping Cart</Link>
              </div>
            </div>

          </div>
        </footer>
      </body>
    </html>
  );
}
