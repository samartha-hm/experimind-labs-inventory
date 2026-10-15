# ERP state — historical implementation notes

## Milestone 13A design strategy — 2026-10-15

Discovery and documentation completed; design direction and UI implementation
await user approval. See docs/erp/ui-ux/DECISION_BRIEF.md for three directions,
recommended Precision Operations/focused packing, eight planning specifications,
seven journeys and bounded 13B proposal. Read-only synthetic browser evidence is
ignored locally; portable diagrams are committed. Document/link/SVG/scope checks
passed. No application, API, database, inventory or permission change; no fresh
backend regression or concept usability test. Milestone 12 operational and
physical-print gates below remain unresolved. Historical results below are not
new 13A verification.

## Current acceptance status — 2026-10-15

Milestone 12 pilot preparation completed; rollout is not approved. A01–A16 prior
browser acceptance retained; four synthetic labels pass PDF/QR/browser checks.
Physical print/scan evidence remains pending from the operator. Historical
retained fingerprints match; continuity into the distinct current browser
database is unproven. Current paired recovery baseline and strict retained
validation pass after a narrow PostgreSQL version-header correction. Current
development app-role superuser privileges, stale saved recovery-admin credentials,
backup custody and named pilot authorization remain operational gates. No stock
records or privileges were changed. See docs/erp/39_PILOT_READINESS_AND_FINAL_ACCEPTANCE.md.
Final checks: 476 tests/65 files, four schema tests, typecheck and builds PASS.

Branch: feature/kit-builder-milestone-1. Milestones 1–8 implemented. M8 implementation: 49c92487b163e15f928b98558b1ec1e00557ce93.

Independent immutable approved recipe versions and work order snapshots support explicit yield, units, scrap and chemical metadata. Manual/project-site production carries assignment, priority, due date and demand revision. Verified input reservations share capacity with project reservations. Actual issues consume stock; pending/rejected/rework output is unavailable; QC acceptance alone adds stock. Existing stock_ledger remains the physical source; legacy inventory masters/history remain unchanged.

Current-user RBAC, tenant isolation, exact decimal conversions, item locks, optimistic revisions, immutable events, actor-bound idempotency and deferred reconciliation protect operations. Read-only project previews include production allocations/incoming; no automatic fulfillment, dispatch or procurement expansion. Production history protects sites and active work blocks project archival.

Migrations 1791763200005/0006 applied only to isolated development; empty rollback/reapply and populated rollback refusal PASS. See ADR-027 and runbook 32.

Verification: 11 focused production tests; final full 418 tests/56 files PASS; typecheck and frontend/PWA/server builds PASS. Authenticated development HTTP scenarios cover laser partial QC, make-for-stock multi-batch and multi-school linked production: input 20→11 m, accepted output 6 m, rejected output 2 m. Repeated previews preserve stock and existing masters/history.

Browser acceptance PENDING (runtime EPERM). Stop for review; no Milestone 9, merge or deployment. Use /new or /compact before further work.

## Milestone 9 — 2026-10-14

Supersedes the earlier Milestone 9 stop instruction: user authorized implementation and feature-branch pushes. Phase A preserved; B packing execution/QC and C printable stable labels/QR implemented. Verified checkpoint 406fe55e80e671fc1fc09059d6ac8d7d7f29bae1 is on GitHub.

Fresh final verification: 438 tests/59 files, typecheck and frontend/PWA/server builds PASS. HTTP/PostgreSQL synthetic School A six common/two universal crates; School B three common/zero universal; exceptions corrected, QC rejection/rework/reinspection and labels exercised; both Ready after authorized QC. Printing leaves package records and stock unchanged. Bidirectional pick/ledger reconciliation zero mismatches; verified synthetic balance 15.2 m. Development inventory nine rows and historical ledger twelve rows preserve fingerprints.

Packing/readiness migrations 1791849600007/1791936000008 applied to isolated development only; final run no-op. Browser visual and physical print acceptance remain PENDING due to recorded runtime EPERM. Labels use configurable tenant-specific browser-local layouts; QR requires current-user authentication and tenant ownership. No dispatch/Milestone 10, main merge or deployment.
