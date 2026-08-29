import { MigrationInterface, QueryRunner } from "typeorm";

export class EnterpriseMultiLocationAndAuditCore1689500000010 implements MigrationInterface {
  name = "EnterpriseMultiLocationAndAuditCore1689500000010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. stock_locations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_locations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "item_id" uuid NOT NULL,
        "warehouse_id" character varying(100) NOT NULL,
        "bin_id" character varying(100) NOT NULL DEFAULT 'GENERAL',
        "zone" character varying(100) NOT NULL DEFAULT 'Zone A',
        "quantity" numeric(14,4) NOT NULL DEFAULT 0,
        "allocated_qty" numeric(14,4) NOT NULL DEFAULT 0,
        "reserved_qty" numeric(14,4) NOT NULL DEFAULT 0,
        "quarantine_qty" numeric(14,4) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_locations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_stock_locations_org_item_wh_bin" UNIQUE ("organization_id", "item_id", "warehouse_id", "bin_id"),
        CONSTRAINT "FK_stock_locations_item" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stock_locations_org_item" ON "stock_locations" ("organization_id", "item_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stock_locations_wh_bin" ON "stock_locations" ("warehouse_id", "bin_id");`);

    // 2. stock_lots
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_lots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "item_id" uuid NOT NULL,
        "lot_number" character varying(150) NOT NULL,
        "supplier_lot_number" character varying(150),
        "vendor_id" uuid,
        "manufacture_date" TIMESTAMP WITH TIME ZONE,
        "expiry_date" TIMESTAMP WITH TIME ZONE,
        "received_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "status" character varying(50) NOT NULL DEFAULT 'RELEASED',
        "initial_quantity" numeric(14,4) NOT NULL DEFAULT 0,
        "current_quantity" numeric(14,4) NOT NULL DEFAULT 0,
        "unit_cost" numeric(12,4) NOT NULL DEFAULT 0,
        "coa_document_url" text,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_lots_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_stock_lots_org_item_lot" UNIQUE ("organization_id", "item_id", "lot_number"),
        CONSTRAINT "FK_stock_lots_item" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stock_lots_org_item" ON "stock_lots" ("organization_id", "item_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stock_lots_expiry" ON "stock_lots" ("expiry_date");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stock_lots_status" ON "stock_lots" ("status");`);

    // 3. stock_by_lot
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_by_lot" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "lot_id" uuid NOT NULL,
        "warehouse_id" character varying(100) NOT NULL,
        "bin_id" character varying(100) NOT NULL DEFAULT 'GENERAL',
        "quantity" numeric(14,4) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_by_lot_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_stock_by_lot_org_lot_wh_bin" UNIQUE ("organization_id", "lot_id", "warehouse_id", "bin_id"),
        CONSTRAINT "FK_stock_by_lot_lot" FOREIGN KEY ("lot_id") REFERENCES "stock_lots"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stock_by_lot_lot" ON "stock_by_lot" ("lot_id");`);

    // 4. uom_conversions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "uom_conversions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "item_id" uuid,
        "from_uom" character varying(30) NOT NULL,
        "to_uom" character varying(30) NOT NULL,
        "conversion_factor" numeric(14,6) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_uom_conversions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_uom_conversions" UNIQUE ("organization_id", "item_id", "from_uom", "to_uom")
      );
    `);

    // 5. audit_events (Immutable SHA-256 Hash Chained Audit Trail)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sequence_number" BIGSERIAL,
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "actor_id" character varying(100) NOT NULL,
        "actor_name" character varying(255) NOT NULL DEFAULT 'System',
        "actor_role" character varying(50) NOT NULL DEFAULT 'viewer',
        "session_id" character varying(100),
        "ip_address" character varying(50),
        "user_agent" text,
        "action" character varying(80) NOT NULL,
        "entity_type" character varying(100) NOT NULL,
        "entity_id" character varying(150) NOT NULL,
        "before_state" jsonb,
        "after_state" jsonb,
        "delta" jsonb,
        "reason_code" text,
        "previous_hash" character varying(64) NOT NULL,
        "event_hash" character varying(64) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_events_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_events_org_seq" ON "audit_events" ("organization_id", "sequence_number");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_events_entity" ON "audit_events" ("entity_type", "entity_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_events_action" ON "audit_events" ("action");`);

    // 6. Backfill existing inventory into stock_locations
    await queryRunner.query(`
      INSERT INTO "stock_locations" ("item_id", "organization_id", "warehouse_id", "bin_id", "quantity", "allocated_qty", "reserved_qty")
      SELECT 
        "id", 
        COALESCE("organization_id", '00000000-0000-0000-0000-000000000000'::uuid), 
        COALESCE("warehouse_id"::text, 'WH-MAIN-01'), 
        COALESCE(NULLIF("bin_location", ''), 'GENERAL'), 
        COALESCE("quantity", 0), 
        0, 
        0
      FROM "inventory_items"
      ON CONFLICT ("organization_id", "item_id", "warehouse_id", "bin_id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uom_conversions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_by_lot";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_lots";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_locations";`);
  }
}
