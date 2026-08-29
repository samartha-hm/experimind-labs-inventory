import { getApiBaseUrl } from "@/utils/api";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Truck, Sparkles, Box, Award, BookOpen, Layers, Check } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.id);
  
  if (!product) {
    return { title: 'Product Not Found - Experimind Shop' };
  }

  return {
    title: `${product.name} - ExperiMind Labs`,
    description: product.description || `Buy ${product.name} directly from Experimind Labs. Experiential STEM education tools.`,
  };
}

async function getProduct(id: string) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/public/storefront/product/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.error("Failed to fetch product:", err);
    return null;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.id);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto">
          <Box className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-900">Product Not Found</h1>
        <p className="text-slate-500 text-sm">The product or STEM kit you are looking for may have been archived or moved.</p>
        <Link href="/catalog" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-8 rounded-xl transition-all shadow-md">
          Return to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link href="/" className="hover:text-indigo-600">Home</Link>
        <span>/</span>
        <Link href="/catalog" className="hover:text-indigo-600">Catalog</Link>
        <span>/</span>
        <Link href={`/catalog?category=${encodeURIComponent(product.category || '')}`} className="hover:text-indigo-600">
          {product.category || 'General'}
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-bold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Product Main Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Product Media Column */}
        <div className="lg:col-span-6 sticky top-28">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs aspect-square flex items-center justify-center relative overflow-hidden group">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="text-slate-300 flex flex-col items-center gap-3">
                <Box className="h-28 w-28 text-slate-300" />
                <span className="text-xs font-semibold text-slate-400">Authentic Experimind Labware</span>
              </div>
            )}

            {product.category === 'STEM Kits' && (
              <div className="absolute top-4 left-4 bg-indigo-600 text-white text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-300" />
                <span>Flagship STEM Kit</span>
              </div>
            )}
          </div>
        </div>

        {/* Product Details Column */}
        <div className="lg:col-span-6 space-y-8">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-200/60">
                {product.category || 'Science Gear'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                SKU: {product.sku}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {product.name}
            </h1>

            <p className="text-base text-slate-600 leading-relaxed">
              {product.description || 'Hands-on experiential learning apparatus designed for school labs, ATL innovation spaces, and student experimenters.'}
            </p>
          </div>

          {/* Pricing Box */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-slate-900">
                ₹{Number(product.basePrice).toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-md">
                Includes All Taxes (GST)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Free delivery across India for orders above ₹999. Dispatched in 24 hours.
            </p>
          </div>

          {/* Stock & Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold">
              {product.stockQty > 5 ? (
                <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>In Stock ({product.stockQty} units available for instant dispatch)</span>
                </span>
              ) : product.stockQty > 0 ? (
                <span className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-200 font-bold">
                  <span>⚡ Only {product.stockQty} unit{product.stockQty === 1 ? '' : 's'} remaining in lab stock</span>
                </span>
              ) : (
                <span className="text-red-500 bg-red-50 px-3.5 py-1.5 rounded-full border border-red-100">
                  Out of Stock - Restocking Soon
                </span>
              )}
            </div>

            <div className="w-full h-14">
              {product.stockQty > 0 ? (
                <AddToCartButton product={product} fullWidth={true} />
              ) : (
                <button disabled className="w-full h-full bg-slate-200 text-slate-500 font-bold rounded-2xl cursor-not-allowed text-base">
                  Currently Unavailable
                </button>
              )}
            </div>
          </div>

          {/* Assurance Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-slate-900">Safety Tested</h5>
                <p className="text-[11px] text-slate-500 mt-0.5">Non-toxic & student safe</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Truck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-slate-900">Direct Lab Dispatch</h5>
                <p className="text-[11px] text-slate-500 mt-0.5">From Karnataka HQ</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Award className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-slate-900">Curriculum Aligned</h5>
                <p className="text-[11px] text-slate-500 mt-0.5">CBSE / ICSE / State</p>
              </div>
            </div>
          </div>

          {/* Educational Specifications */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span>Educational & Curriculum Specifications</span>
            </h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <dt className="text-slate-500 font-medium">Recommended Level</dt>
                <dd className="font-bold text-slate-900 mt-0.5">{product.gradeLevel || 'Grades 6–10'}</dd>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <dt className="text-slate-500 font-medium">Package Contents</dt>
                <dd className="font-bold text-slate-900 mt-0.5">{product.unit === 'kit' ? 'Complete Hands-on Kit & Manual' : '1x Laboratory Apparatus'}</dd>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <dt className="text-slate-500 font-medium">Curriculum Standards</dt>
                <dd className="font-bold text-slate-900 mt-0.5">CBSE / ICSE / State / ATL</dd>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <dt className="text-slate-500 font-medium">Safety Standard</dt>
                <dd className="font-bold text-slate-900 mt-0.5">100% Student Safe & Tested</dd>
              </div>
            </dl>
          </div>

        </div>
      </div>
    </div>
  );
}
