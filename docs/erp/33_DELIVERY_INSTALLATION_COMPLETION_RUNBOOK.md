# Milestone 10 — Delivery, installation and completion

## Dispatch and custody

Use the saved project Delivery panel. Create orders from QC-ready physical packages for the selected school/site. Orders snapshot stable package IDs, hierarchy and template versions. Exclusive package claims prevent duplicate dispatch, including overlapping parent/child selections. Enter transport details and use dispatch/transit actions.

Record partial or complete proof of delivery by selecting received packages and entering recipient, receipt time and acknowledgement. Outstanding packages remain in transit. Report exceptions; authorized correction precedes retry. Failed delivery and return actions retain immutable history. Returned unreceived packages enter return quarantine; received packages retain school custody.

Authenticated QR lookup displays tenant-owned package and custody history. Manifest preview/download/print uses persisted identities and never allocates packages or changes stock.

## Installation and completion

Create a school/site installation job when required, assign an active employee and configure required checklist tasks. Assigned operators record progress, notes, surveys and issues. Resolve issues and finish required tasks before submission. Authorized managers/admins accept the installation; reopening permits audited correction and reinspection.

Project progress evaluates all schools, expected package receipts, current demand revisions and QC, unresolved delivery issues, required installations, active reservations and unfinished production. Authorized customer acceptance closes a ready project. An explicit exception closure records blocker snapshots, approver and reason. Closed projects reject operational edits; authorized reopening requires a reason and preserves earlier acceptance history.

## Permissions and accounting

APIs use authenticated current database users, tenant ownership and server-enforced roles. Managers/admins perform approvals; assigned operators perform permitted execution. Idempotency binds actor and input; immutable revisions and project locks protect retries and concurrent actions.

Picking alone deducts packing stock through the existing authoritative ledger. Dispatch, POD, installation, closure and printing write no stock transactions. Custody references original picks and ledger entries. Return quarantine is a location/status transition, not an inventory receipt; subsequent stock recovery needs a separately authorized ledger workflow.

Secure photo/document storage is unavailable. Text acknowledgements, notes and surveys are supported; no arbitrary attachment paths or public URLs are accepted.

## Isolated migration and verification

The development migration runner permits only 127.0.0.1:55432/experimind_kitbuilder_development. Additive migrations 1792022400009 and 1792108800010 are applied there. Empty rollback/reapply passes; populated rollback refuses history loss. Final runner execution is a no-op.

Acceptance passed: 16 focused tests in two files; complete suite 443 tests in 60 files; TypeScript typecheck; frontend/PWA and server builds. Existing bundle-size warning remains.

Synthetic HTTP/PostgreSQL acceptance covers School A two complete Grades 8–10 Science sets: six common and two universal crates in two batches. School B three Grade 8 Science sets: three common and zero universal crates. Partial POD, delivery exception/correction, installation acceptance, controlled closure/reopening, tenant/role checks, idempotency, concurrent claims and restart persistence pass.

Bidirectional pick/ledger reconciliation reports zero unmatched/orphan rows; synthetic balance is 15.2 m. Original inventory and historical ledger remain unchanged. Final original fingerprints: nine inventory rows e30e23de3bc63dfa2074dda656c2cddb; twelve ledger rows 536e88b3ba0c96db5fddb855ffef93c8.

Browser visual and physical print acceptance remains pending: the single runtime availability check failed with EPERM. No retry loop, deployment, main merge or Milestone 11 work.
