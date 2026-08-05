import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignEntitiesAndSchema1689500000003 implements MigrationInterface {
  name = "AlignEntitiesAndSchema1689500000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Align Users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "lockout_until" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "reset_token_hash" varchar,
      ADD COLUMN IF NOT EXISTS "reset_token_expires" TIMESTAMP;

      CREATE INDEX IF NOT EXISTS "IDX_users_org" ON "users" ("organization_id");
    `);

    // 2. Align Organizations table
    await queryRunner.query(`
      ALTER TABLE "organizations"
      ADD COLUMN IF NOT EXISTS "gstin" varchar,
      ADD COLUMN IF NOT EXISTS "state_code" varchar;
    `);

    // 3. Align Invoices table
    await queryRunner.query(`
      ALTER TABLE "invoices"
      ADD COLUMN IF NOT EXISTS "invoice_date" date NOT NULL DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS "due_date" date,
      ADD COLUMN IF NOT EXISTS "customer_id" uuid,
      ADD COLUMN IF NOT EXISTS "sales_order_id" uuid,
      ADD COLUMN IF NOT EXISTS "customer_gstin" varchar,
      ADD COLUMN IF NOT EXISTS "place_of_supply" varchar(10) NOT NULL DEFAULT '29',
      ADD COLUMN IF NOT EXISTS "total_taxable" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "cgst_total" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "sgst_total" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "igst_total" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "grand_total" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "irn" varchar,
      ADD COLUMN IF NOT EXISTS "signed_qr_code" text;
    `);

    // 4. Align Invoice Lines table
    await queryRunner.query(`
      ALTER TABLE "invoice_lines"
      ADD COLUMN IF NOT EXISTS "item_name" varchar NOT NULL DEFAULT 'Item',
      ADD COLUMN IF NOT EXISTS "gst_rate_pct" numeric(5,2) NOT NULL DEFAULT 18.00,
      ADD COLUMN IF NOT EXISTS "cgst_amount" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "sgst_amount" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "igst_amount" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "line_total" numeric(12,2) NOT NULL DEFAULT 0;
    `);

    // 5. Align Invoice Sequences table
    await queryRunner.query(`
      ALTER TABLE "invoice_sequences"
      ADD COLUMN IF NOT EXISTS "last_number" integer NOT NULL DEFAULT 0;
    `);

    // 6. Align Inventory Items table
    await queryRunner.query(`
      ALTER TABLE "inventory_items"
      ADD COLUMN IF NOT EXISTS "category" varchar,
      ADD COLUMN IF NOT EXISTS "bin_id" uuid;
    `);

    // 7. Align Purchase Order Lines table
    await queryRunner.query(`
      ALTER TABLE "purchase_order_lines"
      ADD COLUMN IF NOT EXISTS "po_id" uuid;
    `);

    // 8. Align Sales Order Lines table
    await queryRunner.query(`
      ALTER TABLE "sales_order_lines"
      ADD COLUMN IF NOT EXISTS "so_id" uuid;
    `);

    // 9. Align Stock Adjustments table
    await queryRunner.query(`
      ALTER TABLE "stock_adjustments"
      ADD COLUMN IF NOT EXISTS "qty_diff" integer NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Migration rollback rules
  }
}
