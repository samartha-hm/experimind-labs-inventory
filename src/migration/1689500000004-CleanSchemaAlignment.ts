import { MigrationInterface, QueryRunner } from "typeorm";

export class CleanSchemaAlignment1689500000004 implements MigrationInterface {
  name = "CleanSchemaAlignment1689500000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Fix Users table: Make firebase_uid nullable
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "firebase_uid" DROP NOT NULL;
    `);

    // 2. Fix Invoice Lines table: Drop legacy columns if present
    await queryRunner.query(`
      ALTER TABLE "invoice_lines" DROP COLUMN IF EXISTS "description";
      ALTER TABLE "invoice_lines" DROP COLUMN IF EXISTS "unit_price";
      ALTER TABLE "invoice_lines" DROP COLUMN IF EXISTS "taxable_value";
      ALTER TABLE "invoice_lines" DROP COLUMN IF EXISTS "gst_rate";
      ALTER TABLE "invoice_lines" DROP COLUMN IF EXISTS "cgst";
      ALTER TABLE "invoice_lines" DROP COLUMN IF EXISTS "sgst";
      ALTER TABLE "invoice_lines" DROP COLUMN IF EXISTS "igst";
      ALTER TABLE "invoice_lines" DROP COLUMN IF EXISTS "total_amount";
    `);

    // 3. Fix Invoices table: Drop legacy NOT NULL columns if present
    await queryRunner.query(`
      ALTER TABLE "invoices" DROP COLUMN IF EXISTS "subtotal";
      ALTER TABLE "invoices" DROP COLUMN IF EXISTS "cgst";
      ALTER TABLE "invoices" DROP COLUMN IF EXISTS "sgst";
      ALTER TABLE "invoices" DROP COLUMN IF EXISTS "igst";
      ALTER TABLE "invoices" DROP COLUMN IF EXISTS "total_amount";
    `);

    // 4. Fix Invoice Sequences table: Drop legacy last_sequence column if present
    await queryRunner.query(`
      ALTER TABLE "invoice_sequences" DROP COLUMN IF EXISTS "last_sequence";
    `);

    // 5. Fix Customer Orders & Customer Order Lines money types to numeric(12,2)
    await queryRunner.query(`
      ALTER TABLE "customer_orders" ALTER COLUMN "total_amount" TYPE numeric(12,2);
      ALTER TABLE "customer_order_lines" ALTER COLUMN "unit_price" TYPE numeric(12,2);
      ALTER TABLE "customer_order_lines" ALTER COLUMN "line_total" TYPE numeric(12,2);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback rules
  }
}
