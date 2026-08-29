// @ts-nocheck
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

// Check for Firebase credentials
const hasFirebaseCredentials = !!process.env.FIREBASE_SERVICE_ACCOUNT &&
  process.env.FIREBASE_SERVICE_ACCOUNT.trim() !== "";

// Check for Google Sheets credentials
const hasGoogleSheetsCredentials = !!process.env.GOOGLE_SHEET_ID &&
  !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
  !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

if (!hasFirebaseCredentials) {
  console.log("⚠️ FIREBASE_SERVICE_ACCOUNT not set; Firebase migration will be skipped.");
}

if (!hasGoogleSheetsCredentials) {
  console.log("⚠️ Google Sheets credentials not provided. Skipping Google Sheets migration.");
}

// Initialize Firebase Admin if credentials are present
let fbApp: any = null;
let db: any = null;
if (hasFirebaseCredentials) {
  try {
    const firebaseServiceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT.trim(), "base64").toString("utf8")
    );
    console.log(`🔥 Firebase Project ID: ${firebaseServiceAccount.project_id}`);
    fbApp = initializeApp({
      credential: cert(firebaseServiceAccount),
      projectId: firebaseServiceAccount.project_id
    });
    db = getFirestore(fbApp);
    console.log(`🔥 Firestore instance initialized for project: ${firebaseServiceAccount.project_id}`);
  } catch (initError) {
    console.error('❌ Failed to initialize Firebase Admin:', initError);
    process.exit(1);
  }
}

// Initialize Google Sheet only if credentials are present
let ss: any = null;
if (hasGoogleSheetsCredentials) {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(
      /\\n/g,
      "\n"
    ),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  ss = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
  await ss.loadInfo();
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

// Helper to run a query safely
const query = (text: string, values?: any[]) => pool.query(text, values ?? []);

// Migration functions
async function migrateUsersFromFirestore() {
  if (!hasFirebaseCredentials || !db) {
    console.log("⏭️ Skipping Firebase users migration (no Firebase credentials).");
    return;
  }
  console.log("🔄 Migrating Firebase users ...");
  try {
    const snap = await db.collection("users").get();
    for (const doc of snap.docs) {
      const data = doc.data();
      await query(
        `INSERT INTO users (id, firebase_uid, email, name, role, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (firebase_uid) DO NOTHING`,
        [
          uuidv4(),
          data.uid,
          data.email,
          data.displayName ?? data.email,
          data.role ?? "viewer",
          new Date(),
          new Date()
        ]
      );
    }
    console.log(`✅ Users migrated: ${snap.size}`);
  } catch (err) {
    console.error("❌ Failed to migrate Firebase users:", err);
    throw err;
  }
}

async function migrateAssetsFromSheet() {
  if (!hasGoogleSheetsCredentials || !ss) {
    console.log("⏭️ Skipping Google Sheets assets migration (no Google Sheets credentials).");
    return;
  }
  console.log("🔄 Migrating Assets sheet ...");
  const sheet = ss.sheetsByTitle["Assets"];
  const rows = await sheet.getRows();
  for (const r of rows) {
    const id = uuidv4();
    await query(
      `INSERT INTO inventory_items (
        id, sku, name, description, base_price, price_markup_pct,
        quantity, unit, threshold, is_common, is_sellable, is_hidden,
        image_url, room, shelf, box, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,'pcs',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
      )
      ON CONFLICT (sku) DO NOTHING`,
      [
        id,
        `SKU-${id}`,
        r.name,
        r.description,
        Number(r.price) || 0,
        30, // default markup
        Number(r.quantity) || 0,
        Number(r.threshold) || 5,
        String(r.isCommon) === "TRUE",
        true, // isSellable
        String(r.isHidden) === "TRUE",
        r.imageUrl || null,
        r.room || null,
        r.shelf || null,
        r.box || null,
        new Date(),
        new Date()
      ]
    );
  }
  console.log(`✅ Assets migrated: ${rows.length}`);
}

async function migrateKitsFromFirestore() {
  if (!hasFirebaseCredentials || !db) {
    console.log("⏭️ Skipping Firebase kits migration (no Firebase credentials).");
    return;
  }
  console.log("🔄 Migrating Firestore kits ...");
  try {
    const kitsSnap = await db.collection("kits").get();
    for (const doc of kitsSnap.docs) {
      const data = doc.data();
      const kitId = uuidv4();
      await query(
        `INSERT INTO kits (id, name, description, image_url, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT DO NOTHING`,
        [
          kitId,
          data.name,
          data.description ?? null,
          data.imageUrl ?? null,
          new Date(),
          new Date()
        ]
      );

      // BOM items
      const bomSnap = await db.collection(`kits/${doc.id}/bom`).get();
      for (const bomDoc of bomSnap.docs) {
        const bom = bomDoc.data();
        await query(
          `INSERT INTO kit_bom (id, kit_id, inventory_item_id, qty_per_kit, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT DO NOTHING`,
          [
            uuidv4(),
            kitId,
            bom.inventory_item_id,
            bom.qty,
            new Date(),
            new Date()
          ]
        );
      }
    }
    console.log(`✅ Kits migrated: ${kitsSnap.size}`);
  } catch (err) {
    console.error("❌ Failed to migrate Firestore kits:", err);
    throw err;
  }
}

async function migrateOrdersFromSheet() {
  if (!hasGoogleSheetsCredentials || !ss) {
    console.log("⏭️ Skipping Google Sheets orders migration (no Google Sheets credentials).");
    return;
  }
  console.log("🔄 Migrating Orders sheet ...");
  const sheet = ss.sheetsByTitle["Orders"];
  const rows = await sheet.getRows();
  for (const r of rows) {
    const soId = uuidv4();
    const items = JSON.parse(r.itemsJson || "[]");

    // Insert sales order
    await query(
      `INSERT INTO sales_orders (
        id, so_number, customer_name, customer_email, phone, address,
        purpose, status, total_amount, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )`,
      [
        soId,
        `SO-${soId}`,
        r.customerName,
        r.customerEmail,
        r.phone,
        r.address,
        r.purpose,
        r.status || "PENDING",
        0, // total will be updated
        new Date(),
        new Date()
      ]
    );

    // Insert line items and calculate total
    let total = 0;
    for (const it of items) {
      // Try to find inventory item by legacy ID or name
      const invRes = await query(
        `SELECT id FROM inventory_items WHERE sku = $1 OR name ILIKE $2`,
        [`LEGACY-${it.assetId}`, it.assetId] // Try legacy ID first, then name
      );

      let inventoryItemId = null;
      if (invRes.rows.length > 0) {
        inventoryItemId = invRes.rows[0].id;
      } else {
        // Create a placeholder inventory item if not found
        const placeholderId = uuidv4();
        await query(
          `INSERT INTO inventory_items (
            id, sku, name, description, base_price, price_markup_pct,
            quantity, unit, threshold, is_common, is_sellable, is_hidden,
            created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,'pcs',$8,$9,$10,$11,$12,$13
          )`,
          [
            placeholderId,
            `LEGACY-${it.assetId}`,
            it.assetId,
            `Imported from legacy sheet`,
            0,
            30,
            0,
            "pcs",
            0,
            false,
            true,
            false,
            new Date(),
            new Date()
          ]
        );
        inventoryItemId = placeholderId;
      }

      const qty = Number(it.quantity) || 1;
      const price = Number(it.price) || 0;
      total += price * qty;

      await query(
        `INSERT INTO sales_order_lines (
          id, sales_order_id, inventory_item_id, qty_ordered, qty_picked, qty_shipped,
          unit_price, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9
        )`,
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
    await query(
      `UPDATE sales_orders SET total_amount = $1 WHERE id = $2`,
      [total, soId]
    );
  }
  console.log(`✅ Orders migrated: ${rows.length}`);
}

async function migrateSettingsFromSheet() {
  if (!hasGoogleSheetsCredentials || !ss) {
    console.log("⏭️ Skipping Google Sheets settings migration (no Google Sheets credentials).");
    return;
  }
  console.log("🔄 Migrating Settings sheet ...");
  const sheet = ss.sheetsByTitle["Settings"];
  const rows = await sheet.getRows();
  for (const r of rows) {
    const type = r.type?.toUpperCase();
    if (!["CATEGORY", "ROOM", "SHELF", "BOX"].includes(type)) continue;
    await query(
      `INSERT INTO settings (id, setting_type, value, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (setting_type, value) DO NOTHING`,
      [uuidv4(), type.toLowerCase(), r.value, new Date(), new Date()]
    );
  }
  console.log(`✅ Settings migrated: ${rows.length}`);
}

// Main migration function
async function main() {
  try {
    await migrateUsersFromFirestore();
    if (hasGoogleSheetsCredentials) {
      await migrateAssetsFromSheet();
    }
    await migrateKitsFromFirestore();
    if (hasGoogleSheetsCredentials) {
      await migrateOrdersFromSheet();
      await migrateSettingsFromSheet();
    }
    console.log("🎉 Migration completed successfully.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();