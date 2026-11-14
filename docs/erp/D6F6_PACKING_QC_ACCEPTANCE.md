# D6-F6 — browser connection and packing QC acceptance

Date: 2026-11-03. **PARTIAL authenticated readiness; packing acceptance BLOCKED. D6 BLOCKED; operational pilot NO-GO.**

Application SHA: `c7456de0859a4142128aae007d40b03d8d27a4a8`, branch `feature/kit-builder-milestone-1`. This run changes documentation only. The final documentation SHA is recorded in the completion response and Git history.

## Environment and browser

- ERP `127.0.0.1:3104`: `/health`, `/ready`, `/login` returned HTTP 200. PostgreSQL listened on `127.0.0.1:55432`; read-only database checks succeeded. Neither healthy service was restarted or recovered.
- Installed browser skill/runtime package: `26.1027.51404`. Initialized the supported runtime, discovered `iab` and `mcpapps`, and explicitly selected `iab` once successfully. No selection timeout, runtime reset, alternate controller or recovery workaround occurred. This supersedes the historical D6-F5 connection blocker for this run.
- Opened the login form through browser controls. The older saved synthetic account was rejected; its alerts were dismissed. The existing D6-F account then signed in successfully without credential changes. No credentials or tokens are included here.
- Browser displayed `SYNTHETIC D6-F admin`, `Administrator`, and tenant `Experimind Labs (HQ)`. The existing account record associates actor `514e643b-023b-41ff-b942-7e63fcbeff66` with tenant `922a1026-f552-4349-a8a0-cbf3fd3a9e1a` and role `admin`.
- Authenticated read-only navigation reached project planning, preparation/work orders, and labels. Opened `SYNTHETIC D6-F browser journey` / `SYNTHETIC D6-F school`. A fresh second tab retained authentication and reproduced the packing gate. Reload persistence and the complete prior readiness checklist were not separately completed.

## Actual blocker and transaction result

Both browser tabs showed **Assembly, packing and QC** with:

> Legacy production and packing controls are read-only. Use the separately authorized trusted workflow panels when available.

The UI also instructs preserving claims rather than releasing or recreating them. The trusted packing panel, school-plan/package selectors, six evidence fields, and acceptance controls were absent. The project closure area reported school packing allocation missing; that legacy message does not disprove the retained trusted allocation below.

`PackingPanel.tsx:15` conditionally renders the trusted panel using `VITE_TRUSTED_PACKING_ENABLED`. The private launch environment file contains `true`, but the active served frontend did not expose the panel. An HTTP diagnostic did not identify a transformed environment assignment. A feature-disabled/stale served artifact is a hypothesis, not a proven root cause. No runtime flag, build, service, database or application code was changed to bypass this gate.

**Stopped at the authenticated workflow availability/authority blocker.** No allocation, incomplete-QC submission, six-check acceptance/rejection, immutable QC receipt, audit event, retry, dispatch or other custody mutation was submitted. No physical inspection was fabricated. There is no eligible/ineligible package decision to report from browser controls because those controls were unavailable. This is not a browser selection failure, and no ERP business-logic defect is established.

QR/PDF verification and downstream dispatch were not attempted because successful QC was their prerequisite. Retry deduplication and immutable QC/audit acceptance remain unverified.

## Retained fixture and reconciliation

Read-only database evidence (not browser package acceptance):

| Record | Preserved value |
| --- | --- |
| Project | `7eaae636-0589-4474-91c1-208a16800c5f` |
| School | `cd04e9a3-fba5-4cea-9e24-0d65558ff6ab` |
| Plan | `198545ea-8816-4921-af67-5cd7361b1fd2` |
| Package | `b5aecf4a-72f2-4f57-9b4d-097962c40300`, Pouch 1, Science / Grade 8 |
| Frozen material | Activity 8, line `98a9942c-e6b7-4c40-91d5-c0baa8be40d0`, `0.1000 m` |
| Allocation | `803da359-66f8-4cdf-b618-b89ee3d6cc06`, `0.1000` |
| Output | `8f705559-cad5-48fe-a191-0064f6c5b94a`, `0.6000 m`, `pending_qc` |

All **111** table fingerprints, including audit, matched the preserved baseline both before and after browser work. Aggregate SHA-256: `c6ffdc72010b6f61e9038db5fb02d65e5cb7c5ca0798298ed331dc289875a743`. This establishes unchanged source/output quantities, allocations, QC/custody and audit for this non-mutating run; it does not prove a successful QC transition or retry. Session/user/refresh-token tables are excluded by the existing fingerprint helper, so authentication persistence is separately browser-observed.

Private local evidence, excluded from GitHub:

- `.local-dev/d6f6-current-health.json`, `.local-dev/d6f6-final-health.json`, `.local-dev/d6f6-current-state.jsonl`.
- `.local-dev/d6f6-browser/01-authenticated.png`: SHA-256 `543a4e2abfc05a04eec90f27ae06f861a3424f16cec01d30b6d08db351866fa6`.
- `.local-dev/d6f6-browser/02-project.txt`: SHA-256 `bab34d75960831a1d5f8841d38521440398c95592864a3b86c10a16855a264a9`.
- `.local-dev/d6f6-browser/03-fresh-project.txt`: SHA-256 `a3f635480d921ad1f9e9b9b8fe9b00280eb380b149d97fe94009760355f429d2`.
- `.local-dev/d6f6-browser/06-packing-readonly.png`: SHA-256 `83db7416edce2e45f10a75ba8f96738402c14ff6d7681b87e046c82cb943ea56`.

## Verification and continuation

Fresh service readiness, authenticated browser evidence, second-tab persistence and before/after fingerprints passed. No application changes required regression tests; no full suite or build was rerun. Documentation whitespace verification is recorded at commit time. Existing fixtures, private restoration evidence, `.test-tmp/` and unrelated instructions were preserved.

Next bounded task: determine why the active frontend omits the trusted packing panel, prepare a concrete authorized remedy without disturbing healthy services, then resume the same allocation through browser controls. Six-check evidence must reflect actual synthetic inspection capability; the UI's physical-inspection attestation must not be falsely confirmed. O1–O10 remain DRAFT / NOT AUTHORIZED; historical migration provenance remains unresolved. No settlement, ownership transfer, real stock change, migration, deployment, merge to main or pilot occurred.

## D6-F7 follow-up - 2026-11-03

[Bounded frontend diagnosis](D6F7_PACKING_QC_FRONTEND_GATE_DIAGNOSIS.md) confirms the served production bundle omits trusted packing. The runtime VITE flag does not enable code removed at build time; the integrated legacy read-only gate is correct. Fresh authenticated browser reproduction and unchanged 111-table fingerprints were recorded. No QC acceptance or service restart occurred. D6 remains BLOCKED; pilot NO-GO.


## D6-F8 follow-up — 2026-11-03

[Isolated build and browser evidence](D6F8_TRUSTED_PACKING_BUILD_AND_QC_ACCEPTANCE.md): BUILD PASS / QC BLOCKED. Direct build child exit 0; private loopback frontend exposed all six checks for the existing synthetic admin. Incomplete evidence/physical confirmation kept acceptance disabled. No physical inspection, QC submission, new receipt/audit or retry was claimed. All 111 retained fingerprints and authority/credential checks were preserved. D6 BLOCKED; pilot NO-GO; O1-O10 DRAFT / NOT AUTHORIZED.
