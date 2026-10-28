# D5 ERP readiness and pilot gate — 2026-10-28

All evidence below is **SIMULATED / SYNTHETIC TEST EVIDENCE**. This is a
software acceptance record, not physical inspection, staff sign-off or pilot approval.
Branch: `feature/kit-builder-milestone-1`.
Starting revision: `e4096befe09e8fe535e1810acba77ea7d7e6cd2a`.
Implementation revision is recorded in `.agent/SESSION_HANDOFF.md`.

## Six independent verdicts

| Gate | Verdict | Evidence / remaining condition |
| --- | --- | --- |
| Trusted supplier receipt/QC | PASS, scoped synthetic software | Authenticated PR → PO → receipt → quarantine/accept/reject, caps, durable retries, restricted-role and recovery checks. No physical supplier acceptance claimed. |
| Historical review and reconciliation software | PASS for review and structural simulation only | Append-only attributed decisions, current source hashes, provenance references, competing/self/cyclic link detection, unchanged accounting. Operational quantity/cardinality mapping remains unapproved. |
| Actual historical activation | BLOCKED | Independent authoritative documents, approved mapping contract, explicit business authority and separately reviewed atomic activation required. |
| Full-app automated acceptance | BLOCKED | Positive fresh dispatch, partial acknowledgment and installation/closure browser mutations; complete role/flag/offline/accessibility matrix remain incomplete. Browser became unresponsive during stocktake confirmation. |
| Synthetic software readiness | BLOCKED | Full-app acceptance is a required gate; passing API tests and fixture previews do not replace it. D5 is not closed as PASS. |
| Operational pilot readiness | NO-GO | Physical inventory/QC, authorized staff, real devices/scanners/printers and deployment/provisioning evidence are absent. |

## Implemented scope

- Reused the trusted ledger authority for authenticated tenant-administrator PR,
  PO and supplier receipt/QC operations. No parallel stock ledger was introduced.
  Operator requests issue private scoped capabilities after live-session checks;
  durable operation fingerprints prevent changed-payload retries. Concurrent exact
  retries recover the committed result only after current authorization validation.
- Added integrated purchasing/receipt panels, verified receiving-location selection,
  explicit requirement approval and saved-request retry/reconciliation controls.
  Production retry clearing requires a fresh evidence refresh and reconciliation.
- Added read-only historical lineage simulation beside immutable review decisions.
  It requires current accepted reviews, unchanged canonical source evidence and
  identical evidence references/provenance. One incoming/outgoing structural link,
  duplicate/self/cycle and competing-link checks apply within each proposal.
- Paginated the label hub at 50 rows after a large synthetic fixture stalled the
  browser. Final-build browser navigation from page 1 to 2 of 73 succeeded.
- Preserved production authorization, audit, custody and attestation requirements.
  No schema migration, deployment or production provisioning was performed.
  Trusted production, packing and delivery UI flags still require an explicit
  environment value of `true`; they remain default-off. Isolated test builds used
  these flags enabled. The complete browser flag matrix is not verified.

## Trusted purchasing and supplier receipt/QC

Production HTTP handlers exercised approved lineage, outstanding PO coverage,
partial quantities, over-receipt denial, pending/quarantined/rejected stock,
acceptance exactly once, immutable audit, actor/tenant/operation scope, malformed
and forged requests, revocation, concurrency, restricted roles and legacy denial.
Receipt/QC does not create approved school demand, material consumption or delivery
fulfillment. Focused receipt/location checks: 37 passed.

Actual authenticated integrated-browser mutations:

| Operation | Synthetic identity / result |
| --- | --- |
| PR creation, review and approval | `78da40a4-097f-4875-9dd0-f601db3bdb22`, 0.01 m |
| PO creation and approval | `0bb1da14-ccf7-46c5-b56a-ceba6052db1a`, approved revision 3 |
| Partial receipt and quarantine → accept | `b82881a8-b951-4b5e-9061-082d850abbd3`, 0.004 m, Shelf A; verified stock 19.102 → 19.106 m |
| Rejection | `a523053b-faeb-47e0-b0cf-8e98c6f082bc`, 0.004 m; created through HTTP, rejected through browser; no stock increase |
| Remaining PO quantity | 0.002 m after those two partial receipts |

The first receipt's saved request survived application restart and was retried.
Invalid-location conflict/reconcile was exercised; the UI now offers verified
receiving locations. An earlier transient valid-location conflict has no proven
root cause and is not counted as a successful mutation.

## Historical limits and required authority

The simulation reports before/after row counts and fingerprints, conflicts,
reviewer and evidence hash. It explicitly returns `activationEnabled: false`,
`claimsReserved: false` and `verifiedHistoricalQuantity: null`. Unknown historical
stock remains unknown, including the synthetic legacy quantity 987.

This is structural proposal validation, not a complete operational reconciliation
contract. It does not reserve globally unique executable source claims, establish
quantity/unit equivalence, independently authenticate an uploaded document or
activate inventory/requirements/fulfillment. Decisions alone grant no such powers.

Activation requires all of:
1. Independent verification of each authoritative document and its linkage scope.
2. Approved mapping rules for source cardinality, quantity, units and conflicting
   claims, including explicit handling of ambiguous and previously claimed sources.
3. Explicit business authorization and a separately reviewed atomic activation
   procedure enforcing global source-claim uniqueness and accounting conservation.

No activation was implemented or attempted. Legacy QMS/RMA/signature routes stay closed.

## Integrated browser evidence and remaining gaps

Browser evidence used the actual authenticated application at `127.0.0.1:3005`,
synthetic schema `requirement_test_41aba90049184ca4aced784f280d4c6b` in the local
`experimind_kitbuilder_test` database. Fixture previews are distinguished below.

| Workflow | Actual browser evidence | Limitation |
| --- | --- | --- |
| Authentication | Login/logout, expired/revoked session behavior and fresh login | Complete supported-role browser matrix missing |
| Planning | New two-school project, Science/Math quantities, crate/material calculations and explicit revision/hash approval | Full flag matrix missing |
| Production | Input issue 0.1 g; output 0.01 m pending QC; over-issue/output denied; refresh/reconcile/retry state | Full new custody chain not completed |
| Packing | New plan `ddbb146c-3a1e-4d7d-8583-16e37d8f0f08`, allocated 0.01 m output; incomplete/empty crate QC denied | Positive six-check crate used pre-existing synthetic child allocations |
| Six-check QC | Receipt `4732ce5c-d96c-44dd-b2a7-75d1f64ecca8`, plan `77d9cb57-4576-4125-b32b-f03072b5c3fe`, all six checks passed, 6/6 material-bearing packages allocated | Synthetic attestation only; no physical inspection/staff approval |
| Labels | Actual SVG QR and package-lookup link, package resolved; 50-row pagination | No physical scanner/printer acceptance |
| Stocktake | Created, counted, reviewed and approved revision 4: `SIMULATED D5 browser input count`, 2 g Synthetic D3 input, Shelf A | Authenticated read APIs on 2026-10-28 confirm approved r4, four audit revisions and zero posting-ledger entries; NOT POSTED |
| Delivery/install/closure | Existing partial-delivery and closed-installation fixture histories reviewed | No fresh positive browser dispatch, partial acknowledgment or installation/closure mutation |
| Layout/keyboard | Scoped 390×844 phone and 1024×768 tablet width checks; desktop; search Escape/focus | Not all routes, dialogs or accessibility semantics; no real screen-reader/device acceptance |
| Errors/retries | Validation, insufficient custody, durable request/reconcile and renewed session checked | Complete offline/error/permission matrix missing |
| Historical review | Integrated review/save evidence from this D5 work; lineage conflicts covered through HTTP | Complete browser reconciliation/adversarial matrix missing |

### Explicit synthetic QC authorization and limitations

The user explicitly authorized exercising the common-crate physical-inspection
attestation only in isolated synthetic records with test identities, including
common crate #1. The authorization does not permit real stock movement, production
QC changes, physical validation, deployment or pilot activation. All evidence is
identified as **SIMULATED / SYNTHETIC TEST EVIDENCE**. Production attestation,
authorization, audit and custody requirements were not weakened or bypassed.
Physical QC remains blocked until an authorized person inspects the actual crate.

The accepted six-check request reused saved key
`41792095-bb59-4340-989c-6b56909188d8` after a fresh browser login. The earlier
409 was consistent with a stale/revoked live session; no production bypass was used.
The QC record persisted all six checks and the synthetic-only evidence notes.

During the earlier stocktake post-confirmation, browser input timed out. The dialog
API exposed no dialog; replacing the tab did not restore interaction, and closing
the affected tab timed out and reset the browser tool kernel. The authoritative
read reconciliation below now establishes that the count did not post.
No direct database write was used to substitute for the missing browser workflows.
Existing tested packing plans had no dispatch-eligible assemblies; their fixture
history is not evidence of a fresh browser custody chain. Full-app acceptance is
therefore BLOCKED even though positive synthetic six-check QC succeeded.

### 2026-10-28 reconciliation and browser infrastructure blocker

Started at `3ecdb7c3ee111cdeeb15efcfce45c6457117964e`; local and remote
feature-branch revisions matched. Unrelated `AGENTS.md` and `.test-tmp/` were
preserved. No application implementation or authorization rules were changed.

| Evidence class | Fresh result | Exact boundary |
| --- | --- | --- |
| Supported authenticated API reads | Stocktake `4c6e3a5f-db11-4c79-9fd2-a892f640997e` is approved, revision 4; history is r4 approved, r3 reviewed, r2/r1 draft; zero ledger entries for this stocktake | Read before retry and again after interrupted confirmation; local `.local-dev/d55-stocktake-read.json`; establishes no posting, not browser mutation acceptance |
| Actual authenticated browser | Fresh login and stocktake selection reached approved r4 in the full application | No new physical-stock or custody mutation verified |
| Native confirmation | One post-button click raised `Browser action "click" interrupted by JavaScript confirm` with the expected posting question | The click promise was not caught before runtime reset; after reinitialization the dialog API returned no dialog. No confirmation or second posting was submitted |
| Fresh-tab recovery | Fresh tabs loaded the authenticated dashboard; AX and role-locator Inventory clicks returned without a changed accessibility tree or navigation | Input recovery remains unreliable; screenshot `.local-dev/d55-browser-blocker.png` is only a dashboard capture, not workflow acceptance |
| Server isolation | Vite development mode exhibited login timeouts; the same local synthetic app in static production mode returned healthy status, authenticated login and stocktake reads promptly | Local serving mode only, no deployment. PostgreSQL connections through all three configured roles succeeded with no observed blocking sessions. Vite slowdown root cause remains unproven |
| Fresh integrated chain | NOT EXERCISED: fresh project/school → published source → issue/output → packing/six-check QC → dispatch/manifest → partial acknowledgment → fulfillment → installation/closure | Earlier scoped mutations and fixture histories above remain separate; no new chain identities exist |
| Browser denials/retries | No fresh complete wrong-role/tenant/revoked/flag/historical/pending-rejected QC/concurrent/offline/durable-retry matrix | Passing automated coverage does not supply missing browser evidence |
| Accessibility | No fresh route-level keyboard, dialog focus, accessible-name or overflow acceptance | Earlier scoped phone/tablet/desktop checks only; no real-device or screen-reader acceptance |
| Historical activation | BLOCKED, unchanged | Operational authorization gate; no activation attempted |

The reproduced failure boundary is browser control around a native confirmation,
with a separate development-server latency issue. This does not establish a defect
in stocktake accounting or justify removing its confirmation. No direct database
writes, fixture substitutions, synthetic staff sign-off or speculative app fixes
were used to manufacture missing acceptance. Software acceptance remains BLOCKED;
pilot remains NO-GO.

## Consolidated verification and actual recovery

| Check | Result | Local evidence (not committed) |
| --- | --- | --- |
| Full suite, fresh 2026-10-28 | PASS: 79 files passed, 2 skipped; 608 tests passed, 2 skipped; 96.02 s | `.local-dev/d55-full-tests.log` |
| Typecheck, fresh 2026-10-28 | PASS | `.local-dev/d55-typecheck.log` (successful exit; empty log) |
| Frontend/PWA/server production build, fresh 2026-10-28 | PASS; PWA 15 entries; server bundle produced; existing chunk-size advisory | `.local-dev/d55-build.log` |
| QR/PDF regressions | PASS in final automated suite | Full-suite log |
| Focused receipt/location checks | PASS: 37 tests | `.local-dev/d5-closure-receipt-tests.log` |
| Actual service/database restart and fresh restore | PASS, independent opt-in recovery execution | `.local-dev/d50-recovery-run.log`, `.local-dev/d50-recovery-summary.json` |
| Complete integrated browser acceptance | BLOCKED, scoped results above | Browser session evidence; no fabricated aggregate PASS |

No application or recovery assumptions changed in this documentation-only slice;
the prior actual recovery evidence is reused, not claimed as a fresh execution.
Two default-suite opt-in tests were skipped; the separate recovery run supplies
actual recovery evidence rather than treating a skip as PASS. Recovery used local
PostgreSQL port 55432, schema
`requirement_test_26675f7473db40c58906f1c93168811c`; a clean restart changed the
postmaster, then a new database
`experimind_production_restore_f21aa11b76ca2dc6` was restored from a nonempty backup.
Authenticated HTTP mutations, exact retries, live/restricted authorization,
receipt/QC, historical non-activation and accounting/custody checks passed before
restart, after restart and after restore. This is not restored-database browser evidence.

The nonempty baseline included 37 stock events, 243 commitment events, 104 claims,
75 entitlements, 16 work orders, 15 issues, 14 output records, 8 packing plans,
32 allocations, 16 packing QC records, 4 dispatches, 117 dispatch units,
5 delivery receipts, 4 installations, 2 closures, 125 audit records,
198 authority records and 7 historical decisions. Recovery compares persisted
counts/fingerprints and exercises conservation and exactly-once effects.

Local synthetic credentials, diagnostic helpers, logs and SQL backups remain
ignored under `.local-dev/`; do not publish them. Diagnostic QC probes rolled back
all writes and are not browser acceptance evidence. Production migration and
restricted-role provisioning remain deployment gates. No operational pilot,
real stock modification, main merge or force-push is authorized by this report.

## Remaining D5 software work

Restore reliable browser interaction; finish a fresh authenticated production →
packing/QC → dispatch → partial delivery → installation/closure chain. Complete
supported-role, default-off/enabled flag, offline/durable retry and route-level
keyboard/accessibility checks. Resolve and verify any resulting defects, then
refresh acceptance evidence. Keep historical activation and physical pilot gates
independent. Stop this delivery with D5 software acceptance BLOCKED and pilot NO-GO.
