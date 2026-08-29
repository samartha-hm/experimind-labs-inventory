import { Router } from "express";
import { AppDataSource } from "../../db.ts";

const router = Router();

// Helper to determine educational grade levels & rating
function enrichProduct(item: any) {
  const nameLower = (item.name || "").toLowerCase();
  const catLower = (item.category || "").toLowerCase();

  let gradeLevel = "Grades 6–10";
  let badge = "";
  if (item.sku && item.sku.startsWith("EXP-KIT")) {
    badge = "National Award Winner";
    gradeLevel = "Grades 6–12 (ATL)";
  } else if (catLower.includes("anubhav")) {
    gradeLevel = "Grades 1–5 (Early STEM)";
    badge = "Early Learning";
  } else if (catLower.includes("math")) {
    gradeLevel = "Grades 6–10";
    badge = "Visual Math";
  } else if (catLower.includes("robotics") || catLower.includes("electronics") || catLower.includes("iqnaax")) {
    gradeLevel = "Ages 10+ / ATL";
    badge = "IoT & Coding";
  } else if (catLower.includes("prastuti") || catLower.includes("physics")) {
    gradeLevel = "Grades 8–12";
    badge = "Lab Demonstration";
  } else if (catLower.includes("chemical")) {
    gradeLevel = "Grades 9–12";
    badge = "Lab Grade";
  }

  // Consistent rating generator based on string hash
  const hash = (item.name || "").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const rating = (4.7 + (hash % 4) * 0.1).toFixed(1);
  const reviewsCount = 25 + (hash % 140);

  return {
    ...item,
    basePrice: Number(item.basePrice) || 0,
    stockQty: Number(item.stockQty) || 0,
    threshold: Number(item.threshold) || 0,
    gradeLevel,
    badge,
    rating: Number(rating),
    reviewsCount,
    curriculumTags: ["Hands-on STEM", "Activity Based", "NEP 2020 Aligned"]
  };
}

// GET /api/public/storefront/catalog
router.get("/catalog", async (req, res) => {
  try {
    const { category, q, featured } = req.query;

    let query = `
      SELECT 
        id, sku, name, description, base_price as "basePrice", quantity as "stockQty",
        unit, threshold, is_common as "isCommon", is_subassembly as "isSubassembly",
        is_sellable as "isSellable", is_hidden as "isHidden", image_url as "imageUrl",
        category, bin_location as "binLocation"
      FROM inventory_items
      WHERE is_hidden = false 
        AND is_sellable = true 
        AND LOWER(COALESCE(category, '')) NOT IN ('box', 'others')
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (category && typeof category === "string" && category.toLowerCase() !== "all") {
      query += ` AND LOWER(category) = LOWER($${paramIndex})`;
      params.push(category);
      paramIndex++;
    }

    if (q && typeof q === "string" && q.trim()) {
      query += ` AND (LOWER(name) LIKE $${paramIndex} OR LOWER(description) LIKE $${paramIndex} OR LOWER(sku) LIKE $${paramIndex})`;
      params.push(`%${q.trim().toLowerCase()}%`);
      paramIndex++;
    }

    query += ` ORDER BY CASE WHEN sku LIKE 'EXP-KIT%' THEN 0 ELSE 1 END ASC, name ASC`;

    const items = await AppDataSource.query(query, params);
    const parsedItems = items.map(enrichProduct);

    res.json(parsedItems);
  } catch (e: any) {
    console.error("Storefront catalog error:", e);
    res.status(500).json({ error: e.message || "Failed to fetch catalog" });
  }
});

// GET /api/public/storefront/categories
router.get("/categories", async (req, res) => {
  try {
    const rows = await AppDataSource.query(`
      SELECT DISTINCT category, count(*) as count
      FROM inventory_items
      WHERE is_hidden = false 
        AND is_sellable = true
        AND category IS NOT NULL 
        AND category != ''
        AND LOWER(category) NOT IN ('box', 'others')
      GROUP BY category
      ORDER BY count DESC
    `);
    res.json(rows.map((r: any) => ({ name: r.category, count: Number(r.count) })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/public/storefront/product/:id
router.get("/product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let query = `
      SELECT 
        id, sku, name, description, base_price as "basePrice", quantity as "stockQty",
        unit, threshold, is_common as "isCommon", is_subassembly as "isSubassembly",
        is_sellable as "isSellable", is_hidden as "isHidden", image_url as "imageUrl",
        category, bin_location as "binLocation"
      FROM inventory_items
      WHERE is_hidden = false AND `;
      
    let params: any[] = [];
    if (isUuid) {
      query += `id = $1`;
      params = [id];
    } else {
      query += `LOWER(sku) = LOWER($1)`;
      params = [id];
    }

    const items = await AppDataSource.query(query, params);

    if (items.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const parsedItem = enrichProduct(items[0]);
    res.json(parsedItem);
  } catch (e: any) {
    console.error("Storefront product detail error:", e);
    res.status(500).json({ error: e.message || "Failed to fetch product" });
  }
});

export default router;
