import { MigrationInterface, QueryRunner } from "typeorm";
import bcrypt from "bcryptjs";

export class SeedAdminUser1689500000006 implements MigrationInterface {
  name = "SeedAdminUser1689500000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const passwordHash = await bcrypt.hash("Admin@123456!", 10);
    await queryRunner.query(`
      INSERT INTO "users" ("id", "organization_id", "email", "name", "role", "password_hash", "is_active")
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000000',
        'admin@experimindlabs.com',
        'System Administrator',
        'admin',
        '${passwordHash}',
        true
      )
      ON CONFLICT ("email") DO UPDATE SET "role" = 'admin';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "users" WHERE "email" = 'admin@experimindlabs.com';
    `);
  }
}
