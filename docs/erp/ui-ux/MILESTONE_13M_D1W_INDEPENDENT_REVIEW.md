# Milestone 13M-D1W — independent token security review

2026-10-18. **CONDITIONAL PASS**. The three D1U token findings are closed within
the stated trust boundary. Independent source inspection and additional executable
attacks found no new reproducible security defect. No production fix was needed.
Default-worker test reliability and staging prerequisites remain open.

Baseline: branch `feature/kit-builder-milestone-1`, local and GitHub HEAD both
`cd37b38698e01364de0c6e026c7355b10e73c2a7` before review. The unrelated modified
`AGENTS.md` was preserved. This is a repository review with independent additions,
not an external penetration-test certification.

## 1. Threat model and actual roles

Attacker controls runtime SQL/session settings, knows administrator UUIDs, or holds
a captured bearer/capability and changes its request. Trusted components are the
issuer/signing key, identity credential, private ledger credential, migration
owner and application process. Compromise of those credentials/process is outside
the SQL-only runtime boundary. The database does not verify JWT signatures itself:
`TrustedLedgerAuthority` owns verification and its private writer connection.

The final synthetic schema was
`requirement_test_eaa08cd6213e4fd9a66925326400cfc9` in the isolated local test DB.
Actual LOGIN connections asserted `current_user = session_user`:

| Role | LOGIN | Authority |
| --- | --- | --- |
| Runtime | `rt_78dab1f4778b0e7f` | Operational CRUD; ledger reads; limited identity reads/lock support |
| Identity | `id_78dab1f4778b0e7f` | Identity/session writes; no ledger mutation |
| Private ledger | `lg_78dab1f4778b0e7f` | Guarded ledger mutation and dependency reads/locks |

Roles were NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOINHERIT, NOREPLICATION,
NOBYPASSRLS; owner performed fixture provisioning only. Startup boundary checks
reject owner/superuser, role membership, CREATE, unsafe privileges/functions and
unexpected search paths. Runtime cannot obtain signing authority through SQL.
The signing secret resides outside the database. Existing runtime SELECT access
to password hashes/MFA identity data remains a separate credential-exposure risk;
this review does not claim resistance to a runtime process/secret compromise.

## 2. Logout and revocation

Real login/refresh/logout tests deny issuance and execution after durable refresh
revocation, including retries of already committed operations. Disablement and
administrator demotion are checked against current database state. Separate
connections see revocation; existing event/receipt hashes remain unchanged.

Execution locks the user FOR SHARE; logout/refresh/session revocation use FOR
UPDATE. If execution obtains the lock first, its authorized transaction may commit
before logout, and subsequent retries fail. A new D1W barrier holds the logout
UPDATE lock, starts execution on another backend, verifies it is blocked using
`pg_blocking_pids`, commits revocation, and proves execution then fails with all
eight ledger fingerprints unchanged. The test models logout's exact lock/update
transaction; separate tests exercise the real logout API/service.

Expiry is checked with database time before completion; expiration while queued
rolls back the entire mutation. This is transaction ordering, not retroactive
cancellation of immutable committed history. A clock check cannot eliminate the
ordinary interval between its final statement and transaction commit.

## 3. Audience and scope attack matrix

Tests invoke the privileged authority directly, beyond HTTP authorization. Invalid
claim fixtures use the trusted test key to isolate claim validation from signature
failure. Rejections compare all eight ledger table counts and sorted-row hashes.

| Attack | Result |
| --- | --- |
| General API bearer; wrong issuer/audience, including audience arrays | Denied |
| Wrong scope/action; alternate entitlement entry point | Denied |
| Wrong tenant/actor; cross-tenant token reuse | Denied |
| Changed account/project/school-site/item/selector | Denied |
| Changed approval/revision/cap/provenance | Denied |
| Changed execution source, quantity, operation kind or canonical payload | Denied |
| Changed operation key, request digest, session, purpose or validity claims | Denied |
| Forged UUID/permission settings and temporary identity objects | No authority gained |
| Equivalent request with reordered object properties | Same committed result; no writes |

Capabilities bind actor, tenant, session, action, key and canonical full request
digest, with dedicated issuer/audience/scope, unique jti and maximum 60-second
lifetime. Requests are snapshotted before asynchronous work. Identity, resource
and approval checks also remain in ledger service/database guards.

## 4. Replay and idempotency

The immutable receipt is inserted atomically with the mutation. Concurrent exact
duplicates produce one event/receipt. A lost-response retry with the same still
valid capability and exact request retrieves the committed result on a different
connection without writes. Reordered JSON object properties remain equivalent.

The original bearer with a fresh key, a modified payload under the same key, a
second independent operation, or a new capability under an already used key is
rejected. Logout and expiry also reject committed-result retrieval: execution is
an authenticated retry contract, not an unauthenticated receipt lookup. Revocation
does not undo history or permit another event. Receipt UPDATE/DELETE is rejected.

## 5. Database privilege findings

Actual runtime LOGIN attempts deny INSERT/UPDATE/DELETE/TRUNCATE on all eight
ledger tables and direct execution of all eight privileged functions. Actor/session
settings, temporary-table/search-path shadowing, schema creation, role escalation,
unauthorized grants, trigger removal and identity escalation convey no authority.
Runtime pool settings do not leak into the distinct writer pool.

Migration, runtime, identity and private writer credentials remain separate. A
bare service call supplied an administrator UUID is not a capability boundary if
the caller already owns the trusted writer credential. Owner/legacy NOLOGIN guard
tests establish integrity only; actual LOGIN tests establish runtime isolation.

## 6. Ledger integrity and recovery

Conservation/replay checks reconcile approved, fulfilled, held and available
capacity (A = F + H + U), claims and projections. Synthetic transitions include
open, transfer, consume and release; fractional over-capacity, exclusive-source
reuse, forged events, altered projections and duplicate/conflicting keys fail.
Tenant/actor/approval checks and attribution use authenticated current identity.

Nonempty backup/restore matches all eight table fingerprints: **22 accounts,
24 entitlements, 22 balances, 22 claims, 23 sources, 51 events, 0 reconciliation
cases and 8 authorization receipts**. Eight pinned functions and the deferred
witness survive restore; all 22 accounts replay consistently.

A disposable PostgreSQL clone actually restarts, then restricted `review_ledger`
LOGIN retrieves a committed receipt and rejects fresh-key/changed-authorization
and revoked-session replay. Ledger and session fingerprints match before/after.
The runner signs pre-restart test fixtures reconstructed from retained receipt
scope; it does not retain the original integration-test bearer bytes. Shared
development PostgreSQL is never restarted. All operational-table fingerprints in
the synthetic test schema remain unchanged; this is not a company-data audit.

Sanitized durable evidence: [fingerprints](MILESTONE_13M_D1W_FINGERPRINTS.json).
Detailed logs/dumps stay ignored under `.local-dev/13md1w-*`; no secrets committed.

## 7. Verification results

| Check | D1W result |
| --- | --- |
| Focused requirement/ledger PostgreSQL integration | 37/37 PASS, baseline and added attacks |
| Full suite, default workers | 582/583; packing PDF/QR test exceeds unchanged 5000ms |
| Full suite, `--maxWorkers=2` | 583/583, 76 files, 34.53s |
| Packing alone while build competed | 18/19; same 5000ms label timeout |
| Packing alone with no competing build/test | 19/19, 10.67s total |
| Typecheck | PASS |
| Frontend, PWA and server build | PASS |
| Backup/restore and disposable restart | PASS |
| Diff whitespace check | PASS |

The default run overlapped typecheck initially; the first isolated packing run
overlapped the build. Passing idle-isolated and bounded-worker runs support
scheduling/resource contention, without proving which PDF/QR stage is responsible.
No functional label defect was demonstrated. Default-worker reliability remains
unresolved; assertions, timeout and worker defaults were not weakened. Initial
sandbox Vite cache EPERM required rerunning with authorized filesystem access.

## 8. Findings and changes

No new reproducible Critical/High/Medium/Low token-security finding. D1U's logout,
audience/scope and reusable-bearer findings are closed within the threat model.
Open limitations are the existing runtime identity-data exposure, unverified
staging custody/ACLs and packing test reliability, rather than new bypass claims.

Changes add independent cross-connection, canonical request and reverse-lock-order
attacks; recovery runners accept D1W evidence. Production authorization, ledger,
operational adapters and test timeouts are unchanged.

## 9. Staging and operational prerequisites

Before staging/activation: provision and inspect distinct restricted credentials,
owner isolation, TLS, secret custody, grants/search paths and startup smoke checks;
resolve identity SELECT exposure and packing reliability disposition. Production
capability issuance and operational writers still require their own approved
design/integration and adversarial acceptance. No deployment, real credential
rotation, historical reconciliation activation or operational writer integration
was performed.

## 10. D2 recommendation

**Isolated 13M-D2 development may begin after the user accepts this conditional
D1W review.** The three token defects no longer block that isolated development.
This report does not authorize deployment, operational activation, main merge or
historical reconciliation. Work stops at D1W pending acceptance.
