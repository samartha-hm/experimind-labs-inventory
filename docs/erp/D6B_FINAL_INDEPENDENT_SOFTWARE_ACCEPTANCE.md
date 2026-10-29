# D6-B independent software acceptance — 2026-10-29

## Verdicts

| Acceptance boundary | Actual result |
| --- | --- |
| Full authenticated application browser acceptance | **PARTIAL**; observed screens and selected commands below passed; complete browser transaction matrix remains unverified |
| Production migration readiness | **BLOCKED**; registry/identifier gaps, absent applied journal, synthetic-only migration guards and unverified historical production upgrade |
| Deployment preflight | **PARTIAL in isolated Windows rehearsal**; actual production host **NOT VERIFIED** |
| Ownership contract authorization | **DRAFT / NOT AUTHORIZED**; O1–O10 unchanged |
| D6 overall software readiness | **BLOCKED**; independent acceptance gaps and ownership authority remain |
| Operational pilot | **NO-GO** |

This is executed synthetic evidence, not approval to migrate, deploy, post real stock or activate a pilot. No closure was attempted over unresolved holds. No ownership transfer, settlement, historical activation or production migration was performed. D1–D5 implementation was not changed.

## Baseline and isolation

Starting branch `feature/kit-builder-milestone-1`; local and origin both verified at `2060d82d0ae48ef96f0d555226b35074f1220f06` before changes. Read repository directives, current handoff/NEXT_TASK, D6 readiness, D6-P technical impact and D6-C contract. Unrelated modified `AGENTS.md` and untracked `.test-tmp/` were preserved.

Fresh serial regression produced a populated synthetic source. A schema-only dump without ownership/privilege statements was restored transactionally into separate schema `requirement_test_172d43e705324623ab0cf79bceb53536`, database `experimind_kitbuilder_test`, loopback PostgreSQL port 55432. No operational database was used. Separate non-superuser runtime, identity and receipt-ledger roles served the actual built application on `127.0.0.1:3104`, with guests disabled and deterministic synthetic administrator, staff, viewer and other-tenant accounts. Credentials and private environment files are excluded from Git.

The default-off frontend/PWA/server build passed. Separate synthetic builds enabled trusted packing/delivery, then all three trusted production/packing/delivery flags to inspect their actual application entry points. Package lookup used an observed label link. These local build flags grant no operational authority. The isolated application process was stopped after rehearsal.

## Actual application browser evidence

Supported in-app browser interactions used the real sign-in form and application shell, rather than a component harness. Accessibility state and read-only visible DOM were inspected. Existing business records came from regression HTTP/database fixtures; viewing them in a browser does not turn their preparation into browser transaction evidence.

| Area | Actual browser action/result | Limit |
| --- | --- | --- |
| Authentication | Administrator and viewer signed in through the form; reload retained session; Sign Out returned to login; authenticated shell returned after application/database restart | Expiry/refresh denial tested by direct HTTP below; no natural-expiry browser wait |
| Tenant/role navigation | Administrator procurement/administration navigation; viewer shell omitted those entries | Staff and other-tenant form navigation not exhaustively exercised |
| School requirements/approval | Opened saved revision 2 and school allocations; explicit save/calculate/approval controls visible | No new browser requirement approval submitted |
| Procurement, receipt and QC | Actual reservations/purchasing and trusted receiving screens showed PR/PO revisions, approved coverage and QC choices | No verified receiving location existed in this clone's selector; no receipt posted through browser |
| Stocktake/blind count | Loaded immutable reviewed count history: UNKNOWN, first count, dispute, recount, awaiting review and reviewed revision 6; quantities 7/8/8, agreed 8, attribution retained | No new complete blind-count sequence through browser |
| Work order/recipe authority | All-flags build displayed manufacturing recipes/work orders and selected approved work order; project/school, approval/revision, issued input, remaining entitlement and pending-QC output visible | No material issue/output or recipe publication through browser; legacy execution remained read-only |
| Packing/QC/labels | Valid observed package link loaded plan revision 15, retained allocations/QC and complete material coverage; package label preview opened | Allocation/QC writes prepared by fixtures, not repeated through browser |
| Dispatch/delivery/installation | Selected dispatched assembly; previewed manifest and package labels; retained school receipts and completed installation counts visible | New dispatch/delivery/installation writes not performed through browser |
| Closure readiness | Active project retained material holds despite completed school installation; closure blocker visible | Closure intentionally not attempted |
| D6 evidence | Actual browser created explicitly synthetic scanner claim, revision 1; missing evidence hash produced validation error; self-review refused; retry preserved command and refused again; discard refreshed | Positive independent review performed by HTTP, not browser; synthetic review never verifies a real gate |
| 34-lane reconciliation | Actual GET-only panel showed all 34 lanes, revision/hash, separate quantities/units, ownership draft and residual closure blocks | No ownership execution controls introduced |
| Responsive/accessibility | 390 px school and procurement screens had document width 390; inspected school form labels (zero unlabelled controls); authority selectors exposed accessible names | No comprehensive WCAG audit, screen-reader run or complete workflow matrix at all sizes |
| Error handling | Invalid credentials raised duplicate native alerts, both dismissed; invalid package displayed tenant/unavailable error; evidence validation and retry denial rendered | Duplicate login alerts remain a UX finding; complete offline/network-error matrix not verified |

Browser capture labels and visible text are retained privately in `.local-dev/d6b-browser-evidence.json`. Browser console error probe returned no errors at the sampled point; this is not a whole-run console audit.

### Direct HTTP evidence — explicitly separate from browser actions

`d6b-auth-results.json`: administrator login/session 200, authenticated reconciliation 200, expired signed JWT 401, refresh rotation 200, old refresh 401, logout 200, logged-out access token 403, revoked refresh 401, viewer/staff authorized reads 200, other-tenant project 404, anonymous 401. Token values were not saved in the results.

`d6b-conflict-results.json`: independent manager reviewed the browser-created synthetic claim (201); stale revision 0 and concurrent stale revision returned 409; exact same command/key returned 201 with semantically identical result; viewer write returned 403. An initial byte-order-sensitive JSON comparison was corrected to deep semantic equality; there was no duplicate-post defect. Manager credentials were prepared only in this isolated fixture. Review provenance explicitly identifies HTTP synthetic evidence.

## Production migration preparation — read-only checks

Read-only preflight connected to the populated clone and inspected source registration, catalogs, role attributes, function grants and current closure guard. No migration command was executed against an operational database, and no upgrade was inferred from schema synchronization.

| Check | Evidence and verdict |
| --- | --- |
| Identifiers/registration | **BLOCKED**: duplicate identifier `1689500000007` in `AddVisualWarehouseAndSerialNumbers` and `ProductionReconciliation`; latter unregistered. Migrations 18–29 are absent from `src/db.ts` registration. Registered array placement is not proof of upgrade ordering |
| Applied ordering | **NOT VERIFIED**: clone has no applied migration journal; preflight cannot derive a production pending plan. No clean sequential historical upgrade is claimed |
| Restricted grants | 67 installed functions inspected; zero PUBLIC EXECUTE grants. Captured per-function runtime/identity/ledger grants and pinned search paths; restricted-role regression/recovery passed |
| Closure guard migration 32 | Installed guard retains balance LEFT JOIN, held-claim and slot coverage checks. Four migration-focused regression tests passed; dedicated recovery retained closure denial in all phases |
| Refusal/rollback | Source/tests enforce migration 32's isolated test database/schema and predecessor assumptions; non-synthetic application refuses. `down` refuses destructive rollback and requires paired backup/approved recovery. No operational refusal probe or destructive rollback executed |
| Old/new formats | Populated clone retained 42 material, 17 recipe-material and 28 slot accounts; regression/recovery covered retained formats and claims |
| Historical compatibility | **NOT VERIFIED for production**: synthetic historical review/simulation and replay passed; no production historical data clone or applied upgrade chain was provided |
| Startup | `synchronize:false`, automatic migration execution not enabled, restricted schema/search path and isolated writer guard retained; trusted frontend flags default off; builds exercised default and explicit synthetic opt-in |
| Migration identity | Clone owner connection is superuser; preflight correctly **BLOCKED** it as a deployable migration credential. Runtime/identity/ledger connections remained distinct restricted roles |
| Backup preconditions | Synthetic schema dump/transactional restore succeeded; destination and 14-day configured retention checked. Paired private-file recovery, scheduled retention enforcement, off-host copy and intended-host ACLs remain unverified |

Private artifacts: `d6b-preflight.json` (expected nonzero/NO-GO), `d6b-migration-inspection.json`. The preflight's intended-host NOT_VERIFIED items are retained; later isolated checks do not retroactively turn them into production passes. Production migration remediation requires a separately reviewed migration plan; this evidence-only acceptance does not change identifiers, register migrations or make synthetic guards production-capable.

## Isolated Windows deployment/recovery rehearsal

Actual built-server start, process stop, restart and final stop succeeded. Listener inspection showed only `127.0.0.1:3104`; database readiness, `/healthz`, `/readyz` and `/sw.js` returned 200. A production-mode child without JWT secret exited 1 with startup refusal. Sampled diagnostics contained none of the actual JWT secret, database URL, synthetic password or Bearer pattern. Secret values were never included in this report.

This exercised Windows-compatible processes, not installation as a Windows service. Service manager registration, restart policy, TLS/reverse proxy, remote bind/firewall, offline devices, filesystem ACLs, production monitoring, real secret storage and the actual production host remain **NOT VERIFIED**. Backup retention was configured/checked, not aged for 14 days. Process termination was verified; graceful request draining was not established.

Dedicated recovery ran restricted authenticated HTTP **before restart / after actual PostgreSQL fast restart / after fresh nonempty database restore**. The postmaster identity changed. Each phase passed fresh authorized mutation, exact-key retries, replay and residual-hold closure denial. Recovery mutations were synthetic HTTP fixtures, not browser actions. Reconciliation hash was identical in every phase:

`ea4ee282e4a8061e9c53bb1ce19c2de7b076ba0fd239abc8fd23818587ea1127`

The restored database was newly created; source records were not reset. The application was restarted afterward with its restricted roles restored and authenticated shell observed, then stopped. Evidence: `.local-dev/d68-recovery-summary.json`, `d68-recovery-{before,restart,restore}.json`, `d6b-recovery.log`, `d6b-lifecycle.json`, `d6b-service-lifecycle.json` and restarted server logs. This schema recovery does not establish paired database/private-file production recovery.

## Regression and evidence inventory

| Executed check | Result | Private artifact under `.local-dev/` |
| --- | --- | --- |
| Full serial regression | **82 files passed, 2 skipped; 628 tests passed, 2 skipped**; 170.42 s | `d6b-regression-final.log`, `d6b-evidence.json` |
| Typecheck | **PASS** | `d6b-typecheck.log` |
| Default-off frontend/PWA/server build | **PASS**; existing large-chunk warning | `d6b-build.log` |
| Synthetic packing/delivery build | **PASS** | `d6b-enabled-build.log` |
| All-three-flags synthetic build | **PASS** | `d6b-all-enabled-build-final.log` |
| Preflight unit checks | **4 passed** | `d6b-preflight-tests.log` |
| Opt-in production recovery harness | **3 phases passed**; separately covers recovery omitted by ordinary suite | `d6b-recovery.log`, `d68-recovery-summary.json` |
| Real application browser | **PARTIAL**, observed matrix above | `d6b-browser-evidence.json`, in-app interaction trace |
| Auth/tenant/conflict HTTP checks | **PASS for enumerated cases** | `d6b-auth-results.json`, `d6b-conflict-results.json` |

Initial sandbox PostgreSQL EACCES/timeouts and a stalled sandbox build are excluded from passing evidence; the elevated isolated final regression/build completed. No second regression was needed after documentation-only delivery. Private scripts, credentials, dumps, databases and logs remain ignored local artifacts; only acceptance documentation is delivered.

[Evidence manifest](D6B_EVIDENCE_MANIFEST.json) records byte lengths and SHA-256 hashes for the retained private artifacts. It contains no credentials or raw business data and does not replace the underlying evidence.

## Remaining blockers and stop boundary

Full browser acceptance requires complete positive school approval, blind count, procurement/receipt/QC, production/recipe, packing, delivery/installation and independent-review transactions with verified synthetic prerequisites; conflict/retry/role/browser expiry and responsive/accessibility coverage must be completed for those paths. HTTP regression is not a substitute. The duplicate login alert is a retained UX finding.

Production upgrade requires resolved registration/identifiers, a reviewed applicable closure migration path, a populated historical clone with an applied journal and non-superuser migration authority, plus refusal/recovery evidence. Intended-host deployment, paired private-file recovery and retention operations remain unverified.

O1–O10 still require named, scoped business approvals. Even a future independent software PASS cannot authorize ownership implementation or a pilot. Stop after D6-B: no main merge, force push, deployment, production migration or pilot cutover.
