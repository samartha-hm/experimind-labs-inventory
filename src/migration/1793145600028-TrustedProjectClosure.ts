import type { MigrationInterface,QueryRunner } from 'typeorm';

/** Explicit synthetic bridge to the existing installation and closure state machines. */
export class TrustedProjectClosure1793145600028 implements MigrationInterface {
  name='TrustedProjectClosure1793145600028';
  async up(r:QueryRunner):Promise<void> {
    const [scope]=await r.query('SELECT current_database() db,current_schema() schema');
    if(scope.db!=='experimind_kitbuilder_test'||!/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))throw Error('D4 lifecycle requires isolated synthetic schema');
    await r.query(`CREATE TABLE trusted_installation_sources (
      organization_id uuid NOT NULL, installation_id uuid NOT NULL, receipt_id uuid NOT NULL REFERENCES trusted_delivery_receipts(id),
      PRIMARY KEY(installation_id,receipt_id),FOREIGN KEY(installation_id,organization_id) REFERENCES site_installations(id,organization_id));
      CREATE TRIGGER immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON trusted_installation_sources FOR EACH STATEMENT EXECUTE FUNCTION commitment_immutable();
      CREATE FUNCTION requirement_d4_project_blocked(org uuid,project uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT NOT EXISTS(SELECT 1 FROM planning_sites WHERE organization_id=org AND project_id=project)
          OR EXISTS(SELECT 1 FROM planning_sites s JOIN planning_projects pr ON pr.id=s.project_id AND pr.organization_id=s.organization_id
            WHERE s.organization_id=org AND s.project_id=project AND (
              NOT EXISTS(SELECT 1 FROM trusted_packing_plans p WHERE p.organization_id=org AND p.project_id=project AND p.site_id=s.id AND p.demand_revision=pr.revision)
              OR NOT EXISTS(SELECT 1 FROM site_installations j WHERE j.organization_id=org AND j.project_id=project AND j.site_id=s.id
                AND (NOT j.required OR j.status='completed') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(j.issues) issue WHERE issue->>'corrected_by' IS NULL))))
          OR EXISTS(SELECT 1 FROM trusted_packing_plans p JOIN planning_projects pr ON pr.id=p.project_id AND pr.organization_id=p.organization_id
            CROSS JOIN LATERAL jsonb_array_elements(p.snapshot->'packages') kit
            WHERE p.organization_id=org AND p.project_id=project AND p.demand_revision=pr.revision AND kit->>'kind'='kit'
              AND NOT EXISTS(SELECT 1 FROM trusted_dispatches d JOIN trusted_delivery_receipts ack ON ack.dispatch_id=d.id WHERE d.plan_id=p.id AND ack.roots ? (kit->>'id')))
          OR EXISTS(SELECT 1 FROM commitment_balances b JOIN commitment_accounts a ON a.id=b.account_id
            WHERE a.organization_id=org AND a.project_id=project AND b.held<>0 AND (
              a.dimension<>'material' OR EXISTS(SELECT 1 FROM commitment_claims cl WHERE cl.account_id=a.id AND cl.held>0 AND (
                NOT EXISTS(SELECT 1 FROM commitment_work_orders w WHERE w.output_claim=cl.id)
                OR cl.held<>(SELECT coalesce(sum(o.quantity),0) FROM commitment_work_orders w JOIN production_output_custody o ON o.order_id=w.order_id WHERE w.output_claim=cl.id)
                OR cl.held<>(SELECT coalesce(sum(pa.quantity),0) FROM commitment_work_orders w JOIN production_output_custody o ON o.order_id=w.order_id
                  JOIN trusted_packing_allocations pa ON pa.output_id=o.id WHERE w.output_claim=cl.id)))))
          OR EXISTS(SELECT 1 FROM project_stock_reservations WHERE organization_id=org AND project_id=project AND status='active')
          OR EXISTS(SELECT 1 FROM production_work_orders w WHERE w.organization_id=org AND w.project_id=project AND w.status NOT IN ('completed','cancelled')
            AND (NOT EXISTS(SELECT 1 FROM commitment_work_orders trusted WHERE trusted.order_id=w.id)
              OR coalesce((SELECT sum(o.quantity) FROM production_output_custody o WHERE o.order_id=w.id),0)<>w.planned_quantity))
      $$;
      CREATE FUNCTION commitment_d4_lifecycle_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE p trusted_packing_plans; j site_installations; receipt trusted_delivery_receipts;
      BEGIN
        IF TG_OP IN ('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'Preserve D4 lifecycle evidence' USING ERRCODE='23514'; END IF;
        IF TG_TABLE_NAME='trusted_installation_sources' THEN
          SELECT * INTO STRICT j FROM site_installations WHERE id=NEW.installation_id AND organization_id=NEW.organization_id;
          SELECT * INTO STRICT receipt FROM trusted_delivery_receipts WHERE id=NEW.receipt_id AND organization_id=NEW.organization_id;
          IF j.created_at IS DISTINCT FROM transaction_timestamp() OR j.revision<>1 THEN
            RAISE EXCEPTION 'Receipt provenance is frozen during installation creation' USING ERRCODE='23514'; END IF;
          IF NOT EXISTS(SELECT 1 FROM trusted_dispatches d JOIN trusted_packing_plans plan ON plan.id=d.plan_id
            WHERE d.id=receipt.dispatch_id AND plan.project_id=j.project_id AND plan.site_id=j.site_id AND plan.organization_id=j.organization_id) THEN
            RAISE EXCEPTION 'Installation receipt lineage mismatch' USING ERRCODE='23514'; END IF;
          RETURN NEW;
        END IF;
        PERFORM 1 FROM planning_projects WHERE id=NEW.project_id AND organization_id=NEW.organization_id AND archived_at IS NULL FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Current project required' USING ERRCODE='23514'; END IF;
        FOR p IN SELECT * FROM trusted_packing_plans WHERE organization_id=NEW.organization_id AND project_id=NEW.project_id
          AND demand_revision=(SELECT revision FROM planning_projects WHERE id=NEW.project_id AND organization_id=NEW.organization_id)
        LOOP PERFORM requirement_assert(p.organization_id,p.project_id,p.site_id,p.demand_revision,p.approval_id); END LOOP;
        IF TG_TABLE_NAME='site_installations' THEN
          IF TG_OP='INSERT' AND (NEW.status<>'pending' OR NEW.revision<>1 OR NEW.acceptance IS NOT NULL) THEN
            RAISE EXCEPTION 'Installation starts pending' USING ERRCODE='23514'; END IF;
          IF NOT EXISTS(SELECT 1 FROM trusted_delivery_receipts a JOIN trusted_dispatches d ON d.id=a.dispatch_id JOIN trusted_packing_plans plan ON plan.id=d.plan_id
            WHERE plan.organization_id=NEW.organization_id AND plan.project_id=NEW.project_id AND plan.site_id=NEW.site_id) THEN
            RAISE EXCEPTION 'Evidenced school delivery required' USING ERRCODE='23514'; END IF;
          IF TG_OP='UPDATE' AND (NEW.required IS DISTINCT FROM OLD.required OR
            (NEW.status='completed' AND OLD.status<>'installed')) THEN RAISE EXCEPTION 'Installation requirement immutable; distinct installer submission required' USING ERRCODE='23514'; END IF;
          IF NEW.status IN ('installed','completed') AND (
            EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.checklist) task WHERE (task->>'required')::boolean AND NOT (task->>'checked')::boolean)
            OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.issues) issue WHERE issue->>'corrected_by' IS NULL)
            OR EXISTS(SELECT 1 FROM trusted_packing_plans plan CROSS JOIN LATERAL jsonb_array_elements(plan.snapshot->'packages') kit
              WHERE plan.organization_id=NEW.organization_id AND plan.project_id=NEW.project_id AND plan.site_id=NEW.site_id AND kit->>'kind'='kit'
                AND plan.demand_revision=(SELECT revision FROM planning_projects WHERE id=NEW.project_id AND organization_id=NEW.organization_id)
                AND NOT EXISTS(SELECT 1 FROM trusted_dispatches d JOIN trusted_delivery_receipts ack ON ack.dispatch_id=d.id WHERE d.plan_id=plan.id AND ack.roots ? (kit->>'id')))) THEN
            RAISE EXCEPTION 'Installation needs complete receipt, checklist and corrected issues' USING ERRCODE='23514'; END IF;
        ELSE
          IF NEW.status<>'closed' OR NEW.exception IS NOT NULL OR requirement_d4_project_blocked(NEW.organization_id,NEW.project_id)
            OR NEW.project_revision<>(SELECT revision FROM planning_projects WHERE id=NEW.project_id AND organization_id=NEW.organization_id)
            OR coalesce(length(trim(NEW.acceptance->>'recipient')),0)=0 OR coalesce(length(trim(NEW.reason)),0)=0 THEN
            RAISE EXCEPTION 'Complete evidenced project and recipient acceptance required; exceptions and reopening blocked' USING ERRCODE='23514'; END IF;
        END IF;
        RETURN NEW;
      END; $$;
      CREATE FUNCTION commitment_d4_lifecycle_witness() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE row jsonb; actor uuid; record uuid; org uuid; kind text;
      BEGIN
        IF TG_TABLE_NAME='trusted_installation_sources' THEN
          SELECT to_jsonb(j)-'created_at'-'updated_at',j.updated_by,j.id,j.organization_id INTO row,actor,record,org FROM site_installations j WHERE j.id=NEW.installation_id;
          kind:='site_installations';
        ELSE row:=to_jsonb(NEW)-'created_at'-'updated_at'; actor:=NEW.updated_by; record:=NEW.id; org:=NEW.organization_id; kind:=TG_TABLE_NAME; END IF;
        IF NOT EXISTS(SELECT 1 FROM commitment_authorizations z JOIN audit_logs a ON a.organization_id=z.organization_id AND a.actor_id=z.actor_id
          AND a.entity_type='trusted_delivery' AND a.action=kind AND a.entity_id=record AND a."after"=row
          WHERE z.organization_id=org AND z.actor_id=actor AND z.result=row) THEN
          RAISE EXCEPTION 'Signed D4 lifecycle authority required' USING ERRCODE='23514'; END IF;
        IF TG_TABLE_NAME='site_installations' AND NOT EXISTS(SELECT 1 FROM trusted_installation_sources WHERE installation_id=record AND organization_id=org) THEN
          RAISE EXCEPTION 'Installation requires immutable delivery evidence links' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END; $$;`);
    for(const table of ['site_installations','project_completions'])await r.query(`DROP TRIGGER a_d3_execution ON ${table};
      CREATE TRIGGER a_d4_lifecycle BEFORE INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION commitment_d4_lifecycle_guard();
      CREATE TRIGGER d4_no_truncate BEFORE TRUNCATE ON ${table} FOR EACH STATEMENT EXECUTE FUNCTION commitment_immutable();
      CREATE CONSTRAINT TRIGGER d4_lifecycle_witness AFTER INSERT OR UPDATE ON ${table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_d4_lifecycle_witness();`);
    await r.query(`CREATE TRIGGER d4_source BEFORE INSERT ON trusted_installation_sources FOR EACH ROW EXECUTE FUNCTION commitment_d4_lifecycle_guard();
      CREATE CONSTRAINT TRIGGER d4_source_witness AFTER INSERT ON trusted_installation_sources DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_d4_lifecycle_witness();
      REVOKE ALL ON trusted_installation_sources FROM PUBLIC;
      REVOKE ALL ON FUNCTION requirement_d4_project_blocked(uuid,uuid),commitment_d4_lifecycle_guard(),commitment_d4_lifecycle_witness() FROM PUBLIC;`);
  }
  async down():Promise<void>{throw Error('Preserve lifecycle evidence; restore isolated backup');}
}
