import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRbacAndSessions1689500000009 implements MigrationInterface {
  name = "AddRbacAndSessions1689500000009";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create roles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "name" character varying(100) NOT NULL,
        "code" character varying(50) NOT NULL,
        "description" text,
        "is_system" boolean NOT NULL DEFAULT false,
        "color" character varying(50) NOT NULL DEFAULT 'indigo',
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_roles_organization_id" ON "roles" ("organization_id");
      CREATE INDEX IF NOT EXISTS "IDX_roles_code" ON "roles" ("code");
    `);

    // 2. Create sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "refresh_token_hash" character varying(255) NOT NULL,
        "device_info" character varying(255) NOT NULL DEFAULT 'Web Terminal (Desktop)',
        "ip_address" character varying(100) NOT NULL DEFAULT '127.0.0.1',
        "location" character varying(100) NOT NULL DEFAULT 'Direct Connection',
        "last_active_at" TIMESTAMP NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP NOT NULL,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_sessions_user_id" ON "sessions" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_sessions_refresh_token_hash" ON "sessions" ("refresh_token_hash");
    `);

    // 3. Seed initial system roles
    const initialRoles = [
      {
        name: "Super Administrator",
        code: "super_admin",
        description: "Unrestricted operational, financial, and organizational authority across all facilities.",
        is_system: true,
        color: "indigo",
        permissions: JSON.stringify([
          "inventory:read", "inventory:write", "inventory:delete", "inventory:adjust",
          "warehouse:read", "warehouse:write", "warehouse:transfer", "warehouse:audit",
          "procurement:read", "procurement:write", "procurement:receive",
          "sales:read", "sales:write", "sales:dispatch",
          "finance:gst", "finance:valuation", "finance:zoho",
          "compliance:audit_logs", "compliance:roles", "compliance:users", "compliance:approvals"
        ])
      },
      {
        name: "Warehouse & Logistics Manager",
        code: "warehouse_manager",
        description: "Full control over warehouse layouts, multi-stage transfers, dock receiving, picking & cycle counts.",
        is_system: true,
        color: "emerald",
        permissions: JSON.stringify([
          "inventory:read", "inventory:write", "inventory:adjust",
          "warehouse:read", "warehouse:write", "warehouse:transfer", "warehouse:audit",
          "procurement:read", "procurement:receive",
          "sales:read", "sales:dispatch",
          "compliance:approvals"
        ])
      },
      {
        name: "Procurement Specialist",
        code: "procurement_specialist",
        description: "Manages vendor directories, generates Purchase Orders, and monitors inbound logistics.",
        is_system: true,
        color: "blue",
        permissions: JSON.stringify([
          "inventory:read",
          "procurement:read", "procurement:write", "procurement:receive",
          "warehouse:read"
        ])
      },
      {
        name: "Floor Operator / Barcode Scanner",
        code: "floor_operator",
        description: "Optimized for warehouse floor stations: physical counting, dock scanning, and pick-path fulfillment.",
        is_system: true,
        color: "amber",
        permissions: JSON.stringify([
          "inventory:read",
          "warehouse:read", "warehouse:transfer", "warehouse:audit",
          "procurement:receive",
          "sales:dispatch"
        ])
      },
      {
        name: "Auditor / Read-Only Observer",
        code: "auditor_readonly",
        description: "Read-only access to immutable stock ledger, financial valuation, and compliance logs.",
        is_system: true,
        color: "slate",
        permissions: JSON.stringify([
          "inventory:read",
          "warehouse:read",
          "procurement:read",
          "sales:read",
          "finance:gst", "finance:valuation",
          "compliance:audit_logs"
        ])
      }
    ];

    for (const role of initialRoles) {
      await queryRunner.query(
        `INSERT INTO "roles" ("name", "code", "description", "is_system", "color", "permissions")
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT DO NOTHING`,
        [role.name, role.code, role.description, role.is_system, role.color, role.permissions]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}
