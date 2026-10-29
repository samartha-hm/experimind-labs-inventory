# D6-M — Migration registry integrity and upgrade acceptance

Date: 2026-10-29. Branch: `feature/kit-builder-milestone-1`. Verified starting HEAD: `f70de07d7a38e98939678cc6d2f747c297e517ec`. Initial unrelated `AGENTS.md` and `.test-tmp/` changes preserved.

**D6-M / migration readiness: BLOCKED. D6 software: BLOCKED. Operational pilot: NO-GO.** Registry coverage and refusal safeguards are implemented and verified; a successful historical populated-clone upgrade cannot be claimed. The genuine timestamp conflict and absent applied journal require an approved history decision. O1–O10 remain DRAFT / NOT AUTHORIZED; D6-B independent/browser and intended-host gaps remain open.

## Exact findings and changes

| Area | Source evidence and result |
| --- | --- |
| Coverage | Previously `src/db.ts` registered 37 of 50 canonical migrations. Missing: `1689500000007-ProductionReconciliation.ts` and migrations 18–29 listed below. `src/migrations/manifest.mjs` now inventories all 50; explicit imports in `src/migrations/registry.ts` feed `src/db.ts`. No glob discovery at runtime. All 50 match source identities and digests |
| Identifier conflict | `src/migration/1689500000007-AddVisualWarehouseAndSerialNumbers.ts` and `1689500000007-ProductionReconciliation.ts` have different class/name identities but the same timestamp `1689500000007`. Both identities are retained. The planner emits `duplicate-timestamp` and refuses execution. No historical file or identity was edited |
| Ordering | Manifest sorts canonical filenames and records the immediately preceding identity in `after`. Equal-timestamp ordering is inventory order only, not an approved execution order. Unknown, duplicated, timestamp-mismatched, reordered or non-prefix applied history is rejected |
| Historical metadata | Populated synthetic baseline was schema-synchronized, with guarded migrations invoked directly by test fixtures. It has no genuine `migrations` journal. `applied: []` in diagnostics means unavailable history, not proof of zero applied migrations. The 50 pending names are source candidates only. Planner emits `journal-unverified`; no historical rows were invented |
| Source immutability | Manifest pins LF-normalized SHA-256 per source. Tests pin the first 50 complete entries to `97641aab3abc6b1555a6f9f30bdcd34404ed8502c2d3768ae48a509859299916`. Missing, altered, unregistered and identity-drifted sources fail preflight. Future additions must append without changing this prefix; changing the baseline requires explicit review |
| Prerequisites | Migrations 18–29 and 32 retain exact synthetic database/schema guards. Migration 32 also requires its precise predecessor function; replay against an already-patched function refuses. Source registration does not make these migrations production-capable |
| Rollback | Migration 32 `down()` continues to refuse and require paired backup/approved recovery. No ledger/audit rollback protections were weakened. Database-only dumps do not establish paired private-file recovery |

Previously omitted 18–29 files, all under `src/migration/`:

```text
1792540800018-AddReservationCommitments.ts
1792627200019-AddPurchaseRequestCommitments.ts
1792713600020-AddPurchaseOrderCommitments.ts
1792800000021-AddReceiptCommitments.ts
1792886400022-BlockUnintegratedExecution.ts
1792972800023-TrustedRecipePublication.ts
1793059200024-TrustedWorkOrderAuthority.ts
1793059200025-AddFinishedOutputCustody.ts
1793059200026-TrustedPackingCustody.ts
1793145600027-TrustedDispatchCustody.ts
1793145600028-TrustedProjectClosure.ts
1793232000029-HistoricalEvidenceDecisions.ts
```

`scripts/ops/migration-integrity.mjs` supplies shared source/journal planning to preflight and the runner. Journal reads are schema-qualified and ordered by recorded `id`, preserving actual execution order. Absent journal remains absent. Invalid schema identifiers are rejected.

`scripts/run-migrations.ts` defaults to read-only `--plan`. It requires a separate migration URL and three distinct application-role identities on the same database endpoint. Migration authority must own the schema, use its own login, have no memberships and no superuser/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS. The synthetic fixture owner is superuser and therefore fails this deployable-owner requirement. A properly provisioned migration-owner execution is not verified.

Explicit `--apply` additionally requires the guarded loopback synthetic database/schema. It locks the database/schema, rechecks source/history/authority inside a READ COMMITTED transaction, then uses TypeORM's all-migration transaction. The post-lock reread observes a preceding runner's commit. The real registry conflict prevents reaching execution; successful executor/no-op/concurrent-run behavior is not claimed from planner unit tests. Operational targets remain refused. Generic CLI errors suppress connection details. Legacy Firebase/Sheets import `scripts/migrate.ts` is not a schema-upgrade entrypoint and was not executed; direct TypeORM tooling is not an approved upgrade procedure.

`src/security/databaseBoundary.ts` revokes migration/TypeORM metadata table and column grants from runtime, identity and ledger roles; startup assertions reject effective metadata write privileges, ownership, schema creation and role membership. Integration checks deliberately grant metadata column writes to each restricted role, reconfigure the boundary, verify denial, then remove the empty test-only table within the fixture transaction.

## Populated clone and preservation evidence

Reproduction: `node --env-file=.env.kit-builder-development scripts/ops/rehearse-migration-integrity.mjs`. This script only accepts the exact local synthetic database and schema pattern; it does not provision operational credentials.

Source: PostgreSQL 17.5, loopback port 55432, database `experimind_kitbuilder_test`, schema `requirement_test_20d51bde1f3d4401b1e25c145e93fac0`. Restored disposable clone: `requirement_test_bb850ee800534896bdfe42be03e3c3fd`. All 114 populated-schema table counts and sorted-row hashes matched after dump/transactional restore and after refusal/retry. Hashing normalizes the changed schema name embedded in retained function-definition backup rows and synthetic labels; all other row content remains compared. Initial raw comparisons exposed those expected name substitutions and were corrected, not discarded as data loss.

| Retained table | Rows | Matching normalized MD5 |
| --- | ---: | --- |
| stock_ledger | 42 | `efffc51eac379f1ca789329318772956` |
| commitment_events | 305 | `805633bfb751b1523c81523d13c46222` |
| commitment_claims | 129 | `9787c77f537596248d8d0277d590cd6e` |
| production_output_custody | 16 | `28ec6496f8af9faed37076edbaea3d1d` |
| audit_logs | 173 | `4ef8f4bc3fbbb05f8519037125798a10` |

Backup preceded clone inspection. Read-only plan returned exactly `duplicate-timestamp` and `journal-unverified`; no upgrade executed. A disposable transactional journal containing an unknown identity was refused, rolled back, and retry confirmed the journal was still absent and all hashes unchanged. This tests metadata interruption/refusal, not a killed full migration process.

Approved synthetic application of migration 32 is exercised in `workOrderAuthority.cases.ts`: capture predecessor and ledger hash, apply 32, roll back to a savepoint, verify exact function/data restoration, retry, verify ledger hash unchanged and destructive `down()` refused. Installed guard retains balance LEFT JOIN, held claims and slot coverage. This verifies a specific existing migration inside the isolated fixture, not historical chain equivalence. Fresh-install migration equivalence and a genuine populated historical upgrade remain **NOT VERIFIED**.

Private artifact SHA-256 (SQL, credentials and row-level evidence remain untracked):

| Artifact | SHA-256 |
| --- | --- |
| `.local-dev/d6m-recovery/populated-source.sql` | `33db593b332d31f73cc7c19b911d23bc81a711943c47fe1888d159d6a542b5fe` |
| `.local-dev/d6m-recovery/evidence.json` | `e100dc2194dcb2649c9604676c3a33ead6b4534d37ea5683dd284d442275c857` |
| `.local-dev/d600-recovery-summary.json` | `7f0191811fdc66fcc8941d834668a3924bf04a2171777b3c5ec91374d4f9d06e` |

## Recovery, application checks and validation

`scripts/verify-production-recovery.mjs` ran with prefix `d600`, evidence `.local-dev/d6m-evidence.json`, exact workspace-owned cluster directory `.local-dev/d5-closure-pg` and `PRODUCTION_BROWSER=true`. The source for this independent rehearsal was `requirement_test_4f863e74bb184657b48a942c7ecbebe0`; fresh restored database was `experimind_production_restore_c7f964668952bb16`. Recovery ran before final regression regenerated the source evidence file; the retained summary identifies its original baseline.

Restricted authenticated HTTP passed before restart, after actual PostgreSQL restart (postmaster timestamp changed), and after fresh nonempty database restore. Replay covered 87 accounts; stock, custody, claims, audit and retained old/new formats were compared by the recovery harness. Exact retries, duplicate denial, fresh authenticated mutations and residual ownership closure denial passed in all phases. Reconciliation SHA-256 remained `12886d378c1d9ae2a333e5c9bf325385a0e8b8fb0b56ed85e9303a173116e165` across all three phases.

Affected packing/delivery/production component browser checks passed before restart with real restricted authenticated HTTP. The delivery check now scopes the recorded-evidence status by dispatch ID; a transient second loading status previously made its broad locator ambiguous. These are component harness checks with a synthetic auth profile, not completion of D6-B's full built-app browser/accessibility matrix. Browser checks were not repeated after restart/restore; authenticated HTTP was.

| Verification | Result |
| --- | --- |
| Final complete regression | **PASS**: 83 files / 641 tests passed; 2 files / 2 recovery tests skipped by default and separately activated through the recovery harness |
| Registry focused coverage | **PASS**: 13 tests, including real conflict refusal, prefix/no-op planning, corrupt history, digest drift, missing source, schema rejection and migration-authority rejection |
| Preflight unit checks | **PASS**: 4 tests; redaction, malformed/missing configuration, separate roles and permanent pilot NO-GO |
| Typecheck | **PASS**: `tsc --noEmit` |
| Default frontend/PWA/server build | **PASS**: `npm run build`; 15 precache entries; existing bundle-size warning retained |
| Populated clone / recovery | Preservation and refusal checks **PASS**; successful registry upgrade **BLOCKED** |
| Missing migration configuration | CLI exit 1 with sanitized refusal; no database connection attempted |

Initial sandboxed regression connections were denied (EACCES); authorized local-network rerun passed. The recovery guard refused the default cluster directory before restart; the verified workspace cluster path was then used successfully. These environment failures were not counted as application passes.

Production startup retains `synchronize:false` and explicit `migrationsRun:false`; initialization never calls the migration runner. Feature flags and forbidden legacy-route gates were unchanged and remain off by default. No operational SQL, ownership execution, real stock movement, credential rotation, deployment, main merge or cutover occurred. No production host acceptance, off-host/retention/ACL acceptance or paired private-file recovery is claimed.

## Remaining decision and verdict

Obtain genuine applied journal/source provenance for the intended baseline and an approved reconciliation of the two `1689500000007` identities. Do not rename either historical identity, manufacture applied rows, weaken synthetic guards or replay the chain against a synchronized baseline. After that decision, provision and prove a restricted schema-owner migration account and separately authorize an isolated populated historical upgrade/fresh-install comparison with paired backup/recovery.

Registration coverage and fail-closed drift detection are verified. Stable unique historical identifiers, an approved executable order and successful historical upgrade are unresolved, so **D6-M remains BLOCKED**. D6 remains **BLOCKED** by O1–O10 and independent acceptance gaps; the operational pilot remains **NO-GO**.
