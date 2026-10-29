import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { migrationManifest } from '../../src/migrations/manifest.mjs';

// Diagnostics contain identities and issue codes only, never connection strings or SQL errors.
export function planMigrations(manifest, applied) {
  const issues = [];
  const names = new Set();
  const timestamps = new Set();
  for (const [index, entry] of manifest.entries()) {
    if (names.has(entry.name)) issues.push('duplicate-name');
    if (timestamps.has(entry.timestamp)) issues.push('duplicate-timestamp');
    if (!Number.isSafeInteger(entry.timestamp) || entry.timestamp !== Number(entry.name.slice(-13)) ||
        !entry.file.startsWith(`${entry.timestamp}-`)) issues.push('identity-mismatch');
    if (index && entry.timestamp < manifest[index - 1].timestamp) issues.push('unordered-source');
    if (JSON.stringify(entry.after) !== JSON.stringify(index ? [manifest[index - 1].name] : [])) issues.push('prerequisite-mismatch');
    names.add(entry.name); timestamps.add(entry.timestamp);
  }
  if (applied === undefined) issues.push('journal-unverified');
  else {
    const seen = new Set();
    for (const [index, row] of applied.entries()) {
      const entry = manifest.find(item => item.name === row.name);
      if (!entry) issues.push('unknown-applied');
      if (seen.has(row.name)) issues.push('duplicate-applied');
      if (entry && String(entry.timestamp) !== String(row.timestamp)) issues.push('applied-timestamp-mismatch');
      if (manifest[index]?.name !== row.name) issues.push('non-prefix-history');
      seen.add(row.name);
    }
  }
  const pending = manifest.filter(entry => !applied?.some(row => row.name === entry.name)).map(entry => entry.name);
  return { ready: issues.length === 0, issues: [...new Set(issues)], pending,
    applied: applied?.map(row => row.name) ?? [], ordered: manifest.map(entry => entry.name) };
}

export async function inspectMigrationSources(root = process.cwd(), manifest = migrationManifest) {
  const issues = [];
  const discovered = (await readdir(resolve(root, 'src/migration'))).filter(file => /^\d+-.+\.ts$/.test(file)).sort();
  const unregistered = discovered.filter(file => !manifest.some(entry => entry.file === file));
  if (unregistered.length) issues.push('unregistered-source');
  for (const entry of manifest) {
    if (!discovered.includes(entry.file)) { issues.push('missing-source'); continue; }
    const source = (await readFile(resolve(root, 'src/migration', entry.file), 'utf8')).replace(/\r\n/g, '\n');
    if (createHash('sha256').update(source).digest('hex') !== entry.sha256) issues.push('source-digest-mismatch');
    if (source.match(/export class (\w+)/)?.[1] !== entry.name ||
        (source.match(/\bname\s*=\s*["']([^"']+)/)?.[1] ?? entry.name) !== entry.name) issues.push('source-identity-mismatch');
  }
  return { discovered, registered: manifest.map(entry => entry.file), unregistered, issues: [...new Set(issues)] };
}

export async function inspectMigrationAuthority(query, schema) {
  const { rows: [role] } = await query(`SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,
    current_user=session_user AS same_login,
    EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid) AS membership,
    EXISTS(SELECT 1 FROM pg_namespace WHERE nspname=$1 AND nspowner=r.oid) AS owns_schema
    FROM pg_roles r WHERE rolname=current_user`, [schema]);
  return Boolean(role?.same_login && role.owns_schema &&
    !['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls','membership'].some(key => role[key]));
}

// Never manufacture history for synchronized schemas. Plans use read-only connections.
export async function readMigrationJournal(query, schema) {
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('invalid-schema');
  const { rows } = await query('SELECT to_regclass($1) IS NOT NULL AS present', [`${schema}.migrations`]);
  if (!rows[0]?.present) return undefined;
  return (await query(`SELECT id, name, timestamp FROM "${schema}".migrations ORDER BY id`)).rows;
}

export async function inspectMigrationPlan(query, schema, root = process.cwd()) {
  const sources = await inspectMigrationSources(root);
  const journal = await readMigrationJournal(query, schema);
  const plan = planMigrations(migrationManifest, journal);
  const issues = [...new Set([...sources.issues, ...plan.issues])];
  const { rows: [schemaEvidence] } = await query(`SELECT md5(coalesce(string_agg(
    concat_ws(':',table_name,column_name,ordinal_position,data_type,is_nullable,column_default),
    '|' ORDER BY table_name,ordinal_position),'')) AS fingerprint
    FROM information_schema.columns WHERE table_schema=$1`, [schema]);
  return { ...sources, ...plan, issues, ready: issues.length === 0,
    historicalIdentity: diagnoseHistoricalIdentity(migrationManifest, journal, schemaEvidence?.fingerprint ?? null),
    mode: journal === undefined ? 'SOURCE_ONLY' : 'READ_ONLY_JOURNAL',
    limitation: 'Journal identities do not prove schema or historical source equivalence; require a verified populated clone and paired backup.' };
}

// Evidence observations never authorize execution or establish historical provenance.
export function diagnoseHistoricalIdentity(manifest, journal, schemaFingerprint = null) {
  const plan = planMigrations(manifest, journal);
  const collisions = [...new Set(manifest.map(entry => entry.timestamp))]
    .map(timestamp => ({ timestamp, candidates: manifest.map((entry, index) => ({ ...entry, registryIndex: index }))
      .filter(entry => entry.timestamp === timestamp) }))
    .filter(group => group.candidates.length > 1)
    .map(group => ({ ...group, status: 'AMBIGUOUS', applied: journal?.filter(row => String(row.timestamp) === String(group.timestamp)) ?? [] }));
  const observations = manifest.map((entry, registryIndex) => {
    const rows = journal?.filter(row => row.name === entry.name) ?? [];
    const collision = collisions.some(group => group.timestamp === entry.timestamp);
    const conflict = rows.length > 1 || rows.some(row => String(row.timestamp) !== String(entry.timestamp));
    return { ...entry, registryIndex, journalPositions: journal?.flatMap((row, index) => row.name === entry.name ? [index] : []) ?? [],
      status: conflict ? 'CONFLICT' : journal === undefined ? 'MISSING EVIDENCE' : collision ? 'AMBIGUOUS' : rows.length ? 'VERIFIED' : 'NOT APPLICABLE',
      meaning: rows.length ? 'Journal identity comparison only; historical execution and source provenance are not established.' : 'No applied identity established.' };
  });
  return { ready: false, identityComparisonReady: plan.ready, issues: plan.issues, collisions, observations,
    unexpectedApplied: journal?.filter(row => !manifest.some(entry => entry.name === row.name)).map(row => ({ ...row, status: 'CONFLICT' })) ?? [],
    pending: plan.pending, appliedOrdering: journal ?? null,
    checks: {
      journal: { status: journal === undefined ? 'MISSING EVIDENCE' : 'VERIFIED', meaning: 'Presence only' },
      orderingAndDependencies: { status: journal === undefined ? 'MISSING EVIDENCE' : plan.issues.some(issue => ['non-prefix-history', 'prerequisite-mismatch', 'unordered-source'].includes(issue)) ? 'CONFLICT' : 'VERIFIED' },
      historicalProvenance: { status: 'MISSING EVIDENCE', meaning: 'Requires custodian-attested journal, release sources and paired backup provenance.' },
      schema: { status: schemaFingerprint ? 'AMBIGUOUS' : 'MISSING EVIDENCE', fingerprint: schemaFingerprint,
        meaning: 'Current schema cannot prove which historical migration executed.' },
    }, historicalUpgrade: 'BLOCKED' };
}
