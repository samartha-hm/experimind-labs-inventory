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

Next: authenticated delivery route-to-backend checks for partial receipt and retry/reload reconciliation; installation/closure read-only and denial checks until genuine prerequisites exist; remaining navigation/forms and module wiring audit. Full platform completion is not established.
