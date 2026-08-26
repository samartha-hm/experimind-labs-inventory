import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockLedgerAndWmsOps1689500000008 implements MigrationInterface {
  name = "AddStockLedgerAndWmsOps1689500000008";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create stock_ledger table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_ledger" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "item_id" uuid NOT NULL,
        "item_name" character varying(255) NOT NULL,
        "item_sku" character varying(100) NOT NULL,
        "warehouse_id" uuid,
        "bin_location" character varying(100),
        "lot_number" character varying(100),
        "serial_number" character varying(100),
        "qty_delta" numeric(12,4) NOT NULL,
        "unit_cost" numeric(12,4) NOT NULL DEFAULT 0.0000,
        "running_balance" numeric(12,4) NOT NULL DEFAULT 0.0000,
        "transaction_type" character varying(50) NOT NULL,
        "reference_type" character varying(50),
        "reference_id" character varying(100),
        "reason_code" character varying(255),
        "notes" character varying(1000),
        "actor_id" uuid,
        "actor_name" character varying(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_ledger_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_ledger_org_item" ON "stock_ledger" ("organization_id", "item_id");
      CREATE INDEX IF NOT EXISTS "IDX_stock_ledger_org_created" ON "stock_ledger" ("organization_id", "created_at");
      CREATE INDEX IF NOT EXISTS "IDX_stock_ledger_bin" ON "stock_ledger" ("bin_location", "organization_id");
    `);

    // 2. Create warehouse_transfers & lines
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "warehouse_transfers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "transfer_number" character varying(100) NOT NULL UNIQUE,
        "source_warehouse_code" character varying(100) NOT NULL,
        "source_bin" character varying(100),
        "destination_warehouse_code" character varying(100) NOT NULL,
        "destination_bin" character varying(100),
        "status" character varying(50) NOT NULL DEFAULT 'draft',
        "carrier" character varying(255),
        "tracking_number" character varying(100),
        "dispatched_at" TIMESTAMP WITH TIME ZONE,
        "received_at" TIMESTAMP WITH TIME ZONE,
        "notes" character varying(1000),
        "created_by_name" character varying(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_warehouse_transfers_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "warehouse_transfer_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "transfer_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "item_name" character varying(255) NOT NULL,
        "item_sku" character varying(100) NOT NULL,
        "requested_qty" numeric(12,4) NOT NULL,
        "received_qty" numeric(12,4) NOT NULL DEFAULT 0,
        "source_bin" character varying(100),
        "destination_bin" character varying(100),
        CONSTRAINT "PK_warehouse_transfer_lines_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_warehouse_transfer_lines_transfer" FOREIGN KEY ("transfer_id") REFERENCES "warehouse_transfers"("id") ON DELETE CASCADE
      );
    `);

    // 3. Create cycle_counts & lines
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cycle_counts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "audit_number" character varying(100) NOT NULL UNIQUE,
        "title" character varying(255) NOT NULL,
        "warehouse_code" character varying(100),
        "target_zone_or_category" character varying(100),
        "status" character varying(50) NOT NULL DEFAULT 'draft',
        "is_blind_count" boolean NOT NULL DEFAULT true,
        "total_variance_value" numeric(12,2) NOT NULL DEFAULT 0.00,
        "assigned_auditor_name" character varying(255),
        "approved_by_name" character varying(255),
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "notes" character varying(1000),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cycle_counts_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cycle_count_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cycle_count_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "item_name" character varying(255) NOT NULL,
        "item_sku" character varying(100) NOT NULL,
        "bin_location" character varying(100),
        "system_qty" numeric(12,4) NOT NULL,
        "counted_qty" numeric(12,4),
        "variance_qty" numeric(12,4) NOT NULL DEFAULT 0,
        "unit_cost" numeric(12,4) NOT NULL DEFAULT 0,
        "variance_value" numeric(12,2) NOT NULL DEFAULT 0,
        "variance_reason" character varying(255),
        CONSTRAINT "PK_cycle_count_lines_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cycle_count_lines_cycle_count" FOREIGN KEY ("cycle_count_id") REFERENCES "cycle_counts"("id") ON DELETE CASCADE
      );
    `);

    // 4. Seed opening balance in stock_ledger from existing inventory_items
    await queryRunner.query(`
      INSERT INTO "stock_ledger" (
        "organization_id", "item_id", "item_name", "item_sku", "bin_location",
        "qty_delta", "unit_cost", "running_balance", "transaction_type", "reason_code", "created_at"
      )
      SELECT 
        COALESCE(i.organization_id, '00000000-0000-0000-0000-000000000000'),
        i.id,
        i.name,
        i.sku,
        i.bin_location,
        i.quantity,
        i.base_price,
        i.quantity,
        'INITIAL_BALANCE',
        'Initial Stock Balance Migration',
        now()
      FROM "inventory_items" i
      WHERE NOT EXISTS (
        SELECT 1 FROM "stock_ledger" sl WHERE sl.item_id = i.id
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cycle_count_lines";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cycle_counts";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "warehouse_transfer_lines";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "warehouse_transfers";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_ledger";`);
  }
}
