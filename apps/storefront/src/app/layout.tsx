import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Link from "next/link";
import { Sparkles, ShieldCheck, Truck, RefreshCw, Award, Heart, Mail, Phone, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "ExperiMind Shop - Hands-on STEM Kits & Experiential Learning Tools",
  description: "Shop award-winning experiential science kits, Geomagic math tools, PSL physics labs, robotics, and classroom demonstration models by Experimind Labs.",
  keywords: ["STEM kits India", "Geomagic kit", "PSL physics lab", "Prastuti science models", "experiential learning", "ATL lab kits", "science kits for schools"],
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

        {/* Global Value Pillars */}
        <section className="border-t border-slate-200 bg-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Award-Winning Pedagogy</h4>
                  <p className="text-xs text-slate-500 mt-1">Recognized by the President of India for Grassroots STEM Innovation.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Fast Pan-India Delivery</h4>
                  <p className="text-xs text-slate-500 mt-1">Dispatched directly from our central lab in Karnataka within 24 hours.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">100% Student-Safe Gear</h4>
                  <p className="text-xs text-slate-500 mt-1">Non-toxic, high-durability laboratory grade tools and certified electronics.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 shrink-0">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Curriculum & ATL Aligned</h4>
                  <p className="text-xs text-slate-500 mt-1">Perfect for CBSE, ICSE, State Boards, and Atal Tinkering Labs.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Footer */}
        <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 pt-16 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
              
              {/* Brand Col */}
              <div className="space-y-4 md:col-span-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="text-xl font-extrabold text-white tracking-tight">ExperiMind Labs</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Experimind Labs Private Limited is a research-first edu-tech organization dedicated to revolutionizing STEM education through experiential learning kits and innovative classroom models.
                </p>
                <div className="text-xs text-indigo-400 font-semibold flex items-center gap-1.5">
                  <Award className="h-4 w-4" />
                  <span>Incubated at AIC Nitte</span>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-white font-bold text-sm mb-4">Flagship STEM Kits</h4>
                <ul className="space-y-2 text-xs">
                  <li><Link href="/catalog?category=STEM%20Kits" className="hover:text-white transition-colors">Geomagic Geometry Kit</Link></li>
                  <li><Link href="/catalog?category=STEM%20Kits" className="hover:text-white transition-colors">PSL Problem Solving Lab</Link></li>
                  <li><Link href="/catalog?category=STEM%20Kits" className="hover:text-white transition-colors">Prastuti Classroom Models</Link></li>
                  <li><Link href="/catalog?category=STEM%20Kits" className="hover:text-white transition-colors">Anubhav Early Science Box</Link></li>
                  <li><Link href="/catalog?category=Robotics%20%26%20IoT" className="hover:text-white transition-colors">Robotics & IoT Starter Kits</Link></li>
                </ul>
              </div>

              {/* Laboratory & Components */}
              <div>
                <h4 className="text-white font-bold text-sm mb-4">Labware & Supplies</h4>
                <ul className="space-y-2 text-xs">
                  <li><Link href="/catalog?category=Physics%20%26%20Mechanics" className="hover:text-white transition-colors">Optical Physics Benches</Link></li>
                  <li><Link href="/catalog?category=Robotics%20%26%20IoT" className="hover:text-white transition-colors">Microcontrollers & Sensors</Link></li>
                  <li><Link href="/catalog?category=Prastuti%20Science" className="hover:text-white transition-colors">Science Glassware & Labware</Link></li>
                  <li><Link href="/catalog" className="hover:text-white transition-colors">All 300+ Lab Items</Link></li>
                  <li><a href="https://inventory.experimindlabs.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 font-semibold">ERP Management Portal &rarr;</a></li>
                </ul>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-white font-bold text-sm mb-4">Contact & Lab Office</h4>
                <ul className="space-y-3 text-xs">
                  <li className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>Experimind Labs Pvt Ltd, Karnataka, India</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                    <a href="mailto:contact@experimindlabs.com" className="hover:text-white">contact@experimindlabs.com</a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>+91 (India) Direct Support</span>
                  </li>
                </ul>
              </div>

            </div>

            <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
              <div>
                &copy; {new Date().getFullYear()} Experimind Labs Private Limited. All rights reserved.
              </div>
              <div className="flex items-center gap-6">
                <a href="https://www.experimindlabs.com" target="_blank" rel="noreferrer" className="hover:text-slate-400">Official Website</a>
                <Link href="/catalog" className="hover:text-slate-400">Store Catalog</Link>
                <Link href="/cart" className="hover:text-slate-400">View Cart</Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
