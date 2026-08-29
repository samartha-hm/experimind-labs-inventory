import Link from "next/link";
import { ArrowRight, Sparkles, Award, Box, Cpu, Compass, BookOpen, CheckCircle, Zap, ShieldCheck, Star } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";
import AddToCartButton from "@/components/AddToCartButton";

export const dynamic = 'force-dynamic';

async function getFeaturedProducts() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/public/storefront/catalog`, { cache: 'no-store' });
    if (!res.ok) return [];
    const items = await res.json();
    // Return flagship items or top 8 items
    return items.slice(0, 8);
  } catch (e) {
    console.error("Failed to fetch featured products:", e);
    return [];
  }
}

export default async function Home() {
  const featuredProducts = await getFeaturedProducts();

  return (
    <div className="space-y-20 pb-20">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900/5 via-transparent to-transparent pt-12 pb-20 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200/80 rounded-full py-1.5 px-4 text-indigo-700 text-xs font-bold shadow-xs">
                <Award className="h-4 w-4 text-amber-500" />
                <span>Honored with Grassroots STEM Innovation Recognition</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Experiential <span className="gradient-text">STEM Learning</span> Kits for the Next Generation
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
                Moving education beyond rote learning. Explore award-winning hands-on science kits, 3D geometry tools, physics labs, and robotics designed by educational researchers at <strong>ExperiMind Labs</strong>.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/catalog"
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-0.5"
                >
                  <span>Explore All Kits</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>

                <Link
                  href="/catalog?category=STEM%20Kits"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-bold px-6 py-4 rounded-2xl border border-slate-300 transition-all shadow-xs"
                >
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <span>Flagship Kits (Geomagic & PSL)</span>
                </Link>
              </div>

              {/* Trust Metrics */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200/80">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">300+</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Lab & Kit Components</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-indigo-600">100+</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Schools & ATL Labs</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600">100%</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Hands-on Experiential</div>
                </div>
              </div>

            </div>

            {/* Visual Feature Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 p-8 text-white shadow-2xl overflow-hidden border border-indigo-400/30">
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 rounded-full bg-white/10 blur-2xl"></div>
                <div className="relative z-10 space-y-6">
                  <div className="inline-block bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                    Featured Flagship Kit
                  </div>

                  <div>
                    <h3 className="text-3xl font-black tracking-tight text-white">Geomagic 3D Geometry Kit</h3>
                    <p className="text-indigo-100 text-sm mt-2 leading-relaxed">
                      Transform abstract mathematical theorems and 2D formulas into tactile 3D working models. Ideal for middle and high school students.
                    </p>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-white">₹1,499</span>
                    <span className="text-xs text-indigo-200 uppercase font-semibold">Incl. All Taxes & Activity Guide</span>
                  </div>

                  <div className="space-y-2.5 pt-2 text-xs font-semibold text-indigo-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-300" />
                      <span>Over 50+ Geometric Shape Constructions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-300" />
                      <span>CBSE & State Board Curriculum Aligned</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-300" />
                      <span>Durable, High-Precision Connectors</span>
                    </div>
                  </div>

                  <Link
                    href="/catalog?q=Geomagic"
                    className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-indigo-900 font-extrabold py-3.5 px-6 rounded-xl transition-all shadow-md mt-4"
                  >
                    <span>View Geomagic Details</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Flagship Product Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">
            Explore ExperiMind Learning Solutions
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Curated kits and precision apparatus engineered for students, educators, and ATL makerspaces.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <Link href="/catalog?category=STEM%20Kits" className="group bg-white p-6 rounded-3xl border border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Box className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">STEM Kits</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Geomagic, PSL Problem Solving Lab, Prastuti Models, and Anubhav Early Science.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-indigo-600 gap-1">
              <span>Browse STEM Kits</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/catalog?category=Robotics%20%26%20IoT" className="group bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Robotics & IoT</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Microcontrollers, 10-in-1 sensor packs, actuators, and robotics innovation packs.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-blue-600 gap-1">
              <span>Explore Robotics</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/catalog?category=Physics%20%26%20Mechanics" className="group bg-white p-6 rounded-3xl border border-slate-200 hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Physics & Optics</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Optical benches, prisms, lasers, magnetic compasses, and mechanics modules.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-emerald-600 gap-1">
              <span>View Optics & Physics</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/catalog" className="group bg-white p-6 rounded-3xl border border-slate-200 hover:border-amber-500 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Labware & Supplies</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Petri dishes, droppers, pH papers, funnels, spirit lamps, and individual spares.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-amber-600 gap-1">
              <span>Explore All Supplies</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </section>

      {/* Featured Products Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Top Rated & Best Sellers</div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Featured Educational Kits & Gear</h2>
          </div>
          <Link href="/catalog" className="inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-700 gap-1">
            <span>View Full Catalog ({featuredProducts.length}+ Items)</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <p className="text-slate-500 text-sm">Catalog is synchronizing with the central ERP.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product: any) => (
              <div
                key={product.id}
                className="bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group relative"
              >
                {/* Top Badge */}
                <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                  {product.badge ? (
                    <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      {product.badge}
                    </span>
                  ) : (
                    <span className="bg-slate-900/85 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-xs">
                      {product.gradeLevel || 'Grades 6–10'}
                    </span>
                  )}
                </div>

                {/* Product Image Preview */}
                <Link href={`/product/${product.id}`} className="block relative aspect-square bg-gradient-to-b from-slate-50 to-white p-8 overflow-hidden border-b border-slate-100">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Box className="h-16 w-16" />
                    </div>
                  )}
                </Link>

                {/* Product Details */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-indigo-600 uppercase tracking-wider">
                        {product.category || 'STEM Kit'}
                      </span>
                      <div className="flex items-center gap-1 font-bold text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                        <span>{product.rating || '4.9'}</span>
                      </div>
                    </div>

                    <Link href={`/product/${product.id}`} className="block">
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {product.description || 'Precision educational tool designed for experiential learning.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-600 font-bold block">Inclusive of GST</span>
                      <div className="text-xl font-black text-slate-900">
                        ₹{Number(product.basePrice).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <AddToCartButton product={product} />
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Research & Pedagogy Section */}
      <section className="bg-slate-900 text-white py-16 rounded-3xl max-w-7xl mx-auto px-6 sm:px-12 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <BookOpen className="h-4 w-4" />
              <span>Research-First Educational Model</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Bridging Theory & Practical Exploration
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              At Experimind Labs, our kits are born from rigorous cognitive learning research. We design activities that help students develop hypothesis testing, spatial reasoning, and creative engineering habits that last a lifetime.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Structured experiment guides with real-world applications</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Hands-on models designed for peer collaboration</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Teacher training and lesson plan integration</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Empowering rural & grassroots schools across India</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-800/60 p-8 rounded-3xl border border-slate-700 space-y-4 text-center">
            <Award className="h-12 w-12 text-amber-400 mx-auto" />
            <h3 className="text-xl font-bold text-white">Institutional & Bulk Orders</h3>
            <p className="text-xs text-slate-300">
              Equip your school, college, or Atal Tinkering Lab (ATL) with customized experiential kits and teacher workshops.
            </p>
            <a
              href="mailto:contact@experimindlabs.com?subject=School%20Bulk%20Order%20Inquiry"
              className="inline-block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all text-xs"
            >
              Request Institutional Quote
            </a>
          </div>

        </div>
      </section>

    </div>
  );
}
