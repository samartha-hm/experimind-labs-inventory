import type { MigrationInterface, QueryRunner } from "typeorm";

export class OperationalEvidence1793232000030 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE operational_evidence_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      stream_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES users(id),
      revision integer NOT NULL CHECK (revision > 0),
      kind text NOT NULL CHECK (kind IN ('evidence','count')),
      operation_key text NOT NULL CHECK (length(operation_key) BETWEEN 1 AND 100),
      fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
      snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
      captured_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      UNIQUE (organization_id,stream_id,revision),
      UNIQUE (organization_id,actor_id,operation_key));
      CREATE INDEX operational_evidence_latest ON operational_evidence_events(organization_id,stream_id,revision DESC);
      CREATE FUNCTION operational_evidence_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Operational evidence is append only'; END $$;
      CREATE TRIGGER operational_evidence_immutable BEFORE UPDATE OR DELETE OR TRUNCATE
      ON operational_evidence_events FOR EACH STATEMENT EXECUTE FUNCTION operational_evidence_immutable();
      REVOKE ALL ON operational_evidence_events FROM PUBLIC;
      REVOKE ALL ON FUNCTION operational_evidence_immutable() FROM PUBLIC;`);
  }
  async down(): Promise<void> {
    throw new Error("Evidence preservation required: restore a paired pre-migration backup in isolation; do not erase captured evidence");
  }
}
