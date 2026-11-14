import { getApiBaseUrl } from "@/utils/api";
import HomeInteractiveView from "@/components/HomeInteractiveView";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ExperiMind Labs - Hands-on STEM Kits & Experiential Learning Tools',
  description: 'Shop award-winning experiential science kits, Geomagic 3D geometry sets, PSL physics labs, robotics modules, and classroom apparatus by ExperiMind Labs.',
};

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
  const featuredProducts = await getFeaturedProducts();

  return (
    <HomeInteractiveView
      featuredProducts={featuredProducts}
    />
  );
}
