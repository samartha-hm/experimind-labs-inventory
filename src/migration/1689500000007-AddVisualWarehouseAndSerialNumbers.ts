import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVisualWarehouseAndSerialNumbers1689500000007 implements MigrationInterface {
  name = "AddVisualWarehouseAndSerialNumbers1689500000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. physical_racks
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "physical_racks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" character varying(100) NOT NULL,
        "name" character varying(255) NOT NULL,
        "zone" character varying(100) NOT NULL DEFAULT 'Zone A',
        "type" character varying(50) NOT NULL DEFAULT 'steel_shelf',
        "warehouseCode" character varying(100) NOT NULL DEFAULT 'WH-MAIN-01',
        "shelves" jsonb NOT NULL DEFAULT '[]',
        "gridConfig" jsonb,
        "organizationId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_physical_racks_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_physical_racks_code" ON "physical_racks" ("code");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_physical_racks_warehouseCode" ON "physical_racks" ("warehouseCode");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_physical_racks_orgId" ON "physical_racks" ("organizationId");`);

    // 2. floor_plan_layouts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "floor_plan_layouts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "warehouseCode" character varying(100) NOT NULL,
        "elements" jsonb NOT NULL DEFAULT '[]',
        "templates" jsonb NOT NULL DEFAULT '[]',
        "organizationId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_floor_plan_layouts_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_floor_plan_layouts_whCode" ON "floor_plan_layouts" ("warehouseCode");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_floor_plan_layouts_orgId" ON "floor_plan_layouts" ("organizationId");`);

    // 3. custom_element_types
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "custom_element_types" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "key" character varying(100) NOT NULL,
        "label" character varying(255) NOT NULL,
        "iconEmoji" character varying(20) NOT NULL DEFAULT '📦',
        "defaultColor" character varying(50) NOT NULL DEFAULT '#3b82f6',
        "organizationId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_custom_element_types_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_custom_element_types_key" ON "custom_element_types" ("key");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_custom_element_types_orgId" ON "custom_element_types" ("organizationId");`);

    // 4. serial_numbers
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "serial_numbers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "serialNumber" character varying(150) NOT NULL,
        "inventoryItemId" uuid NOT NULL,
        "warehouseId" character varying(100),
        "binId" character varying(100),
        "status" character varying(50) NOT NULL DEFAULT 'IN_STOCK',
        "batchNumber" character varying(100),
        "purchaseOrderId" uuid,
        "salesOrderId" uuid,
        "kitId" uuid,
        "unitCost" numeric(12,2) NOT NULL DEFAULT 0,
        "warrantyExpiry" TIMESTAMP WITH TIME ZONE,
        "notes" text,
        "history" jsonb NOT NULL DEFAULT '[]',
        "organizationId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_serial_numbers_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_serial_numbers_inventoryItem" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_serial_numbers_serialNumber" ON "serial_numbers" ("serialNumber");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_serial_numbers_inventoryItemId" ON "serial_numbers" ("inventoryItemId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_serial_numbers_status" ON "serial_numbers" ("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_serial_numbers_orgId" ON "serial_numbers" ("organizationId");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "serial_numbers";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_element_types";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "floor_plan_layouts";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "physical_racks";`);
  }
}
