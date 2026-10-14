# Next task — Milestone 9 Phase B

Resume preserved Phase A commit 18e0e39a532f2290834db9aec3a2d50b1b4ad124. Do not regenerate or rewrite the completed packing generator/picking backend. Read SESSION_HANDOFF.md and inspect status first. Remote remains the Milestone 8 checkpoint; no implementation pushed yet.

Implement authenticated assignment, package assembly/checklists, exceptions/corrections, approved material changes and QC routes around existing PackingService methods. Review those preserved methods before exposing them. Build an execution interface using existing operational styling. Test partial packing, missing/damaged items, rejection/correction/reinspection, all-child QC and Ready gating, immutable snapshots, current-user authorization and persistence. QC/packing must not append another stock decrement. Commit verified Phase B locally.

Then Phase C: printable pouch/box/crate/complete-kit labels, stable physical package IDs, authenticated tenant-safe QR verification, idempotent reprint/access tests and local commit. Phase D: complete suite/typecheck/builds and integrated School A/B packing/QC/labels/ledger acceptance; update handoff, review artifacts/secrets, push verified branch and verify remote HEAD. Browser limitation may be documented without repeated retries.

Use only isolated development/test databases at 127.0.0.1:55432. Packing migration is applied and immutable; future corrections need a new migration. Development legacy baseline is synchronized: do not run old seed/alignment migrations. Preserve all inventory/history. Existing fulfilled school stock fails closed pending explicit reconciliation. No dispatch, main merge, force push, deployment or Milestone 10.
