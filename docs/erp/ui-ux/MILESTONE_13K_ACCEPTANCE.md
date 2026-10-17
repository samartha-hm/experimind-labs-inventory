# Milestone 13K — acceptance and operational reconciliation

Date: 2026-10-17. Branch: `feature/kit-builder-milestone-1`. Starting HEAD: `1ca8935a3d4d5946a4123e54210cec949d4de44a`. [Supported contracts and rollback](MILESTONE_13K_CONTRACT_MATRIX.md).

## Authenticated synthetic browser acceptance

Full server on loopback 3101 with `DISABLE_HMR=true`; loopback 3102 proxy adds scoped axe and deterministic GET/PUT faults. Retained isolated PostgreSQL 17.4 on 55432, synthetic development organization only. No real staff or operational actions.

- Open existing two-school project r1; independently change school notes and Science grade 8 quantity, save r2, retain school context and reopen authoritative state.
- Second tab based on r1 changes the other school: 409, local edits retained, save disabled; explicit discard loads r2. Backend simultaneous requests likewise produce one 200 and one 409, even for different schools; duplicate stale request rejected.
- Drop a PUT response after upstream commit: no automatic retry, retained/frozen draft; explicit reload recovers r3. Reopen after server restart confirms persistence.
- Add a school with a deliberately long name and immutable approved STEM v2 selection: Science grade 8=2, grades 9/10=0; Mathematics grade 9=3, grades 8/10=0; universal complete sets explicitly 0; Science grade 8 common override=2 with reason. Missing complete sets / blank override reason block saving. Save and reload r4.
- Keyboard Enter selects filtered draft school; selected heading/UUID and saved values match. Dirty navigation to legacy is blocked. History r1 is read-only; current r4 editor returns. Native unload warning is implemented but physical browser-dialog behavior was not separately validated.
- Synthetic save 403 retains local school note and blocks resave. Subsequent reload 503 retains that note and current detail. Clearing fault and explicit discard/reload recovers r4 without a mutation. Closed historical fixture is read-only; initial rejected attempts rolled back under the existing DB closure guard, then workspace gained an explicit closed-project 409 precheck.

## Automated verification

- Focused React/contract and HTTP/PostgreSQL checks: 20 tests in 2 files passed after the closed-project guard.
- Full suite: 541 tests in 74 files passed. Includes quantity rules, tenant/RBAC, immutable snapshots, audit actors, concurrent schools, repeated saves, flag gates and legacy interoperability.
- TypeScript typecheck and frontend/PWA/server builds passed. Existing large-chunk build advisory remains.
- Scoped axe WCAG 2 A/AA, 2.1 AA and best-practice: zero violations and zero incomplete findings at 1280×900, 768×1024, 360×800 and 320×740 (31 passing rules each). No 320px incomplete contrast finding remains in the scanned current editor state. Long-name/editor screenshots visually inspected; no horizontal page overflow at these widths. These scans do not establish whole-application, physical-device, screen-reader or real-staff acceptance.

## Reconciliation and rollback

`scripts/validate-projects-editing.mjs` guards the exact synthetic loopback database, records sorted row-count/content fingerprints, compares every original project snapshot, checks added revision actors and compares workspace project/history/preview identity with legacy APIs. Login/session bookkeeping is excluded explicitly.

83 business tables checked before browser writes and afterward: only `planning_projects`, `planning_sites`, `planning_version_links`, `planning_project_revisions` changed; 79 tables unchanged. Six original projects retained. Exactly one open project advanced r1→r4 with three added snapshots attributed to the authenticated admin; all original snapshots unchanged. No kit approval, inventory ledger, reservation, procurement, production, packing, delivery or completion change. Existing service computes quantities, unit-specific demand and shortages; no UI stock totals or writes.

Full-server flag-off API/browser rollback and legacy r4 interoperability are checked before the feature checkpoint; see ignored `rollback.json`. Disabling the workspace needs no schema/data rollback.

## Evidence and remaining limits

Ignored local evidence under `.local-dev/ux-13k/`: baseline/verify/rollback fingerprints, desktop/tablet/phone JPGs, 320px editor JPG and scoped audit JSON. Final logs: `.local-dev/13k-full-final.log`, `13k-typecheck-final.log`, `13k-build-final.log`; focused log `13k-focused-final.log`. Evidence contains synthetic project data and stays uncommitted.

Normal HMR/watcher root cause remains unresolved; documented `DISABLE_HMR=true` workaround used throughout, with restart after source/flag changes. No repeated watcher investigation. No migration, production enablement, main merge or deployment. Review required before project approval or any further consequential operational action.
