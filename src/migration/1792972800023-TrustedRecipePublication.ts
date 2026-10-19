import type { MigrationInterface, QueryRunner } from "typeorm";

/** Synthetic forward activation only. Historical versions remain untrusted and untouched. */
export class TrustedRecipePublication1792972800023 implements MigrationInterface {
  name = "TrustedRecipePublication1792972800023";
  async up(r: QueryRunner): Promise<void> {
    const [scope] = await r.query("SELECT current_database() db,current_schema() schema");
    if (scope.db !== "experimind_kitbuilder_test" || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))
      throw new Error("Recipe publication activation restricted to isolated synthetic requirement_test schema");
    await r.query(`LOCK TABLE production_recipes IN ACCESS EXCLUSIVE MODE;
      ALTER TABLE production_recipes ADD COLUMN authority_key varchar(100);
      CREATE UNIQUE INDEX production_recipe_authority_key ON production_recipes(organization_id,created_by,authority_key)
        WHERE authority_key IS NOT NULL;
      DROP TRIGGER a_d3_execution ON production_recipes;
      CREATE TRIGGER a_d3_execution BEFORE UPDATE OR DELETE OR TRUNCATE ON production_recipes
        FOR EACH STATEMENT EXECUTE FUNCTION guard_d3_execution();
      CREATE FUNCTION commitment_recipe_insert() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE d jsonb:=NEW.definition; i jsonb; n integer; u text; q numeric; s numeric;
      BEGIN
        IF NEW.authority_key IS NULL OR length(btrim(NEW.authority_key))=0 OR NEW.status<>'approved'
          OR NEW.revision<>1 OR length(btrim(NEW.name))=0 OR NEW.created_by IS DISTINCT FROM NEW.approved_by
          OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.created_by AND organization_id=NEW.organization_id
            AND is_active AND role IN ('admin','super_admin')) THEN
          RAISE EXCEPTION 'Trusted recipe administrator publication required' USING ERRCODE='23514';
        END IF;
        PERFORM pg_advisory_xact_lock(hashtextextended('recipe:'||NEW.organization_id||':'||NEW.family_id,0));
        SELECT coalesce(max(version),0)+1 INTO n FROM production_recipes
          WHERE organization_id=NEW.organization_id AND family_id=NEW.family_id;
        IF NEW.version<>n THEN RAISE EXCEPTION 'Recipe predecessor changed' USING ERRCODE='23514'; END IF;
        IF EXISTS(SELECT 1 FROM production_recipes WHERE organization_id=NEW.organization_id
          AND family_id=NEW.family_id AND authority_key IS NULL) THEN
          RAISE EXCEPTION 'Historical recipe family is not trusted publication lineage' USING ERRCODE='23514'; END IF;
        SELECT unit INTO u FROM inventory_items WHERE id=(d->>'output_item_id')::uuid AND organization_id=NEW.organization_id FOR SHARE;
        IF u IS NULL OR u='slots' OR length(btrim(u))=0 OR d->>'unit' IS DISTINCT FROM u
          OR coalesce(d->>'yield_quantity','') !~ '^[0-9]{1,8}([.][0-9]{1,4})?$'
          OR (d->>'yield_quantity')::numeric<=0 OR jsonb_typeof(d->'inputs') IS DISTINCT FROM 'array'
          OR jsonb_array_length(d->'inputs') NOT BETWEEN 1 AND 100 THEN
          RAISE EXCEPTION 'Canonical recipe output required' USING ERRCODE='23514';
        END IF;
        IF (SELECT count(DISTINCT x->>'item_id') FROM jsonb_array_elements(d->'inputs') x)<>jsonb_array_length(d->'inputs') THEN
          RAISE EXCEPTION 'Duplicate recipe input' USING ERRCODE='23514'; END IF;
        FOR i IN SELECT value FROM jsonb_array_elements(d->'inputs') LOOP
          SELECT unit INTO u FROM inventory_items WHERE id=(i->>'item_id')::uuid AND organization_id=NEW.organization_id FOR SHARE;
          IF u IS NULL OR u='slots' OR length(btrim(u))=0 OR i->>'unit' IS DISTINCT FROM u
            OR i->>'item_id'=d->>'output_item_id' OR i ? 'conversion_id' OR i ? 'conversion_factor'
            OR coalesce(i->>'quantity','') !~ '^[0-9]{1,8}([.][0-9]{1,4})?$'
            OR coalesce(i->>'canonical_quantity','') !~ '^[0-9]{1,8}([.][0-9]{1,4})?$'
            OR coalesce(i->>'scrap_percent','') !~ '^[0-9]{1,8}([.][0-9]{1,4})?$' THEN
            RAISE EXCEPTION 'Canonical recipe input required' USING ERRCODE='23514'; END IF;
          q:=(i->>'quantity')::numeric; s:=(i->>'scrap_percent')::numeric;
          IF q<=0 OR q<>(i->>'canonical_quantity')::numeric OR s NOT BETWEEN 0 AND 100
            OR q*(1+s/100)*10000<>trunc(q*(1+s/100)*10000) OR q*(1+s/100)>99999999.9999 THEN
            RAISE EXCEPTION 'Inexact recipe material allowance' USING ERRCODE='23514'; END IF;
        END LOOP;
        FOR u IN SELECT unnest(ARRAY['instructions','specification','concentration']) LOOP
          IF jsonb_typeof(d->u) IS DISTINCT FROM 'string' OR length(d->>u)>5000 THEN
            RAISE EXCEPTION 'Invalid recipe notes' USING ERRCODE='23514'; END IF;
        END LOOP;
        RETURN NEW;
      END $$;
      CREATE TRIGGER b_trusted_recipe_insert BEFORE INSERT ON production_recipes
        FOR EACH ROW EXECUTE FUNCTION commitment_recipe_insert();
      ALTER FUNCTION commitment_recipe_insert() SET search_path TO pg_catalog,"${scope.schema}",pg_temp;
      REVOKE ALL ON FUNCTION commitment_recipe_insert() FROM PUBLIC;
      CREATE FUNCTION commitment_recipe_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NOT EXISTS(SELECT 1 FROM commitment_authorizations WHERE organization_id=NEW.organization_id
          AND actor_id=NEW.created_by AND operation_key=NEW.authority_key AND result->>'id'=NEW.id::text
          AND result->>'family'=NEW.family_id::text AND result->>'version'=NEW.version::text) THEN
          RAISE EXCEPTION 'Atomic recipe publication authorization evidence required' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END $$;
      CREATE CONSTRAINT TRIGGER c_recipe_evidence AFTER INSERT ON production_recipes
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commitment_recipe_evidence();
      ALTER FUNCTION commitment_recipe_evidence() SET search_path TO pg_catalog,"${scope.schema}",pg_temp;
      REVOKE ALL ON FUNCTION commitment_recipe_evidence() FROM PUBLIC;`);
  }
  async down(): Promise<void> { throw new Error("Preserve immutable recipe publication evidence; use a reviewed forward migration"); }
}
