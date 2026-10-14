# Milestone 11 security and recovery checkpoint

Controlled pilot approval remains pending. This is local development verification, not deployment approval.

## Verified boundaries and remaining limits

- Product templates, planning, stocktake, supply, production, packing and delivery use current database users, explicit tenants and operation-specific roles. Integration acceptance exercises cross-tenant denial, optimistic revisions, concurrent replay, rollback and persistence. Legacy operational aliases remain fail-closed.
- Main tenant middleware now rejects missing/zero organizations and inactive/deleted users, reloads current roles and fails closed on database errors. Role hierarchy no longer invents ranks for unknown role names. Permission lookup cannot borrow another organization's role record.
- Public catalog image fetching is restricted to HTTPS `drive.google.com` and `lh3.googleusercontent.com`, including redirects. Responses must be raster images, at most 8 MiB; cache is capped at 64 MiB/500 entries. Other providers receive the existing placeholder. This assumes trusted host DNS and TLS configuration. Private attachments never use this proxy.
- Older advanced QMS mutations looked up inspections/deviations/CAPAs/changes/RMAs by ID without tenant predicates. RMA disposition also could repeat stock credits and did not pass the outer transaction to the ledger writer. Signature verification looked up a signature without tenant ownership. **All non-read QMS and electronic-signature API operations now return authenticated 503 `ADVANCED_OPERATIONS_DISABLED`.** Tenant-scoped history remains readable. Packing QC, delivery and closure use separate verified APIs. Repair and test those older services before enabling them; there is no override switch.
- Remote PostgreSQL TLS configuration still uses `rejectUnauthorized:false`; remote/cloud hosting is outside this checkpoint and needs certificate verification. Review reverse-proxy trust, HTTPS, host ACLs and rate limits before LAN exposure.
- Files are immutable private objects with authenticated downloads and checksum verification. Upload/database failure can leave an orphan file; preserve and reconcile, do not automatically delete. Windows filesystem ACLs and malware scanning are operational prerequisites; PDF files remain untrusted.
- Migrations with suffixes `0011`/`0012` had empty rollback/reapply and populated rollback refusal verified. These suffixes are not an applied/total count. Do not roll back populated tables by deleting records; restore a paired snapshot or apply a forward corrective migration.

## Controlled-pilot security classification

| Restriction | Pilot decision | Boundary / required follow-up |
| --- | --- | --- |
| Packing QC, delivery custody, project closure/reopening | Required for the controlled pilot | Use separately verified tenant/role/revision APIs; retain stock-ledger and replay protections. |
| Legacy inspections, deviations, CAPAs and change mutations | Deferred with legacy endpoints safely blocked | QMS router gates all non-read methods with authentication/current tenant followed by 503 `ADVANCED_OPERATIONS_DISABLED`; repair tenant/reference ownership before enabling. |
| Electronic signing and verification | Deferred with legacy endpoints safely blocked | Signature router applies the same gate, including verification POST; repair signature ownership and permissions before enabling. No regulated electronic-signature acceptance is claimed. |
| RMA receipt/disposition and stock credits | Deferred with legacy endpoints safely blocked | Covered by QMS mutation gate; require outer ledger transaction, tenant ownership and exact-once replay tests before enabling. Handle no pilot returns through these endpoints. |

GET/HEAD/OPTIONS pass to the existing route authorization, not anonymous history.
There is no override switch. A pilot needing advanced QMS, electronic signatures
or returns must wait for their repairs; do not enable them to pass acceptance.

## Migration reconciliation (11B)

The isolated database has **13 applied additive migrations**, suffixes `0000`
through `0012`; `AddPrivateAttachments1792195200011` and
`AddSharedLabelLayouts1792281600012` are both applied. No Kit Builder migration
is unapplied or required for this checkpoint. The earlier phrase “11/12 applied”
referred to those two migration suffixes, not eleven of twelve migrations.

`src/db.ts` also registers 16 legacy migrations (`1689500000000` through
`1689500000015`), which are absent from this isolated database's migration table.
They were intentionally bypassed: `scripts/initialize-kit-builder-dev.ts` first
bootstrapped entity metadata in a **new empty** database, then ran only additive
Kit Builder migrations. Legacy schema alignment, organization/admin seeds and
initializers must not be blindly applied to this populated baseline. Their
absence is expected here and is not authorization to run `db:migrate` or setup.

## Dependency review

Initial audit: 11 affected packages (1 critical, 8 high, 1 moderate, 1 low). Compatible patches updated proxy-addr, brace-expansion, DOMPurify, fast-uri, ip-address and source-map-js. Removed unused `@types/jest` and its vulnerable transitive chain; tests use Vitest. Final `npm audit` reports zero known vulnerabilities. This is registry advisory coverage, not a guarantee of security.

Proxy-addr's [critical IP-spoofing advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) matters to proxy-derived addresses/rate limiting. The removed development chain included the [braces denial-of-service advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Lockfile changes were verified by the complete suite, typecheck and builds.

## Paired local backup procedure

Prerequisites: PostgreSQL client tools matching the server major version (`pg_dump`, `pg_restore`, `createdb`, `psql`); private backup directory outside the repository/web root; encrypted offline retention; separate service account. Supply credentials through a restricted `PGPASSFILE`, never URLs, command history, screenshots or Git. Record tool/server versions and the Git SHA.

1. Stop the local application and workers cleanly. Keep PostgreSQL running. Confirm no upload, stock or planning writer remains. A database dump alone does not capture object bytes; copying files while uploads continue is not a consistent backup.
2. Set `PGHOST=127.0.0.1`, `PGPORT=55432`, `PGDATABASE=experimind_kitbuilder_development`, `PGUSER` to the configured development role and `PGPASSFILE` to its private credentials file. Refuse production URLs/hosts. Confirm the database name and port independently with `psql` before proceeding.
3. In a new private timestamped backup directory, run `pg_dump --format=custom --file=<absolute-backup>/database.dump`. Check the exit code. Copy the complete configured `ATTACHMENT_STORAGE_ROOT` into `<absolute-backup>/objects` while writers remain stopped. Preserve generated organization/object keys; do not rename objects.
4. Produce a manifest containing relative object keys, lengths and SHA-256 hashes, plus dump SHA-256, applied migrations, Git SHA, time and tool versions. For every `private_attachments` row, require its object key, size and digest to match. Flag extra objects for later investigation without deleting them. Include layout revisions, audit tables and all ledger rows in the database dump.
5. Protect the backup with host ACLs/encryption and keep a second offline copy. Resume the application only after both snapshot components and the manifest are complete. Retention deletes only explicitly reviewed backup directories, never the source object root or database.

## Isolated restoration rehearsal

1. Use only the local isolated server above. Choose a **new** database named `experimind_pilot_restore_<timestamp>` and a **new**, empty private object-root directory. Abort if either target already exists. Do not use `--clean`, drop databases or overwrite the development source.
2. Run `createdb <new-name>` under the isolated connection settings. Run `pg_restore --exit-on-error --single-transaction --no-owner --dbname=<new-name> <backup>/database.dump`. Check both exit codes. Preserve failed rehearsal targets for diagnosis; do not overwrite or clean automatically.
3. Copy the paired object tree to the new root. Recalculate every manifest hash/length and verify all attachment metadata matches. Verify migration records, inventory/ledger row counts and full ordered row fingerprints against the snapshot. Verify label revision history and immutable audit history.
4. Start a **separate local-only** app instance with the restored database/object root, fresh local port, existing test secrets supplied privately and outbound integrations disabled. Use synthetic users/data. Confirm attachment authenticated downloads, cross-tenant/role denial, layout reload/history, package QR identity and print/reprint without new package/ledger rows.
5. Reconcile packing picks with ledger IDs, tenant, negative quantity and reciprocal `packing_pick_id`; require zero unmatched picks/orphan ledger links. Reconcile item balances from the authoritative ledger. Replay an already completed packing/delivery action and require unchanged balance/history. Confirm project closure and reopening persistence.
6. Record results and elapsed restore time privately. Stop the rehearsal instance. Keep source data unchanged. Do not approve pilot recovery until **both** database and object restoration pass.

## Repeatable Windows rehearsal commands

Stop the application with Ctrl+C; keep the isolated PostgreSQL server running.
Use the portable PostgreSQL **17.5** clients extracted, with user approval, from
the [official EDB Windows binary archive](https://www.enterprisedb.com/download-postgresql-binaries).
Only client executables and their bin-directory DLL dependencies were extracted;
ZIP CRCs and per-file SHA-256s are recorded privately in `client-manifest.json`.
No installer, Windows service or PATH change was used.

```powershell
Set-Location 'D:\Experimindlabs\ERP\erp-development'
$pgClientBin = 'D:\Experimindlabs\ERP\erp-development\.local-dev\tools\postgresql-17.5\pgsql\bin'
& "$pgClientBin\pg_dump.exe" --version
& "$pgClientBin\pg_restore.exe" --version
& "$pgClientBin\psql.exe" --version
# Only after explicit administrator authorization and local credential setup:
node --env-file=.env.kit-builder-development --env-file=.local-dev/recovery-admin.env scripts/rehearse-pilot-recovery.mjs $pgClientBin
if ($LASTEXITCODE -ne 0) { throw 'Recovery failed; preserve targets for diagnosis' }
```

The guarded script accepts only `127.0.0.1:55432` and
`experimind_kitbuilder_development`, refuses active source clients and requires
client/server major 17. Credentials come privately from the ignored environment
file into child-process environment, never command arguments or output. It uses
a repeatable-read exported snapshot with shared table locks and creates a custom
dump, object copy and manifest in a new `.local-dev/recovery/<timestamp>/backup`.
The application role has no CREATEDB privilege. An explicitly authorized operator
must create an ignored `.local-dev/recovery-admin.env` privately, containing
`RECOVERY_ADMIN_DATABASE_URL` for the existing `postgres` administrator at
`127.0.0.1:55432/postgres`. Obtain its correct credential; never guess or reuse
another account's password. Do not put credentials in chat, command arguments or
Git. The script uses this account only to create a fresh database owned by
`kitbuilder_dev`; dump, restore and validation use the application account.
It creates `experimind_pilot_restore_<timestamp>` from `template0`, restores in
one transaction and copies objects into the new sibling `restored-objects` root.
It never uses `--clean`, drops a database, runs migrations or overwrites the source.

Validation compares normalized schema dumps, every public table's ordered full
row hash/count, every sequence state, migration records and every object hash.
Schema normalization removes random dump restriction markers and treats only
literal varchar-array-to-text casts as equivalent to their restored per-element
casts. Changed values, column references and all other definitions remain unequal.
It checks user/tenant ownership, item/ledger ownership and balances, reciprocal
packing-pick links and attachment record/file size/digest. Extra objects are
reported and preserved. Source hashes are rechecked after recovery. Private
`result.json` is written only on PASS; the manifest contains all comparison
hashes and versions. Inspect these files locally; do not commit dumps or metadata.

Repeat all schema/table/sequence/object/integrity validation against an existing
rehearsal's saved manifest without writing or recreating anything:

```powershell
node --env-file=.env.kit-builder-development scripts/rehearse-pilot-recovery.mjs $pgClientBin --validate 'D:\Experimindlabs\ERP\erp-development\.local-dev\recovery\<timestamp>'
if ($LASTEXITCODE -ne 0) { throw 'Retained pair validation failed' }
```

For a later hosting restore from a retained pair, first set restricted
`PGPASSFILE`, `PGHOST`, `PGPORT`, `PGUSER`; independently confirm the isolated
target. Choose a new timestamped database/root, never the source, then use:

```powershell
# Replace only with reviewed absolute backup and NEW recovery paths/names.
$backupPath = 'D:\Experimindlabs\ERP\erp-development\.local-dev\recovery\<timestamp>\backup'
$newDatabase = 'experimind_pilot_restore_<new-timestamp>'
$newObjectRoot = 'D:\Experimindlabs\ERP\erp-development\.local-dev\recovery\<new-timestamp>\restored-objects'
if (Test-Path -LiteralPath $newObjectRoot) { throw 'Object target already exists' }
# CREATE DATABASE needs a separately authorized administrator's PGPASSFILE.
# PGUSER must name that administrator for this command only.
& "$pgClientBin\createdb.exe" --template=template0 --owner=kitbuilder_dev $newDatabase
if ($LASTEXITCODE -ne 0) { throw 'Database target unavailable; do not overwrite' }
$env:PGUSER = 'kitbuilder_dev' # application credential in restricted PGPASSFILE
& "$pgClientBin\pg_restore.exe" --exit-on-error --single-transaction --no-owner --no-privileges "--dbname=$newDatabase" "$backupPath\database.dump"
if ($LASTEXITCODE -ne 0) { throw 'Restore failed; retain target' }
Copy-Item -LiteralPath "$backupPath\objects" -Destination $newObjectRoot -Recurse
& "$pgClientBin\psql.exe" "--dbname=$newDatabase" --no-psqlrc --set=ON_ERROR_STOP=1 --command='SELECT current_database(), name FROM migrations ORDER BY timestamp;'
```

The last query alone is insufficient: compare against the paired manifest using
all validation checks above before switching a hosting instance. For this local
rehearsal, the read-only `--validate` command verifies the manifest's recorded
database/root. Manual alternate-target restores require a separately reviewed
validation configuration; do not edit an original manifest to claim equivalence.
Rerun the guarded rehearsal command to test a new live-source pair automatically.
Ignored local backups are development evidence, not an
encrypted/offline hosting retention solution. Preserve the private environment
and authentication secrets separately under host ACLs/encryption.

Rollback from a failed rehearsal: stop only its separate application process,
retain the new database/root for diagnosis, and run `npm run dev:kit-builder`
with the existing source environment. The source database/root were never
switched, so no reverse restore, destructive cleanup or migration rollback is
needed. A future hosting cutover must retain its previous database/root pair and
stop writers before switching both together.

## Actual recovery status

**Paired PostgreSQL and private attachment restore: PASS**, completed
2026-10-14 19:47 IST. Server and portable clients report PostgreSQL 17.5.
After explicit user authorization, the existing isolated administrator created
`experimind_pilot_restore_20261014141752742` owned by kitbuilder_dev; all dump,
restore and validation operations used the application account. No roles or
source data were changed. Evidence is private in
`D:\Experimindlabs\ERP\erp-development\.local-dev\recovery\20261014141752742`.
Fresh object root is its `restored-objects` child; backup/manifest is its `backup`
child. Both initial paired validation and retained-pair read-only validation PASS.
All 85 public tables (including projects/templates/migrations/users), sequence
states and normalized schema match. Tenant relationships, verified ledger
balances/sequences/units, reciprocal picks and attachment hashes/size pass.
One attachment record matches its file; ten pre-existing unreferenced objects
were copied unchanged, reported and preserved. No unexpected data/file differences
remain; source hashes were unchanged. Initial schema comparison found PostgreSQL
reparsing equivalent literal array casts, now narrowly normalized and tested
against changed values/columns. Earlier failed targets are retained for diagnosis.
Existing Linux backup/restore scripts do not include attachments and must not be
run against this local setup. This proves paired data recovery, not browser or
hosting cutover acceptance. Host ACLs/encrypted offline retention remain required.

Actual visual/physical print acceptance is pending; follow [the manual browser matrix](34_PILOT_BROWSER_ACCEPTANCE.md). HTTP acceptance is not visual acceptance. Complete the browser matrix before controlled pilot approval.
