# D6-F full-app browser acceptance

## D6-F4 resumption — 2026-10-30

**BLOCKED — NOT PASS.** [Authenticated browser acceptance resumption](D6F4_AUTHENTICATED_BROWSER_ACCEPTANCE.md): supported inventory lists the in-app browser, but explicit selection times out after 10.48 seconds. No tab, authentication, QC or downstream transition reached; no application mutation or fresh database verification. Prior results remain historical; original allocation denial INCONCLUSIVE. D6 BLOCKED; pilot NO-GO.

## D6-F3 follow-up — 2026-10-30

**BLOCKED — NOT PASS.** [Downstream coverage matrix and evidence](D6F3_DOWNSTREAM_BROWSER_ACCEPTANCE.md): browser runtime selection/documentation timed out twice after documented recovery; zero new authenticated browser transitions or application mutations. All downstream QC/dispatch/delivery/installation and adversarial/device checks remain unexercised. The original allocation denial remains INCONCLUSIVE. No standalone browser fallback or old-key replay was attempted.

Current supporting checks: 19 focused tests passed; database-enabled regression 645 passed / two dedicated recovery-harness skips; typecheck and default frontend/PWA/server build passed. Fresh isolated unit fixtures confirm School A 6 common/2 universal, School B 3/0, Math 0/0 crates. Source clean restart and fresh nonempty restore retain the exact F2R 111-table digest, guard/credential identity and closure blocker. These are unit/database checks, not full-app acceptance. D6 BLOCKED; pilot NO-GO.

Status: **PARTIAL — NOT PASS**. D6 overall remains **BLOCKED**; operational pilot **NO-GO**.

This run uses synthetic records only. No recorded QC represents an actual physical inspection. O1–O10 ownership transfers and settlements remain unauthorized. Historical migration acceptance was not revisited.

## Baseline and isolation

- Starting branch: `feature/kit-builder-milestone-1`.
- Starting local and remote HEAD verified: `586c797a30aefcafe5e8acd3915b4b1b73786e67`.
- Baseline instructions, session handoff, NEXT_TASK and D6-B/P/M/current D6 reports were reviewed.
- Isolated PostgreSQL: loopback `127.0.0.1:55432`, database `experimind_kitbuilder_test`.
- Browser schema: `requirement_test_65e4d0314cc341f7b81dae97c9e936df`, cloned from synthetic acceptance schema `requirement_test_2b47d7075f4b41f8a1a8f613d9b15678`.
- Dedicated restricted runtime, identity and ledger roles; fresh synthetic administrator, viewer and other-tenant accounts; bcrypt cost 12; random private credentials and strong signing key. Guest authentication disabled. App served at `http://127.0.0.1:3104`.
- Production, packing and delivery flags enabled only in the disposable build/private application scope. No production authentication changes.
- Unrelated `AGENTS.md` and `.test-tmp/` changes must remain unstaged.

## Actual authenticated browser transitions

| Transition | Observed result |
|---|---|
| Fresh administrator login | Succeeded; authenticated application visible |
| Reload and second-tab session persistence | Authenticated state retained |
| Supplier receipt against approved PO coverage, verified location | `7029a26a-81da-470b-8cde-2af5b248858c`, 0.002 m, pending |
| Incoming QC quarantine | Same receipt quarantined |
| Incoming QC accept | Same receipt accepted; planning showed 19.104 m verified on-hand |
| Second supplier receipt | `492ac41d-d428-4dff-bf2b-a9acd9088b71`, 0.001 m, pending |
| Incoming QC reject | Second receipt rejected; displayed on-hand remained 19.104 m |
| Purchase-request review and approval | `f2653b6f-cf9d-4ca0-b59c-df118cb006fd` advanced draft r1 → reviewed r2 → approved r3 |
| Create project, school and requirement calculation | `SYNTHETIC D6-F browser journey`; Science Grade 8 quantity 2; universal complete sets 0; 0.6 m demand |
| Requirement approval | `84b521f7-1e66-494e-b459-bfa3c5433f3b`, revision 1, hash `7f8d41128cc5843b56dc942b15b07ba3ea5dcf828ebff5e5916801af668037e6` |
| Raw-material issue | Work order `ba4d89eb-f224-4b85-a6b8-22221462a4ed`; issued 0.6000 g; remaining entitlement 0; evidence `9521a984-0e08-4f9d-b0f7-d5d10698f38b` |
| Finished-output recording | `8f705559-cad5-48fe-a191-0064f6c5b94a`, 0.6 m, pending-QC custody, synthetic output shelf |
| Frozen school packing plan and durable retry | Initial guarded error; request `f06d2d85-9e5f-431d-9640-6ecd8f01a93d` survived leaving/reopening project; unchanged browser retry succeeded with plan `198545ea-8816-4921-af67-5cd7361b1fd2` |
| School package-tree selection | Two Grade 8 kits, nested pouches and two common crates displayed |
| QR package label preview | Authenticated preview displayed the synthetic school/project, package `PK-b5aecf4a-72f2-4f57-9b4d-097962c40300` and accessible QR image; PDF download remains unverified |
| Aggregate finished-output selection | Reproduced missing matching option; repaired the selector and browser-selected the matching 0.6 m output for a 0.1 m pouch allocation |
| Allocation submission and retry | Both returned a guarded packing denial; no successful allocation or six-check QC is claimed |

Project: `7eaae636-0589-4474-91c1-208a16800c5f`; school: `cd04e9a3-fba5-4cea-9e24-0d65558ff6ab`.

## Fixture-only prerequisites

`scripts/prepare-d6f-browser.mts` clones the synthetic schema, configures restricted database roles and creates fresh accounts. `scripts/prepare-d6f-production.mts` establishes recipe publication, a synthetic reviewed/approved/posted raw opening and the exclusive work-order claim using trusted services. These operations are **not browser-tested transitions**. Existing catalog, approved PO/source coverage and verified receiving scope came from acceptance fixtures.

Local private evidence: `.local-dev/d6f-evidence.json`, `.local-dev/d6f-production-prerequisites.json`, `.local-dev/d6f-browser/01-authenticated-reload.txt` through `12-package-qr-preview.txt`, and `.local-dev/d6f-browser-13-allocation-fixed.txt`. Files contain observations rather than a portable automated browser suite; evidence file 09 was captured after navigation and does not independently prove the earlier packing error. Credential-free hashes are recorded in `D6F_EVIDENCE_MANIFEST.json`. Never publish account/environment files or schema dumps. Fixture preparation refuses to overwrite an existing browser scope or production prerequisites; recipe preparation requires the browser-created approval in `D6F_BROWSER_APPROVAL`.

## Verification completed

- Requirement-approval/database acceptance: **37 passed**, one file, 72.91 seconds; source evidence `.local-dev/d6f-source-evidence.json`.
- Isolated feature-enabled frontend/PWA/server build: **passed** before browser execution; `.local-dev/d6f-build.log`.
- Accessible labelled form controls, explicit confirmations and keyboard selection were used for the transitions above. This is not a complete accessibility audit.
- Focused aggregate/direct output matching regression: **1 passed**. The helper checks school, project, approval, revision, selection, version, material, SKU and unit.
- Repaired feature-enabled frontend/PWA/server build: **passed**, `.local-dev/d6f-fixed-build.log`.
- First consolidated regression: **637 passed, 8 failed, 2 skipped** (86 files); timeouts caused follow-on disconnected driver/server failures. All three affected suites passed sequentially: **42 passed** in 35.32 seconds. This is not a clean consolidated PASS; a full sequential rerun was started separately.
- Post-fix typecheck first found an incomplete typed test fixture; corrected by supplying the required output fields. Resumed typecheck **passed**, `.local-dev/d6f-typecheck-resume.log`; focused test rerun **1 passed**, `.local-dev/d6f-matching-final.log`.
- Database reconciliation of the exact browser-created receipt IDs **passed**: frozen source validator, five immutable decision/audit events, accepted receipt's single 0.002 m posting and rejected receipt's absent ledger reference. Rollback-only deletion attempts against provenance/decision history were denied. This is database evidence, not additional browser coverage; `.local-dev/d6f-receipt-proof.json`.
- Final sequential consolidated regression: **645 passed, 2 skipped**, 84 passed files and 2 skipped files; 126.76 seconds. `.local-dev/d6f-regression-resume.log` supersedes the interrupted rerun and earlier load-related failures.
- Default frontend/PWA/server build: **passed**, `.local-dev/d6f-default-build.log`; trusted frontend flags explicitly removed from the build process. Existing bundle-size warning remains.
- Explicit isolated recovery: **PASS before restart, after actual PostgreSQL restart and after fresh-database restore**. Uses the populated synthetic source fixture schema, not additional browser transitions. Restricted authenticated HTTP, exact retries, reconciliation and paired table hashes passed; `.local-dev/d606-recovery-summary.json`, `.local-dev/d6f-recovery.log`. This does not establish authentic historical upgrade acceptance or production host/private-file recovery.
- Fixture preservation refusals **passed** for both preparation scripts: existing private scope/prerequisites prevented rerun mutations.

## Product defect and separate submission gap

The packing UI assumed `demand_line` always represented one material. Existing trusted work-order authority can aggregate several frozen lines for a shared SKU. The UI now matches inside the aggregate while preserving exact scope and unit checks; database authority is unchanged. The corrected UI exposes the expected output. Its allocation submission still returned a guarded denial, and the root cause remains unresolved. This denial must not be conflated with browser runtime timeouts or described as a completed allocation.

## Outstanding acceptance and infrastructure limitation

The in-app browser Node runtime timed out and reset while inspecting the package tree. Reinitialization and a trivial runtime-health command also timed out. Independent PowerShell and cmd diagnostics subsequently stalled without output. These are infrastructure failures; they do not establish a product failure. The first packing denial's root cause remains unresolved: browser retry later succeeded. A separate server-side diagnostic with a mismatched request fingerprint returned `Authorization replay conflict` and is not browser evidence.

Still required: browser PR creation and PO/source-coverage creation; explicit receipt duplicate/retry denial; packing allocation and six-check synthetic QC; PDF preview/download; dispatch; partial/final school receipt; installation; closure-denial verification; readiness/reconciliation dashboard; wrong role/tenant, revoked session, stale revision and duplicate submission; offline limitations; full keyboard/confirmation checks; desktop/tablet/phone layouts. Existing backend acceptance does not substitute for these browser gaps. On 2026-10-30 shell access recovered, but a fresh browser connection again timed out before page interaction.

Final typecheck, consolidated regression, default frontend/PWA/server build and isolated restart/restore recovery passed. Browser acceptance remains incomplete. The resulting scoped commit and verified local/remote SHA are reported in the delivery response; no main merge or operational action is authorized.

Resume only within this isolated synthetic scope. Preserve physical stock, commitment, custody and immutable audit invariants; do not release/recreate claims or infer material ownership fulfillment. Correct closure denial is an expected success criterion, but has not yet been browser-exercised in this run.


## D6-F2R follow-up — 2026-10-30

**PARTIAL — NOT PASS; D6 BLOCKED; pilot NO-GO.** Preserved PostgreSQL source recovery, clean restart and fresh-database schema restore verified. Authenticated fallback browser controls created one 0.1000 m allocation (HTTP 201), receipt `803da359-66f8-4cdf-b618-b89ee3d6cc06`, using a fresh key. This supersedes the earlier observation that no allocation had succeeded, but does not establish replay of the original pending key or classify its historical denial. Original outbound payload/detailed error were not retained; reconstructed original-key authority succeeds only in a rollback diagnostic. No implementation defect proved or code changed.

Focused tests: 20 passed; complete database-enabled regression: 645 passed / 2 default recovery skips; typecheck and frontend/PWA/server builds passed. Separate restricted authenticated replay and 111-table reconciliation passed before restart, after restart and fresh restore. Six-check QC, PDF download, downstream and remaining adversarial/device/accessibility browser acceptance remain outstanding. See [D6-F2R report](D6F2R_RECOVERY_AND_ALLOCATION_ROOT_CAUSE.md) and the appended manifest section for exact scope and evidence limitations.


## D6-F8 follow-up — 2026-11-03

[Isolated build and browser evidence](D6F8_TRUSTED_PACKING_BUILD_AND_QC_ACCEPTANCE.md): BUILD PASS / QC BLOCKED. Direct build child exit 0; private loopback frontend exposed all six checks for the existing synthetic admin. Incomplete evidence/physical confirmation kept acceptance disabled. No physical inspection, QC submission, new receipt/audit or retry was claimed. All 111 retained fingerprints and authority/credential checks were preserved. D6 BLOCKED; pilot NO-GO; O1-O10 DRAFT / NOT AUTHORIZED.
