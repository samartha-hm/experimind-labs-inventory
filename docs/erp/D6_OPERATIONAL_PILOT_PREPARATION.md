# D6 operational pilot preparation

Software verdict: BLOCKED (D6-C). Operational pilot: NO-GO.
All rehearsal records are SYNTHETIC TEST EVIDENCE. No real stock or deployment is authorized.

## Current D6-C decision and acceptance verdicts

The [ownership decision contract](D6C_OWNERSHIP_DECISION_CONTRACT_DRAFT.md) is **DRAFT / NOT AUTHORIZED**. O1–O10 give recommendations, alternatives, conserved accounting examples, risks and exact accountable approvals. The proposal is ready for business review; no named approver has approved it. Its future adversarial matrix is a specification, not executed acceptance evidence.

| Required verdict | D6-C result |
| --- | --- |
| Residual-hold closure protection | PASS in retained restricted-role regression/recovery; migration 32 unchanged |
| Ownership proposal | READY FOR REVIEW; DRAFT / NOT AUTHORIZED |
| Business approval and settlement implementation | BLOCKED; no approval, transfer, settlement or historical activation added |
| Full-app browser acceptance | PARTIAL; login/navigation/reload/logout recovered, transaction and role acceptance incomplete |
| D6 software preparation | BLOCKED by missing authority and incomplete full-app acceptance |
| Operational pilot | NO-GO; intended-host acceptance NOT PERFORMED |

### Login investigation and infrastructure repair

The synthetic account exists in the intended isolated schema, is active/unlocked, has a matching password hash, and connects through the configured restricted database roles. PostgreSQL recovered after its interrupted local startup and returned ready; no schema reset was used. The older full-app stall is not evidence of incorrect credentials or an authentication product defect.

Three concurrent workspace dev servers consumed scarce memory on the 8 GB host (about 240 MB free). Even health/auth requests stalled, while fresh browser navigation timed out during cold frontend compilation. Only the verified workspace-owned duplicate servers were stopped. Vite now excludes `.local-dev` PostgreSQL files and `.test-tmp` rehearsal artifacts from its watcher. With one server and frontend compilation settled, a fresh tab on `http://127.0.0.1:3102` authenticated through the actual form. This establishes a recovered local path and observed infrastructure contributors; it does not isolate watcher activity as the sole cause or establish intended-host performance.

| Investigation / actual-screen check | Current evidence and limit |
| --- | --- |
| Origin, request and response | Fresh 3102 origin; synthetic HTTP login 200 with user/token and HttpOnly refresh cookie; no credential/token retained in this report |
| Loading and dialogs | Actual form advanced to authenticated Approver/Administrator shell; no native dialog observed on successful login. Invalid-password/error recovery remains unverified |
| Session persistence | Actual reload retained authenticated shell; actual Sign Out returned to login. HTTP logout 200; reuse of revoked refresh token on registered `/auth/refresh-token` returned 401 |
| Procurement | Actual Replenishment screen rendered reservations/purchasing, material quantities and inspection controls; no new procurement transaction claimed |
| Production | Actual Preparation queue rendered retained synthetic work orders and explicit legacy read-only readiness blocker; keyboard Return exercised Retry readiness |
| Trusted production / packing / delivery | Full-app positive acceptance NOT VERIFIED. Current production feature flag is absent; packing/delivery require a retained package query parameter. These entry conditions were not bypassed or treated as business authority |
| Readiness, residual-hold closure | Current component/restricted HTTP evidence retained below; actual full-app operator path NOT VERIFIED |
| Responsive / keyboard | Authenticated overview document/body widths equalled 390, 1024 and 1440 px viewports (no document overflow); viewport reset. This is shell layout evidence, not complete workflow/device acceptance |
| Role/tenant denial, conflicting retries | Targeted backend regressions pass; actual full-app role switching, cross-tenant denial and positive transaction retry/conflict remain NOT VERIFIED |

Private evidence: `.local-dev/d6c-auth-http.json`, `d6c-browser-app.log`, `d6c-postgres.log` and the in-app tab 6 interaction trace. Earlier probes of nonexistent `/auth/me` and `/auth/refresh` reached SPA/404 behavior and are excluded from session verdicts. Browser navigation timeouts during cold compilation are retained as limitations, not silently counted as passes. Completion requires a controlled single-server session with documented synthetic feature flags/package entry points, then actual production/packing/delivery/readiness writes, reload/retry/conflict and role/tenant checks at all requested sizes. No full-app end-to-end PASS is claimed.

### Current verification

Focused authoritative integration: **37 passed**. Final full serial regression: **81 files passed, two skipped; 615 tests passed, two skipped**. TypeScript and PWA/server build passed. An earlier run overlapped dev servers/build under memory pressure and hit two fixture timeouts before being stopped; the final suite ran alone and passed. Private evidence: `d6c-focused.log`, `d6c-full-serial-final.log`, `d6c-typecheck-final.log`, `d6c-build-final.log` under `.local-dev`.

The existing `.local-dev/d632-recovery-summary.json` remains applicable: this change adds no ledger, migration, authority or database mutation logic. Its before/restart/fresh-restore phases preserve restricted authenticated mutations, original-key retries, replay, fingerprints and residual-hold closure denial. Paired private-file and intended-host recovery remain unverified. Historical D6-R results below are retained as historical evidence, not substituted for current full-app acceptance.

## Delivered authority

Authenticated, organization-scoped operational records persist through the trusted ledger writer. Commands record actor, observation time, evidence identifier/provenance/SHA256, revision, payload fingerprint and classification. Independent authorized reviewers may record REVIEWED, REJECTED, MORE_EVIDENCE or EXPIRED; these decisions never mean operationally VERIFIED. Immutable revisions and same-key exact retries retain the original response; conflicting payloads, stale revisions, self-review, revoked sessions and foreign scope are rejected. Runtime/identity roles cannot insert records; the writer cannot update/delete them.

The stocktake UI supports scope assignments, two independent counters, UNKNOWN quantities, alternating passes, discrepancy/recount and independent review. Before the second pass, another counter's quantity is withheld, including history. Agreement does not post stock or authorize an opening balance. Retained evidence is available after reload and as attributed JSON. Uncertain UI saves retain the original command/key for retry during that page session; reload requires history reconciliation.

The readiness dashboard separates retained claims from verification and keeps physical stock UNKNOWN and device acceptance NOT TESTED until real authority exists. Simulations and submitted hashes are not proof of the referenced artifact's authenticity or availability.

## Synthetic transaction rehearsal

School A: two complete Grades 8–10 kits, six common crates and two universal crates. School B: three Grade-8-only common kits, three common crates and no universal crates. One independent Math quantity is included for A. Shared output SKU demand is aggregated with all frozen source lines retained; packing remains bound to each approved line. Sub-unit SQL proof formatting is canonicalized.

The test exercises approval, recipe material budgets, verified synthetic opening input, work-order claim/issue/output, full allocation, all six QC checks, blocked pre-QC dispatch, dispatch, partial acknowledgment, exact retries/duplicate rejection and installation acceptance. Closure and its same-key retry now fail closed without a completion record. Input conservation is checked; delivery acknowledgment does not move physical stock. The synthetic recipe consumes 3.7 g to produce 3.7 m; this is recipe yield, not a stock-unit conversion. It does not prove procurement lineage.

Two P0 gaps prevent a full end-to-end PASS:

- Procurement PR/PO/receipt/incoming-QC acceptance runs separately. There is no approved transfer contract linking purchased raw-material ownership into this recipe journey. Implement and independently test explicit ownership transfer; do not fabricate continuity with direct SQL.
- Output-material commitment holds remain although delivery slots are fulfilled. D6-R prevents new closure with these residual balances. Historical closed records are preserved and report their blockers; no settlement, deletion, reopening or inventory release is implied.

## D6-R ownership transition matrix

| Existing operation | Authority / exclusive ownership | Permitted transition |
| --- | --- | --- |
| School approval | Frozen school deliverable entitlement, material and slot accounts | Establishes approved demand; not physical inventory |
| PR / PO source coverage | Procurement planning hold and immutable source witness | Existing purchase/QC workflow only; a coverage claim is not a second exclusive physical-stock reservation |
| Accepted incoming QC | Receipt custody and explicit physical posting | Posts accepted physical quantity exactly once; preserves procurement commitment A/F/H/U |
| Recipe / work-order claim | Recipe-derived material budget; exclusive input reservation and output entitlement claim | Uses existing work-order authority; no authorized procurement claim transfer is specified |
| Work-order issue | Reserved raw input at its location | Consumes input reservation and debits physical raw stock once; consumption remains irrevocable |
| Finished output | Produced-output custody against issued recipe inputs | Records output once; no additional raw-stock debit or implicit procurement settlement |
| Packing / dispatch | Output allocation and dispatched package custody | Allocation/QC/dispatch do not fulfill raw-material claims or create stock |
| Delivery acknowledgment | Frozen school delivery slots | Fulfills delivered slots once; no physical-stock mutation or material-hold settlement |
| Project closure | All current delivery, installation, custody and commitment evidence | Blocked while any account or claim has a nonzero hold, or delivery slots remain unfulfilled |

Required business decisions: identify the procurement source entitlement and recipe destination, their units/yield witness, which liability/approval owner authorizes a partial transfer, and the append-only event that settles output-material ownership. Specify cancellation/remainder and retry/concurrency semantics. Shared school/SKU identity is insufficient authority. No transfer or settlement has been invented; its partial-transfer/concurrency acceptance remains BLOCKED.

Migration `1793232000032` replaces only the existing D4 closure predicate, preserving function identity/ACL and all data. It includes claim-held evidence even where a balance cache is absent. Its scope guard permits only the isolated synthetic database/schema, and its rollback refuses removal of the protection. Production upgrade remains BLOCKED pending clone rehearsal and an approved deployment path. The authenticated progress response reports per-account approved, fulfilled, held, uncommitted and claim-held quantities; these are commitment units, not available warehouse stock. Existing production/physical reservation and procurement blockers remain in force.

## Preflight and recovery

Run `node scripts/ops/pilot-preflight.mjs` with separately supplied environment variables. This read-only tool reports PASS/BLOCKED/NOT_VERIFIED, severity, evidence reference and corrective action. Opt-in local PostgreSQL checks are bounded and read-only; schema-aware journal comparison lists pending/unregistered migrations. It never applies migrations, rotates credentials, restarts services or grants GO. Source registration alone does not establish upgrade safety.

The isolated recovery runner fingerprints populated stock, commitment, custody, operational evidence and audit tables; restarts only a verified workspace-owned cluster, restores a nonempty dump to a fresh database, replays commitments and checks fresh authenticated restricted-role HTTP plus original-key retries. Results are private local artifacts. Database recovery does not verify private-file restore, production ACLs or operational disaster recovery.

## Remaining real gates

P0: authorize the missing ownership transfer and material settlement contracts; approve an independent operational verification contract; rehearse production migration ordering on a clone and reconcile its journal. Closure protection is implemented; residual ownership itself is unresolved.

P1: accountable operators must perform warehouse coverage/variance review and separately authorize opening stock; print and scan representative QR/PDF labels on actual devices; complete supervised staff scenarios; provision intended-host credentials; test paired private-file restore, service lifecycle, HTTPS/LAN ACLs, 25-operator load, offline/reconnect/PWA freshness, logging/retention, feature flags and rollback. Retain attributed evidence and independent review for each gate.

No live credential was rotated and no pilot GO transition was introduced. Local synthetic checks cannot satisfy these real gates.

## Validation retained for this implementation

Current D6-R regression: 80 files passed, two skipped; 611 tests passed, two skipped (one worker). The initial parallel run had two five-second fixture timeouts and cascading failures (603 passed, eight failed); the serial rerun passed. Targeted authoritative integration: 37 passed. Eight preflight/recovery-helper tests, four additional migration safety tests, TypeScript and PWA/server build passed. Private evidence: `.local-dev/d6r-evidence.json`, `d6r-full-serial.log`, `d6r-ops-tests.log`, `d6r-typecheck-final.log`, `d6r-build.log`. These results do not resolve the two P0 business-contract gaps above.

Historical D6 evidence observed synthetic login and authenticated retained evidence/count and NO-GO rendering, but controls disappeared between interactions. Historical recovery passed three phases; it predates this closure change and is not current recovery proof. Current D6-R browser/recovery results are recorded below; no database-only assertion establishes full-app browser acceptance or physical device acceptance.

Current read-only preflight: `.local-dev/d6r-preflight.json`; ready=false, pilot=NO-GO, missing operational role/environment configuration, migration registration BLOCKED, applied journal and feature flags NOT_VERIFIED. Startup/boundary regression tests passed; this source-only invocation supplied no intended-host credentials and applied no migration. Actual host acceptance: NOT PERFORMED.

| Required verdict | D6-R result |
| --- | --- |
| Procurement-to-production authority | BLOCKED: approved transfer contract absent |
| Material stock and reservation reconciliation | PARTIAL: synthetic input conservation passes; procurement lineage and residual material ownership unresolved |
| School closure accounting | Protection PASS; settlement BLOCKED; historical evidence retained |
| Exact two-school rehearsal | BLOCKED end to end; required crate mix, Math and downstream synthetic execution pass through installation; procurement separate and closure denied |
| Browser acceptance | PARTIAL: authenticated component checks PASS; full-app operator acceptance INCOMPLETE |
| D6 software preparation | BLOCKED by ownership authority and incomplete acceptance |
| Operational pilot | NO-GO; intended-host acceptance NOT PERFORMED |

## Current D6-R recovery and browser evidence

Guarded database recovery PASS: `.local-dev/d632-recovery-summary.json` records a verified workspace-cluster restart and a nonempty dump restored into a fresh database. Before/restart/restore phases pass restricted authenticated HTTP, fresh mutations, original-key retries, commitment replay and fingerprints. All three phases confirm unresolved material ownership still blocks project closure; no closure receipt exists for the exact rehearsal. This does not prove paired private-file or intended-host recovery.

Authenticated component browser checks PASS: `.local-dev/d6r-component-browser.log`. Production, packing and delivery use real restricted HTTP with a bootstrapped authenticated profile. Checks include keyboard retry, accessible DOM QR previews, package lookup rejection, PDF downloads, responsive delivery layouts at 390/1024/1440 pixels, residual-hold messages and disabled closure. Obsolete iframe-preview assertions were corrected to test the current accessible previews. These checks do not exercise full-app login or establish complete role/positive-transaction acceptance.

Full-app browser acceptance INCOMPLETE. Fresh in-app tabs on local ports 3100 and 3101 displayed the login form. Port 3100 showed a loading screen after submission; reload returned to login. A clean-origin attempt on 3101 did not establish an authenticated operator screen, including after keyboard submission. No current full-app write/reload/role/responsive PASS is claimed. Captured browser errors were empty and a bounded synthetic database activity check found no active query; neither observation establishes a product or browser-infrastructure root cause. Keep this distinct from the passing component and database tests.

Infrastructure interruption: local tool sessions/browser bindings disappeared and the workspace PostgreSQL service stopped during execution. The earlier synthetic schema was absent after restart. Fresh isolated evidence was regenerated and the current targeted suite passed 37 tests before the successful recovery/component checks above. Do not attribute this interruption to a product regression without further evidence. Current artifacts use schema `requirement_test_5f11bc62677d4c48915c2c67cc2ea27d`; older artifacts are not substituted for current proof.

Missing-contract adversarial cases (partial ownership transfer/remainder, competing transfer consumers and transfer retries) remain BLOCKED rather than simulated as an authorized transition. Existing physical issue/concurrency, tenant/school/unit, rollback, restricted-role and delivery retry checks remain regression evidence for their own authorities.
