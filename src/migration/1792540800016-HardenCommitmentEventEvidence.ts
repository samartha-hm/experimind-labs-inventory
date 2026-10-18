import type { MigrationInterface, QueryRunner } from "typeorm";

/** Bind ledger queries to their schema and require retained event evidence. */
export class HardenCommitmentEventEvidence1792540800016 implements MigrationInterface {
  name = "HardenCommitmentEventEvidence1792540800016";
  private readonly functions = ["commitment_apply()", "commitment_entitlement_insert()", "commitment_account_insert()",
    "commitment_source_insert()", "commitment_projection_guard()", "commitment_immutable()", "commitment_quantity(jsonb)"];
  private async schema(r: QueryRunner): Promise<string> {
    const [{ schema }] = await r.query("SELECT current_schema() AS schema");
    if (typeof schema !== "string" || !schema) throw new Error("Ledger schema required");
    return `"${schema.replaceAll('"', '""')}"`;
  }
  async up(r: QueryRunner): Promise<void> {
    const schema = await this.schema(r);
    await r.query(`
      LOCK TABLE commitment_balances,commitment_events IN SHARE ROW EXCLUSIVE MODE;
      DO $$ BEGIN
        IF EXISTS(SELECT 1 FROM commitment_balances b WHERE
          b.sequence<>(SELECT count(*) FROM commitment_events e WHERE e.account_id=b.account_id) OR
          (b.sequence=0 AND (b.approved<>0 OR b.fulfilled<>0 OR b.held<>0 OR b.entitlement_id IS NOT NULL)) OR
          (b.sequence>0 AND NOT EXISTS(SELECT 1 FROM commitment_events e WHERE e.account_id=b.account_id
            AND e.organization_id=b.organization_id AND e.sequence=b.sequence AND e.entitlement_id=b.entitlement_id
            AND e.approved_after=b.approved AND e.fulfilled_after=b.fulfilled AND e.held_after=b.held))) THEN
          RAISE EXCEPTION 'Existing commitment evidence drift; independent recovery required' USING ERRCODE='23514';
        END IF;
      END $$;
      CREATE FUNCTION commitment_event_witness() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.sequence=0 AND TG_OP='INSERT' AND NEW.approved=0 AND NEW.fulfilled=0 AND NEW.held=0
          AND NEW.entitlement_id IS NULL THEN RETURN NULL; END IF;
        IF NOT EXISTS(SELECT 1 FROM commitment_events e WHERE e.account_id=NEW.account_id
          AND e.organization_id=NEW.organization_id AND e.sequence=NEW.sequence
          AND e.entitlement_id=NEW.entitlement_id AND e.approved_after=NEW.approved
          AND e.fulfilled_after=NEW.fulfilled AND e.held_after=NEW.held) THEN
          RAISE EXCEPTION 'Projection requires retained matching event evidence' USING ERRCODE='23514';
        END IF;
        RETURN NULL;
      END $$;
      CREATE CONSTRAINT TRIGGER commitment_event_witness AFTER INSERT OR UPDATE ON commitment_balances
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_event_witness();
    `);
    // pg_temp must be explicit and last: omitting it implicitly searches it first.
    // Nested invoker functions (including requirement_assert) inherit this path.
    for (const signature of [...this.functions, "commitment_event_witness()"]) {
      await r.query(`ALTER FUNCTION ${schema}.${signature} SET search_path TO pg_catalog, ${schema}, pg_temp`);
    }
  }
  async down(r: QueryRunner): Promise<void> {
    await r.query("LOCK TABLE commitment_accounts IN ACCESS EXCLUSIVE MODE");
    if ((await r.query("SELECT 1 FROM commitment_accounts LIMIT 1")).length)
      throw new Error("Preserve commitment evidence; use forward recovery");
    await r.query(`DROP TRIGGER commitment_event_witness ON commitment_balances;
      DROP FUNCTION commitment_event_witness()`);
    const schema = await this.schema(r);
    for (const signature of this.functions) await r.query(`ALTER FUNCTION ${schema}.${signature} RESET search_path`);
  }
}
