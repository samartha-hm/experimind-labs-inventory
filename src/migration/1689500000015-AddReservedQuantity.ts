import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReservedQuantity1689500000015 implements MigrationInterface {
  name = "AddReservedQuantity1689500000015";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "reserved_quantity" integer NOT NULL DEFAULT 0;`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "reserved_quantity";`
    );
  }
}
