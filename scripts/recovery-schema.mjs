// Keep schema definitions intact; these two pg_dump directives are session keys.
// PostgreSQL reparses varchar literal arrays as per-element text casts on restore.
// Normalize only literal arrays, retaining values and all other definitions.
export const normalizeSchema = sql => sql.split('\n').filter(line => !/^\\(un)?restrict /.test(line)).join('\n')
  .replace(/\(ARRAY\[((?:'(?:[^']|'')*'::character varying)(?:, '(?:[^']|'')*'::character varying)*)\]\)::text\[\]/g,
    (_, values) => `ARRAY[${values.replace(/'(?:[^']|'')*'::character varying/g, value => `(${value})::text`)}]`);

// Legacy manifests hash the server version header. Substitute only this metadata
// from the recorded source, retaining the original digest and all schema checks.
export function schemaForManifest(sql, sourceVersion) {
  const version = /^PostgreSQL (17\.\d+(?: \([^\r\n]*\))?) on /.exec(sourceVersion)?.[1];
  if (!version) throw Error('Unrecognized source PostgreSQL 17 version');
  const headers = sql.match(/^-- Dumped from database version 17\.\d+(?: \([^\r\n]*\))?$/gm);
  if (headers?.length !== 1) throw Error('Expected one PostgreSQL 17 source version header');
  return normalizeSchema(sql.replace(headers[0], `-- Dumped from database version ${version}`));
}
