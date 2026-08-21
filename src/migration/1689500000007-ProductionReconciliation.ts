import { MigrationInterface, QueryRunner } from "typeorm";

export class ProductionReconciliation1689500000007 implements MigrationInterface {
  name = "ProductionReconciliation1689500000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns if they don't exist yet
    await queryRunner.query(`ALTER TABLE "bins" ADD COLUMN IF NOT EXISTS "warehouse_id" uuid;`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "vendor_id" uuid;`);
    await queryRunner.query(`ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "po_id" uuid;`);
    await queryRunner.query(`ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "inventory_item_id" uuid;`);
    await queryRunner.query(`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "customer_id" uuid;`);
    await queryRunner.query(`ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "so_id" uuid;`);
    await queryRunner.query(`ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "inventory_item_id" uuid;`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "bin_id" uuid;`);

    // Add Foreign Key Constraints with safe IF NOT EXISTS guards
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_bins_warehouse') THEN
          ALTER TABLE "bins" ADD CONSTRAINT "FK_bins_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_purchase_orders_vendor') THEN
          ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_purchase_orders_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_purchase_order_lines_po') THEN
          ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "FK_purchase_order_lines_po" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_purchase_order_lines_item') THEN
          ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "FK_purchase_order_lines_item" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_sales_orders_customer') THEN
          ALTER TABLE "sales_orders" ADD CONSTRAINT "FK_sales_orders_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_sales_order_lines_so') THEN
          ALTER TABLE "sales_order_lines" ADD CONSTRAINT "FK_sales_order_lines_so" FOREIGN KEY ("so_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_sales_order_lines_item') THEN
          ALTER TABLE "sales_order_lines" ADD CONSTRAINT "FK_sales_order_lines_item" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    // Performance Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bins_org" ON "bins" ("organization_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_purchase_orders_org" ON "purchase_orders" ("organization_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sales_orders_org" ON "sales_orders" ("organization_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_items_org" ON "inventory_items" ("organization_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transactions_org" ON "transactions" ("organization_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_org";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_items_org";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sales_orders_org";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchase_orders_org";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bins_org";`);

    await queryRunner.query(`ALTER TABLE "sales_order_lines" DROP CONSTRAINT IF EXISTS "FK_sales_order_lines_item";`);
    await queryRunner.query(`ALTER TABLE "sales_order_lines" DROP CONSTRAINT IF EXISTS "FK_sales_order_lines_so";`);
    await queryRunner.query(`ALTER TABLE "sales_orders" DROP CONSTRAINT IF EXISTS "FK_sales_orders_customer";`);
    await queryRunner.query(`ALTER TABLE "purchase_order_lines" DROP CONSTRAINT IF EXISTS "FK_purchase_order_lines_item";`);
    await queryRunner.query(`ALTER TABLE "purchase_order_lines" DROP CONSTRAINT IF EXISTS "FK_purchase_order_lines_po";`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP CONSTRAINT IF EXISTS "FK_purchase_orders_vendor";`);
    await queryRunner.query(`ALTER TABLE "bins" DROP CONSTRAINT IF EXISTS "FK_bins_warehouse";`);
  }
}
