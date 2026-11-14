import type { MigrationInterface, QueryRunner } from "typeorm";

/** Review judgments only; this migration grants no operational reconciliation rights. */
export class HistoricalEvidenceDecisions1793232000029 implements MigrationInterface {
  name = "HistoricalEvidenceDecisions1793232000029";
  async up(r: QueryRunner): Promise<void> {
    const [scope] = await r.query("SELECT current_database() db,current_schema() schema");
    if (scope.db !== "experimind_kitbuilder_test" || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))
      throw Error("Historical review activation requires isolated synthetic schema");
    await r.query(`CREATE TABLE trusted_historical_decisions (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id),
      source text NOT NULL CHECK(source IN ('inventory_items','project_stock_reservations','purchase_requests','purchase_orders','production_work_orders','packing_orders','delivery_orders')),
      record_id uuid NOT NULL, revision integer NOT NULL CHECK(revision>0),
      previous_id uuid REFERENCES trusted_historical_decisions(id),
      evidence_hash text NOT NULL CHECK(evidence_hash ~ '^[a-f0-9]{64}$'), evidence jsonb NOT NULL,
      decision text NOT NULL CHECK(decision IN ('accepted_for_review','disputed','insufficient_evidence','excluded','requires_documentation')),
      reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 2000),
      evidence_refs jsonb NOT NULL CHECK(jsonb_typeof(evidence_refs)='array' AND jsonb_array_length(evidence_refs) BETWEEN 1 AND 20),
      actor_id uuid NOT NULL REFERENCES users(id), operation_key varchar(100) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      UNIQUE(organization_id,source,record_id,revision), UNIQUE(organization_id,actor_id,operation_key));
      CREATE FUNCTION commitment_historical_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE previous trusted_historical_decisions; original jsonb; ref jsonb;
      BEGIN
        IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Historical decisions are immutable' USING ERRCODE='23514'; END IF;
        IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_id AND organization_id=NEW.organization_id AND is_active AND role IN ('admin','super_admin')) THEN
          RAISE EXCEPTION 'Active tenant reviewer required' USING ERRCODE='23514'; END IF;
        IF NEW.source NOT IN ('inventory_items','project_stock_reservations','purchase_requests','purchase_orders','production_work_orders','packing_orders','delivery_orders') THEN
          RAISE EXCEPTION 'Unsupported historical source' USING ERRCODE='23514'; END IF;
        PERFORM pg_advisory_xact_lock(hashtextextended('historical:'||NEW.organization_id||':'||NEW.source||':'||NEW.record_id,0));
        EXECUTE format('SELECT to_jsonb(t)||jsonb_build_object(''quantity'',to_jsonb(t)->>''quantity'') FROM %I.%I t WHERE id=$1 AND organization_id=$2 FOR SHARE',TG_TABLE_SCHEMA,NEW.source)
          INTO original USING NEW.record_id,NEW.organization_id;
        IF original IS NULL OR original IS DISTINCT FROM NEW.evidence THEN
          RAISE EXCEPTION 'Current tenant source evidence required' USING ERRCODE='23514'; END IF;
        SELECT * INTO previous FROM trusted_historical_decisions WHERE organization_id=NEW.organization_id AND source=NEW.source AND record_id=NEW.record_id ORDER BY revision DESC LIMIT 1;
        IF NEW.revision<>coalesce(previous.revision,0)+1 OR NEW.previous_id IS DISTINCT FROM previous.id THEN
          RAISE EXCEPTION 'Stale historical decision' USING ERRCODE='23514'; END IF;
        FOR ref IN SELECT value FROM jsonb_array_elements(NEW.evidence_refs) LOOP
          IF jsonb_typeof(ref)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(ref))<>3
            OR jsonb_typeof(ref->'identifier') IS DISTINCT FROM 'string' OR length(trim(ref->>'identifier')) NOT BETWEEN 1 AND 300
            OR jsonb_typeof(ref->'provenance') IS DISTINCT FROM 'string' OR length(trim(ref->>'provenance')) NOT BETWEEN 1 AND 1000
            OR jsonb_typeof(ref->'sha256') IS DISTINCT FROM 'string' OR ref->>'sha256' !~ '^[a-f0-9]{64}$' THEN
            RAISE EXCEPTION 'Evidence identifier, provenance and SHA-256 required' USING ERRCODE='23514'; END IF;
        END LOOP;
        NEW.created_at:=clock_timestamp();
        RETURN NEW;
      END; $$;
      CREATE FUNCTION commitment_historical_witness() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NOT EXISTS(SELECT 1 FROM commitment_authorizations z JOIN audit_logs a
          ON a.organization_id=z.organization_id AND a.actor_id=z.actor_id
          WHERE z.organization_id=NEW.organization_id AND z.actor_id=NEW.actor_id AND z.operation_key=NEW.operation_key
          AND z.result=to_jsonb(NEW) AND a.entity_type='historical_review' AND a.entity_id=NEW.id
          AND a.action='historical_decision' AND a."after"=to_jsonb(NEW)) THEN
          RAISE EXCEPTION 'Signed historical authority and audit required' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER historical_guard BEFORE INSERT OR UPDATE OR DELETE ON trusted_historical_decisions
        FOR EACH ROW EXECUTE FUNCTION commitment_historical_guard();
      CREATE FUNCTION commitment_historical_audit_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF TG_OP='TRUNCATE' OR OLD.entity_type='historical_review' OR (TG_OP='UPDATE' AND NEW.entity_type='historical_review') THEN
          RAISE EXCEPTION 'Historical audit is immutable' USING ERRCODE='23514'; END IF;
        IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
      END; $$;
      CREATE TRIGGER historical_audit_guard BEFORE UPDATE OR DELETE ON audit_logs
        FOR EACH ROW EXECUTE FUNCTION commitment_historical_audit_guard();
      CREATE TRIGGER historical_audit_truncate BEFORE TRUNCATE ON audit_logs
        FOR EACH STATEMENT EXECUTE FUNCTION commitment_historical_audit_guard();
      CREATE TRIGGER historical_no_truncate BEFORE TRUNCATE ON trusted_historical_decisions
        FOR EACH STATEMENT EXECUTE FUNCTION commitment_immutable();
      CREATE CONSTRAINT TRIGGER historical_witness AFTER INSERT ON trusted_historical_decisions
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_historical_witness();
      REVOKE ALL ON trusted_historical_decisions FROM PUBLIC;
      REVOKE ALL ON FUNCTION commitment_historical_guard(),commitment_historical_witness(),commitment_historical_audit_guard() FROM PUBLIC;`);
  }
  async down(): Promise<void> { throw Error("Preserve historical review evidence; restore an isolated backup"); }
}
