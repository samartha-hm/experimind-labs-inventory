import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function clearDemoData() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL missing in environment.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? false : { rejectUnauthorized: false }
  });

  console.log("🧹 Clearing demo and sample data from database...");

  const tablesToTruncate = [
    "transaction_lines",
    "transactions",
    "sales_order_lines",
    "sales_orders",
    "purchase_order_lines",
    "purchase_orders",
    "kit_bom",
    "kits",
    "inventory_items",
    "bins",
    "warehouses",
    "vendors",
    "customers",
    "audit_logs"
  ];

  try {
    for (const table of tablesToTruncate) {
      await pool.query(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(`  ✓ Cleared table "${table}"`);
    }
    
    // Preserve System Admin User, delete other demo users
    await pool.query(`DELETE FROM "users" WHERE email != 'admin@experimindlabs.com';`);
    console.log(`  ✓ Demo users cleaned. Admin user admin@experimindlabs.com preserved.`);

    console.log("✨ Database cleaned and ready for production use!");
  } catch (error) {
    console.error("❌ Error clearing demo data:", error);
  } finally {
    await pool.end();
  }
}

clearDemoData();
