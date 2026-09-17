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

// ===== CMS Storage & Configuration =====
let memoryCmsStore: any = null;

const DEFAULT_STOREFRONT_CMS = {
  announcement: {
    isVisible: true,
    text: "🎉 National Science Day Special: Free Activity Workbooks with all ExperiMind Labs STEM Kits! Pan-India Delivery.",
    discountCode: "EXPERIMIND10",
    linkUrl: "/catalog",
    badge: "Limited Offer"
  },
  hero: {
    eyebrowBadge: "🔬 Research-First Experiential STEM Education",
    headline: "Transform Abstract Science & Math into Hands-on Discovery",
    subtitle: "Engineered by cognitive researchers and master educators at ExperiMind Labs. Trusted by 250+ premier ATL schools, makerspaces, and curious students across India.",
    primaryCtaText: "Explore STEM Catalog",
    primaryCtaLink: "/catalog",
    secondaryCtaText: "Browse ATL Kits",
    secondaryCtaLink: "/catalog?category=STEM%20Kits",
    showcaseImageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80",
    trustMetrics: [
      { label: "Active School Labs", value: "250+" },
      { label: "Precision STEM Tools", value: "320+" },
      { label: "Student Hours Inspired", value: "50k+" },
      { label: "NEP 2020 Aligned", value: "100%" }
    ]
  },
  usps: [
    {
      id: "usp_1",
      icon: "Award",
      title: "National Award-Winning Pedagogy",
      description: "Rooted in constructivist cognitive learning models to build deep spatial and empirical intuition."
    },
    {
      id: "usp_2",
      icon: "ShieldCheck",
      title: "Lab-Grade Calibration & Safety",
      description: "Non-toxic, high-durability apparatus built for thousands of hours of intense classroom exploration."
    },
    {
      id: "usp_3",
      icon: "BookOpen",
      title: "Complete Curriculum Manuals",
      description: "Every kit includes graded step-by-step visual guides, theory primers, and real-world project challenges."
    },
    {
      id: "usp_4",
      icon: "Truck",
      title: "Direct Lab Dispatch & Warranty",
      description: "Dispatched from our Karnataka central technical warehouse with institutional GST invoices and prompt support."
    }
  ],
  curriculum: [
    {
      grade: "Grades 1–5",
      title: "Anubhav Sensory Science",
      focus: "Curiosity, tactile observation, elementary optics, color synthesis, and foundational balance mechanics."
    },
    {
      grade: "Grades 6–8",
      title: "Middle School Exploration",
      focus: "3D Geomagic spatial math, circuit building, electromagnetism, ray optics, and density labs."
    },
    {
      grade: "Grades 9–10",
      title: "Secondary Lab Sciences",
      focus: "Rigorous physics mechanics, chemical reaction labware, lens equations, and micro-measuring tools."
    },
    {
      grade: "Grades 11–12 & ATL",
      title: "Innovation & Robotics Hub",
      focus: "Microcontrollers, sensor fusion, IoT telemetry, prototype fabrication, and advanced apparatus."
    }
  ],
  testimonials: [
    {
      id: "t_1",
      name: "Dr. Sunita Rao",
      role: "Principal",
      institution: "Delhi Public School, Bangalore South",
      quote: "ExperiMind Labs kits have transformed our science periods. The Geomagic 3D kits made spatial geometry intuitive for even our most hesitant students.",
      rating: 5,
      verified: true
    },
    {
      id: "t_2",
      name: "Prof. Arvind Kulkarni",
      role: "ATL Lab Coordinator",
      institution: "Vidyaniketan National School",
      quote: "The durability and precision of ExperiMind Labs physical science modules are unmatched. Our students actively innovate rather than just reading theory.",
      rating: 5,
      verified: true
    },
    {
      id: "t_3",
      name: "Meera Nair",
      role: "Parent & Educator",
      institution: "Mysore STEM Circle",
      quote: "The activity guides are exceptionally well written. My 8th grader built an entire optics bench over the weekend and understood refraction effortlessly.",
      rating: 5,
      verified: true
    }
  ],
  faqs: [
    {
      id: "faq_1",
      question: "Are ExperiMind Labs kits aligned with CBSE, ICSE, and State board curricula?",
      answer: "Yes! All kits are mapped directly to NCERT and NEP 2020 experiential learning mandates for Grades 1 through 12, covering core physics, chemistry, biology, and applied mathematics."
    },
    {
      id: "faq_2",
      question: "Can educational institutions and ATL labs place bulk orders with institutional GST invoices?",
      answer: "Absolutely. We issue official B2B Tax Invoices with valid GSTIN and HSN codes, offering dedicated school lab pricing and educational dispatch terms."
    },
    {
      id: "faq_3",
      question: "What is the typical shipping timeline across India?",
      answer: "Standard orders are packed within 24 hours at our central lab warehouse and delivered within 3–5 business days via premier air courier partners (Delhivery, BlueDart, DTDC)."
    },
    {
      id: "faq_4",
      question: "What if a glass component or sensor arrives damaged?",
      answer: "We offer a 100% Zero-Hassle Replacement Guarantee. Simply contact our support team within 7 days of delivery with your order ID for immediate spare part dispatch."
    }
  ],
  theme: {
    accentColor: "indigo",
    schoolDispatchesEmail: "orders@experimindlabs.com",
    officialPhone: "+91 80 4123 9876",
    officeAddress: "ExperiMind Labs Pvt Ltd, Tech Research Park, Karnataka, India"
  }
};

// GET /api/public/storefront/cms
router.get("/cms", async (_req, res) => {
  try {
    if (!memoryCmsStore) {
      // Try to load from database if exists
      try {
        const rows = await AppDataSource.query(`
          SELECT value FROM settings WHERE setting_type = 'category' AND value LIKE 'CMS_CONFIG:%' LIMIT 1
        `);
        if (rows.length > 0) {
          const raw = rows[0].value.replace("CMS_CONFIG:", "");
          memoryCmsStore = JSON.parse(raw);
        }
      } catch (err) {
        // Fallback to default
      }
    }
    res.json(memoryCmsStore || DEFAULT_STOREFRONT_CMS);
  } catch (e: any) {
    res.json(DEFAULT_STOREFRONT_CMS);
  }
});

// POST /api/public/storefront/cms
router.post("/cms", async (req, res) => {
  try {
    const newConfig = req.body;
    if (!newConfig || typeof newConfig !== "object") {
      return res.status(400).json({ error: "Invalid CMS configuration payload" });
    }
    memoryCmsStore = {
      ...DEFAULT_STOREFRONT_CMS,
      ...newConfig
    };

    // Save to settings table for persistence across server restarts
    try {
      const jsonStr = JSON.stringify(memoryCmsStore);
      await AppDataSource.query(`
        DELETE FROM settings WHERE setting_type = 'category' AND value LIKE 'CMS_CONFIG:%'
      `);
      await AppDataSource.query(`
        INSERT INTO settings (id, setting_type, value)
        VALUES (gen_random_uuid(), 'category', $1)
      `, [`CMS_CONFIG:${jsonStr}`]);
    } catch (err) {
      console.warn("Could not persist CMS to settings table:", err);
    }

    res.json({ success: true, cms: memoryCmsStore });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to save CMS config" });
  }
});

export default router;
