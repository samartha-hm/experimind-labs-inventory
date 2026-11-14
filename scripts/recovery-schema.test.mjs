import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { normalizeSchema, schemaForManifest } from './recovery-schema.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const source = 'PostgreSQL 17.5 on x86_64-windows, compiled by Visual C++, 64-bit';
const original = '-- Dumped from database version 17.5\n-- Dumped by pg_dump version 17.5\nCREATE TABLE public.items (name text);';
test('retained digest survives only a server minor-version header change', () => {
  const restored = original.replace('database version 17.5', 'database version 17.4');
  assert.notEqual(hash(restored), hash(original));
  assert.equal(hash(schemaForManifest(restored, source)), hash(normalizeSchema(original)));
});
test('definition, tool version and other comment changes still fail the digest', () => {
  for (const changed of [original.replace('name text', 'name integer'), original.replace('pg_dump version 17.5', 'pg_dump version 17.6'), original + '\n-- altered']) {
    assert.notEqual(hash(schemaForManifest(changed, source)), hash(normalizeSchema(original)));
  }
});
test('missing, ambiguous or unexpected major headers fail closed', () => {
  for (const sql of [original.replace('database version 17.5', 'database version 18.0'), original + '\n-- Dumped from database version 17.5', 'CREATE TABLE public.items (name text);']) {
    assert.throws(() => schemaForManifest(sql, source));
  }
  assert.throws(() => schemaForManifest(original, 'PostgreSQL 18.0 on x86_64'));
});
test('literal array normalization preserves values and nonliteral expressions', () => {
  assert.equal(normalizeSchema("(ARRAY['one'::character varying, 'two'::character varying])::text[]"), "ARRAY[('one'::character varying)::text, ('two'::character varying)::text]");
  assert.equal(normalizeSchema('(ARRAY[column_name])::text[]'), '(ARRAY[column_name])::text[]');
  assert.notEqual(normalizeSchema("(ARRAY['one'::character varying])::text[]"), normalizeSchema("(ARRAY['other'::character varying])::text[]"));
});
