import type { MigrationInterface, QueryRunner } from "typeorm";

/** Additive, synthetic-only activation. Rollback preserves all nonempty custody evidence. */
export class AddFinishedOutputCustody1793059200025 implements MigrationInterface {
  name = "AddFinishedOutputCustody1793059200025";
  async up(r: QueryRunner): Promise<void> {
    const [scope] = await r.query("SELECT current_database() db,current_schema() schema");
    if (scope.db !== "experimind_kitbuilder_test" || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))
      throw Error("Output custody activation restricted to isolated synthetic requirement_test schema");
    await r.query(`CREATE TABLE production_output_custody (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, order_id uuid NOT NULL, source_id uuid NOT NULL,
      quantity numeric(12,4) NOT NULL CHECK(quantity>0), unit varchar(30) NOT NULL,
      location varchar(100) NOT NULL CHECK(length(trim(location))>0),
      output_type varchar(30) NOT NULL DEFAULT 'recipe_output' CHECK(output_type='recipe_output'),
      status varchar(30) NOT NULL DEFAULT 'pending_qc' CHECK(status='pending_qc'),
      input_basis jsonb NOT NULL, actor_id uuid NOT NULL, operation_key varchar(100) NOT NULL,
      qr text NOT NULL UNIQUE CHECK(qr='ERP:OUTPUT:'||id::text), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      UNIQUE(id,organization_id), UNIQUE(organization_id,source_id),
      FOREIGN KEY(order_id,organization_id) REFERENCES production_work_orders(id,organization_id),
      FOREIGN KEY(actor_id) REFERENCES users(id));
      CREATE INDEX production_output_order ON production_output_custody(order_id);
      CREATE TRIGGER immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON production_output_custody
        FOR EACH STATEMENT EXECUTE FUNCTION commitment_immutable();

      CREATE FUNCTION commitment_output_insert() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE w production_work_orders; c commitment_work_orders; mat record; total numeric;
        required numeric; consumed numeric; issues jsonb; basis jsonb:='[]';
      BEGIN
        SELECT * INTO STRICT w FROM production_work_orders WHERE id=NEW.order_id AND organization_id=NEW.organization_id FOR UPDATE;
        SELECT * INTO STRICT c FROM commitment_work_orders WHERE order_id=w.id AND organization_id=w.organization_id;
        PERFORM commitment_work_order_check(w.id);
        IF NEW.unit<>w.unit OR w.status<>'in_progress' THEN
          RAISE EXCEPTION 'Active canonical work-order output required' USING ERRCODE='23514'; END IF;
        SELECT coalesce(sum(quantity),0)+NEW.quantity INTO total FROM production_output_custody WHERE order_id=w.id;
        IF total>w.planned_quantity THEN RAISE EXCEPTION 'Exclusive output authority exhausted' USING ERRCODE='23514'; END IF;
        FOR mat IN SELECT m.*,e.cap,a.unit FROM commitment_work_order_materials m
          JOIN commitment_entitlements e ON e.id=m.entitlement_id JOIN commitment_accounts a ON a.id=m.account_id
          WHERE m.order_id=w.id ORDER BY m.id LOOP
          required:=mat.cap*NEW.quantity/w.planned_quantity;
          IF required*10000<>trunc(required*10000) THEN
            RAISE EXCEPTION 'Inexact partial output input allocation' USING ERRCODE='23514'; END IF;
          SELECT coalesce(sum(i.quantity),0),coalesce(jsonb_agg(i.id ORDER BY i.id),'[]') INTO consumed,issues
            FROM production_input_issues i JOIN commitment_work_order_issues x ON x.issue_id=i.id
            WHERE x.material_id=mat.id AND i.organization_id=w.organization_id;
          IF consumed<mat.cap*total/w.planned_quantity THEN
            RAISE EXCEPTION 'Output exceeds proven material consumption' USING ERRCODE='23514'; END IF;
          basis:=basis||jsonb_build_array(jsonb_build_object('material',mat.id,'item',mat.item_id,
            'quantity',to_char(required,'FM99999990.0000'),'unit',mat.unit,'issues',issues));
        END LOOP;
        IF jsonb_array_length(basis)=0 THEN RAISE EXCEPTION 'Proven recipe input required' USING ERRCODE='23514'; END IF;
        NEW.input_basis:=basis;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER output_basis BEFORE INSERT ON production_output_custody FOR EACH ROW EXECUTE FUNCTION commitment_output_insert();
      CREATE FUNCTION commitment_output_witness() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        PERFORM commitment_work_order_check(NEW.order_id);
        IF NOT EXISTS(SELECT 1 FROM commitment_authorizations z JOIN audit_logs a
          ON a.organization_id=z.organization_id AND a.actor_id=z.actor_id AND a.entity_id=NEW.id
          AND a.action='FINISHED_OUTPUT' AND a.entity_type='trusted_production' AND a."after"=z.result
          WHERE z.organization_id=NEW.organization_id AND z.actor_id=NEW.actor_id AND z.operation_key=NEW.operation_key
          AND z.result=jsonb_build_object('id',NEW.id,'order',NEW.order_id,
            'quantity',to_char(NEW.quantity,'FM99999990.0000'),'qr',NEW.qr)) THEN
          RAISE EXCEPTION 'Atomic output audit and authorization evidence required' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END; $$;
      CREATE CONSTRAINT TRIGGER output_evidence AFTER INSERT ON production_output_custody
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_output_witness();
      REVOKE ALL ON production_output_custody FROM PUBLIC;
      REVOKE ALL ON FUNCTION commitment_output_insert(),commitment_output_witness() FROM PUBLIC;`);
  }
  async down(): Promise<void> {
    throw Error("Preserve custody evidence: restore an isolated pre-activation backup instead of destructive rollback");
  }
}
