import type { MigrationInterface, QueryRunner } from "typeorm";

export const blockedExecutionTables = ["production_recipes", "production_work_orders", "production_input_reservations",
  "production_input_issues", "production_batches", "production_qc_decisions", "packing_orders", "packing_picks",
  "delivery_orders", "delivery_package_claims", "package_custody_events", "site_installations", "project_completions"];

/** Explicit synthetic activation. Preserve historical rows; never infer missing custody. */
export class BlockUnintegratedExecution1792886400022 implements MigrationInterface {
  name = "BlockUnintegratedExecution1792886400022";
  async up(r: QueryRunner): Promise<void> {
    const [scope] = await r.query("SELECT current_database() db,current_schema() schema");
    if (scope.db !== "experimind_kitbuilder_test" || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))
      throw new Error("Execution guard activation restricted to isolated synthetic requirement_test schema");
    await r.query("SELECT 1 FROM commitment_receipts LIMIT 0");
    await r.query(`CREATE FUNCTION guard_d3_execution() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'D3 production/packing source transfer, consumption and custody contract required'
        USING ERRCODE='23514'; END $$;
      CREATE FUNCTION guard_d3_stock() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.production_issue_id IS NOT NULL OR NEW.production_qc_id IS NOT NULL OR NEW.packing_pick_id IS NOT NULL
          OR NEW.transaction_type IN ('KIT_CONSUMPTION','KIT_PRODUCTION') THEN
          RAISE EXCEPTION 'D3 production/packing physical execution is not integrated' USING ERRCODE='23514';
        END IF;
        RETURN NEW;
      END $$;`);
    for (const table of blockedExecutionTables) {
      await r.query(`LOCK TABLE ${table} IN ACCESS EXCLUSIVE MODE`);
      await r.query(`CREATE TRIGGER a_d3_execution BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON ${table}
        FOR EACH STATEMENT EXECUTE FUNCTION guard_d3_execution()`);
    }
    await r.query(`CREATE TRIGGER a_d3_stock BEFORE INSERT OR UPDATE ON stock_ledger
      FOR EACH ROW EXECUTE FUNCTION guard_d3_stock()`);
    for (const fn of ["guard_d3_execution", "guard_d3_stock"])
      await r.query(`ALTER FUNCTION ${fn}() SET search_path TO pg_catalog,"${scope.schema}",pg_temp;
        REVOKE ALL ON FUNCTION ${fn}() FROM PUBLIC`);
  }
  async down(): Promise<void> {
    throw new Error("Preserve D3 execution guards; a reviewed forward custody/authorization migration is required");
  }
}
