# Milestone 13H — acceptance

PASS for bounded packing evidence integration; stop for review before QC approval
or further operational writes. Legacy Packing/QC remains default. No migration.
See [supported contracts and blockers](MILESTONE_13H_CONTRACT_MATRIX.md).

## Integrated and blocked actions

Scan/Enter selects server-authorized package identity without writing. Stable
school/project/kit/package/QR context, order revision and provenance accompany
package assembly/reset, missing/damaged/other exception reporting and supported
correction. Nonblank reason and explicit identity acknowledgment precede review
and save, including acknowledgment of progress reset. Server persistence and reload
precede completion feedback. Required, picked, assembled allocation and inspected
quantities are distinguished; allocation is not a measured physical count.

Measured actual quantities and separate checklist criteria lack suitable existing
write contracts and remain read-only. Accepted package/ancestor rework, QC,
dispatch, picking, reservations, stock, lifecycle and approved requirements have
no integrated write action. Assembly uses existing pick/child/exception validation.

## Authorization, concurrency and recovery

Focused tests cover tenant 404, viewer 403, missing key/reason 400, unsupported
routes 405, stale revision 409 and accepted target/ancestor protection. Existing
current-role authentication, tenant scoping and transactional service validation
remain authoritative. Different keys racing the same revision yield 200/409;
identical concurrent key/body replays once; altered body with the same key fails.
Guarded assembly succeeds after valid synthetic picks without further stock writes.

Browser acceptance commits an exception then deliberately loses its response.
Reload restores the exact pending body/key and retry produces one event. Correction
and reset produce exactly two further events, all attributed to the authenticated
staff operator. Cross-tab reload observes the saved revision. Simulated 403/409
preserve unresolved intent and require explicit reconciliation; API tests exercise
real permission and conflict responses. SessionStorage recovery ends when that
browser session/storage ends; review history before initiating a replacement.

## Operational reconciliation

Own synthetic development order was created/released before the browser baseline;
no company records were used. Order revision 2 to 5 contains exactly one reported
then corrected exception and one assembly reset, with three SupplyEvents. Status
remains packing; package QC remains pending. Snapshot, change requests and every
other order field except execution/revision/update attribution are unchanged.

Complete table fingerprints before and after are identical:

| Table | Rows | MD5 of ordered complete rows |
| --- | ---: | --- |
| inventory_items | 12 | 22c2ce24c00be7fefb375b1c598f7629 |
| stock_ledger | 20 | 503075566241331bfa340c247e5a6231 |
| project_stock_reservations | 5 | b20e3c152d875a2b1fba531fe5f6e600 |
| packing_picks | 4 | 2395d20e7b1283fac1d1a5b7639aaf8a |
| planning_projects | 6 | 94d2552af6e3546f1854f5dd17d44e93 |
| planning_sites | 12 | d4f9c51f5cd3d65e8882ff95c17ea2e6 |
| product_template_versions | 22 | 90812834a750741fe78abc09cc3e8329 |

No duplicate deduction, reservation change, QC approval, dispatch-ready transition,
inspection bypass or approved requirement modification occurred. Integration tests
independently reconcile synthetic API action baselines, including assembly.

## Browser, accessibility and rollback

Authenticated standalone Edge: desktop 1440x1000, tablet 768x1024 and reflow 390x844
pass; no workspace horizontal overflow, minimum action targets 48px. Scoped axe
has zero violations and zero incomplete checks at all three sizes. Keyboard wedge
Enter, focus, reason/acknowledgment gates, interrupted save recovery, durable
exceptions and cross-tab refresh pass. No application page errors remain after
excluding the existing development WebSocket close error. In-app browser was
unresponsive; standalone Edge fallback was used. Physical tablet/scanner/printer,
staff, screen-reader and actual browser zoom acceptance remain pending.

Actual server restart with workspace/execution flags off restores legacy QR lookup.
Legacy detail exactly equals the newly saved order; rollback fingerprints including
packing orders and SupplyEvents remain unchanged. No flag was persisted. Production
is disabled; opt-in development/test requires both workspace/execution flags and
an exact organization allowlist. No schema or data conversion is needed to revert.

## Automated verification and evidence

- Focused contracts/API: 23/23 passed; final full suite includes guarded positive assembly.
- Final full suite: 529/529 tests, 72 files, 30-second test budget, maxWorkers=2.
- Typecheck and frontend/PWA/server builds passed; existing bundle-size warning remains.
- Browser harness syntax checks and git diff whitespace checks passed.
- Ignored evidence: .local-dev/13h-{focused,full-suite,typecheck,build}.log and
  .local-dev/ux-13h/{browser-report,rollback-report}.json plus screenshots.

Earlier attempts exposed database setup-hook timeouts with default workers,
foreground PostgreSQL process termination and a rollback startup race; final runs
passed after bounded workers, detached isolated PostgreSQL and readiness checks.
Development HMR was disabled for stable browser acceptance. Browser assertion
selectors were tightened; audit identity now comes from authenticated server context.
These are development validation constraints, not claims of physical acceptance.
