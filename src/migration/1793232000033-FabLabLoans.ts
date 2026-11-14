import type { MigrationInterface, QueryRunner } from "typeorm";

export class FabLabLoans1793232000033 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE lab_loans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
      item_id uuid NOT NULL REFERENCES inventory_items(id), asset_tag text NOT NULL,
      borrower text NOT NULL, department text NOT NULL, due_date date NOT NULL,
      issued_by uuid NOT NULL, checked_out_at timestamptz NOT NULL DEFAULT now(),
      inspected_by uuid, returned_at timestamptz, return_condition text
        CHECK (return_condition IN ('GOOD','DAMAGED','CALIBRATION_REQUIRED')),
      cleared_at timestamptz, cleared_by uuid
    )`);
    await runner.query(`CREATE UNIQUE INDEX lab_asset_in_custody ON lab_loans (organization_id, lower(asset_tag))
      WHERE returned_at IS NULL OR (return_condition <> 'GOOD' AND cleared_at IS NULL)`);
  }
  async down(runner: QueryRunner) { await runner.query("DROP TABLE lab_loans"); }
}
