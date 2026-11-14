import type { MigrationInterface, QueryRunner } from "typeorm";

/** Additive; retained capability receipts are security evidence. */
export class AddLedgerCapabilities1792540800017 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    await r.query(`CREATE TABLE commitment_authorizations (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, actor_id uuid NOT NULL,
      operation_key text NOT NULL, fingerprint text NOT NULL,
      result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      UNIQUE(organization_id,actor_id,operation_key)
    )`);
    await r.query(`REVOKE ALL ON commitment_authorizations FROM PUBLIC;
      CREATE TRIGGER commitment_authorizations_immutable BEFORE UPDATE OR DELETE ON commitment_authorizations
      FOR EACH ROW EXECUTE FUNCTION commitment_immutable()`);
  }
  async down(r: QueryRunner): Promise<void> {
    if ((await r.query(`SELECT 1 FROM commitment_authorizations LIMIT 1`)).length)
      throw new Error("Preserve capability receipts; forward recovery required");
    await r.query(`DROP TABLE commitment_authorizations`);
  }
}
