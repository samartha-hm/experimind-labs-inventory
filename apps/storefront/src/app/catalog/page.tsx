import { getApiBaseUrl } from "@/utils/api";
import CatalogInteractiveView from "@/components/CatalogInteractiveView";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'All STEM Kits & Experiential Labware - ExperiMind Labs Store',
  description: 'Shop hands-on STEM education kits, Geomagic 3D geometry sets, PSL physics labs, robotics modules, and classroom demonstration models by ExperiMind Labs.',
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

  return (
    <CatalogInteractiveView
      products={products}
      categories={categories}
      activeCategory={activeCategory}
      searchQuery={searchQuery}
    />
  );
}
