# Milestone 13M-D1V — acceptance

2026-10-18. Verdict: **CONDITIONAL PASS**. All three D1U security gaps are closed
in automated isolated PostgreSQL verification under actual restricted LOGINs.
The full suite passes with bounded workers; default worker contention remains a
documented regression-run limitation. Independent review has not been performed.
No D2 writer integration is authorized by this result.

See [lifecycle contract](MILESTONE_13M_D1V_TOKEN_LIFECYCLE.md) and
[retained fingerprints](MILESTONE_13M_D1V_FINGERPRINTS.json).

| Verification | Result |
| --- | --- |
| Focused requirement/ledger PostgreSQL suite | 37/37 passed; also included in final full run |
| Final full suite, `--maxWorkers=2` | 583/583, 76 files, 37.35 seconds |
| Prior bounded-worker full run | 583/583, 37.77 seconds |
| Default-worker full runs | Twice 582/583: packing PDF test exceeded existing 5000ms |
| Packing suite alone | 19/19 passed |
| Typecheck and frontend/PWA/server builds | PASS; PWA 15 precache entries, server bundle generated |
| Nonempty backup/restore | Eight ledger fingerprints match; 22 accounts, 50 events; eight pinned functions; replay/conservation preserved |
| Disposable database restart | PASS: receipt retry, revoked session and replay rejection persist; ledger/session fingerprints unchanged |
| Operational reconciliation | Before/after fingerprints unchanged; no company data used |

## Security evidence

`trustedLedgerBoundary.cases.ts` and `trustedLedgerIndependentReview.cases.ts`
connect as distinct runtime, identity and ledger LOGINs, asserting current_user =
session_user. Denials retain equal counts and full sorted-row hashes across all
eight ledger tables. Coverage includes general bearer execution, wrong issuer,
audience (including multi-audience arrays), scope, tenant, actor, action, account,
project/site/item/selector, approval/revision/cap/provenance, operation key, payload,
purpose, session and timestamps. Existing SQL DML/function/temp/settings/role
impersonation and pool-state isolation checks remain in place.

Real login/refresh/logout tests reject post-logout issuance, pending execution and
committed retries. Current role demotion/disablement deny execution. Concurrent
same-operation replay produces one event and receipt; changed payload/key and a
different capability under an existing key fail. An advisory-lock barrier proves
execution-before-logout ordering; later retry fails. Another barrier expires a
queued token and verifies complete rollback. Receipt mutation is rejected.

Restart testing restores the nonempty synthetic schema into a fresh cluster,
recreates restricted roles, signs fixtures before shutdown, revokes a separate
synthetic session, actually restarts PostgreSQL and retries through the restricted
ledger LOGIN. No mutation or session fingerprint changes survive rejected replay.
These are implementation-authored adversarial tests, not external review.

## Packing timeout investigation

The same PDF/QR test failed in two default-worker full runs and passed in isolation.
It generates and reprints each package PDF, encodes 360px QR PNGs and performs
read-only HTTP checks. Both bounded-worker full runs pass with unchanged 5000ms
timeout and assertions. This supports worker contention as the trigger; individual
PDF stages were not profiled. No label production code or test configuration was
changed. Use explicit `--maxWorkers=2` for reproducible verification on this host;
default-worker reliability remains open for a separate performance review.

## Recovery and limits

Ignored `.local-dev/13md1v-*` logs/evidence retain detailed synthetic runs; sanitized
fingerprints are checked in. Run the integration file in full because earlier
tests establish prerequisite migrations. Recovery selectors accept `13md1v`.
Restart runner requires bundled PostgreSQL tools, a free port 55439 and the retained
synthetic evidence schema. Windows pg_ctl uses ignored stdio to avoid inherited
pipe handles blocking its parent. No shared cluster shutdown is performed.

Remaining gates: independent review of locking/revocation and capability custody;
staging provisioning/TLS/secret and restricted startup smoke tests; separate
runtime identity-data exposure review; default-worker packing performance.
No deployment, real credential rotation, reconciliation activation, main merge
or operational adapter was performed. Request independent review before D2.
