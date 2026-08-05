import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedDefaultOrganization1689500000002 implements MigrationInterface {
  name = "SeedDefaultOrganization1689500000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "organizations" ("id", "name", "slug", "currency")
      VALUES ('00000000-0000-0000-0000-000000000000', 'Experimind Primary Organization', 'primary-org', 'INR')
      ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "organizations" WHERE "id" = '00000000-0000-0000-0000-000000000000';
    `);
  }
}
