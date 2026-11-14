# Milestone 13M-D1 — Acceptance

Result: PASS for the isolated foundation scope; stop for independent review before writer integration.
Date: 2026-10-18. Baseline: `52dd7c48847d6d747ef885129ed384da78c6babc`.

Implementation: [schema, invariants, security, migration/rollback and follow-up](MILESTONE_13M_D1_LEDGER_FOUNDATION.md).
Diagnostics: [shadow verification and limits](MILESTONE_13M_D1_SHADOW_VERIFICATION.md).

## Reproducible checks

Tests use the existing isolated `experimind_kitbuilder_test` PostgreSQL database on localhost:55432,
with per-run synthetic schemas; no company database was changed. The existing local cluster failed to
start because of stale shared memory; a separate ignored `.local-dev/13md-pg` cluster was initialized.
Secrets, database files, build artifacts and logs are excluded from commits.

| Check | Result |
| --- | --- |
| Focused `requirementApproval.integration.test.ts` | 30 passed; actual PostgreSQL, including unchanged 13M-A/B scenarios |
| Full Vitest suite with development test environment | 76 files, 576 tests passed; 19.35 seconds |
| `npm run typecheck --silent` | PASS, exit 0 |
| `npm run build --silent` | PASS: frontend, PWA (15 precache entries), server; bundle-size warning |
| Migration empty baseline | Up/down/up passes with empty prerequisite table definitions; transaction rolls back |
| Migration populated synthetic baseline | Up/down/up passes; operational fingerprints unchanged |
| Populated ledger downgrade | Refused; immutable evidence retained |
| Operational preservation | All 22 tracked table counts/hashes match before and after the ledger/shadow scenarios |

Commands: `node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run
src/routes/__tests__/requirementApproval.integration.test.ts --reporter=dot`; full suite omits the file argument.
Set `REQUIREMENT_REVIEW_EVIDENCE_PATH` to an ignored local JSON path to retain detailed synthetic run evidence.

## Transaction, idempotency and security evidence

- Two concurrent 1.5-unit holds against a 2.4 cap: exactly one succeeds. Duplicate synthetic source race:
  exactly one succeeds. Equal concurrent same-key requests return the same event; changed payload fails.
- Open 2.4, transfer stages, consume 1.2: cancelling 2.4 fails; release of evidenced untouched 1.2 succeeds;
  final F=1.2/H=0. Old transferred source identity remains unavailable.
- Split 2 into 0.5+1.5 without increasing H; incomplete partition fails. Retired-parent consumption and
  splitting a partially consumed child fail. Child consumption yields F=0.2/H=1.8.
- Underfunded revised total-to-date cap 1.8 fails with F=1/H=1; later 3.3 cap preserves F/H.
  Stale approval retries fail. Material and integer deliverable-slot accounts remain independent by school.
- Independent replay and immutable entitlement caps match projections and aggregate claims; corrupted
  retained after-state is rejected. Injected outer transaction failure leaves no event/source/claim delta.
- Wrong tenant, staff actor, approval revision/provenance, inexact stock consumption, direct projection writes,
  evidence UPDATE/DELETE and TRUNCATE are rejected. Current approval/packing guards continue unchanged.

## Limits and review gate

No operational writer integration, historical activation, UI, routes, deployment, main merge or new dependency.
The remaining risks are real-source exclusivity/settlement proof, source-specific quantity adapters, revision
compatibility/carry-forward policy, multi-account locking and production DDL privilege boundaries. Synthetic
release declarations are not operational cancellation authority. No extra resource-loss authority is introduced.
Existing whole-site packing is unchanged. The next task is independent review of the foundation and a separately
authorized bounded writer integration, not automatic cutover.

## Operational fingerprints

The table below records one final run's counts and before/after digest comparison. Digests are ordered-row
MD5 preservation checks, not security signatures. UUIDs/timestamps vary between synthetic runs.

| Table | Rows before/after | Before MD5 | After MD5 |
| --- | --- | --- | --- |
| inventory_items | 3/3 | c1a00ae9685e91e7da58f15393c8fd2b | c1a00ae9685e91e7da58f15393c8fd2b |
| stock_ledger | 5/5 | a7c08a8eedf79758927d810cff9a8fb1 | a7c08a8eedf79758927d810cff9a8fb1 |
| physical_stocktakes | 3/3 | d5e6ff0e4212e174076b61ef865f3485 | d5e6ff0e4212e174076b61ef865f3485 |
| physical_stock_scopes | 3/3 | 5c987ad600015911c2b47e9bf24656ea | 5c987ad600015911c2b47e9bf24656ea |
| physical_stocktake_events | 15/15 | 7645a731aa8bc13b4546c60ceca468e5 | 7645a731aa8bc13b4546c60ceca468e5 |
| project_stock_reservations | 1/1 | 4f7aac8eca62ae605569617c90845bba | 4f7aac8eca62ae605569617c90845bba |
| purchase_requests | 1/1 | 9493b266d25e33fe9d7d137908fe2071 | 9493b266d25e33fe9d7d137908fe2071 |
| purchase_orders | 0/0 | d41d8cd98f00b204e9800998ecf8427e | d41d8cd98f00b204e9800998ecf8427e |
| purchase_goods_receipts | 0/0 | d41d8cd98f00b204e9800998ecf8427e | d41d8cd98f00b204e9800998ecf8427e |
| supply_events | 23/23 | 1f03eef6413b2c4c83debdb60700fd4e | 1f03eef6413b2c4c83debdb60700fd4e |
| production_work_orders | 1/1 | 1de300e0d60ce94496807de6bb7d4c8e | 1de300e0d60ce94496807de6bb7d4c8e |
| production_input_reservations | 1/1 | 3627b97aa88a530e775eb1e96ee2f22f | 3627b97aa88a530e775eb1e96ee2f22f |
| production_input_issues | 0/0 | d41d8cd98f00b204e9800998ecf8427e | d41d8cd98f00b204e9800998ecf8427e |
| production_batches | 0/0 | d41d8cd98f00b204e9800998ecf8427e | d41d8cd98f00b204e9800998ecf8427e |
| production_qc_decisions | 0/0 | d41d8cd98f00b204e9800998ecf8427e | d41d8cd98f00b204e9800998ecf8427e |
| packing_orders | 6/6 | 1a3ff799c196fa2ee125b01e3404df57 | 1a3ff799c196fa2ee125b01e3404df57 |
| packing_picks | 1/1 | b90ec13d12c936f49ae4c2bd136030b3 | b90ec13d12c936f49ae4c2bd136030b3 |
| delivery_orders | 1/1 | 23f3a788128999385091c2508fc814a6 | 23f3a788128999385091c2508fc814a6 |
| delivery_package_claims | 24/24 | 182c3aea4898398c076e314a771b73da | 182c3aea4898398c076e314a771b73da |
| package_custody_events | 72/72 | c5cc1e19bb941e8a5a3430c9fc29e89a | c5cc1e19bb941e8a5a3430c9fc29e89a |
| site_installations | 1/1 | 1dee60a5b4ae69798b866443f635577e | 1dee60a5b4ae69798b866443f635577e |
| project_completions | 1/1 | ab8f178302824a5c17381cc94e0862c1 | ab8f178302824a5c17381cc94e0862c1 |
