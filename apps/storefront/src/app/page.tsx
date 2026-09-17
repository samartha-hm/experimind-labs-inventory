import { getApiBaseUrl } from "@/utils/api";
import HomeInteractiveView from "@/components/HomeInteractiveView";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ExperiMind Labs - Hands-on STEM Kits & Experiential Learning Tools',
  description: 'Shop award-winning experiential science kits, Geomagic 3D geometry sets, PSL physics labs, robotics modules, and classroom apparatus by ExperiMind Labs.',
};

async function getCmsConfig() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/public/storefront/cms`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}

async function getFeaturedProducts() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/public/storefront/catalog`, { cache: 'no-store' });
    if (!res.ok) return [];
    const items = await res.json();
    return items.slice(0, 8);
  } catch (e) {
    console.error("Failed to fetch featured products:", e);
    return [];
  }
}

export default async function Home() {
  const [cms, featuredProducts] = await Promise.all([
    getCmsConfig(),
    getFeaturedProducts()
  ]);

  return (
    <HomeInteractiveView
      cms={cms}
      featuredProducts={featuredProducts}
    />
  );
}
