import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQmsAndESignatures1689500000011 implements MigrationInterface {
  name = "AddQmsAndESignatures1689500000011";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. users: Add MFA and password history columns if not exists
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_secret" character varying;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enabled" boolean NOT NULL DEFAULT false;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_backup_codes" jsonb;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_password_change" TIMESTAMP WITH TIME ZONE;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_history" jsonb;`);

    // 2. electronic_signatures
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "electronic_signatures" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "signer_user_id" uuid NOT NULL,
        "signer_printed_name" character varying(255) NOT NULL,
        "signer_role_title" character varying(100),
        "entity_type" character varying(100) NOT NULL,
        "entity_id" character varying(150) NOT NULL,
        "signature_meaning" character varying(80) NOT NULL,
        "comments" text,
        "ip_address" character varying(50),
        "session_id" character varying(100),
        "record_hash" character varying(64) NOT NULL,
        "signature_digest" character varying(64) NOT NULL,
        "auth_method" character varying(50) NOT NULL DEFAULT 'PASSWORD_REAUTH',
        "signed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_electronic_signatures_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_electronic_signatures_entity" ON "electronic_signatures" ("entity_type", "entity_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_electronic_signatures_org" ON "electronic_signatures" ("organization_id");`);

    // 3. quality_inspections
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quality_inspections" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "inspection_number" character varying(50) NOT NULL,
        "item_id" uuid NOT NULL,
        "lot_number" character varying(150),
        "purchase_order_id" uuid,
        "batch_quantity" numeric(12,2) NOT NULL DEFAULT 0,
        "sample_size_inspected" numeric(12,2) NOT NULL DEFAULT 0,
        "defect_count" numeric(12,2) NOT NULL DEFAULT 0,
        "status" character varying(50) NOT NULL DEFAULT 'PENDING_INSPECTION',
        "checklist_results" jsonb NOT NULL DEFAULT '[]',
        "inspector_name" character varying(255),
        "inspector_user_id" uuid,
        "disposition_notes" text,
        "deviation_id" uuid,
        "inspected_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quality_inspections_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_quality_inspections_number" UNIQUE ("inspection_number"),
        CONSTRAINT "FK_quality_inspections_item" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_quality_inspections_org" ON "quality_inspections" ("organization_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_quality_inspections_status" ON "quality_inspections" ("status");`);

    // 4. deviations (NCR)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "deviations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "deviation_number" character varying(50) NOT NULL,
        "title" character varying(255) NOT NULL,
        "severity" character varying(50) NOT NULL DEFAULT 'MAJOR',
        "status" character varying(50) NOT NULL DEFAULT 'OPEN',
        "source_event_type" character varying(100),
        "source_reference_id" character varying(150),
        "item_id" uuid,
        "lot_number" character varying(150),
        "affected_quantity" numeric(12,2) NOT NULL DEFAULT 0,
        "description" text NOT NULL,
        "immediate_containment_action" text,
        "root_cause_analysis" text,
        "disposition" character varying(50) NOT NULL DEFAULT 'PENDING',
        "disposition_rationale" text,
        "capa_id" uuid,
        "reported_by_name" character varying(255),
        "investigated_by_name" character varying(255),
        "approved_by_name" character varying(255),
        "closed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_deviations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_deviations_number" UNIQUE ("deviation_number")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_deviations_org" ON "deviations" ("organization_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_deviations_status" ON "deviations" ("status");`);

    // 5. capas
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "capas" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "capa_number" character varying(50) NOT NULL,
        "title" character varying(255) NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'INITIATED',
        "source_deviation_id" uuid,
        "problem_statement" text NOT NULL,
        "five_whys_analysis" text,
        "root_cause" text NOT NULL DEFAULT '',
        "corrective_actions" jsonb NOT NULL DEFAULT '[]',
        "preventive_actions" jsonb NOT NULL DEFAULT '[]',
        "effectiveness_criteria" text,
        "effectiveness_verification_results" text,
        "is_effective" boolean NOT NULL DEFAULT false,
        "lead_investigator_name" character varying(255),
        "qa_approver_name" character varying(255),
        "due_date" TIMESTAMP WITH TIME ZONE,
        "closed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_capas_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_capas_number" UNIQUE ("capa_number")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_capas_org" ON "capas" ("organization_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_capas_status" ON "capas" ("status");`);

    // 6. change_requests (ECO)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "change_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "eco_number" character varying(50) NOT NULL,
        "title" character varying(255) NOT NULL,
        "change_type" character varying(80) NOT NULL DEFAULT 'BOM_MODIFICATION',
        "status" character varying(50) NOT NULL DEFAULT 'DRAFT',
        "target_kit_id" uuid,
        "target_item_id" uuid,
        "reason_for_change" text NOT NULL,
        "impact_assessment" text,
        "proposed_changes" jsonb,
        "initiator_name" character varying(255),
        "ccb_approver_name" character varying(255),
        "effective_date" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_change_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_change_requests_number" UNIQUE ("eco_number")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_change_requests_org" ON "change_requests" ("organization_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_change_requests_status" ON "change_requests" ("status");`);

    // 7. rmas & rma_lines
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rmas" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "rma_number" character varying(50) NOT NULL,
        "customer_id" uuid,
        "customer_name" character varying(255),
        "sales_order_id" uuid,
        "status" character varying(50) NOT NULL DEFAULT 'REQUESTED',
        "reason_for_return" text NOT NULL,
        "customer_notes" text,
        "internal_notes" text,
        "received_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rmas_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rmas_number" UNIQUE ("rma_number")
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rma_lines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "rma_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "serial_number" character varying(150),
        "lot_number" character varying(150),
        "quantity_returned" numeric(12,2) NOT NULL DEFAULT 1,
        "condition_grade" character varying(50) NOT NULL DEFAULT 'GOOD_ORIGINAL_BOX',
        "disposition" character varying(50) NOT NULL DEFAULT 'PENDING',
        "inspection_notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rma_lines_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rma_lines_rma" FOREIGN KEY ("rma_id") REFERENCES "rmas"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rma_lines_item" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rma_lines";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rmas";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "change_requests";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "capas";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deviations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quality_inspections";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "electronic_signatures";`);
  }
}
