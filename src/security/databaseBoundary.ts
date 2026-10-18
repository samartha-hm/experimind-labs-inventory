import type { DataSource, EntityManager } from "typeorm";

export const ledgerTables = ["commitment_accounts", "commitment_entitlements", "commitment_balances",
  "commitment_claims", "commitment_sources", "commitment_events", "commitment_reconciliation_cases"];
export const identityTables = ["users", "roles", "refresh_tokens", "sessions"];
export const sqlIdentifier = (name: string): string => `"${name.replaceAll('"', '""')}"`;
type Sql = Pick<EntityManager, "query">;

/** Explicit operator action, under the schema owner. Never called by server startup. */
export async function configureDatabaseBoundary(db: Sql, schema: string,
  roles: { runtime: string; identity: string; ledger: string }): Promise<void> {
  if (new Set(Object.values(roles)).size !== 3) throw new Error("Distinct boundary roles required");
  const s = sqlIdentifier(schema), runtime = sqlIdentifier(roles.runtime);
  const identity = sqlIdentifier(roles.identity), ledger = sqlIdentifier(roles.ledger);
  await db.query(`REVOKE ALL ON SCHEMA ${s} FROM PUBLIC;
    REVOKE ALL ON ALL TABLES IN SCHEMA ${s} FROM PUBLIC;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA ${s} FROM PUBLIC;
    REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA ${s} FROM PUBLIC;
    ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
    GRANT USAGE ON SCHEMA ${s} TO ${runtime},${identity},${ledger};
    REVOKE CREATE ON SCHEMA ${s} FROM ${runtime},${identity},${ledger}`);
  // Existing operational services require CRUD. Identity and ledger objects are excluded.
  const operational: { relname: string }[] = await db.query(`SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind IN ('r','p')
    AND c.relname<>ALL($2::text[])`, [schema, [...ledgerTables, ...identityTables, "migrations", "typeorm_metadata"]]);
  for (const { relname } of operational)
    await db.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ${s}.${sqlIdentifier(relname)} TO ${runtime}`);
  await db.query(`GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA ${s} TO ${runtime}`);
  for (const table of [...ledgerTables, ...identityTables]) {
    const t = `${s}.${sqlIdentifier(table)}`;
    await db.query(`REVOKE ALL ON ${t} FROM ${runtime}; GRANT SELECT ON ${t} TO ${runtime}`);
    // Table REVOKE does not remove pre-existing column ACLs.
    const columns: { attname: string }[] = await db.query(`SELECT attname FROM pg_attribute
      WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped`, [t]);
    for (const { attname } of columns)
      await db.query(`REVOKE ALL (${sqlIdentifier(attname)}) ON ${t} FROM ${runtime}`);
  }
  // PostgreSQL requires one UPDATE column for FOR SHARE. This column conveys no identity.
  await db.query(`GRANT UPDATE(updated_at) ON ${s}.users TO ${runtime},${ledger}`);
  for (const table of identityTables)
    await db.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ${s}.${sqlIdentifier(table)} TO ${identity}`);
  await db.query(`GRANT SELECT,INSERT ON ${s}.audit_logs TO ${identity}`);
  for (const table of ledgerTables)
    await db.query(`REVOKE ALL ON ${s}.${sqlIdentifier(table)} FROM ${identity};
      GRANT SELECT,INSERT,UPDATE ON ${s}.${sqlIdentifier(table)} TO ${ledger}`);
  for (const table of ["users", "planning_projects", "planning_sites", "requirement_approvals", "project_completions"])
    await db.query(`GRANT SELECT ON ${s}.${sqlIdentifier(table)} TO ${ledger}`);
  await db.query(`GRANT UPDATE(updated_at) ON ${s}.planning_projects TO ${ledger}`);
  const functions: { signature: string; proname: string; prosecdef: boolean }[] = await db.query(`
    SELECT p.oid::regprocedure::text signature,p.proname,p.prosecdef FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1`, [schema]);
  for (const f of functions) {
    await db.query(`REVOKE ALL ON FUNCTION ${f.signature} FROM ${runtime},${identity},${ledger}`);
    if (f.proname.startsWith("commitment_")) {
      if (f.prosecdef) throw new Error("Ledger functions must remain invoker functions");
      await db.query(`ALTER FUNCTION ${f.signature} SET search_path TO pg_catalog,${s},pg_temp;
        GRANT EXECUTE ON FUNCTION ${f.signature} TO ${ledger}`);
    } else if (f.proname.startsWith("requirement_") || f.proname.startsWith("guard_")) {
      if (f.prosecdef) throw new Error("Operational functions must remain invoker functions");
      await db.query(`ALTER FUNCTION ${f.signature} SET search_path TO pg_catalog,${s},pg_temp;
        GRANT EXECUTE ON FUNCTION ${f.signature} TO ${runtime}`);
      if (f.proname === "requirement_assert")
        await db.query(`GRANT EXECUTE ON FUNCTION ${f.signature} TO ${ledger}`);
    } else if (f.proname === "uuid_generate_v4" && !f.prosecdef) {
      // Legacy entity defaults use uuid-ossp; this pure UUID generator conveys no authority.
      await db.query(`GRANT EXECUTE ON FUNCTION ${f.signature} TO ${runtime},${identity}`);
    }
  }
}

/** Fail closed, including inherited privileges and SET ROLE membership. No bypass flag. */
export async function assertDatabaseBoundary(db: DataSource, kind: "runtime" | "identity" | "ledger",
  schema: string): Promise<void> {
  const fail = () => { throw new Error(`Unsafe ${kind} database authority; operator provisioning required`); };
  const [{ path }] = await db.query("SELECT current_setting('search_path') path");
  if (path.replace(/\s/g, "") !== `pg_catalog,${schema},pg_temp`) fail();
  const [role] = await db.query(`SELECT r.rolsuper,r.rolcreaterole,r.rolcreatedb,r.rolreplication,r.rolbypassrls,
    current_user=session_user same_login,
    EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid) membership,
    has_database_privilege(current_database(),'CREATE') database_create,
    EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'
      AND (n.nspowner=r.oid OR has_schema_privilege(n.oid,'CREATE'))) schema_create,
    EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname=$1 AND c.relowner=r.oid) owns_objects
    FROM pg_roles r WHERE r.rolname=current_user`, [schema]);
  if (!role || !role.same_login || Object.entries(role).some(([k,v]) => k !== "same_login" && v === true)) fail();
  if ((await db.query(`SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname=$1 AND p.proowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) LIMIT 1`, [schema])).length) fail();
  for (const table of [...ledgerTables, ...identityTables]) {
    const t = `${sqlIdentifier(schema)}.${sqlIdentifier(table)}`;
    const forbidden = kind === "runtime" || (kind === "identity" && ledgerTables.includes(table)) ||
      (kind === "ledger" && identityTables.includes(table));
    if (!forbidden) continue;
    const rows: { attname: string; writable: boolean }[] = await db.query(`SELECT attname,
      (has_column_privilege($1,attname,'INSERT') OR has_column_privilege($1,attname,'UPDATE')) writable
      FROM pg_attribute WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped`, [t]);
    if (rows.some(c => c.writable && !(table === "users" && c.attname === "updated_at" && kind !== "identity"))) fail();
    for (const privilege of ["DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"])
      if ((await db.query("SELECT has_table_privilege($1,$2) allowed", [t, privilege]))[0].allowed) fail();
  }
  if ((await db.query(`SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND has_schema_privilege(n.oid,'USAGE')
    AND has_function_privilege(p.oid,'EXECUTE')
    AND (p.prosecdef OR (n.nspname=$1 AND $2<>'ledger' AND p.proname LIKE 'commitment_%')) LIMIT 1`, [schema, kind])).length) fail();
  // Owner-backed views/foreign tables can convey authority even without base-table grants.
  if ((await db.query(`SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND c.relkind IN ('v','m','f')
    AND has_schema_privilege(n.oid,'USAGE') AND (has_table_privilege(c.oid,'SELECT') OR
      has_table_privilege(c.oid,'INSERT') OR has_table_privilege(c.oid,'UPDATE') OR has_table_privilege(c.oid,'DELETE')) LIMIT 1`)).length) fail();
  const tables: { relname: string }[] = await db.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=$1 AND c.relkind IN ('r','p')`, [schema]);
  for (const {relname} of tables) {
    const t = `${sqlIdentifier(schema)}.${sqlIdentifier(relname)}`;
    const operational = ![...ledgerTables,...identityTables,"migrations","typeorm_metadata"].includes(relname);
    const writable = kind === "runtime" ? operational : kind === "identity" ? identityTables.includes(relname) : ledgerTables.includes(relname);
    for (const privilege of ["INSERT","UPDATE","DELETE","TRUNCATE","REFERENCES","TRIGGER"]) {
      const allowed = writable && ["INSERT","UPDATE",...(kind === "ledger" ? [] : ["DELETE"])].includes(privilege) ||
        kind === "identity" && relname === "audit_logs" && privilege === "INSERT";
      if (!allowed && (await db.query("SELECT has_table_privilege($1,$2) allowed",[t,privilege]))[0].allowed) fail();
    }
    const columns: {attname:string; writable:boolean}[] = await db.query(`SELECT attname,
      (has_column_privilege($1,attname,'INSERT') OR has_column_privilege($1,attname,'UPDATE')) writable
      FROM pg_attribute WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped`,[t]);
    if (!writable && !(kind === "identity" && relname === "audit_logs") && columns.some(c=>c.writable &&
      !(c.attname === "updated_at" && (relname === "users" && kind === "runtime" || kind === "ledger" && ["users","planning_projects"].includes(relname))))) fail();
  }
  // Missing authority is also unsafe: never silently substitute runtime credentials for identity/writer credentials.
  for (const table of kind === "identity" ? identityTables : kind === "ledger" ? ledgerTables : [...ledgerTables,...identityTables]) {
    for (const privilege of kind === "runtime" ? ["SELECT"] : ["SELECT","INSERT","UPDATE"]) {
      if (!(await db.query("SELECT has_table_privilege($1,$2) allowed",[`${sqlIdentifier(schema)}.${sqlIdentifier(table)}`,privilege]))[0].allowed) fail();
    }
  }
}
