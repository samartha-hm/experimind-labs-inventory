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

  console.log(`✨ Successfully seeded ${insertedCount} real inventory items into PostgreSQL database!`);
  await pool.end();
}

seedRealInventory();
