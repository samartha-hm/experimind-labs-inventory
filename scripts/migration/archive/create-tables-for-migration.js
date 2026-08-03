// create-tables-for-migration.js
// Creates only the tables needed for the CSV migration script
const { Client } = require('pg');
require('dotenv').config();

// Extract connection parameters
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const client = new Client({
  host: DB_HOST,
  port: parseInt(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});

async function createEssentialTables() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "firebase_uid" VARCHAR,
        "email" VARCHAR UNIQUE NOT NULL,
        "name" VARCHAR NOT NULL,
        "role" VARCHAR DEFAULT 'viewer',
        "password_hash" VARCHAR,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Users table created');

    // Create inventory_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "inventory_items" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sku" VARCHAR UNIQUE NOT NULL,
        "name" VARCHAR NOT NULL,
        "description" TEXT,
        "base_price" DECIMAL(10,2) DEFAULT 0,
        "price_markup_pct" INTEGER DEFAULT 30,
        "quantity" INTEGER DEFAULT 0,
        "unit" VARCHAR DEFAULT 'pcs',
        "threshold" INTEGER DEFAULT 5,
        "is_common" BOOLEAN DEFAULT FALSE,
        "is_sellable" BOOLEAN DEFAULT TRUE,
        "is_hidden" BOOLEAN DEFAULT FALSE,
        "image_url" VARCHAR,
        "room" VARCHAR,
        "shelf" VARCHAR,
        "box" VARCHAR,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Inventory items table created');

    // Create settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "setting_type" VARCHAR NOT NULL,
        "value" VARCHAR NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW(),
        UNIQUE(setting_type, value)
      )
    `);
    console.log('✓ Settings table created');

    // Create sales_orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "sales_orders" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "so_number" VARCHAR UNIQUE NOT NULL,
        "customer_name" VARCHAR,
        "customer_email" VARCHAR,
        "phone" VARCHAR,
        "address" TEXT,
        "purpose" TEXT,
        "status" VARCHAR DEFAULT 'PENDING',
        "total_amount" DECIMAL(12,2) DEFAULT 0,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Sales orders table created');

    // Create sales_order_lines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "sales_order_lines" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sales_order_id" UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
        "inventory_item_id" UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
        "qty_ordered" INTEGER NOT NULL,
        "qty_picked" INTEGER DEFAULT 0,
        "qty_shipped" INTEGER DEFAULT 0,
        "unit_price" DECIMAL(12,2) NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Sales order lines table created');

    console.log('🎉 All essential tables created successfully!');
  } catch (err) {
    console.error('❌ Error creating tables:', err);
    throw err;
  } finally {
    await client.end();
  }
}

createEssentialTables();