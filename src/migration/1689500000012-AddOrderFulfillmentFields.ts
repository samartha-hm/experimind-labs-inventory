import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderFulfillmentFields1689500000012 implements MigrationInterface {
  name = "AddOrderFulfillmentFields1689500000012";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_orders" ADD COLUMN IF NOT EXISTS "customer_address" text;`);
    await queryRunner.query(`ALTER TABLE "customer_orders" ADD COLUMN IF NOT EXISTS "carrier" character varying(100);`);
    await queryRunner.query(`ALTER TABLE "customer_orders" ADD COLUMN IF NOT EXISTS "tracking_number" character varying(150);`);
    await queryRunner.query(`ALTER TABLE "customer_orders" ADD COLUMN IF NOT EXISTS "shipping_fee" numeric(12,2) NOT NULL DEFAULT 0;`);
    await queryRunner.query(`ALTER TABLE "customer_orders" ADD COLUMN IF NOT EXISTS "payment_method" character varying(50) NOT NULL DEFAULT 'cod';`);
    await queryRunner.query(`ALTER TABLE "customer_orders" ADD COLUMN IF NOT EXISTS "gstin" character varying(50);`);
    await queryRunner.query(`ALTER TABLE "customer_orders" ADD COLUMN IF NOT EXISTS "notes" text;`);
    await queryRunner.query(`ALTER TABLE "customer_orders" ADD COLUMN IF NOT EXISTS "invoice_number" character varying(100);`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_orders_tracking" ON "customer_orders" ("tracking_number");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_orders_status" ON "customer_orders" ("status");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_orders" DROP COLUMN IF EXISTS "invoice_number";`);
    await queryRunner.query(`ALTER TABLE "customer_orders" DROP COLUMN IF EXISTS "notes";`);
    await queryRunner.query(`ALTER TABLE "customer_orders" DROP COLUMN IF EXISTS "gstin";`);
    await queryRunner.query(`ALTER TABLE "customer_orders" DROP COLUMN IF EXISTS "payment_method";`);
    await queryRunner.query(`ALTER TABLE "customer_orders" DROP COLUMN IF EXISTS "shipping_fee";`);
    await queryRunner.query(`ALTER TABLE "customer_orders" DROP COLUMN IF EXISTS "tracking_number";`);
    await queryRunner.query(`ALTER TABLE "customer_orders" DROP COLUMN IF EXISTS "carrier";`);
    await queryRunner.query(`ALTER TABLE "customer_orders" DROP COLUMN IF EXISTS "customer_address";`);
  }
}
