import type { DataSource, EntityManager } from "typeorm";
import { blockedExecutionTables } from "../migration/1792886400022-BlockUnintegratedExecution";

export const ledgerTables = ["commitment_accounts", "commitment_entitlements", "commitment_balances",
  "commitment_claims", "commitment_sources", "commitment_events", "commitment_reconciliation_cases", "commitment_authorizations"];
export const identityTables = ["users", "roles", "refresh_tokens", "sessions"];
export const sqlIdentifier = (name: string): string => `"${name.replaceAll('"', '""')}"`;
type Sql = Pick<EntityManager, "query">;
const baseWorkOrderTables = ["commitment_work_orders","commitment_work_order_materials","commitment_work_order_issues","production_work_orders","production_input_reservations","production_input_issues"];
async function installedWorkOrderTables(db: Sql): Promise<string[]> {
  const [{installed}] = await db.query("SELECT to_regclass('production_output_custody') IS NOT NULL installed");
  const [{packing}] = await db.query("SELECT to_regclass('trusted_packing_plans') IS NOT NULL packing");
  return [...baseWorkOrderTables,...(installed ? ["production_output_custody"] : []),...(packing ? ["trusted_packing_plans","trusted_packing_allocations","trusted_packing_qc"] : [])];
}
const workOrderUpdates = ["production_work_orders","production_input_reservations"];
async function workOrdersInstalled(db: Sql): Promise<boolean> {
  return (await db.query("SELECT to_regclass('commitment_work_orders') IS NOT NULL installed"))[0].installed;
}
async function recipePublicationInstalled(db: Sql): Promise<boolean> {
  return (await db.query("SELECT to_regprocedure('commitment_recipe_insert()') IS NOT NULL installed"))[0].installed;
}
async function executionBlockedTables(db: Sql): Promise<string[]> {
  return (await db.query("SELECT to_regprocedure('guard_d3_execution()') IS NOT NULL installed"))[0].installed ? blockedExecutionTables : [];
}
const reservationWrites = ["project_stock_reservations", "supply_events", "requirement_execution_bindings"];
const receiptWrites = ["commitment_receipts", "commitment_receipt_decisions", "purchase_goods_receipts", "stock_ledger"];
async function receiptInstalled(db: Sql, schema: string): Promise<boolean> {
  return (await db.query("SELECT to_regclass($1) IS NOT NULL installed",[`${sqlIdentifier(schema)}.commitment_receipts`]))[0].installed;
}
async function reservationInstalled(db: Sql, schema: string): Promise<boolean> {
  return (await db.query("SELECT to_regclass($1) IS NOT NULL installed",[`${sqlIdentifier(schema)}.commitment_reservations`]))[0].installed;
}
async function purchaseRequestInstalled(db: Sql, schema: string): Promise<boolean> {
  return (await db.query("SELECT to_regclass($1) IS NOT NULL installed",[`${sqlIdentifier(schema)}.commitment_pr_lines`]))[0].installed;
}

async function purchaseOrderInstalled(db: Sql, schema: string): Promise<boolean> {
  return (await db.query("SELECT to_regclass($1) IS NOT NULL installed",[`${sqlIdentifier(schema)}.commitment_po_lines`]))[0].installed;
}

/** Explicit operator action, under the schema owner. Never called by server startup. */
export async function configureDatabaseBoundary(db: Sql, schema: string,
  roles: { runtime: string; identity: string; ledger: string }): Promise<void> {
  if (new Set(Object.values(roles)).size !== 3) throw new Error("Distinct boundary roles required");
  const s = sqlIdentifier(schema), runtime = sqlIdentifier(roles.runtime);
  const identity = sqlIdentifier(roles.identity), ledger = sqlIdentifier(roles.ledger);
  const d2 = await reservationInstalled(db,schema);
  const pr=await purchaseRequestInstalled(db,schema);
  const po=await purchaseOrderInstalled(db,schema);
  const receipt=await receiptInstalled(db,schema);
  const recipes=await recipePublicationInstalled(db);
  const workOrders=await workOrdersInstalled(db);
  const workOrderTables=await installedWorkOrderTables(db);
  const poWrites=[...(po?["commitment_po_lines","commitment_po_coverage","purchase_orders"]:[]),...(receipt?receiptWrites:[])];
  const prWrites=[...(pr?["commitment_pr_lines","purchase_requests"]:[]),...poWrites];
  const executionTables = await executionBlockedTables(db);
  const protectedTables = [...ledgerTables,...(d2 ? ["commitment_reservations",...reservationWrites] : []),...prWrites,...executionTables,...(workOrders?workOrderTables:[])];
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
  for (const table of [...protectedTables, ...identityTables]) {
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
  for (const table of ["users", "refresh_tokens", "sessions", "planning_projects", "planning_sites", "requirement_approvals", "project_completions"])
    await db.query(`GRANT SELECT ON ${s}.${sqlIdentifier(table)} TO ${ledger}`);
  await db.query(`GRANT UPDATE(updated_at) ON ${s}.planning_projects TO ${ledger}`);
  if (d2) {
    await db.query(`GRANT SELECT,INSERT,UPDATE ON ${["commitment_reservations",...reservationWrites].map(t=>`${s}.${sqlIdentifier(t)}`).join(",")} TO ${ledger};
      GRANT UPDATE(updated_at) ON ${s}.inventory_items TO ${ledger}`);
    for (const table of ["inventory_items","stock_ledger","physical_stocktakes","physical_stock_scopes",
      "production_work_orders","production_input_reservations","packing_orders","delivery_orders","site_installations","purchase_requests","purchase_orders"])
      await db.query(`GRANT SELECT ON ${s}.${sqlIdentifier(table)} TO ${ledger}`);
  }
  if (pr) await db.query(`GRANT SELECT,INSERT,UPDATE ON ${prWrites.map(t=>`${s}.${sqlIdentifier(t)}`).join(",")} TO ${ledger}`);
  if (po) await db.query(`GRANT SELECT ON ${s}.vendors,${s}.purchase_goods_receipts,${s}.purchase_order_lines TO ${ledger}`);
  // Stock is append-only. Other protected receipt tables also have immutable/final-state guards.
  if (receipt) await db.query(`REVOKE UPDATE ON ${s}.stock_ledger FROM ${ledger}`);
  for (const table of executionTables) for (const role of [identity, ledger]) {
    const t = `${s}.${sqlIdentifier(table)}`;
    await db.query(`REVOKE ALL ON ${t} FROM ${role}; GRANT SELECT ON ${t} TO ${role}`);
    const columns: {attname:string}[] = await db.query("SELECT attname FROM pg_attribute WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped", [t]);
    for (const {attname} of columns) await db.query(`REVOKE ALL (${sqlIdentifier(attname)}) ON ${t} FROM ${role}`);
  }
  if (workOrders) {
    for (const table of workOrderTables) {
      await db.query(`REVOKE ALL ON ${s}.${sqlIdentifier(table)} FROM ${identity}; ${table.startsWith('trusted_packing_')?'':`GRANT SELECT ON ${s}.${sqlIdentifier(table)} TO ${identity};`}
        GRANT SELECT,INSERT${workOrderUpdates.includes(table)?",UPDATE":""} ON ${s}.${sqlIdentifier(table)} TO ${ledger}`);
    }
    await db.query(`GRANT SELECT,INSERT ON ${s}.audit_logs TO ${ledger}`);
    await db.query(`GRANT SELECT ON ${s}.requirement_execution_bindings,${s}.product_template_versions TO ${ledger}`);
  }
  if (recipes) await db.query(`GRANT INSERT ON ${s}.production_recipes TO ${ledger}`);
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
      if (workOrders && f.proname === "requirement_check_binding")
        await db.query(`GRANT EXECUTE ON FUNCTION ${f.signature} TO ${ledger}`);
    } else if (f.proname === "uuid_generate_v4" && !f.prosecdef) {
      // Legacy entity defaults use uuid-ossp; this pure UUID generator conveys no authority.
      await db.query(`GRANT EXECUTE ON FUNCTION ${f.signature} TO ${runtime},${identity}${d2 ? `,${ledger}` : ""}`);
    }
  }
}

/** Fail closed, including inherited privileges and SET ROLE membership. No bypass flag. */
export async function assertDatabaseBoundary(db: DataSource, kind: "runtime" | "identity" | "ledger",
  schema: string): Promise<void> {
  const fail = () => { throw new Error(`Unsafe ${kind} database authority; operator provisioning required`); };
  const d2=await reservationInstalled(db,schema);
  const executionTables=await executionBlockedTables(db);
  const pr=await purchaseRequestInstalled(db,schema);
  const po=await purchaseOrderInstalled(db,schema);
  const receipt=await receiptInstalled(db,schema);
  const recipes=await recipePublicationInstalled(db);
  const workOrders=await workOrdersInstalled(db);
  const workOrderTables=await installedWorkOrderTables(db);
  const d2Tables=[...(d2 ? ["commitment_reservations",...reservationWrites] : []),...(pr?["commitment_pr_lines","purchase_requests"]:[]),...(po?["commitment_po_lines","commitment_po_coverage","purchase_orders"]:[]),...(receipt?receiptWrites:[]),...(workOrders?workOrderTables:[])];
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
    const operational = ![...ledgerTables,...d2Tables,...identityTables,...executionTables,"migrations","typeorm_metadata"].includes(relname);
    const writable = kind === "runtime" ? operational : kind === "identity" ? identityTables.includes(relname) : [...ledgerTables,...d2Tables].includes(relname);
    for (const privilege of ["INSERT","UPDATE","DELETE","TRUNCATE","REFERENCES","TRIGGER"]) {
      const allowed = kind === "ledger" && workOrders && relname === "audit_logs" && privilege === "INSERT" || kind === "ledger" && recipes && relname === "production_recipes" && privilege === "INSERT" || writable && ["INSERT",...(kind === "ledger" && (receipt && relname === "stock_ledger" || workOrders && workOrderTables.includes(relname) && !workOrderUpdates.includes(relname)) ? [] : ["UPDATE"]),...(kind === "ledger" ? [] : ["DELETE"])].includes(privilege) ||
        kind === "identity" && relname === "audit_logs" && privilege === "INSERT";
      if (!allowed && (await db.query("SELECT has_table_privilege($1,$2) allowed",[t,privilege]))[0].allowed) fail();
    }
    const columns: {attname:string; writable:boolean}[] = await db.query(`SELECT attname,
      (has_column_privilege($1,attname,'INSERT') OR has_column_privilege($1,attname,'UPDATE')) writable
      FROM pg_attribute WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped`,[t]);
    if (kind === "ledger" && recipes && relname === "production_recipes" &&
      (await db.query(`SELECT 1 FROM pg_attribute WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped
        AND has_column_privilege($1,attname,'UPDATE') LIMIT 1`,[t])).length) fail();
    if (!writable && !(kind === "ledger" && workOrders && relname === "audit_logs") && !(kind === "identity" && relname === "audit_logs") && !(kind === "ledger" && recipes && relname === "production_recipes") && columns.some(c=>c.writable &&
      !(c.attname === "updated_at" && (relname === "users" && kind === "runtime" || kind === "ledger" && ["users","planning_projects",...(d2?["inventory_items"]:[])].includes(relname))))) fail();
  }
  // Missing authority is also unsafe: never silently substitute runtime credentials for identity/writer credentials.
  if (kind === "ledger") for (const table of ["refresh_tokens", "sessions"])
    if (!(await db.query("SELECT has_table_privilege($1,'SELECT') allowed",
      [`${sqlIdentifier(schema)}.${sqlIdentifier(table)}`]))[0].allowed) fail();
  if (kind === "ledger" && recipes && !(await db.query("SELECT has_table_privilege('production_recipes','INSERT') allowed"))[0].allowed) fail();
  for (const table of kind === "identity" ? identityTables : kind === "ledger" ? [...ledgerTables,...d2Tables] : [...ledgerTables,...d2Tables,...identityTables]) {
    for (const privilege of kind === "runtime" ? ["SELECT"] : ["SELECT","INSERT","UPDATE"]) {
      if (kind === "ledger" && privilege === "UPDATE" && (receipt && table === "stock_ledger" || workOrders && workOrderTables.includes(table) && !workOrderUpdates.includes(table))) continue;
      if (!(await db.query("SELECT has_table_privilege($1,$2) allowed",[`${sqlIdentifier(schema)}.${sqlIdentifier(table)}`,privilege]))[0].allowed) fail();
    }
  }
}
