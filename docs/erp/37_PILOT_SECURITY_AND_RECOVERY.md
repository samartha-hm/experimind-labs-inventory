# Milestone 11 security and recovery checkpoint

Controlled pilot approval remains pending. This is local development verification, not deployment approval.

## Verified boundaries and remaining limits

- Product templates, planning, stocktake, supply, production, packing and delivery use current database users, explicit tenants and operation-specific roles. Integration acceptance exercises cross-tenant denial, optimistic revisions, concurrent replay, rollback and persistence. Legacy operational aliases remain fail-closed.
- Main tenant middleware now rejects missing/zero organizations and inactive/deleted users, reloads current roles and fails closed on database errors. Role hierarchy no longer invents ranks for unknown role names. Permission lookup cannot borrow another organization's role record.
- Public catalog image fetching is restricted to HTTPS `drive.google.com` and `lh3.googleusercontent.com`, including redirects. Responses must be raster images, at most 8 MiB; cache is capped at 64 MiB/500 entries. Other providers receive the existing placeholder. This assumes trusted host DNS and TLS configuration. Private attachments never use this proxy.
- Older advanced QMS mutations looked up inspections/deviations/CAPAs/changes/RMAs by ID without tenant predicates. RMA disposition also could repeat stock credits and did not pass the outer transaction to the ledger writer. Signature verification looked up a signature without tenant ownership. **All non-read QMS and electronic-signature API operations now return authenticated 503 `ADVANCED_OPERATIONS_DISABLED`.** Tenant-scoped history remains readable. Packing QC, delivery and closure use separate verified APIs. Repair and test those older services before enabling them; there is no override switch.
- Remote PostgreSQL TLS configuration still uses `rejectUnauthorized:false`; remote/cloud hosting is outside this checkpoint and needs certificate verification. Review reverse-proxy trust, HTTPS, host ACLs and rate limits before LAN exposure.
- Files are immutable private objects with authenticated downloads and checksum verification. Upload/database failure can leave an orphan file; preserve and reconcile, do not automatically delete. Windows filesystem ACLs and malware scanning are operational prerequisites; PDF files remain untrusted.
- Migration 11/12 empty rollback/reapply and populated rollback refusal were verified. Do not roll back populated tables by deleting records. Restore a paired snapshot or apply a forward corrective migration.

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

## Actual recovery status

Portable attachment-tree copy/restore with metadata hashes and corruption detection passed using synthetic temporary files; original bytes remained unchanged. PostgreSQL `pg_dump`/`pg_restore` are absent from PATH, the configured embedded development binary location and the bounded standard-installation checks. **Paired PostgreSQL restoration has not run and remains a pilot blocker.** Existing Linux backup/restore scripts do not include attachments and must not be run against this local setup.

Actual visual/physical print acceptance is also pending; follow [the manual browser matrix](34_PILOT_BROWSER_ACCEPTANCE.md). HTTP acceptance is not visual acceptance. Install matching local PostgreSQL client tools and complete the new-target rehearsal, then execute the browser matrix before controlled pilot approval.
