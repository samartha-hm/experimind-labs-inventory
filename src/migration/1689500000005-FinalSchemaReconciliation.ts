import { MigrationInterface, QueryRunner } from "typeorm";

export class FinalSchemaReconciliation1689500000005 implements MigrationInterface {
  name = "FinalSchemaReconciliation1689500000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Align Invoice Lines table: Add missing unit_price and taxable_value columns
    await queryRunner.query(`
      ALTER TABLE "invoice_lines"
      ADD COLUMN IF NOT EXISTS "unit_price" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "taxable_value" numeric(12,2) NOT NULL DEFAULT 0;
    `);

    // 2. Align Audit Logs table: Add missing audit columns
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS "actor_id" uuid,
      ADD COLUMN IF NOT EXISTS "action" varchar,
      ADD COLUMN IF NOT EXISTS "entity_type" varchar,
      ADD COLUMN IF NOT EXISTS "entity_id" varchar;
    `);

    // 3. Align Invoice Sequences table: Add financial_year column
    await queryRunner.query(`
      ALTER TABLE "invoice_sequences"
      ADD COLUMN IF NOT EXISTS "financial_year" varchar NOT NULL DEFAULT '2026-2027';
    `);

    // 4. Align Organizations table: Add slug column
    await queryRunner.query(`
      ALTER TABLE "organizations"
      ADD COLUMN IF NOT EXISTS "slug" varchar;
    `);

    // 5. Align Stock Adjustments table: Add reason_code, actor_id, notes
    await queryRunner.query(`
      ALTER TABLE "stock_adjustments"
      ADD COLUMN IF NOT EXISTS "reason_code" varchar,
      ADD COLUMN IF NOT EXISTS "actor_id" uuid,
      ADD COLUMN IF NOT EXISTS "notes" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback rules
  }
}
