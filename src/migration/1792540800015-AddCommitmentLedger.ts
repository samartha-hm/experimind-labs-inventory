import type { MigrationInterface, QueryRunner } from "typeorm";

/** Isolated accounting only. No operational trigger or writer references this ledger. */
export class AddCommitmentLedger1792540800015 implements MigrationInterface {
  name = "AddCommitmentLedger1792540800015";
  async up(r: QueryRunner): Promise<void> {
    await r.query(`
      CREATE TABLE commitment_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
        project_id uuid NOT NULL, site_id uuid NOT NULL, obligation text NOT NULL CHECK(length(obligation) BETWEEN 1 AND 200),
        dimension text NOT NULL CHECK(dimension IN ('material','slot')), item_key text NOT NULL,
        unit text NOT NULL CHECK(length(unit) BETWEEN 1 AND 40), selector jsonb NOT NULL,
        UNIQUE(id,organization_id), UNIQUE(organization_id,project_id,site_id,obligation),
        UNIQUE(organization_id,project_id,site_id,dimension,item_key,unit),
        FOREIGN KEY(project_id,organization_id) REFERENCES planning_projects(id,organization_id),
        CHECK(jsonb_typeof(selector)='object')
      );
      CREATE TABLE commitment_entitlements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, account_id uuid NOT NULL,
        approval_id uuid NOT NULL, revision int NOT NULL CHECK(revision>0),
        cap numeric NOT NULL CHECK(cap>=0 AND cap<=1000000000 AND scale(cap)<=6),
        provenance jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        UNIQUE(id,account_id,organization_id), UNIQUE(account_id,approval_id),
        FOREIGN KEY(account_id,organization_id) REFERENCES commitment_accounts(id,organization_id),
        FOREIGN KEY(approval_id,organization_id) REFERENCES requirement_approvals(id,organization_id)
      );
      CREATE TABLE commitment_balances (
        account_id uuid PRIMARY KEY, organization_id uuid NOT NULL, entitlement_id uuid,
        approved numeric NOT NULL DEFAULT 0, fulfilled numeric NOT NULL DEFAULT 0, held numeric NOT NULL DEFAULT 0,
        sequence bigint NOT NULL DEFAULT 0,
        FOREIGN KEY(account_id,organization_id) REFERENCES commitment_accounts(id,organization_id),
        FOREIGN KEY(entitlement_id,account_id,organization_id) REFERENCES commitment_entitlements(id,account_id,organization_id),
        CHECK(approved>=fulfilled+held AND fulfilled>=0 AND held>=0 AND approved<=1000000000),
        CHECK(scale(approved)<=6 AND scale(fulfilled)<=6 AND scale(held)<=6)
      );
      CREATE TABLE commitment_claims (
        id uuid PRIMARY KEY, organization_id uuid NOT NULL, account_id uuid NOT NULL, root_id uuid NOT NULL,
        parent_id uuid, source_kind text NOT NULL CHECK(source_kind ~ '^synthetic:[a-z_]+$'),
        source_id text NOT NULL CHECK(length(source_id) BETWEEN 1 AND 200),
        source_slice text NOT NULL CHECK(length(source_slice) BETWEEN 1 AND 200),
        quantity numeric NOT NULL CHECK(quantity>0 AND quantity<=1000000000 AND scale(quantity)<=6),
        held numeric NOT NULL CHECK(held>=0), fulfilled numeric NOT NULL DEFAULT 0 CHECK(fulfilled>=0),
        released numeric NOT NULL DEFAULT 0 CHECK(released>=0), retired boolean NOT NULL DEFAULT false,
        UNIQUE(id,account_id,organization_id), UNIQUE(organization_id,source_kind,source_id,source_slice),
        FOREIGN KEY(account_id,organization_id) REFERENCES commitment_accounts(id,organization_id),
        FOREIGN KEY(root_id,account_id,organization_id) REFERENCES commitment_claims(id,account_id,organization_id) DEFERRABLE INITIALLY DEFERRED,
        FOREIGN KEY(parent_id,account_id,organization_id) REFERENCES commitment_claims(id,account_id,organization_id),
        CHECK((NOT retired AND quantity=held+fulfilled+released) OR (retired AND held=0 AND fulfilled=0 AND released=0))
      );
      CREATE TABLE commitment_sources (
        organization_id uuid NOT NULL, kind text NOT NULL CHECK(kind ~ '^synthetic:[a-z_]+$'),
        source_id text NOT NULL CHECK(length(trim(source_id)) BETWEEN 1 AND 200),
        slice text NOT NULL CHECK(length(trim(slice)) BETWEEN 1 AND 200), claim_id uuid NOT NULL, account_id uuid NOT NULL,
        PRIMARY KEY(organization_id,kind,source_id,slice),
        FOREIGN KEY(claim_id,account_id,organization_id) REFERENCES commitment_claims(id,account_id,organization_id)
      );
      CREATE FUNCTION commitment_source_insert() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO commitment_sources(organization_id,kind,source_id,slice,claim_id,account_id)
          VALUES(NEW.organization_id,NEW.source_kind,NEW.source_id,NEW.source_slice,NEW.id,NEW.account_id);
        RETURN NEW;
      END $$;
      CREATE TRIGGER commitment_source_insert AFTER INSERT OR UPDATE OF source_kind,source_id,source_slice ON commitment_claims
        FOR EACH ROW EXECUTE FUNCTION commitment_source_insert();
      CREATE TABLE commitment_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, account_id uuid NOT NULL,
        entitlement_id uuid NOT NULL, actor_id uuid NOT NULL, key varchar(100) NOT NULL CHECK(length(trim(key))>0),
        kind text NOT NULL CHECK(kind IN ('authorize','open','transfer','consume','release','split')),
        payload jsonb NOT NULL, reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000),
        sequence bigint NOT NULL, approved_after numeric NOT NULL, fulfilled_after numeric NOT NULL, held_after numeric NOT NULL,
        created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        UNIQUE(organization_id,actor_id,key), UNIQUE(account_id,sequence),
        FOREIGN KEY(entitlement_id,account_id,organization_id) REFERENCES commitment_entitlements(id,account_id,organization_id),
        CHECK(jsonb_typeof(payload)='object')
      );
      CREATE TABLE commitment_reconciliation_cases (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, account_id uuid NOT NULL,
        source_hash varchar(64) NOT NULL CHECK(source_hash ~ '^[0-9a-f]{64}$'), evidence jsonb NOT NULL,
        active boolean NOT NULL DEFAULT false CHECK(NOT active), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        FOREIGN KEY(account_id,organization_id) REFERENCES commitment_accounts(id,organization_id)
      );
      CREATE FUNCTION commitment_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Commitment evidence immutable' USING ERRCODE='23514'; END $$;
      CREATE FUNCTION commitment_quantity(value jsonb) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
      BEGIN
        IF jsonb_typeof(value) IS DISTINCT FROM 'string' OR (value #>> '{}') !~ '^[0-9]{1,10}([.][0-9]{1,6})?$' THEN
          RAISE EXCEPTION 'Canonical six-place quantity string required'; END IF;
        IF (value #>> '{}')::numeric>1000000000 THEN RAISE EXCEPTION 'Planning range exceeded'; END IF;
        RETURN (value #>> '{}')::numeric;
      END $$;
      CREATE FUNCTION commitment_projection_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF pg_trigger_depth()<2 THEN RAISE EXCEPTION 'Projection writes require an immutable event' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END $$;
      CREATE FUNCTION commitment_account_insert() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NOT EXISTS(SELECT 1 FROM planning_sites WHERE id=NEW.site_id AND project_id=NEW.project_id AND organization_id=NEW.organization_id) THEN
          RAISE EXCEPTION 'Tenant school identity mismatch' USING ERRCODE='23514'; END IF;
        IF NEW.dimension='material' AND (NEW.selector <> jsonb_build_object('item',NEW.item_key) OR NEW.unit='slots') THEN
          RAISE EXCEPTION 'Canonical material selector required' USING ERRCODE='23514'; END IF;
        IF NEW.dimension='slot' AND (NEW.unit<>'slots' OR NEW.item_key<>NEW.selector::text OR
          NOT (NEW.selector ? 'selection') OR (NEW.selector ? 'grade')=(NEW.selector ? 'crate') OR
          jsonb_typeof(NEW.selector->'selection') IS DISTINCT FROM 'string' OR
          jsonb_typeof(coalesce(NEW.selector->'grade',NEW.selector->'crate')) IS DISTINCT FROM 'string' OR
          (NEW.selector - 'selection' - 'grade' - 'crate')<>'{}'::jsonb) THEN
          RAISE EXCEPTION 'Exact selection and grade/crate slot selector required' USING ERRCODE='23514'; END IF;
        INSERT INTO commitment_balances(account_id,organization_id) VALUES(NEW.id,NEW.organization_id);
        RETURN NEW;
      END $$;
      CREATE TRIGGER commitment_account_insert AFTER INSERT ON commitment_accounts FOR EACH ROW EXECUTE FUNCTION commitment_account_insert();
      CREATE FUNCTION commitment_entitlement_insert() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE a commitment_accounts; approval requirement_approvals; expected numeric; proof jsonb;
      BEGIN
        SELECT * INTO STRICT a FROM commitment_accounts WHERE id=NEW.account_id AND organization_id=NEW.organization_id;
        SELECT * INTO STRICT approval FROM requirement_approvals WHERE id=NEW.approval_id AND organization_id=NEW.organization_id;
        IF approval.project_id<>a.project_id OR approval.revision<>NEW.revision OR NOT EXISTS(
          SELECT 1 FROM jsonb_array_elements(approval.snapshot->'content'->'sites') s WHERE s->>'id'=a.site_id::text) THEN
          RAISE EXCEPTION 'Exact approved revision and school required' USING ERRCODE='23514'; END IF;
        IF a.dimension='material' THEN
          SELECT sum((l->>'quantity')::numeric),jsonb_agg(l ORDER BY l::text) INTO expected,proof
          FROM jsonb_array_elements(approval.snapshot->'lines') l
          WHERE l->>'site_id'=a.site_id::text AND l->>'inventory_item_id'=a.item_key AND l->>'unit'=a.unit AND l ? 'material_id';
        ELSIF a.selector ? 'grade' THEN
          SELECT (s->'context'->'grade_quantities'->>(a.selector->>'grade'))::numeric,s INTO expected,proof
          FROM jsonb_array_elements(approval.snapshot->'content'->'sites') site,
            LATERAL jsonb_array_elements(site->'selections') s
          WHERE site->>'id'=a.site_id::text AND s->>'id'=a.selector->>'selection';
        ELSE
          SELECT (l->>'quantity')::numeric,l INTO expected,proof FROM jsonb_array_elements(approval.snapshot->'lines') l
          WHERE l->>'site_id'=a.site_id::text AND l->>'selection_id'=a.selector->>'selection'
            AND l->>'owner_id'=a.selector->>'crate' AND NOT l ? 'material_id' AND l->>'source'='crate';
        END IF;
        IF expected IS NULL OR NEW.cap<>expected OR NEW.provenance<>proof OR
          (a.dimension='slot' AND trunc(NEW.cap)<>NEW.cap) THEN
          RAISE EXCEPTION 'Entitlement must equal frozen approved demand and provenance' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER commitment_entitlement_insert BEFORE INSERT ON commitment_entitlements FOR EACH ROW EXECUTE FUNCTION commitment_entitlement_insert();
      CREATE FUNCTION commitment_apply() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE a commitment_accounts; e commitment_entitlements; b commitment_balances; c commitment_claims;
        q numeric; child jsonb; total numeric:=0; child_id uuid; p jsonb; claim_id uuid;
      BEGIN
        SELECT * INTO STRICT a FROM commitment_accounts WHERE id=NEW.account_id AND organization_id=NEW.organization_id;
        -- Same order as existing execution: actor, project, account balance, claim.
        PERFORM 1 FROM users WHERE id=NEW.actor_id AND organization_id=NEW.organization_id AND is_active AND role IN ('admin','super_admin') FOR SHARE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Active tenant administrator required' USING ERRCODE='23514'; END IF;
        SELECT * INTO STRICT e FROM commitment_entitlements WHERE id=NEW.entitlement_id AND account_id=a.id AND organization_id=a.organization_id;
        PERFORM requirement_assert(a.organization_id,a.project_id,a.site_id,e.revision,e.approval_id);
        SELECT * INTO STRICT b FROM commitment_balances WHERE account_id=a.id AND organization_id=a.organization_id FOR UPDATE;
        p:=NEW.payload;
        IF NEW.kind='authorize' THEN
          IF p<>'{}'::jsonb OR e.cap<b.fulfilled+b.held OR (b.entitlement_id IS NOT NULL AND
            e.revision <= (SELECT revision FROM commitment_entitlements WHERE id=b.entitlement_id)) THEN
            RAISE EXCEPTION 'Total-to-date revision cap cannot reset or underfund commitments' USING ERRCODE='23514'; END IF;
          b.approved:=e.cap; b.entitlement_id:=e.id;
        ELSE
          IF b.entitlement_id IS DISTINCT FROM e.id THEN RAISE EXCEPTION 'Current ledger entitlement required' USING ERRCODE='23514'; END IF;
          IF NEW.kind='open' THEN
            IF p - 'claim' - 'quantity' - 'source'<>'{}'::jsonb THEN RAISE EXCEPTION 'Unknown open fields'; END IF;
            q:=commitment_quantity(p->'quantity'); claim_id:=(p->>'claim')::uuid;
            IF q IS NULL OR q<=0 OR scale(q)>6 OR q>b.approved-b.fulfilled-b.held THEN RAISE EXCEPTION 'Insufficient approved demand' USING ERRCODE='23514'; END IF;
            IF a.dimension='slot' AND trunc(q)<>q THEN RAISE EXCEPTION 'Whole slots required'; END IF;
            INSERT INTO commitment_claims(id,organization_id,account_id,root_id,source_kind,source_id,source_slice,quantity,held)
              VALUES(claim_id,a.organization_id,a.id,claim_id,p->'source'->>'kind',p->'source'->>'id',p->'source'->>'slice',q,q);
            b.held:=b.held+q;
          ELSE
            SELECT * INTO STRICT c FROM commitment_claims WHERE id=(p->>'claim')::uuid AND account_id=a.id AND organization_id=a.organization_id FOR UPDATE;
            IF c.retired THEN RAISE EXCEPTION 'Slice already retired'; END IF;
            IF NEW.kind='transfer' THEN
              IF p - 'claim' - 'source'<>'{}'::jsonb OR c.held<=0 THEN RAISE EXCEPTION 'Live slice required'; END IF;
              -- Keep the old identity occupied forever: no subsequent allocation can reuse it.
              IF EXISTS(SELECT 1 FROM commitment_events ev WHERE ev.organization_id=a.organization_id AND
                ev.payload->'source'=p->'source') THEN RAISE EXCEPTION 'Source identity already claimed' USING ERRCODE='23505'; END IF;
              UPDATE commitment_claims SET source_kind=p->'source'->>'kind',source_id=p->'source'->>'id',source_slice=p->'source'->>'slice' WHERE id=c.id;
            ELSIF NEW.kind='split' THEN
              IF p - 'claim' - 'children'<>'{}'::jsonb OR c.fulfilled<>0 OR c.released<>0 OR jsonb_array_length(p->'children')<2 THEN
                RAISE EXCEPTION 'Split requires an untouched live slice and disjoint children'; END IF;
              FOR child IN SELECT value FROM jsonb_array_elements(p->'children') LOOP
                q:=commitment_quantity(child->'quantity'); child_id:=(child->>'claim')::uuid;
                IF child - 'claim' - 'quantity' - 'source'<>'{}'::jsonb OR q IS NULL OR q<=0 OR scale(q)>6 OR
                  (a.dimension='slot' AND trunc(q)<>q) THEN RAISE EXCEPTION 'Invalid child slice'; END IF;
                INSERT INTO commitment_claims(id,organization_id,account_id,root_id,parent_id,source_kind,source_id,source_slice,quantity,held)
                  VALUES(child_id,a.organization_id,a.id,c.root_id,c.id,child->'source'->>'kind',child->'source'->>'id',child->'source'->>'slice',q,q);
                total:=total+q;
              END LOOP;
              IF total<>c.held THEN RAISE EXCEPTION 'Children must partition the entire parent; include explicit remainder'; END IF;
              UPDATE commitment_claims SET held=0,retired=true WHERE id=c.id;
            ELSE
              q:=commitment_quantity(p->'quantity');
              IF p - 'claim' - 'quantity' - 'untouched' - 'unencumbered' - 'evidence'<>'{}'::jsonb OR
                q IS NULL OR q<=0 OR scale(q)>6 OR q>c.held OR (a.dimension='slot' AND trunc(q)<>q) THEN
                RAISE EXCEPTION 'Quantity exceeds eligible held slice'; END IF;
              IF a.dimension='material' AND NEW.kind='consume' AND (q*10000<>trunc(q*10000) OR q>99999999.9999) THEN
                RAISE EXCEPTION 'Consumption must be exactly representable in stock'; END IF;
              IF NEW.kind='release' AND (p->'untouched' IS DISTINCT FROM 'true'::jsonb OR p->'unencumbered' IS DISTINCT FROM 'true'::jsonb OR
                coalesce(length(trim(p->>'evidence')),0)=0) THEN RAISE EXCEPTION 'Proof of untouched unencumbered remainder required'; END IF;
              UPDATE commitment_claims SET held=held-q,fulfilled=fulfilled+CASE WHEN NEW.kind='consume' THEN q ELSE 0 END,
                released=released+CASE WHEN NEW.kind='release' THEN q ELSE 0 END WHERE id=c.id;
              b.held:=b.held-q;
              IF NEW.kind='consume' THEN b.fulfilled:=b.fulfilled+q; END IF;
            END IF;
          END IF;
        END IF;
        NEW.sequence:=b.sequence+1; NEW.approved_after:=b.approved; NEW.fulfilled_after:=b.fulfilled; NEW.held_after:=b.held;
        UPDATE commitment_balances SET entitlement_id=b.entitlement_id,approved=b.approved,fulfilled=b.fulfilled,held=b.held,sequence=NEW.sequence WHERE account_id=a.id;
        RETURN NEW;
      END $$;
      CREATE TRIGGER commitment_apply BEFORE INSERT ON commitment_events FOR EACH ROW EXECUTE FUNCTION commitment_apply();
    `);
    for (const table of ["accounts", "entitlements", "sources", "events", "reconciliation_cases"]) {
      await r.query(`CREATE TRIGGER commitment_${table}_immutable BEFORE UPDATE OR DELETE ON commitment_${table}
        FOR EACH ROW EXECUTE FUNCTION commitment_immutable()`);
    }
    for (const table of ["balances", "claims", "sources"]) {
      await r.query(`CREATE TRIGGER commitment_${table}_projection BEFORE INSERT OR UPDATE OR DELETE ON commitment_${table}
        FOR EACH ROW EXECUTE FUNCTION commitment_projection_guard()`);
    }
    // TRUNCATE bypasses row triggers; explicitly forbid it, including cascade.
    for (const table of ["accounts", "entitlements", "balances", "claims", "sources", "events", "reconciliation_cases"]) {
      await r.query(`CREATE TRIGGER commitment_${table}_truncate BEFORE TRUNCATE ON commitment_${table}
        FOR EACH STATEMENT EXECUTE FUNCTION commitment_immutable()`);
    }
  }
  async down(r: QueryRunner): Promise<void> {
    // Lock every ledger table before checking; rollback is permitted only if all are empty.
    await r.query(`LOCK TABLE commitment_accounts,commitment_entitlements,commitment_balances,commitment_claims,commitment_sources,commitment_events,commitment_reconciliation_cases IN ACCESS EXCLUSIVE MODE`);
    for (const table of ["accounts", "entitlements", "balances", "claims", "sources", "events", "reconciliation_cases"]) {
      if ((await r.query(`SELECT 1 FROM commitment_${table} LIMIT 1`)).length) throw new Error("Preserve commitment evidence; use forward recovery");
    }
    await r.query(`DROP TABLE commitment_events,commitment_reconciliation_cases,commitment_sources,commitment_claims,commitment_balances,commitment_entitlements,commitment_accounts;
      DROP FUNCTION commitment_apply(),commitment_entitlement_insert(),commitment_account_insert(),commitment_source_insert(),commitment_projection_guard(),commitment_immutable(),commitment_quantity(jsonb)`);
  }
}
