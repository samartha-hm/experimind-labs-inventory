# Milestone 13M-D2B2-B-R — recovery and integration report

Historical checkpoint. The subsequent
[B-S closure report](MILESTONE_13M_D2B2_B_S_FALLBACK_AND_RECOVERY.md)
records fallback closure and the new restart/restore evidence; the findings below
describe the earlier implementation.

2026-10-19. **BLOCKED.** Partial implementation preserved for independent review;
no acceptance commit, push, deployment, real stock mutation or later milestone.

## 1. Initial inventory and preservation

Branch: `feature/kit-builder-milestone-1`.
Initial and retained HEAD: `045c479f5deba1514e565fb3139b4590cd6eef92`.

Initial tracked changes were `AGENTS.md` (+1 unrelated line, preserved),
`src/routes/__tests__/purchaseOrderCommitment.cases.ts` (+41/-4),
`src/security/TrustedLedgerAuthority.ts` (+8/-5) and
`src/security/databaseBoundary.ts` (+12/-3). Initial untracked files were the
receipt/QC contract, `1792800000021-AddReceiptCommitments.ts` and
`ReceiptCommitmentService.ts`. They were not assumed committed or discarded.
No reset, clean, destructive down migration, staging or commit was performed.

Recovery changes additionally touch `server.ts`, `src/db.ts`, both receipt HTTP
routers, the commitment fixture, and `scripts/review-commitment-recovery.mjs`;
`receiptHttp.cases.ts` and this report are new. Verification files under
`.local-dev` are local evidence, not a committed reproducibility artifact.

## 2. HTTP root cause and implemented wiring

The partial receipt service was reachable through the private authority in a
fixture, while the production supply router still called legacy
`SupplyPlanningService.receive/inspect`. Startup supplied no receipt authority
connection. Consequently, service-only proof did not establish HTTP enforcement.

The supply router now accepts an injected authority and strict receipt/QC DTOs,
checks route/transition identity, and calls `performForSession`. That method binds
the signed capability's actor, organization and session to the bearer access token
before the existing live authorization/transaction path executes. Extra properties
are rejected. Production startup optionally creates a separate ledger connection
from `RECEIPT_LEDGER_DATABASE_URL`, restricted to the same isolated localhost
PostgreSQL target and synthetic requirement-test schema; it verifies receipt mapping
installation. This is synthetic integration plumbing, not an operational rollout.

## 3. Consequential route map and support boundaries

| Entry point | Authentication / authorization | Consequence and status |
|---|---|---|
| `POST /api/v1/supply-planning/orders/:id/receipts` | Bearer JWT, active tenant user and writer RBAC; guarded mode additionally requires session-bound operation capability, live private authorization and frozen source identity | Guarded pending receipt with exclusive PO interval when authority/migration exists; actual router tested |
| `POST /api/v1/supply-planning/receipts/:id/{accept,reject,quarantine}` | Same tenant user lookup; reviewer RBAC; capability and live authority checks in guarded mode | Explicit QC state/revision; accept alone posts physical stock atomically |
| `POST /api/v1/purchase-order/:id/receive` | Existing authenticated mount and tenant middleware | Explicit 503; no receipt/stock write; denial body changed, dedicated HTTP denial test not added |
| Supply receipt/QC with neither authority nor migration 21 | Existing tenant/RBAC checks only | **Remaining legacy fallback**, including non-QC automatic acceptance; universal guarded routing gate FAIL |

Guarded receive locks approved PO/PR lineage and exact coverage, verifies demand
project/site/item/unit/approval/revisions and the approved execution binding, then
creates receipt mapping, audit, authorization result and pending operational evidence
in one transaction. QC rechecks frozen lineage/revision and writes immutable decision
evidence. The stock helper requires an already verified physical location; no
unknown historical balance is converted to zero. Deferred witnesses tie receipt
coverage, audit, authorization and stock together. Runtime SQL is not granted ledger
mutation authority; the restricted authority owns supported writes.

PO decrease/cancellation, coverage return, reversal/replacement and downstream
production/packing/delivery are not authorized by this work. Existing commitment
barriers remain; comprehensive downstream HTTP denial evidence was not added.
There is no public capability issuer or client workflow, and full `server.ts`
startup was not exercised. Actual-router testing is not whole-server acceptance.

## 4. Source, commitment and stock evidence

The nonempty HTTP fixture receives one partial quantity, quarantines it, and
accepts it explicitly. Three receipt audit transitions and one stock movement
remain after retries. A/F/H/U snapshots do not change. Pending/quarantined material
does not post usable stock. Source subinterval allocation serializes against the PO
and retains coverage for every receipt status, including rejection.

Restored fingerprints cover receipt mapping, decisions, operational goods receipts,
physical stock scopes and stock ledger as well as upstream commitment/PR/PO tables.
The restored receipt consistency function succeeds. This demonstrates the tested
sample, not exhaustive concurrent receipt exhaustion or all invalid lineage cases.

## 5. Security, concurrency and transaction verification

Actual production-router requests exercise missing capability, bearer-as-capability,
extra actor property, changed quantity, wrong route identity, different execution
session, stale QC revision and revoked-session retry. Concurrent acceptance with
the same capability/key returns the same result and one physical movement. An
injected receipt audit trigger failure leaves receipt/source/stock/commitment
snapshots unchanged; the trigger is removed afterward. Existing restricted-role,
trusted-token and upstream commitment tests remain in the focused acceptance file.

Missing acceptance evidence: independently signed forged tenant/school/PR/PO and
malformed coverage cases across every HTTP transition; distinct concurrent receipts
exhausting remaining coverage; overlap/different-key replay matrix; rollback at
every consequential write boundary; dedicated legacy-route HTTP denial; restored
restricted-role HTTP retry/revocation. Changed body against an unchanged signature
is useful fingerprint evidence but is not a substitute for validly signed invalid
lineage. No claim of comprehensive adversarial PASS is made.

## 6. Migration and nonempty recovery

The isolated acceptance fixture applies the additive migration after predecessor
migrations in a fresh synthetic schema. Migration 21 preserves historical barriers,
adds append-only receipt/decision evidence and deferred reciprocal witnesses, and
intentionally refuses `down`. It is not an automatically activated deployment.

Recovery invocation, from the repository with the isolated development env:

```powershell
$env:COMMITMENT_RECOVERY_MILESTONE='13md2b2br'
node --env-file=.env.kit-builder-development --import tsx scripts/review-commitment-recovery.mjs
```

The script reads the latest acceptance evidence, dumps the nonempty source,
restores into a newly named synthetic schema, checks fingerprints and replays
balances/witnesses. This run used source
`requirement_test_15cdf6c6cd264873b1552fe642329568` and target
`commitment_restore_ca3e469dec4a4098b1faba09063d6e61`.
Result: **22 matching table fingerprints, 28 replayed accounts, 86 events,
17 pinned functions, four receipt witness triggers**, nonempty receipt/QC/stock,
and receipt consistency verified again from a fresh connection. Local evidence:
`.local-dev/13md2b2br-recovery-evidence.json`; backup is beneath
`.local-dev/13md2b2br-recovery/<target-schema>/synthetic.sql`.

**Recovery gate incomplete:** a fresh connection is not a PostgreSQL process
restart. The dump omits privileges; restoring runtime/identity/ledger roles and
verifying their ACL/startup assertions is still required. No restored HTTP
idempotent retry was run. Preserved authorization/audit fingerprints prove data
continuity, not executable capability continuity after restore.

Safe forward repair requires a reviewed additive migration, pre-change nonempty
backup, matching schema/function/trigger fingerprints, restricted role provisioning,
source/stock/projection reconciliation, then restart and authenticated replay before
opening writes. For disaster recovery, keep mutation entrypoints closed, restore
the backup into a fresh isolated target, validate those same gates, and reconcile
any later immutable events before activation. Application rollback must retain
schema and evidence and disable receipt mutation. Populated down/implicit stock
reversal is unsupported; this report does not certify operational recovery readiness.

## 7. PWA investigation

Both observed production builds succeeded. The final generated `dist/sw.js`
precache contains 15 assets totaling 3014.67 KiB. Largest:
`assets/index-D9KbXf6R.js`, **1,681,047 bytes**, below the 2,097,152-byte limit.
The next largest asset is XLSX at 331,764 bytes. Every manifest URL was resolved
to its built file and measured. Frontend, generated service worker and server
bundle all completed; the chunk-size warning remains advisory.

No original oversized asset/error artifact was available or reproduced. Its exact
identity and growth cause therefore remain **unresolved**, not fixed by inference.
No Workbox size limit, precache exclusion, offline behavior or feature flag was
changed. A reproducible failing input/build log is required to establish the
historical PWA root cause. No unnecessary bundle remedy was introduced.

## 8. Verification results

| Check | Result |
|---|---|
| Focused commitment PostgreSQL acceptance | 37/37 passed initially; later HTTP/rollback/revocation additions also pass in final full run |
| Commitment plus packing focused run | 56/56 passed across two files; before final added audit/revocation assertions |
| Final full default suite | **582 passed, 1 failed**, 76 files (75 passed, 1 failed); 42.87 s |
| Actual router receive/quarantine/accept, concurrency, binding, audit rollback and revoked retry | Passed within final commitment fixture; not separate counted test cases |
| Typecheck (`tsc --noEmit`) | PASS |
| Frontend/PWA/server production build | PASS; manifest inspected |
| Nonempty backup/restore and projection/receipt replay | PASS within limits above |
| PostgreSQL process restart / restored restricted HTTP replay | NOT RUN |
| Full adversarial/write-boundary matrix | INCOMPLETE |
| `git diff --check` | PASS before report; rechecked at close |

Local logs: `.local-dev/d2b2br-full-final.log`,
`d2b2br-http-packing.log`, `d2b2br-typecheck-final.log`,
`d2b2br-build-final.log`, `d2b2br-recovery.log`.
Vitest used a workspace-local TEMP/TMP because the default temp location produced
rename permission errors; database and ephemeral HTTP execution used authorized
localhost access only.

The sole final full-suite failure is packing's test
`prints and reprints traceable labels without package or ledger writes and isolates QR access`
at `packing.integration.test.ts:358`, exceeding 5000 ms (5038 ms observed).
The focused packing run passes all 19 tests. The label path serially rasterizes
QR codes and embeds PNGs into PDFs, and the test generates/reprints PDFs inside
one deadline. Full-suite resource contention is a hypothesis supported by focused
success, not an established profiled root cause. Assertions and global timeouts
were not weakened; no speculative packing fix was made.

## 9. Verdict and next review prerequisites

**BLOCKED**, because legacy fallback, incomplete adversarial coverage, missing
restart/restricted restore acceptance and a failing default regression test are
unresolved core gates. Historical PWA root cause also remains unverified despite
successful current builds. Independent review should resolve universal guarded
routing and capability issuance/startup first, then complete missing fault/race
and recovery checks and diagnose packing before acceptance. No commit/push or
local/remote accepted-HEAD equivalence is claimed for this dirty implementation.
