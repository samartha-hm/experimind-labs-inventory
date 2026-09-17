import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockIntegrityAndSpatialTree1689500000014 implements MigrationInterface {
  name = "AddStockIntegrityAndSpatialTree1689500000014";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enforce non-negative stock constraint on inventory_items (Section 3 Integrity Rule)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'check_stock_non_negative'
        ) THEN
          ALTER TABLE "inventory_items"
          ADD CONSTRAINT "check_stock_non_negative" CHECK (quantity >= 0);
        END IF;
      END $$;
    `);

    // 2. Add is_esd_safe and spatial_path to bins table
    await queryRunner.query(`ALTER TABLE "bins" ADD COLUMN IF NOT EXISTS "is_esd_safe" boolean NOT NULL DEFAULT false;`);
    await queryRunner.query(`ALTER TABLE "bins" ADD COLUMN IF NOT EXISTS "spatial_path" character varying(255);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bins_spatial_path" ON "bins" ("spatial_path");`);

    // 3. Add is_esd_safe and spatial_path to stock_locations table
    await queryRunner.query(`ALTER TABLE "stock_locations" ADD COLUMN IF NOT EXISTS "is_esd_safe" boolean NOT NULL DEFAULT false;`);
    await queryRunner.query(`ALTER TABLE "stock_locations" ADD COLUMN IF NOT EXISTS "spatial_path" character varying(255);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stock_locations_spatial_path" ON "stock_locations" ("spatial_path");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP CONSTRAINT IF EXISTS "check_stock_non_negative";`);
    await queryRunner.query(`ALTER TABLE "bins" DROP COLUMN IF EXISTS "spatial_path";`);
    await queryRunner.query(`ALTER TABLE "bins" DROP COLUMN IF EXISTS "is_esd_safe";`);
    await queryRunner.query(`ALTER TABLE "stock_locations" DROP COLUMN IF EXISTS "spatial_path";`);
    await queryRunner.query(`ALTER TABLE "stock_locations" DROP COLUMN IF EXISTS "is_esd_safe";`);
  }
}
