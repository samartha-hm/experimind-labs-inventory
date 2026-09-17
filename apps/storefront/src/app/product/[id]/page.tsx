import { getApiBaseUrl } from "@/utils/api";
import Link from "next/link";
import { ArrowLeft, Box } from "lucide-react";
import ProductDetailInteractiveView from "@/components/ProductDetailInteractiveView";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.id);
  
  if (!product) {
    return { title: 'Product Not Found - ExperiMind Shop' };
  }

  return {
    title: `${product.name} - ExperiMind Labs Store`,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Breadcrumb Navigation (Amazon Style) */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link href="/" className="hover:text-indigo-600">Home</Link>
        <span>/</span>
        <Link href="/catalog" className="hover:text-indigo-600">Catalog</Link>
        <span>/</span>
        <Link href={`/catalog?category=${encodeURIComponent(product.category || '')}`} className="hover:text-indigo-600">
          {product.category || 'STEM Apparatus'}
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-bold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Product Interactive View */}
      <ProductDetailInteractiveView product={product} />

    </div>
  );
}
