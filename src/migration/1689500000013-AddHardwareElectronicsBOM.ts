import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHardwareElectronicsBOM1689500000013 implements MigrationInterface {
  name = "AddHardwareElectronicsBOM1689500000013";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend inventory_items with hardware and parametric attributes
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "mpn" character varying(150);`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "manufacturer" character varying(150);`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "package_footprint" character varying(100);`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "mounting_type" character varying(50) DEFAULT 'SMD';`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "msl_rating" character varying(20) DEFAULT 'MSL 1';`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "parametric_specs" jsonb DEFAULT '{}';`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "datasheet_url" text;`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "pinout_diagram_url" text;`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_items_mpn" ON "inventory_items" ("mpn");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_items_footprint" ON "inventory_items" ("package_footprint");`);

    // 2. Extend stock_lots with reel fractionation and MSL attributes
    await queryRunner.query(`ALTER TABLE "stock_lots" ADD COLUMN IF NOT EXISTS "parent_lot_id" uuid;`);
    await queryRunner.query(`ALTER TABLE "stock_lots" ADD COLUMN IF NOT EXISTS "package_type" character varying(50) NOT NULL DEFAULT 'FULL_REEL';`);
    await queryRunner.query(`ALTER TABLE "stock_lots" ADD COLUMN IF NOT EXISTS "floor_life_seconds_remaining" integer;`);
    await queryRunner.query(`ALTER TABLE "stock_lots" ADD COLUMN IF NOT EXISTS "msl_open_timestamp" TIMESTAMP WITH TIME ZONE;`);
    await queryRunner.query(`ALTER TABLE "stock_lots" ADD COLUMN IF NOT EXISTS "msl_bake_history" jsonb DEFAULT '[]';`);
    await queryRunner.query(`ALTER TABLE "stock_lots" ADD COLUMN IF NOT EXISTS "feeder_slot" character varying(50);`);
    await queryRunner.query(`ALTER TABLE "stock_lots" ADD COLUMN IF NOT EXISTS "reel_diameter" character varying(50);`);
    await queryRunner.query(`ALTER TABLE "stock_lots" ADD COLUMN IF NOT EXISTS "tape_width" character varying(50);`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stock_lots_parent_lot_id" ON "stock_lots" ("parent_lot_id");`);

    // Foreign key for lot fractionation
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_stock_lots_parent_lot'
        ) THEN
          ALTER TABLE "stock_lots"
          ADD CONSTRAINT "FK_stock_lots_parent_lot"
          FOREIGN KEY ("parent_lot_id") REFERENCES "stock_lots"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 3. Create bom_nodes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bom_nodes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "parent_item_id" uuid NOT NULL,
        "child_item_id" uuid NOT NULL,
        "quantity" numeric(14,4) NOT NULL DEFAULT 1,
        "scrap_percentage" numeric(5,2) NOT NULL DEFAULT 0,
        "reference_designators" text[] NOT NULL DEFAULT '{}',
        "find_number" integer,
        "assembly_phase" character varying(50) NOT NULL DEFAULT 'SMT_TOP',
        "do_not_populate" boolean NOT NULL DEFAULT false,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bom_nodes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bom_nodes_parent_item" FOREIGN KEY ("parent_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bom_nodes_child_item" FOREIGN KEY ("child_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bom_nodes_org_parent" ON "bom_nodes" ("organization_id", "parent_item_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bom_nodes_org_child" ON "bom_nodes" ("organization_id", "child_item_id");`);

    // 4. Create component_alternates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "component_alternates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "bom_node_id" uuid NOT NULL,
        "alternate_item_id" uuid NOT NULL,
        "preference_rank" integer NOT NULL DEFAULT 1,
        "approval_status" character varying(50) NOT NULL DEFAULT 'APPROVED',
        "engineering_notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_component_alternates_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_component_alternates_bom_node" FOREIGN KEY ("bom_node_id") REFERENCES "bom_nodes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_component_alternates_item" FOREIGN KEY ("alternate_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_component_alternates_node_item" ON "component_alternates" ("bom_node_id", "alternate_item_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "component_alternates";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bom_nodes";`);

    await queryRunner.query(`ALTER TABLE "stock_lots" DROP CONSTRAINT IF EXISTS "FK_stock_lots_parent_lot";`);
    await queryRunner.query(`ALTER TABLE "stock_lots" DROP COLUMN IF EXISTS "tape_width";`);
    await queryRunner.query(`ALTER TABLE "stock_lots" DROP COLUMN IF EXISTS "reel_diameter";`);
    await queryRunner.query(`ALTER TABLE "stock_lots" DROP COLUMN IF EXISTS "feeder_slot";`);
    await queryRunner.query(`ALTER TABLE "stock_lots" DROP COLUMN IF EXISTS "msl_bake_history";`);
    await queryRunner.query(`ALTER TABLE "stock_lots" DROP COLUMN IF EXISTS "msl_open_timestamp";`);
    await queryRunner.query(`ALTER TABLE "stock_lots" DROP COLUMN IF EXISTS "floor_life_seconds_remaining";`);
    await queryRunner.query(`ALTER TABLE "stock_lots" DROP COLUMN IF EXISTS "package_type";`);
    await queryRunner.query(`ALTER TABLE "stock_lots" DROP COLUMN IF EXISTS "parent_lot_id";`);

    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "pinout_diagram_url";`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "datasheet_url";`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "parametric_specs";`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "msl_rating";`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "mounting_type";`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "package_footprint";`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "manufacturer";`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "mpn";`);
  }
}
