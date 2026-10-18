# Milestone 13M-D1R — Independent commitment ledger review

**Verdict: CONDITIONAL PASS for the isolated synthetic foundation after the fixes below. Operational writer integration remains BLOCKED by a known HIGH security finding.**

Reviewed 2026-10-18 on `feature/kit-builder-milestone-1`, starting at `e90c44af1a915f6428e4d16de42dd141ec30f783`.
Reviewed the actual seven-table migration, entities, ledger/shadow services, approval guard and PostgreSQL tests against the C design and D1 acceptance documents. This verdict does not authorize D2, historical activation or deployment.

## Findings by severity

| Severity / status | Finding and disposition |
| --- | --- |
| HIGH / FIXED | The event BEFORE INSERT trigger changed balances/claims before PostgreSQL resolved an idempotency conflict. A direct `INSERT ... ON CONFLICT DO NOTHING` with an existing actor/key and a new consume payload discarded the event but committed consumption. A new regression failed before the fix (30 passed, 1 failed), demonstrating missing immutable evidence. |
| HIGH / FIXED | Unqualified trigger queries followed caller search paths. A restricted DML role created a temporary balance table, raised its cap to 999, and successfully inserted an over-cap quantity 3 into the real event table. The new assertion failed before path hardening (35 passed / 1 failed). Pinning all eight ledger functions to `pg_catalog, <ledger schema>, pg_temp` rejects that insert and keeps deferred evidence lookups on the real event table. |
| HIGH / INTEGRATION BLOCKER | Administrator UUIDs in service context and SQL event input are trusted caller assertions. A nonowner role with schema USAGE and table DML successfully inserted an event naming a known active administrator. Tenant/role membership checks do not authenticate the SQL caller. No HTTP ledger route currently exposes this boundary. Define an authenticated service boundary and least-privilege database interface before writers are enabled; do not treat raw DML grants as tenant authorization. |
| MEDIUM / INTEGRATION BLOCKER | The configured local application/test user `kitbuilder_dev` is a superuser. Production role grants/ownership are not established by this review. Trigger-depth checks are not a security boundary against owners or callers allowed to create triggers. Separate migration ownership from runtime DML, deny runtime DDL/TRIGGER/role escalation, and verify actual deployment grants. |
| MEDIUM / INTEGRATION BLOCKER | No automatic retry policy exists in `execute`. Actual SQLSTATE 40001 and 40P01 victims rolled back and succeeded on caller-managed same-key retries. Future multi-account operational transactions need one lock order, bounded whole-transaction retry and a defined unknown-commit recovery contract. |
| MEDIUM / CONDITIONAL | Replay reconstructs A/F/H, sequence and claim arithmetic and checks every event after-state. It does not independently revalidate all actor/source/release provenance or return a complete per-claim/source projection audit. Aggregate claim totals were checked by tests; deployment recovery must also inspect individual provenance and claims. Replay is not a validator for arbitrary externally supplied evidence. |

## Narrow fix

Added forward migration `1792540800016-HardenCommitmentEventEvidence.ts`; the applied D1 migration is unchanged. A deferred constraint trigger requires a retained matching event for **each** balance transition, including transitions whose A/F/H totals stay constant. A later event cannot hide an earlier missing witness. Failure aborts the transaction, including claims and source history.

The migration locks balances/events and refuses installation if existing sequence/count/latest-state evidence disagrees. It does not repair drift or certify all historical provenance. Empty account creation is permitted only with zero balances and no entitlement. Removing this protection refuses any populated account set. Keep constraints initially deferred: forcing them immediate before event insertion fails closed because the existing event trigger runs before the event row is retained.

The same forward migration pins function search paths to the actual migration schema, safely quoted, with `pg_temp` explicitly last. Omitting `pg_temp` would leave PostgreSQL's implicit temporary-table precedence. Nested invoker functions inherit the pinned path. This does not grant privileges or authenticate callers. Empty downgrade restores the original function configurations; populated downgrade remains refused.

## Tested invariants and transactions

| Area | Fresh evidence |
| --- | --- |
| Conservation | A is a total-to-date cap; U=A−F−H remains nonnegative. Consumption moves H into irreversible F; transfer preserves totals; an evidenced untouched remainder can be released without reducing F. |
| Quantities | Negative/zero opens, over-cap `2.400001`, above-range `1000000001`, exponent notation and seven-place fractions rejected. Six-place material holds supported; stock consumption must be exactly four-place representable and within stock range. Fractional slots rejected. |
| Revisions | Underfunded cap 1.8 rejected with F=1/H=1; later 3.3 preserves F/H. Stale retries rejected. Concurrent revision save versus new hold serializes through the project: either the old hold wins and reduced authorization fails, or the old hold becomes stale. |
| Ownership | Tenant/project/site and immutable approval/provenance checks reject mismatches. Material demand, grade/common/universal slots and independent Maths entitlements remain separate; another school cannot borrow capacity. |
| Exclusivity | Competing last-capacity opens and duplicate source identities produce one winner. Source history retains old transferred identities. Distinct opaque slice strings are not proof of physical disjointness. |
| Split/parent race | Children must conserve the entire untouched parent, including an explicit remainder. Retired parent and partially consumed child operations fail. Concurrent parent consume versus split permits exactly one. |
| Consume/release race | Concurrent 0.7 consume/release against held 1 permits exactly one; replay and claims agree after either outcome. |
| Idempotency | Equal same-key service retries return the retained event; conflicting payloads fail. Discarded SQL duplicate events now fail at commit without projection changes. |
| Atomic rollback | Injected transaction exception removes event/claim/source/balance deltas; retry succeeds. Actual SERIALIZABLE stale-snapshot 40001 and injected opposite advisory-lock ordering 40P01 preserve replay after caller retries. The deadlock test models future outer lock inversion, not a claim that single-account calls inherently deadlock. |
| Audit/SQL | Event and entitlement mutation, projection edits and TRUNCATE rejected. Replay detects changed after-state/sequence discrepancies; owner-injected existing drift causes hardening migration refusal and is rolled back. |

Current lock path is administrator row SHARE, actor/key advisory lock, project UPDATE lock, balance UPDATE lock, then claim UPDATE lock. Future writers must reconcile this order with inventory/source locks and administrative user updates; multi-account ordering is not implemented here.

## SQL role and migration boundary

The restricted-role test creates a temporary NOLOGIN/NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOINHERIT role inside a transaction, grants only schema USAGE and table SELECT/INSERT/UPDATE/DELETE, then uses SET LOCAL ROLE. Direct projection edits, event deletion, permanent CREATE TABLE, trigger creation and trigger disabling are refused. Database TEMP privilege inherited from PUBLIC still permits temporary tables. The over-cap temporary-balance attack is rejected after hardening; an empty temporary event table cannot redirect the deferred witness. Valid supplied-admin events still execute and pass the deferred witness check. The transaction rolls back the role, grants, temporary tables and test event.

**Unresolved authentication boundary:** SQL membership validation answers whether the supplied UUID belongs to an active tenant administrator, not whether the connected caller is that administrator. The demonstrated role can name that UUID and create a valid commitment without the administrator's authenticated session. Service-layer RBAC alone cannot protect a database principal allowed direct ledger DML. This remains HIGH and blocks consequential writers.

Minimum remediation before integration: separate owner/migrator credentials from runtime; revoke direct ledger DML and schema CREATE/TRIGGER/role-escalation rights from every untrusted principal; authenticate requests in a trusted server and derive actor/tenant solely from its verified session, then recheck live membership. Only trusted service code may hold the ledger-writing credential; clients must never choose actor/tenant or access that credential. If SQL callers themselves are untrusted, replace raw table access with a narrowly granted, audited database interface enforcing authenticated, nonforgeable caller identity and tenant scope; arbitrary UUID parameters or caller-set session variables are insufficient. Test impersonation and cross-tenant rejection using the actual deployed roles. Designing that identity/interface contract exceeds this review's narrow demonstrated ledger fixes, so it is documented rather than partially implemented.

This is a representative DML-only role, not proof of production configuration or protection from a superuser. Trigger functions are invoker-security and require their cross-table reads/locks/writes to be granted. A table-DML-only runtime role cannot perform schema migration; deploy using a separate owner-equivalent migration identity with schema CREATE and ownership of affected tables/functions. pgcrypto/gen_random_uuid and prerequisite approval objects must exist. Migration-role compatibility was exercised with the local privileged user; a nonowner production migration identity was not available. Quiesce writers during hardening and run through the transactional migration runner.

## Shadow lineage: ten cases remain unresolved

Fresh inspection reproduced ten missing-source-lineage and ten historical-reconciliation-required diagnostics. Unknown explicit links and duplicate hypotheses remain diagnostic; no record was repaired or assigned a claim. Reconciliation metadata is immutable and constrained `active=false`; no metadata-driven execution path exists.

| Source / observed status | Cases | Ambiguity requiring evidence |
| --- | ---: | --- |
| Reservation / active | 1 | No immutable claim/root/slice correspondence; matching item or quantity cannot establish ownership. |
| Purchase request / reviewed | 1 | No top-level project/site identity and no proven line-to-obligation mapping; review status supplies no entitlement. |
| Production order / released | 1 | No proven input/output stage lineage or claim transfer; status alone cannot determine held versus fulfilled demand. |
| Packing order / draft | 4 | Draft status does not establish whether a particular obligation has already been committed elsewhere. |
| Packing order / packing | 1 | Embedded lines/packages require source-specific quantity, unit and prior-stage lineage. |
| Packing order / ready | 1 | Completion of packing is not evidence of delivery fulfillment or independent capacity ownership. |
| Delivery order / delivered | 1 | Delivered status alone does not prove which immutable claim/slice was fulfilled or exclude double counting with packing. |

The recovery evidence retains the ten synthetic record IDs/statuses and source schema. No name/quantity/status inference authorizes activation. Shadow remains REPEATABLE READ / READ ONLY, tenant-filtered, administrator-gated and explicitly diagnostic.

## Migration, recovery and preservation

Empty prerequisite-table migration up/down/up and populated synthetic prerequisite migration up/down/up passed for both migrations. This is an empty **prerequisite schema**, not installation of the complete application into a database without prerequisite migrations. Populated base-ledger downgrade and hardening downgrade both refuse evidence destruction.

`scripts/review-commitment-recovery.mjs` permits only localhost:55432 / `experimind_kitbuilder_test` and a generated `requirement_test_<32 hex>` source. It pg_dumps that synthetic schema, restores into a fresh generated schema with psql single-transaction/ON_ERROR_STOP, compares all seven table fingerprints, and replays every restored account. No source cleanup or restore into an existing schema occurs. Local PostgreSQL 17.5 tools are required at the script's documented-in-code path; dumps/evidence remain ignored under `.local-dev`.

Fresh recovery: 20 accounts, 22 entitlements, 20 balances, 18 claims, 19 source identities, 44 events, zero reconciliation cases; all seven counts/ordered-row MD5s matched, and all 20 restored account replays matched. Both parent-race outcomes are valid, so claim/source counts can vary between runs. All eight restored function paths target the restored schema, and the enabled, initially deferred witness constraint was verified. Empty reconciliation data is a coverage limit. This schema-scoped drill does not certify production cluster roles, external attachments, disaster recovery or a production restore runbook. MD5s are preservation comparisons, not security signatures.

Final source: `requirement_test_d356764544af43bea9218c3522da5b87`; restored to `commitment_restore_84872352e7e34ddeb8dc3a16d9075ac1`.

| Ledger table | Count before = after | Ordered-row MD5 before = after |
| --- | ---: | --- |
| accounts | 20 | `1ce8adf2e8a1cd62976aae3533813cab` |
| entitlements | 22 | `9ddd59911dba3d66f0f01dbbbd0ad69b` |
| balances | 20 | `49eb055b83f1ed3fec16279f3de480e3` |
| claims | 18 | `1798d36de62d9bd24df5b0321588149c` |
| sources | 19 | `f60c803611427704810d60255d74a68f` |
| events | 44 | `a0c10748f476a2053cbb0c6f14d24bd5` |
| reconciliation_cases | 0 | `d41d8cd98f00b204e9800998ecf8427e` |

All 22 operational table before/after fingerprints matched around ledger/shadow scenarios. Test setup intentionally creates synthetic operational fixtures before that comparison. Company records were not accessed or changed.

## Verification and reproduction

- Fresh baseline focused PostgreSQL suite: 30/30. After the first regression, 30 passed / 1 failed; after hardening, 31/31, then expanded checks 34/34. The final full run includes all 36 approval/ledger cases.
- The first standalone filtered role test lacked prerequisite cases and failed during fixture setup; it supplied no security evidence. Running the complete focused file then reproduced the temporary-table bypass (35 passed / 1 failed); the hardened focused rerun passed 36/36.
- Final full suite: **76 files / 582 tests passed**, with `--testTimeout=15000`. An earlier final run hit the existing packing-label test's default 5000ms timeout (581 passed / 1 timed out); no production code was changed for that timing issue.
- TypeScript `tsc --noEmit`: PASS. `npm run build --silent`: frontend, PWA (15 precache entries), server PASS; existing large-bundle warning remains.
- Set `REQUIREMENT_REVIEW_EVIDENCE_PATH=.local-dev/13md1r-evidence.json`; run `node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run --reporter=dot --silent --testTimeout=15000`. Add `src/routes/__tests__/requirementApproval.integration.test.ts` for focused tests.
- Then run `node --env-file=.env.kit-builder-development node_modules/tsx/dist/cli.mjs scripts/review-commitment-recovery.mjs`. Evidence: ignored `.local-dev/13md1r-evidence.json` and `.local-dev/13md1r-recovery-evidence.json`; no credentials or dump data are committed.

## Prerequisites before any writer integration

1. Approve and verify authenticated caller/tenant enforcement and production role separation; raw UUID assertions and owner-level runtime access are insufficient.
2. Specify real-source identity, overlapping-slice exclusion, stage lineage and independently verifiable untouched/unencumbered settlement proof. Synthetic declarations cannot establish physical truth.
3. Define approved-revision compatibility/carry-forward behavior for live claims; current stale-approval rejection is deliberately conservative.
4. Agree on multi-account/source lock ordering, whole-transaction retry and uncertain-commit reconciliation. Preserve the actor/key identity across retries.
5. Add source-specific shadow/provenance and per-claim audit coverage, reconcile the ten cases explicitly, and rehearse production grants/recovery separately.

No operational adapters, routes, modern approval UI, historical activation, deployment or main merge were implemented. Stop for user review before 13M-D2; use `/new` or `/compact` for the next authorized slice.
