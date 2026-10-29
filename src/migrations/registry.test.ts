import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrationManifest } from './manifest.mjs';
import { registeredMigrations } from './registry';
import { inspectMigrationSources, inspectMigrationAuthority, planMigrations, readMigrationJournal } from '../../scripts/ops/migration-integrity.mjs';

const manifest = [1, 2, 3].map((n, index) => ({ name: `Test${1700000000000 + n}`,
  file: `${1700000000000 + n}-Test.ts`, timestamp: 1700000000000 + n,
  after: index ? [`Test${1700000000000 + n - 1}`] : [] }));
const journal = manifest.map(({ name, timestamp }) => ({ name, timestamp: String(timestamp) }));

describe('migration integrity', () => {
  it('requires a dedicated unelevated schema owner without role memberships', async () => {
    const role={same_login:true,owns_schema:true,rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false,rolbypassrls:false,membership:false};
    const inspect=(value: typeof role)=>inspectMigrationAuthority(async()=>({rows:[value]}),'synthetic');
    expect(await inspect(role)).toBe(true);
    for(const key of ['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls','membership'] as const)
      expect(await inspect({...role,[key]:true})).toBe(false);
    expect(await inspect({...role,same_login:false})).toBe(false);
    expect(await inspect({...role,owns_schema:false})).toBe(false);
  });
  it('pins the historical prefix: additions may only follow these 50 unchanged entries', () => {
    expect(createHash('sha256').update(JSON.stringify(migrationManifest.slice(0, 50))).digest('hex'))
      .toBe('97641aab3abc6b1555a6f9f30bdcd34404ed8502c2d3768ae48a509859299916');
  });
  it('registers all 50 canonical sources once, preserving names, order and source bytes', async () => {
    expect(registeredMigrations.map(Migration => { const instance = new Migration(); return instance.name ?? Migration.name; }))
      .toEqual(migrationManifest.map(entry => entry.name));
    expect(new Set(registeredMigrations).size).toBe(migrationManifest.length);
    const sources = await inspectMigrationSources();
    expect(sources.issues).toEqual([]);
    expect(sources.unregistered).toEqual([]);
    expect(sources.discovered.length).toBe(migrationManifest.length);
  });
  it('keeps the real legacy timestamp collision blocked without renaming either migration', () => {
    expect(planMigrations(migrationManifest, []).issues).toEqual(['duplicate-timestamp']);
    expect(migrationManifest.filter(entry => entry.timestamp === 1689500000007).map(entry => entry.name)).toEqual([
      'AddVisualWarehouseAndSerialNumbers1689500000007', 'ProductionReconciliation1689500000007']);
  });
  it('plans a verified prefix in order, including no-op and empty-journal baselines', () => {
    expect(planMigrations(manifest, journal.slice(0, 1))).toMatchObject({ ready: true, pending: manifest.slice(1).map(e => e.name) });
    expect(planMigrations(manifest, journal)).toMatchObject({ ready: true, pending: [] });
    expect(planMigrations(manifest, [])).toMatchObject({ ready: true, pending: manifest.map(e => e.name) });
    expect(planMigrations(manifest, undefined).issues).toContain('journal-unverified');
  });
  it.each([
    [[{ name: 'Unrecognized1700000000001', timestamp: 1700000000001 }], 'unknown-applied'],
    [[journal[0], journal[0]], 'duplicate-applied'],
    [[{ ...journal[0], timestamp: '1700000000999' }], 'applied-timestamp-mismatch'],
    [[journal[1]], 'non-prefix-history'],
    [[journal[1], journal[0]], 'non-prefix-history'],
  ])('refuses altered, duplicate, unknown, gapped or reordered history', (rows, issue) => {
    const plan = planMigrations(manifest, rows);
    expect(plan.ready).toBe(false); expect(plan.issues).toContain(issue);
  });
  it('refuses duplicate names, timestamp disorder and missing prerequisites', () => {
    expect(planMigrations([manifest[0], manifest[0]], []).issues).toContain('duplicate-name');
    expect(planMigrations([...manifest].reverse(), []).issues).toContain('unordered-source');
    expect(planMigrations([{ ...manifest[0], after: ['invented'] }], []).issues).toContain('prerequisite-mismatch');
  });
  it('does not create a journal or accept an unsafe schema identifier', async () => {
    const sql: string[] = [];
    const query = async (statement: string) => { sql.push(statement); return { rows: [{ present: false }] }; };
    expect(await readMigrationJournal(query, 'synthetic')).toBeUndefined();
    expect(sql).toEqual(['SELECT to_regclass($1) IS NOT NULL AS present']);
    await expect(readMigrationJournal(query, 'public;DROP SCHEMA public')).rejects.toThrow('invalid-schema');
    expect(sql).toHaveLength(1);
  });
  it('detects source edits, omitted registration and deleted history before connecting', async () => {
    const root = await mkdtemp(join(tmpdir(), 'migration-integrity-'));
    try {
      const directory = join(root, 'src/migration');
      await mkdir(directory, { recursive: true });
      const source = 'export class Test1700000000001 {}\n';
      const entry = { ...manifest[0], scope: 'test-only', sha256: createHash('sha256').update(source).digest('hex') };
      const path = join(directory, entry.file);
      await writeFile(path, source.replace(/\n/g, '\r\n'));
      expect((await inspectMigrationSources(root, [entry])).issues).toEqual([]);
      await writeFile(path, source + '// altered\n');
      expect((await inspectMigrationSources(root, [entry])).issues).toContain('source-digest-mismatch');
      await writeFile(join(directory, manifest[1].file), 'unregistered');
      expect((await inspectMigrationSources(root, [entry])).issues).toContain('unregistered-source');
      await rm(path);
      expect((await inspectMigrationSources(root, [entry])).issues).toContain('missing-source');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
