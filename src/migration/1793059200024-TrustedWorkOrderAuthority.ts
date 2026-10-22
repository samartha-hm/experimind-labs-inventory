import type { MigrationInterface, QueryRunner } from "typeorm";

/** Explicit synthetic activation; historical work orders acquire no inferred authority. */
export class TrustedWorkOrderAuthority1793059200024 implements MigrationInterface {
  name = "TrustedWorkOrderAuthority1793059200024";
  async up(r: QueryRunner): Promise<void> {
    const [scope] = await r.query("SELECT current_database() db,current_schema() schema");
    if (scope.db !== "experimind_kitbuilder_test" || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))
      throw Error("Work-order activation restricted to isolated synthetic requirement_test schema");
    const replace = async (fn: string, from: string, to: string) => {
      const [{ definition }] = await r.query("SELECT pg_get_functiondef(to_regprocedure($1)) definition",[`${fn}()`]);
      if (!definition?.includes(from)) throw Error(`Unexpected prerequisite function ${fn}`);
      await r.query(definition.replace(from,to));
    };
    await r.query(`LOCK TABLE production_work_orders,production_input_reservations,production_input_issues IN ACCESS EXCLUSIVE MODE;
      ALTER TABLE commitment_claims ADD UNIQUE(id,organization_id);
      ALTER TABLE commitment_entitlements ADD UNIQUE(id,organization_id);
      ALTER TABLE commitment_events ADD UNIQUE(id,organization_id);
      CREATE TABLE commitment_work_orders(
        order_id uuid PRIMARY KEY,organization_id uuid NOT NULL,source_id uuid NOT NULL,output_claim uuid NOT NULL UNIQUE,
        approval_id uuid NOT NULL,demand_line jsonb NOT NULL,actor_id uuid NOT NULL,operation_key varchar(100) NOT NULL,
        UNIQUE(order_id,organization_id),UNIQUE(organization_id,source_id),
        FOREIGN KEY(order_id,organization_id) REFERENCES production_work_orders(id,organization_id),
        FOREIGN KEY(output_claim,organization_id) REFERENCES commitment_claims(id,organization_id),
        FOREIGN KEY(approval_id,organization_id) REFERENCES requirement_approvals(id,organization_id));
      CREATE TABLE commitment_work_order_materials(
        id uuid PRIMARY KEY,organization_id uuid NOT NULL,order_id uuid NOT NULL,item_id uuid NOT NULL REFERENCES inventory_items(id),
        account_id uuid NOT NULL UNIQUE,entitlement_id uuid NOT NULL UNIQUE,claim_id uuid NOT NULL UNIQUE,reservation_id uuid NOT NULL UNIQUE,
        UNIQUE(id,organization_id),UNIQUE(order_id,item_id),
        FOREIGN KEY(order_id,organization_id) REFERENCES commitment_work_orders(order_id,organization_id),
        FOREIGN KEY(account_id,organization_id) REFERENCES commitment_accounts(id,organization_id),
        FOREIGN KEY(entitlement_id,organization_id) REFERENCES commitment_entitlements(id,organization_id),
        FOREIGN KEY(claim_id,organization_id) REFERENCES commitment_claims(id,organization_id),
        FOREIGN KEY(reservation_id,organization_id) REFERENCES production_input_reservations(id,organization_id));
      CREATE TABLE commitment_work_order_issues(
        issue_id uuid PRIMARY KEY,organization_id uuid NOT NULL,material_id uuid NOT NULL,source_id uuid NOT NULL,
        event_id uuid NOT NULL UNIQUE,actor_id uuid NOT NULL,operation_key varchar(100) NOT NULL,
        UNIQUE(organization_id,source_id),
        FOREIGN KEY(issue_id,organization_id) REFERENCES production_input_issues(id,organization_id),
        FOREIGN KEY(material_id,organization_id) REFERENCES commitment_work_order_materials(id,organization_id),
        FOREIGN KEY(event_id,organization_id) REFERENCES commitment_events(id,organization_id));
      ALTER TABLE commitment_accounts DROP CONSTRAINT commitment_accounts_dimension_check;
      ALTER TABLE commitment_accounts ADD CHECK(dimension IN ('material','slot','recipe_material'));
      ALTER TABLE production_input_reservations DROP CONSTRAINT production_input_reservations_status_check;
      ALTER TABLE production_input_reservations ADD CHECK(status IN ('active','consumed','released','budgeted'));`);
    await replace("guard_production_records","OLD.status<>'active'","OLD.status NOT IN ('active','budgeted')");
    await replace("commitment_apply","a.dimension='material' AND NEW.kind='consume'","a.dimension IN ('material','recipe_material') AND NEW.kind='consume'");
    await replace("commitment_entitlement_insert","IF a.dimension='material' THEN",`IF a.dimension='recipe_material' THEN
          SELECT (x->>'canonical_quantity')::numeric*w.planned_quantity/(w.recipe_snapshot->>'yield_quantity')::numeric
              *(1+(x->>'scrap_percent')::numeric/100),
            jsonb_build_object('order',w.id,'outputClaim',c.output_claim,'recipe',w.recipe_id,'item',x->>'item_id',
              'quantity',to_char(
                (x->>'canonical_quantity')::numeric*w.planned_quantity/(w.recipe_snapshot->>'yield_quantity')::numeric
                *(1+(x->>'scrap_percent')::numeric/100),'FM99999999.0000'), 'unit',a.unit,'conversion','1')
            INTO expected,proof
          FROM production_work_orders w JOIN commitment_work_orders c ON c.order_id=w.id,
            LATERAL jsonb_array_elements(w.recipe_snapshot->'inputs') x
          WHERE w.id::text=a.selector->>'workOrder' AND w.organization_id=a.organization_id
            AND w.project_id=a.project_id AND w.site_id=a.site_id AND c.approval_id=NEW.approval_id
            AND x->>'item_id'=a.selector->>'item' AND x->>'unit'=a.unit
            AND a.item_key=w.id::text||'/'||(x->>'item_id')
            AND a.selector=jsonb_build_object('item',x->>'item_id','workOrder',w.id);
          IF expected*10000<>trunc(expected*10000) THEN RAISE EXCEPTION 'Inexact physical allowance'; END IF;
        ELSIF a.dimension='material' THEN`);
    for (const table of ["production_work_orders","production_input_reservations","production_input_issues"]) {
      await r.query(`DROP TRIGGER a_d3_execution ON ${table};
        CREATE TRIGGER a_d3_execution BEFORE ${table==='production_input_issues'?'UPDATE OR ':''}DELETE OR TRUNCATE ON ${table}
          FOR EACH STATEMENT EXECUTE FUNCTION guard_d3_execution()`);
    }
    try { await r.query(`CREATE OR REPLACE FUNCTION guard_d3_stock() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.production_qc_id IS NOT NULL OR NEW.packing_pick_id IS NOT NULL OR NEW.transaction_type='KIT_PRODUCTION'
        OR (NEW.transaction_type='KIT_CONSUMPTION' AND NEW.production_issue_id IS NULL)
        OR (NEW.production_issue_id IS NOT NULL AND (NEW.transaction_type<>'KIT_CONSUMPTION' OR NOT EXISTS(
          SELECT 1 FROM production_input_issues i JOIN commitment_work_orders w ON w.order_id=i.order_id
          WHERE i.id=NEW.production_issue_id AND i.organization_id=NEW.organization_id))) THEN
        RAISE EXCEPTION 'Trusted material issue required; output and packing remain blocked' USING ERRCODE='23514'; END IF;
      RETURN NEW; END; $$;
      CREATE FUNCTION commitment_work_order_check(oid uuid) RETURNS void LANGUAGE plpgsql AS $$
      DECLARE w production_work_orders; c commitment_work_orders; a commitment_accounts; cl commitment_claims;
        e commitment_entitlements; mat record; issued numeric; n integer;
      BEGIN
        SELECT * INTO STRICT w FROM production_work_orders WHERE id=oid;
        SELECT * INTO STRICT c FROM commitment_work_orders WHERE order_id=oid AND organization_id=w.organization_id;
        SELECT * INTO STRICT cl FROM commitment_claims WHERE id=c.output_claim AND organization_id=w.organization_id;
        SELECT * INTO STRICT a FROM commitment_accounts WHERE id=cl.account_id AND organization_id=w.organization_id;
        IF w.status<>'in_progress' OR w.created_by<>c.actor_id OR w.released_by<>c.actor_id
          OR w.demand_revision<>(SELECT revision FROM requirement_approvals WHERE id=c.approval_id)
          OR a.dimension<>'material' OR a.project_id<>w.project_id OR a.site_id<>w.site_id
          OR a.item_key<>w.output_item_id::text OR a.unit<>w.unit
          OR w.recipe_snapshot->>'output_item_id'<>w.output_item_id::text OR w.recipe_snapshot->>'unit'<>w.unit
          OR cl.held<>w.planned_quantity OR cl.fulfilled<>0 OR cl.released<>0
          OR NOT EXISTS(SELECT 1 FROM commitment_sources s WHERE s.claim_id=cl.id AND s.kind='synthetic:work_order_output'
            AND s.source_id=oid::text AND s.slice='output')
          OR NOT EXISTS(SELECT 1 FROM production_recipes p WHERE p.id=w.recipe_id AND p.organization_id=w.organization_id
            AND p.authority_key IS NOT NULL AND p.status='approved' AND p.definition=w.recipe_snapshot)
          OR NOT EXISTS(SELECT 1 FROM requirement_approvals ap,LATERAL jsonb_array_elements(ap.snapshot->'lines') l
            WHERE ap.id=c.approval_id AND ap.organization_id=w.organization_id AND ap.project_id=w.project_id
              AND l=c.demand_line AND l->>'inventory_item_id'=w.output_item_id::text AND l->>'site_id'=w.site_id::text AND l->>'unit'=w.unit)
          OR NOT EXISTS(SELECT 1 FROM commitment_authorizations z JOIN audit_logs au ON au.organization_id=z.organization_id
            AND au.actor_id=z.actor_id AND au.entity_id=oid AND au.action='WORK_ORDER_CLAIM'
            AND au.entity_type='trusted_production' AND au."after"=z.result
            WHERE z.organization_id=w.organization_id AND z.actor_id=c.actor_id AND z.operation_key=c.operation_key AND z.result->>'id'=oid::text)
        THEN RAISE EXCEPTION 'Exclusive work-order authority evidence mismatch' USING ERRCODE='23514'; END IF;
        SELECT count(*) INTO n FROM commitment_work_order_materials WHERE order_id=oid;
        IF n<>jsonb_array_length(w.inputs) OR n<>jsonb_array_length(w.recipe_snapshot->'inputs') THEN
          RAISE EXCEPTION 'Complete frozen recipe budget required' USING ERRCODE='23514'; END IF;
        FOR mat IN SELECT x.*,r.quantity remaining,r.unit reservation_unit,r.status reservation_status,r.line_id,
          r.item_id reservation_item,r.order_id reservation_order
          FROM commitment_work_order_materials x JOIN production_input_reservations r ON r.id=x.reservation_id WHERE x.order_id=oid LOOP
          SELECT * INTO STRICT a FROM commitment_accounts WHERE id=mat.account_id;
          SELECT * INTO STRICT cl FROM commitment_claims WHERE id=mat.claim_id;
          SELECT * INTO STRICT e FROM commitment_entitlements WHERE id=mat.entitlement_id;
          SELECT coalesce(sum(i.quantity),0) INTO issued FROM production_input_issues i WHERE i.reservation_id=mat.reservation_id;
          IF a.dimension<>'recipe_material' OR a.project_id<>w.project_id OR a.site_id<>w.site_id
            OR a.organization_id<>w.organization_id OR a.selector<>jsonb_build_object('item',mat.item_id,'workOrder',oid)
            OR a.item_key<>oid::text||'/'||mat.item_id::text OR a.unit<>mat.reservation_unit OR e.account_id<>a.id
            OR e.approval_id<>c.approval_id OR cl.account_id<>a.id OR cl.held+cl.fulfilled<>e.cap
            OR cl.fulfilled<>issued OR cl.held<>mat.remaining OR cl.released<>0
            OR mat.reservation_item<>mat.item_id OR mat.reservation_order<>oid
            OR NOT ((mat.remaining=0 AND mat.reservation_status='consumed') OR
              (mat.remaining<>0 AND mat.reservation_status='budgeted'))
            OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(w.inputs) x WHERE x->>'id'=mat.line_id::text
              AND x->>'item_id'=mat.item_id::text AND (x->>'planned_quantity')::numeric=e.cap AND x->>'unit'=a.unit)
            OR NOT EXISTS(SELECT 1 FROM commitment_sources s WHERE s.claim_id=cl.id AND s.kind='synthetic:work_order_material'
              AND s.source_id=oid::text AND s.slice=mat.item_id::text)
          THEN RAISE EXCEPTION 'Recipe material conservation mismatch' USING ERRCODE='23514'; END IF;
        END LOOP;
        IF EXISTS(SELECT 1 FROM production_input_issues i
          LEFT JOIN commitment_work_order_issues x ON x.issue_id=i.id
          LEFT JOIN commitment_work_order_materials wm ON wm.id=x.material_id
          LEFT JOIN commitment_events ev ON ev.id=x.event_id
          LEFT JOIN stock_ledger s ON s.id=i.ledger_id
          LEFT JOIN commitment_authorizations z ON z.organization_id=x.organization_id AND z.actor_id=x.actor_id AND z.operation_key=x.operation_key
          LEFT JOIN audit_logs au ON au.organization_id=x.organization_id AND au.actor_id=x.actor_id AND au.entity_id=i.id
            AND au.action='MATERIAL_ISSUE' AND au.entity_type='trusted_production' AND au."after"=z.result
          WHERE i.order_id=oid AND (x.issue_id IS NULL OR wm.order_id IS DISTINCT FROM oid
            OR wm.reservation_id IS DISTINCT FROM i.reservation_id OR i.scrap_quantity<>0 OR x.actor_id<>i.issued_by
            OR ev.account_id IS DISTINCT FROM wm.account_id OR ev.entitlement_id IS DISTINCT FROM wm.entitlement_id
            OR ev.kind IS DISTINCT FROM 'consume' OR ev.actor_id IS DISTINCT FROM i.issued_by
            OR ev.payload IS DISTINCT FROM jsonb_build_object('claim',wm.claim_id,'quantity',z.result->>'quantity')
            OR s.production_issue_id IS DISTINCT FROM i.id OR s.qty_delta IS DISTINCT FROM -i.quantity
            OR s.item_id IS DISTINCT FROM i.item_id OR s.organization_id IS DISTINCT FROM i.organization_id
            OR s.actor_id IS DISTINCT FROM i.issued_by OR s.verified_unit IS DISTINCT FROM i.unit
            OR s.physical_location IS DISTINCT FROM i.location OR au.id IS NULL
            OR z.result IS DISTINCT FROM jsonb_build_object('id',i.id,'order',oid,'ledger',i.ledger_id,'event',ev.id,
              'quantity',to_char(i.quantity,'FM99999990.0000')))) THEN
          RAISE EXCEPTION 'Atomic stock, consumption, audit and authorization evidence required' USING ERRCODE='23514'; END IF;
      END; $$;
      CREATE FUNCTION commitment_work_order_witness() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE oid uuid; j jsonb:=to_jsonb(NEW); BEGIN
        IF TG_TABLE_NAME IN ('commitment_work_orders','commitment_work_order_materials','production_input_reservations','production_input_issues') THEN
          PERFORM commitment_work_order_check((j->>'order_id')::uuid);
        ELSIF TG_TABLE_NAME='production_work_orders' THEN PERFORM commitment_work_order_check(NEW.id);
        ELSIF TG_TABLE_NAME='commitment_work_order_issues' THEN
          PERFORM commitment_work_order_check((SELECT order_id FROM commitment_work_order_materials WHERE id=NEW.material_id));
        ELSIF TG_TABLE_NAME='commitment_events' THEN
          FOR oid IN SELECT order_id FROM commitment_work_orders WHERE output_claim IN (SELECT id FROM commitment_claims WHERE account_id=NEW.account_id)
            UNION SELECT order_id FROM commitment_work_order_materials WHERE account_id=NEW.account_id LOOP
            PERFORM commitment_work_order_check(oid); END LOOP;
        END IF; RETURN NEW; END; $$;`); }
    catch (error) {
      const failed = error as { query?: string; driverError?: { position?: string; message?: string; detail?: string; where?: string } };
      const dbError = failed.driverError, position = Number(dbError?.position ?? 0);
      const context = failed.query?.slice(Math.max(0, position - 100), position + 100).replaceAll("\n", " ");
      throw new Error(`D3 witness SQL error at ${dbError?.position ?? "?"}: ${dbError?.message ?? "unknown"}; ${context ?? ""}`);
    }
    for (const table of ["commitment_work_orders","commitment_work_order_materials","commitment_work_order_issues"]) {
      await r.query(`CREATE TRIGGER immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON ${table} FOR EACH STATEMENT EXECUTE FUNCTION commitment_immutable()`);
    }
    for (const table of ["commitment_work_orders","commitment_work_order_materials","commitment_work_order_issues","production_work_orders","production_input_reservations","production_input_issues","commitment_events"])
      await r.query(`CREATE CONSTRAINT TRIGGER d3_work_order_evidence AFTER INSERT OR UPDATE ON ${table}
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_work_order_witness()`);
    await r.query(`CREATE FUNCTION commitment_production_audit_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'Preserve production audit evidence' USING ERRCODE='23514'; END IF;
      IF OLD.entity_type='trusted_production' OR (TG_OP='UPDATE' AND NEW.entity_type='trusted_production') THEN
        RAISE EXCEPTION 'Immutable production audit evidence' USING ERRCODE='23514'; END IF;
      IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $$;
      CREATE TRIGGER immutable_production_audit BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION commitment_production_audit_guard();
      CREATE TRIGGER immutable_production_audit_truncate BEFORE TRUNCATE ON audit_logs FOR EACH STATEMENT EXECUTE FUNCTION commitment_production_audit_guard()`);
    for (const fn of ["guard_d3_stock()","commitment_work_order_check(uuid)","commitment_work_order_witness()","commitment_production_audit_guard()"])
      await r.query(`ALTER FUNCTION ${fn} SET search_path TO pg_catalog,"${scope.schema}",pg_temp; REVOKE ALL ON FUNCTION ${fn} FROM PUBLIC`);
  }
  async down(): Promise<void> { throw Error("Preserve work-order and issue authority; reviewed forward migration required"); }
}
