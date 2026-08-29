import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

function parseCSVLine(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let entry = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const nextC = text[i + 1];

    if (c === '"') {
      if (inQuotes && nextC === '"') {
        entry += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(entry.trim());
      entry = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && nextC === '\n') {
        i++;
      }
      row.push(entry.trim());
      if (row.some(field => field.length > 0)) {
        lines.push(row);
      }
      row = [];
      entry = '';
    } else {
      entry += c;
    }
  }

  if (entry.length > 0 || row.length > 0) {
    row.push(entry.trim());
    lines.push(row);
  }

  return lines;
}

async function seedRealInventory() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL missing in environment.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? false : { rejectUnauthorized: false }
  });

  const csvPath = path.join(process.cwd(), 'old web page', 'Invetory_mgmt - Assets.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  console.log(`📦 Reading real inventory data from ${csvPath}...`);
  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSVLine(content);

  if (rows.length < 2) {
    console.error("❌ CSV file is empty or missing data rows.");
    process.exit(1);
  }

  const headers = rows[0].map(h => h.toLowerCase().trim());
  console.log(`  Headers: ${headers.join(', ')}`);

  const nameIdx = headers.indexOf('name');
  const descIdx = headers.indexOf('description');
  const priceIdx = headers.indexOf('price');
  const qtyIdx = headers.indexOf('quantity');
  const imgIdx = headers.indexOf('imageurl');
  const catIdx = headers.indexOf('category');
  const hiddenIdx = headers.indexOf('ishidden');
  const roomIdx = headers.indexOf('room');
  const shelfIdx = headers.indexOf('shelf');
  const boxIdx = headers.indexOf('box');
  const barcodeIdx = headers.indexOf('barcode');

  let insertedCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 2) continue;

    const name = r[nameIdx] || '';
    if (!name) continue;

    const description = descIdx >= 0 ? r[descIdx] || null : null;
    const price = priceIdx >= 0 ? parseFloat(r[priceIdx]) || 0 : 0;
    const quantity = qtyIdx >= 0 ? parseInt(r[qtyIdx], 10) || 0 : 0;
    const imageUrl = imgIdx >= 0 ? r[imgIdx] || null : null;
    const category = catIdx >= 0 && r[catIdx] ? r[catIdx] : 'General Components';
    const isHidden = hiddenIdx >= 0 ? r[hiddenIdx].toUpperCase() === 'TRUE' : false;
    const barcode = barcodeIdx >= 0 && r[barcodeIdx] ? r[barcodeIdx] : `EL-${i}`;

    const room = roomIdx >= 0 ? r[roomIdx] : '';
    const shelf = shelfIdx >= 0 ? r[shelfIdx] : '';
    const box = boxIdx >= 0 ? r[boxIdx] : '';

    const binParts = [room, shelf ? `Shelf ${shelf}` : '', box].filter(Boolean);
    const binLocation = binParts.length > 0 ? binParts.join(' - ') : null;

    try {
      await pool.query(`
        INSERT INTO "inventory_items" (
          "organization_id",
          "sku",
          "name",
          "description",
          "category",
          "base_price",
          "price_markup_pct",
          "quantity",
          "unit",
          "threshold",
          "is_common",
          "is_subassembly",
          "is_sellable",
          "is_hidden",
          "image_url",
          "bin_location"
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          $1, $2, $3, $4, $5, 30, $6, 'pcs', 10, false, false, true, $7, $8, $9
        )
        ON CONFLICT ("sku") DO UPDATE SET
          "name" = EXCLUDED.name,
          "description" = EXCLUDED.description,
          "category" = EXCLUDED.category,
          "base_price" = EXCLUDED.base_price,
          "quantity" = EXCLUDED.quantity,
          "is_hidden" = EXCLUDED.is_hidden,
          "image_url" = EXCLUDED.image_url,
          "bin_location" = EXCLUDED.bin_location;
      `, [barcode, name, description, category, price, quantity, isHidden, imageUrl, binLocation]);

      insertedCount++;
    } catch (err) {
      console.error(`Failed to insert item ${name}:`, err);
    }
  }

  // Ensure Flagship Experimind Labs STEM Kits are seeded
  const flagshipKits = [
    {
      sku: "EXP-KIT-GEO",
      name: "Geomagic 3D Geometry & Visual Math Kit",
      description: "National Award-winning experiential geometry kit designed to transform 2D spatial concepts into interactive 3D structures. Ideal for Grades 6-10.",
      category: "STEM Kits",
      price: 1499,
      quantity: 45,
      imageUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80",
      binLocation: "Main Lab - Shelf A - Box 1"
    },
    {
      sku: "EXP-KIT-PSL",
      name: "PSL Physical Science & Problem Solving Lab",
      description: "Complete physics discovery lab covering mechanics, electricity, magnetism, optics, and energy transformation with hands-on experiment modules.",
      category: "STEM Kits",
      price: 2299,
      quantity: 30,
      imageUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80",
      binLocation: "Main Lab - Shelf A - Box 2"
    },
    {
      sku: "EXP-KIT-PRASTUTI",
      name: "Prastuti Classroom Demonstration Science Kit",
      description: "Curriculum-aligned science model kit for educators and students to demonstrate core scientific principles with interactive working models.",
      category: "STEM Kits",
      price: 3499,
      quantity: 20,
      imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
      binLocation: "Main Lab - Shelf B - Box 1"
    },
    {
      sku: "EXP-KIT-ANUBHAV",
      name: "Anubhav Foundational Sensory Science Kit",
      description: "Activity-based experiential science set designed for early learning (Grades 1-5) focusing on observation, light, color, sound, and textures.",
      category: "STEM Kits",
      price: 1199,
      quantity: 50,
      imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80",
      binLocation: "Main Lab - Shelf B - Box 2"
    },
    {
      sku: "EXP-KIT-ROBO",
      name: "Robotics & IoT Innovation Starter Kit",
      description: "Microcontroller-based robotics and IoT starter pack with sensors, motors, Bluetooth, breadboard, and curriculum project guide.",
      category: "Robotics & IoT",
      price: 2799,
      quantity: 35,
      imageUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80",
      binLocation: "Robotics Lab - Shelf C - Box 1"
    },
    {
      sku: "EXP-KIT-OPTICS",
      name: "Precision Optical Physics Lab Set",
      description: "High-grade optical bench kit with convex/concave lenses, prisms, plane mirrors, laser source, and refraction tanks for light experiments.",
      category: "Physics & Mechanics",
      price: 899,
      quantity: 60,
      imageUrl: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80",
      binLocation: "Physics Lab - Shelf D - Box 1"
    },
    {
      sku: "EXP-KIT-SENSOR",
      name: "Smart Sensor Explorer Pack (10-in-1)",
      description: "Essential STEM sensor modules: Ultrasonic, PIR Motion, IR Obstacle, Temperature/Humidity, Soil Moisture, LDR Light, and Sound Detection.",
      category: "Robotics & IoT",
      price: 1250,
      quantity: 80,
      imageUrl: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&auto=format&fit=crop&q=80",
      binLocation: "Electronics Lab - Shelf C - Box 2"
    }
  ];

  for (const kit of flagshipKits) {
    try {
      await pool.query(`
        INSERT INTO "inventory_items" (
          "organization_id", "sku", "name", "description", "category",
          "base_price", "price_markup_pct", "quantity", "unit", "threshold",
          "is_common", "is_subassembly", "is_sellable", "is_hidden", "image_url", "bin_location"
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          $1, $2, $3, $4, $5, 30, $6, 'kit', 5, true, false, true, false, $7, $8
        )
        ON CONFLICT ("sku") DO UPDATE SET
          "name" = EXCLUDED.name,
          "description" = EXCLUDED.description,
          "category" = EXCLUDED.category,
          "base_price" = EXCLUDED.base_price,
          "quantity" = EXCLUDED.quantity,
          "is_hidden" = false,
          "is_sellable" = true,
          "image_url" = EXCLUDED.image_url,
          "bin_location" = EXCLUDED.bin_location;
      `, [kit.sku, kit.name, kit.description, kit.category, kit.price, kit.quantity, kit.imageUrl, kit.binLocation]);
      insertedCount++;
    } catch (err) {
      console.error(`Failed to insert flagship kit ${kit.name}:`, err);
    }
  }

  console.log(`✨ Successfully seeded ${insertedCount} real inventory items and Experimind Flagship STEM Kits into PostgreSQL database!`);
  await pool.end();
}

seedRealInventory();
