# ERP state — historical implementation notes

## Milestone 13G — 2026-10-16 — current

Authenticated read-only Packing/QC foundation completed behind independent
default-off development/test organization flags. Legacy operational panel remains
default. Existing tenant/current-role service reads supply package hierarchy,
contents, progress, QC and provenance; no mutation or migration. Full suite
527/527 in 72 files (30-second label-test budget), typecheck and frontend/PWA/server
builds pass. Standalone Edge desktop/tablet/reflow, keyboard, QR and actual flag-off
legacy lookup pass. Scoped axe zero violations; one clipped desktop contrast
check separately computed 15.38:1. Seven operational table fingerprints unchanged.
See docs/erp/ui-ux/MILESTONE_13G_ACCEPTANCE.md, contract audit and write proposal.
Temporary acceptance server stopped; no flag persisted. Physical device/printer/
scanner/assistive acceptance and earlier Milestone 12 gates remain pending.
Stop for review before write-enabled Packing/QC, merge or deployment.

## Milestone 13F — 2026-10-16 — historical

Supported Studio lifecycle completed: saved completeness review, authoritative
quantity preview, confirmed immutable approval, provenance/history/comparison and
continuing existing draft. Existing tenant/RBAC, locking and idempotence retained;
unsupported rejection/correction/clone transitions disclosed. No migration,
calculator or operational inventory changes. Full suite 523/523, 71 files;
typecheck/build pass. Standalone Edge desktop/tablet/reflow scoped axe: zero
violations/incomplete. Complex synthetic fixture and operational fingerprints pass;
flag-off legacy rollback passes. Local flags left off. Implementation checkpoint
497d8acde6b7ee59caea74c013bc623610453af8 pushed and verified.
See MILESTONE_13F_INTEGRATION.md and MILESTONE_13F_ACCEPTANCE.md.
Manual device/staff/assistive acceptance and earlier Milestone 12 gates remain open.
Stop after 13F: no further implementation, Packing/QC, merge or deployment.

## Milestone 13E — 2026-10-16 — historical

Bounded existing-draft editing integrated behind the additional default-off
KIT_STUDIO_DRAFT_EDITING flag. Existing tenant/role checks, transactional revision
locking, validators, calculators and immutable approved versions are reused.
Explicit save, dirty navigation guards, conflict recovery, revision comparison
and responsive inspectors verified. Full suite 513/513 in 70 files; focused 41;
typecheck and frontend/PWA/server builds pass. Independent Edge desktop/tablet/
reflow audits have zero axe violations/incomplete checks. Operational inventory,
reservations and ledger fingerprints unchanged; seven locations reconcile.
Flag-off browser rollback preserves saved drafts in legacy editor. Local server
left off. See MILESTONE_13E_INTEGRATION.md and MILESTONE_13E_ACCEPTANCE.md.
Manual device/staff/assistive acceptance and Milestone 12 gates remain pending.
Stop for review before approval/publishing, Packing/QC, merge or deployment.

## Milestone 13D — 2026-10-16 — historical

Authorized development read-only Kit Studio integrated behind default-off server
flag and exact organization allowlist; existing builder remains default. Existing
authenticated tenant/role authority, services and approved snapshots preserved.
No schema, quantity calculator, inventory/ledger or permission changes.
Full suite 503 passed, zero failed/pending, 69 files; HTTP/PostgreSQL 21 passed;
Studio focused 10 passed; typecheck and frontend/PWA/server builds pass.
Authenticated browser/DB fingerprints and rollback pass; three scoped axe audits
have zero violations/incomplete checks. Local review server left flag-off.
Quantity traces and original approval metadata remain explicitly unavailable
under the existing template read contract. See MILESTONE_13D_INTEGRATION.md and
MILESTONE_13D_ACCEPTANCE.md. Manual device/assistive testing and Milestone 12 gates
remain pending. Stop for review before write integration; no deployment authorized.

## Milestone 13C — 2026-10-16 — historical

User-authorized DEV-only synthetic refinement completed; awaiting design review.
Kit Studio preserves education/BOM/packaging context on tablets, explicit shared
ownership, quantity tracing and revision recovery. Packing/QC separates rejection,
correction, reinspection and reviewer approval with retained exceptions.
No operational route/API/schema/calculator/ledger/RBAC/history changes.

Isolated PostgreSQL reconnected safely: all 84 skipped tests recovered; full suite
492 passed, zero failed/pending, 67 files. Authenticated navigation smoke, typecheck
and frontend/PWA/server builds pass. Eleven browser groups and six axe audits
pass with zero automated violations. Evidence: .local-dev/ux-13c.
Manual staff/device/scanner, assistive-technology and actual zoom testing remain.
See docs/erp/ui-ux/MILESTONE_13C_ACCEPTANCE.md and MILESTONE_13C_INTEGRATION.md.
Read-only integration is proposed, not implemented or approved. The 13B database
blockers below are historical and recovered; Milestone 12 gates remain unresolved.
No rollout authorized.

## Milestone 13B — 2026-10-15 (historical)

Precision Operations and focused Packing/QC approved and implemented as a
DEV-only, synthetic, memory-only prototype. Shell, My work, Kit Studio, floor QC
and foundations are ready for user review. Radix Dialog selected after measured
React Aria comparison. See docs/erp/ui-ux/MILESTONE_13B.md and acceptance record.
No API/schema/calculator/ledger/RBAC/history changes. Current checks: 7 focused
tests; repository 399 passed/84 skipped; typecheck/build pass. DB-enabled run:
six suites fail on connection setup timeout; isolated PostgreSQL unavailable.
Original login/view-toggle smoke passes; authenticated navigation unverified.
Desktop/tablet browser checks completed; staff/device testing, full accessibility
audit and 13C remain pending. Milestone 12 operational gates remain unresolved.
No rollout authorized.

## Milestone 13A design strategy — 2026-10-15

Discovery and documentation completed; direction subsequently approved for
bounded 13B only. See docs/erp/ui-ux/DECISION_BRIEF.md for three directions,
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
