import { getApiBaseUrl } from "@/utils/api";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import { Box, Sparkles, Star, Award, CheckCircle2, SlidersHorizontal, ArrowUpDown } from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'All STEM Kits & Experiential Labware - ExperiMind Shop',
  description: 'Shop hands-on STEM education kits, Geomagic 3D geometry sets, PSL physics labs, robotics modules, and classroom demonstration models.',
};

async function getCatalog(category?: string, search?: string) {
  try {
    let url = `${getApiBaseUrl()}/public/storefront/catalog`;
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('q', search);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch (err) {
    console.error("Failed to fetch catalog:", err);
    return [];
  }
}

async function getCategories() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/public/storefront/categories`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    return [];
  }
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const activeCategory = resolvedParams?.category || 'all';
  const searchQuery = resolvedParams?.q || '';

  const [products, categories] = await Promise.all([
    getCatalog(activeCategory, searchQuery),
    getCategories(),
  ]);

  // Clean category names for display
  const formatCategoryName = (cat: string) => {
    if (cat.toLowerCase() === 'maths kits') return '3D Geometry & Math';
    if (cat.toLowerCase() === 'prastuti science') return 'Demonstration Science';
    if (cat.toLowerCase() === 'stem kits') return 'Flagship STEM Kits';
    if (cat.toLowerCase() === 'robotics & iot') return 'Robotics & Sensors';
    if (cat.toLowerCase() === 'anubhav') return 'Sensory Science (Grades 1-5)';
    if (cat.toLowerCase() === 'chemicals') return 'Lab Chemistry Sets';
    return cat;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Catalog Header Banner */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-indigo-50/40 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 uppercase tracking-widest mb-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Experiential STEM Learning Collection</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {activeCategory !== 'all' ? formatCategoryName(activeCategory) : 'All Experiential STEM Kits & Models'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Curriculum-aligned hands-on kits designed for schools, ATL labs, and curious learners. ({products.length} items)
            </p>
          </div>

          {searchQuery && (
            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700">
              <span>Search results for &ldquo;{searchQuery}&rdquo;</span>
              <Link href="/catalog" className="text-indigo-900 hover:text-indigo-600 font-bold ml-2">✕ Clear</Link>
            </div>
          )}
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 border-t border-slate-200/60 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href={`/catalog${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>All Kits</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {products.length}
            </span>
          </Link>

          {categories.map((cat: any) => (
            <Link
              key={cat.name}
              href={`/catalog?category=${encodeURIComponent(cat.name)}${
                searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''
              }`}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeCategory.toLowerCase() === cat.name.toLowerCase()
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{formatCategoryName(cat.name)}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeCategory.toLowerCase() === cat.name.toLowerCase() ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {cat.count}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto">
            <Box className="h-8 w-8 text-indigo-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900">No STEM Kits Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We couldn&apos;t find any products matching your selected category or search filter.
          </p>
          <Link
            href="/catalog"
            className="inline-block bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all"
          >
            View All STEM Kits
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product: any) => (
            <div
              key={product.id}
              className="bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group relative"
            >
              {/* Top Badges */}
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

                {product.stockQty > 0 && product.stockQty <= 5 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    Only {product.stockQty} left
                  </span>
                )}
              </div>

              {/* Product Image */}
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

              {/* Product Content */}
              <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-bold text-indigo-600 uppercase tracking-wider">
                      {formatCategoryName(product.category || 'STEM Kit')}
                    </span>
                    <div className="flex items-center gap-1 font-bold text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <span>{product.rating || '4.9'}</span>
                    </div>
                  </div>

                  <Link href={`/product/${product.id}`} className="block">
                    <h3 className="font-bold text-slate-900 text-base line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {product.description || 'Hands-on experiential learning kit engineered by Experimind Labs.'}
                  </p>
                </div>

                {/* Pricing & CTA */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-600 font-bold block">Inclusive of GST</span>
                    <div className="text-xl font-black text-slate-900">
                      ₹{Number(product.basePrice).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    {product.stockQty > 0 ? (
                      <AddToCartButton product={product} />
                    ) : (
                      <span className="text-[11px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
