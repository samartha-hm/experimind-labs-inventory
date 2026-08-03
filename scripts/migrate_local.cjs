const { Pool } = require("pg");
require("dotenv").config();
const { v4: uuidv4, v5: uuidv5 } = require("uuid");
const fs = require('fs');
const path = require('path');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// Deterministically convert legacy string/numeric IDs to valid UUIDs
function getUuid(legacyId) {
  if (!legacyId) return uuidv4();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(legacyId)) return legacyId;
  return uuidv5(String(legacyId).trim(), NAMESPACE);
}

// Helper to parse CSV content properly handling quotes and commas
function parseCSV(content) {
  const rows = [];
  let i = 0;
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  while (i < content.length) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && i + 1 < content.length && content[i + 1] === '"') {
        currentCell += '"';
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else if (char === '\r') {
      // Ignore carriage returns
    } else {
      currentCell += char;
    }
    i++;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows.map(row => row.map(cell => cell.trim()));
}

// Helper to read CSV file and return array of objects
function readCSVToObjects(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const rows = parseCSV(data);
    if (rows.length === 0) return [];

    const headers = rows[0];
    const result = [];

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = j < values.length ? values[j] : '';
      }
      result.push(obj);
    }
    return result;
  } catch (error) {
    console.error(`❌ Error reading CSV file ${filePath}:`, error.message);
    return [];
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function query(text, values) {
  return pool.query(text, values);
}

async function migrateAssetsFromCSV() {
  console.log("🔄 Migrating Assets from local CSV...");
  const assets = readCSVToObjects(path.resolve(process.env.ASSETS_CSV_PATH || './assets.csv'));
  if (assets.length === 0) return;

  let successCount = 0;
  for (const asset of assets) {
    if (!asset.name) continue;
    try {
      const id = getUuid(asset.id);
      const name = asset.name || '';
      const description = asset.description || '';
      const base_price = parseFloat(asset.price || '0') || 0;
      const price_markup_pct = 30;
      const quantity = parseInt(asset.quantity || '0') || 0;
      const threshold = parseInt(asset.threshold || '5') || 5;
      const is_common = false;
      const is_hidden = (asset.isHidden || '').toUpperCase() === 'TRUE';
      const image_url = asset.imageUrl || null;
      const room = asset.room || null;
      const shelf = asset.shelf || null;
      const box = asset.box || null;
      const sku = asset.barcode || `SKU-${id}`;

      await query(
        `INSERT INTO inventory_items (
          id, sku, name, description, base_price, price_markup_pct,
          quantity, unit, threshold, is_common, is_sellable, is_hidden,
          image_url, room, shelf, box, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,'pcs',$8,$9,true,$10,$11,$12,$13,$14,$15,$16
        )
        ON CONFLICT (sku) DO UPDATE SET 
          quantity = EXCLUDED.quantity,
          base_price = EXCLUDED.base_price,
          description = EXCLUDED.description`,
        [
          id,
          sku,
          name,
          description,
          base_price,
          price_markup_pct,
          quantity,
          threshold,
          is_common,
          is_hidden,
          image_url,
          room,
          shelf,
          box,
          new Date(),
          new Date()
        ]
      );
      successCount++;
    } catch (err) {
      console.error(`Error importing asset ${asset.name || 'unknown'}:`, err);
    }
  }
  console.log(`✅ Assets migrated: ${successCount}/${assets.length}`);
}

async function migrateOrdersFromCSV() {
  console.log("🔄 Migrating Orders from local CSV...");
  const orders = readCSVToObjects(path.resolve(process.env.ORDERS_CSV_PATH || './orders.csv'));
  if (orders.length === 0) return;

  let successCount = 0;
  for (const order of orders) {
    if (!order.orderId) continue;
    try {
      const soId = getUuid(order.orderId);

      // Insert sales order
      await query(
        `INSERT INTO sales_orders (
          id, so_number, customer_name, customer_email, phone, address, purpose, status, total_amount, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          soId,
          `SO-${order.orderId}`,
          String(order.customerName || ''),
          String(order.customerEmail || ''),
          String(order.phone || ''),
          String(order.address || ''),
          String(order.purpose || ''),
          String(order.status || 'PENDING'),
          0,
          new Date(order.createdAt || new Date()),
          new Date(order.createdAt || new Date())
        ]
      );

      // Parse items
      let items = [];
      if (order.itemsJson) {
        try {
          const jsonString = order.itemsJson.replace(/""/g, '"');
          items = JSON.parse(jsonString);
        } catch (e) {
          try {
            const fixedJson = order.itemsJson.replace(/"""/g, '"').replace(/""/g, '"');
            items = JSON.parse(fixedJson);
          } catch (e2) {
            items = [];
          }
        }
      }

      let total = 0;
      for (const item of items) {
        if (!item.assetId) continue;
        const inventoryItemId = getUuid(item.assetId);

        // Verify if item exists in inventory_items
        const invRes = await query(`SELECT id FROM inventory_items WHERE id = $1`, [inventoryItemId]);
        if (invRes.rows.length === 0) {
          // Create placeholder inventory item
          await query(
            `INSERT INTO inventory_items (
              id, sku, name, description, base_price, price_markup_pct,
              quantity, unit, threshold, is_common, is_sellable, is_hidden, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT (sku) DO NOTHING`,
            [
              inventoryItemId,
              `LEGACY-${item.assetId}`,
              `Legacy Asset (${item.assetId})`,
              'Imported from legacy orders',
              parseFloat(item.price || '0') || 0,
              30,
              0,
              'pcs',
              1,
              false,
              true,
              false,
              new Date(),
              new Date()
            ]
          );
        }

        const qty = parseInt(item.quantity || '1') || 1;
        const price = parseFloat(item.price || '0') || 0;
        total += price * qty;

        await query(
          `INSERT INTO sales_order_lines (
            id, so_id, inventory_item_id, qty_ordered, qty_picked, qty_shipped,
            unit_price, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT DO NOTHING`,
          [
            uuidv4(),
            soId,
            inventoryItemId,
            qty,
            0,
            0,
            price,
            new Date(),
            new Date()
          ]
        );
      }

      // Update total amount
      await query(`UPDATE sales_orders SET total_amount = $1 WHERE id = $2`, [total, soId]);
      successCount++;
    } catch (err) {
      console.error(`Error importing order ${order.orderId}:`, err);
    }
  }
  console.log(`✅ Orders migrated: ${successCount}/${orders.length}`);
}

async function migrateSettingsFromCSV() {
  console.log("🔄 Migrating Settings from local CSV...");
  const settings = readCSVToObjects(path.resolve(process.env.SETTINGS_CSV_PATH || './settings.csv'));
  if (settings.length === 0) return;

  let successCount = 0;
  for (const setting of settings) {
    try {
      const type = (setting.type || '').toUpperCase();
      if (!["CATEGORY", "ROOM", "SHELF", "BOX"].includes(type)) continue;

      await query(
        `INSERT INTO settings (id, setting_type, value, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (setting_type, value) DO NOTHING`,
        [uuidv4(), type.toLowerCase(), setting.value || '', new Date(), new Date()]
      );
      successCount++;
    } catch (err) {
      console.error(`Error importing setting ${setting.value || 'unknown'}:`, err);
    }
  }
  console.log(`✅ Settings migrated: ${successCount}/${settings.length}`);
}

async function migrateUsersFromCSV() {
  console.log("🔄 Migrating Users from local CSV...");
  const users = readCSVToObjects(path.resolve(process.env.USERS_CSV_PATH || './users.csv'));
  if (users.length === 0) return;

  let successCount = 0;
  for (const user of users) {
    try {
      const email = user.email || '';
      if (!email) continue;

      const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
      if (existing.rows.length > 0) continue;

      const id = getUuid(user.id);
      const password = user.password || 'Experimind@123';
      const name = user.name || email.split('@')[0];
      const role = user.role === 'EMPLOYEE' ? 'editor' : 'admin';

      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      await query(
        `INSERT INTO users (
          id, firebase_uid, email, name, role, password_hash, created_at, updated_at
        ) VALUES (
          $1,null,$2,$3,$4,$5,$6,$7
        )`,
        [id, email, name, role, password_hash, new Date(user.createdAt || new Date()), new Date()]
      );
      successCount++;
    } catch (err) {
      console.error(`Error importing user ${user.email || 'unknown'}:`, err);
    }
  }
  console.log(`✅ Users migrated: ${successCount}/${users.length}`);
}

async function main() {
  try {
    console.log("🚀 Starting local CSV-based migration...");

    // Clean up old entries to allow clean import
    console.log("🧹 Truncating old database tables (cascade)...");
    await query("TRUNCATE sales_order_lines, sales_orders, inventory_items, settings CASCADE");

    await migrateAssetsFromCSV();
    await migrateOrdersFromCSV();
    await migrateSettingsFromCSV();
    await migrateUsersFromCSV();

    console.log("🎉 Local CSV migration completed successfully.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();