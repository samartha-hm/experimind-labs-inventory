import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrgAuditOrdersInvoices1689500000001 implements MigrationInterface {
  name = "AddOrgAuditOrdersInvoices1689500000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Organizations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "slug" varchar NOT NULL,
        "currency" varchar NOT NULL DEFAULT 'INR',
        "settings" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_organizations_id" PRIMARY KEY ("id")
      );
    `);

    // Ensure default organization row exists
    await queryRunner.query(`
      INSERT INTO "organizations" ("id", "name", "slug")
      VALUES ('00000000-0000-0000-0000-000000000000', 'Default Organization', 'default-org')
      ON CONFLICT DO NOTHING;
    `);

    // 2. Audit Logs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "actor_id" varchar NOT NULL,
        "action" varchar NOT NULL,
        "entity_type" varchar NOT NULL,
        "entity_id" varchar NOT NULL,
        "before" jsonb,
        "after" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_org" ON "audit_logs" ("organization_id");
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id");
    `);

    // 3. Refresh Tokens
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user" ON "refresh_tokens" ("user_id");
    `);

    // 4. Stock Adjustments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_adjustments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "inventory_item_id" uuid NOT NULL,
        "quantity_delta" integer NOT NULL,
        "reason_code" varchar NOT NULL,
        "notes" varchar,
        "actor_id" varchar NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_adjustments_id" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_stock_adjustments_org" ON "stock_adjustments" ("organization_id");
      CREATE INDEX IF NOT EXISTS "IDX_stock_adjustments_item" ON "stock_adjustments" ("inventory_item_id");
    `);

    // 5. Customer Orders
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "order_number" varchar NOT NULL,
        "customer_name" varchar NOT NULL,
        "customer_email" varchar,
        "customer_phone" varchar,
        "status" varchar NOT NULL DEFAULT 'created',
        "total_amount" integer NOT NULL,
        "razorpay_order_id" varchar,
        "razorpay_payment_id" varchar,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_customer_orders_number" UNIQUE ("order_number"),
        CONSTRAINT "PK_customer_orders_id" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_customer_orders_org" ON "customer_orders" ("organization_id");
      CREATE INDEX IF NOT EXISTS "IDX_customer_orders_razorpay_order" ON "customer_orders" ("razorpay_order_id");
    `);

    // 6. Customer Order Lines
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_order_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "inventory_item_id" uuid NOT NULL,
        "item_name" varchar NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price" integer NOT NULL,
        "line_total" integer NOT NULL,
        CONSTRAINT "PK_customer_order_lines_id" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_customer_order_lines_order" ON "customer_order_lines" ("order_id");
    `);

    // 7. Invoices
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "invoice_number" varchar NOT NULL,
        "order_id" uuid,
        "customer_name" varchar NOT NULL,
        "subtotal" integer NOT NULL,
        "cgst" integer NOT NULL DEFAULT 0,
        "sgst" integer NOT NULL DEFAULT 0,
        "igst" integer NOT NULL DEFAULT 0,
        "total_amount" integer NOT NULL,
        "status" varchar NOT NULL DEFAULT 'issued',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_invoices_number" UNIQUE ("invoice_number"),
        CONSTRAINT "PK_invoices_id" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_invoices_org" ON "invoices" ("organization_id");
    `);

    // 8. Invoice Lines
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoice_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "invoice_id" uuid NOT NULL,
        "description" varchar NOT NULL,
        "hsn_code" varchar,
        "quantity" integer NOT NULL,
        "unit_price" integer NOT NULL,
        "taxable_value" integer NOT NULL,
        "gst_rate" integer NOT NULL DEFAULT 18,
        "cgst" integer NOT NULL DEFAULT 0,
        "sgst" integer NOT NULL DEFAULT 0,
        "igst" integer NOT NULL DEFAULT 0,
        "total_amount" integer NOT NULL,
        CONSTRAINT "PK_invoice_lines_id" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_invoice_lines_invoice" ON "invoice_lines" ("invoice_id");
    `);

    // 9. Invoice Sequences
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoice_sequences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "financial_year" varchar NOT NULL,
        "last_sequence" integer NOT NULL DEFAULT 0,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_invoice_seq_fy" UNIQUE ("organization_id", "financial_year"),
        CONSTRAINT "PK_invoice_sequences_id" PRIMARY KEY ("id")
      );
    `);

    // Add organization_id columns to existing 15 entities if missing
    const tables = [
      "inventory_items",
      "warehouses",
      "bins",
      "kits",
      "kit_bom",
      "vendors",
      "purchase_orders",
      "purchase_order_lines",
      "customers",
      "sales_orders",
      "sales_order_lines",
      "transactions",
      "transaction_lines",
      "settings",
      "users",
    ];

    for (const table of tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN IF NOT EXISTS "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
        CREATE INDEX IF NOT EXISTS "IDX_${table}_org" ON "${table}" ("organization_id");
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "invoice_sequences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoice_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_order_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_adjustments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
  }
}
