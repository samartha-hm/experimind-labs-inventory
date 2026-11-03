# ERP accelerated completion sprint

2026-11-03. Branch feature/kit-builder-milestone-1. Recovery and bounded delivery integration completed; broad platform acceptance remains unfinished.

## Connectivity and classification

Sandbox policy caused PostgreSQL/HTTP loopback EACCES, GitHub DNS failures and a subsequent Vitest temporary-file rename EPERM. Approved unrestricted execution restored access. No firewall, security policy, dependencies, credentials or database configuration changed. PostgreSQL listens on 127.0.0.1:55432. Run `node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run` with permitted loopback access; plain npm test does not load that environment file. Integration suites guard their local test database target and create isolated schemas.

Prior failures: advancedOperationsGate 4 and legacyOperationsGate 16 HTTP tests now all pass; environmental failures, no application defect found. Seven previously setup-failed database suites now pass: packing 19, productionPlanning 11, productTemplates 23, projectPlanning 14, requirementApproval 37, stocktakes 17, supplyPlanning 9. These account for 130 of the prior 132 skips. The other two tests, receiptRecovery and productionRecovery, remain intentionally gated by explicit recovery phases; blindly enabling preserved-schema recovery is not an ordinary regression.

## Final verification

Full regression: **658 passed, zero failed, two intentionally skipped; 660 tests across 87 files; actual process exit 0**. Includes 12 new lookup regressions and the prior manifest pagination regression. Focused runs: 20 HTTP tests, 130 database tests and 12 lookup tests passed. TypeScript --noEmit, frontend/PWA and backend esbuild passed. Build outputs are private .local-dev/recovery-default and .local-dev/recovery-server.cjs; running dist preserved.

Private evidence: .local-dev/recovery-full.json, recovery-full.log, recovery-http.json, recovery-db.json and recovery-build.log.

## Application fixes

Generated QR destinations were full URLs, while delivery lookup accepted only a UUID/code and required a separately loaded packing plan. Delivery now parses same-origin generated QR URLs and resolves package ancestry against loaded authorized packing or frozen dispatch snapshots. Unknown/project-excluded packages, foreign/ambiguous URLs, incomplete ancestry and duplicate dispatch custody fail closed. Scanned URLs are never fetched. Plan/dispatch selection and subsequent scans clear stale receipt inputs, selected units, confirmation and preview. Lookup never acknowledges physical units.

Twelve regressions cover QR/PK/UUID inputs, project/loaded-tenant boundaries, input immutability, absent packing plans and ambiguity denial. Synthetic headless Edge panel verification passed at widths 375/1440/3840: frozen dispatch lookup, unchecked receipt units, viewer receipt disabled and invalid-scan clearing of selection/recipient; zero non-GET requests and page errors. Evidence: .local-dev/recovery-lookup-browser.json and its private reproduction script. This uses mocked GET responses and is not a live physical delivery journey or comprehensive responsive audit.

Prior local commit d6538c0 repairs manifest pagination with a long-name PDF regression; retained for publication with this branch history.

## Preservation and acceptance limits

Fresh read-only comparison against .local-dev/d6f8-final-health.json: **all 111 preserved tables match prior row counts and content hashes**, including audit history; zero changed tables. Evidence: .local-dev/recovery-preserved-result.json. Ordinary integration tests created isolated schemas. No operational stock or preserved fixture data changed. Role grants, credential configuration, feature flags, AGENTS.md and unrelated .test-tmp/ were not edited. Trusted packing stays OFF by default.

Existing partial receipt, installation, closure, accounting, authorization and idempotence coverage passes in the full suite; new live end-to-end acceptance for these workflows was not performed. Physical QC and recipient acceptance remain outstanding. D6 BLOCKED; pilot NO-GO. O1-O10 authority and historical migration provenance remain unresolved. No production deployment, main merge, force push, migration, settlement or cutover.

## Git and next work

Initial local SHA independently read: 8370f79906227121e5e4014e1c19a0fa66c68f7c. Initial live remote SHA independently obtained with git ls-remote: c75c9b621f2290b03e0ba02b10c26cf7b65a7a73. GitHub HTTPS is reachable under permitted execution. Implementation publication is recorded below after committing.

The follow-on workflow verification and remaining acceptance limits are recorded below. Full platform completion is not established.

Publication verified: local implementation SHA from git rev-parse HEAD and independently queried live remote SHA from git ls-remote both equal **2e3081ac0c654ae79c7ac455704f7d1314fff3e2**. Normal push advanced the feature branch from c75c9b6 to 2e3081a, including earlier local pagination commits. A following documentation-only commit records this observation; its final branch SHA is verified separately in the session result.

## Follow-on dispatch-to-closure software checkpoint

Started at independently read local SHA **fced1b97d6ccc81d121e7c4103efc4b30e28d51c**, on the same feature branch. The earlier results above are historical; the following results supersede their test totals.

Repaired the existing TrustedDeliveryPanel rather than adding another workflow. A synchronous in-flight guard prevents duplicate submissions; context generations discard stale mutation/refresh results. Saved requests retain their original idempotency key and payload, are validated before replay, and fail closed when unreadable. Clearing requires a successful refresh and an independent reconciliation confirmation. Selection changes clear action evidence. Successful writes disable further actions until refresh succeeds; refresh failure is distinguished from an unacknowledged write.

Connected the existing installation reopen action, with evidence and confirmation gates. Installer completion now reflects full school receipt, required checklist completion and unresolved issues. Recipient acceptance remains a separate action. Added school-scoped A/F/H/U reconciliation with material and slot units kept separate, claim holds, and expandable installation/closure audit snapshots. No accounting, service authority or schema rules changed.

Workflow trace: PackingPanel/App feature gates -> TrustedDeliveryPanel -> authenticated `/production-planning/trusted-delivery` and `/operator/delivery/*` routes -> TrustedLedgerAuthority -> existing trusted delivery/completion services -> dispatch, receipt, installation, commitment and immutable event records. TrustedCompletionService supplies tenant-scoped reconciliation and closure blockers; ProjectCompletionService handles installation revisions and reopen/accept history. Runtime writes still require session authority and the existing isolated synthetic activation checks.

| Workflow | Current evidence |
| --- | --- |
| QR lookup, frozen dispatch identity, manifests/labels | Existing focused lookup and PDF/label regressions; earlier read-only browser evidence above |
| QC eligibility, role/tenant/session denial, duplicate dispatch | Authenticated isolated integration tests; unchanged dispatch replay also exercised in supported browser |
| Partial school receipt, concurrent duplicate acknowledgment, F/H conservation | Isolated integration tests, including partial-to-complete receipt; no new browser receipt claimed |
| Installation checklist, issue correction, stale revisions, partial-receipt denial | Isolated integration tests |
| Reopen, installer finish, recipient acceptance | Supported browser using the real panel and authenticated isolated API; four POST receipts, all 201 |
| Reconciliation, residual material holds, closure denial | Browser displayed school quantities and two 0.2000 m ownership holds; close control disabled. Integration tests verify server denial and no exception bypass |

Browser review used an opt-in local fixture harness, a synthetic AuthContext profile and a genuine isolated test-session bearer token. It was not the full application's login flow or operational physical acceptance. Saved dispatch replay returned original ID `09ef6136-e908-4e48-a110-bae329790c9a` without another dispatch. Installation `bf7d65c4-9fab-4ba5-9956-ba1fa4bd5fcb` moved completed -> in_progress (revision 7, prior acceptance cleared) -> installed -> completed (revision 9). Reopen/finish/accept were disabled until their respective evidence/confirmation prerequisites were supplied. Both schools remained 2/2 received, and closure remained blocked. Actual screenshot and response receipts: private `.local-dev/sprint-delivery-browser.png` and `sprint-browser-receipts.json`. Screenshot precedes a source text-encoding correction; it is retained as captured evidence. The harness bundles in memory and does not persist the bearer token.

Verification: focused **46 passed**, including nine saved-request regressions; browser-attached integration **37 passed**. Final full regression **667 passed, zero failed, two intentionally gated recovery skips; 669 tests; exit 0**, run with one worker. TypeScript --noEmit, frontend/PWA build and backend esbuild passed. Private outputs remain under `.local-dev/sprint-*`; running dist was preserved. Frontend has the existing large-chunk warning. Fresh read-only fingerprint comparison: **111 tables identical, zero changed**, including audit content. Frontend production/packing/delivery flags remain unset/OFF in the development environment and require literal `true`; backend still requires authority and installed tables, with server authority activation restricted to the isolated loopback test database/schema.

Failures retained: the first browser-attached run exceeded the existing three-minute test limit; only explicit review mode now receives an extended limit. The first full regression, concurrent with building, passed 666 tests and failed the existing five-second database lock-wait observation. The subsequent serial full run passed without changing that test or production behavior. A PowerShell stderr/native-command wrapper initially obscured build exit status; a direct child-process runner established frontend exit 0 and the backend API build established exit 0. Earlier sandbox EPERM required permitted execution, without security/configuration changes.

Completed software work covers dispatch recovery, delivery reconciliation presentation, installation recovery/acceptance controls and closure readiness presentation. Broader navigation/responsive acceptance, full application login-to-closure browser coverage and physical/business acceptance remain outstanding. No operational QC, stock movement, delivery or recipient acceptance was fabricated; all new browser writes targeted the disposable synthetic integration schema. Preserved fixtures, prior evidence, AGENTS.md and unrelated `.test-tmp/` were left intact. D6 **BLOCKED**, pilot **NO-GO**; physical QC/recipient sign-off, O1-O10 authority and historical provenance remain unresolved. No deployment, main merge, force push, settlement, migration activation or cutover.

Next bounded task: exercise partial school receipt and unchanged retry/reload in the full application shell using an isolated authenticated fixture, capturing before/after custody quantities without operational writes. Publication hashes are recorded after the implementation checkpoint in SESSION_HANDOFF.md and the final session response.
