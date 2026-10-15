# Browser acceptance and operational fixes — 2026-10-15

Branch feature/kit-builder-milestone-1; starting checkpoint b417cdad245851bab94dbecdc633f2ff65253613.
Resolve final commit with git rev-parse HEAD; verify git ls-remote origin refs/heads/feature/kit-builder-milestone-1.

A01–A16 plus private attachments/shared label layout exercised in local Edge.
See docs/erp/38_BROWSER_ACCEPTANCE_RESULTS.md for evidence and exact limitations.
Fixes: API asset rate limiting, auth context, packing/delivery summary hydration,
production refresh loop, batch QC rejection and standalone common-crate dispatch.
476 tests/65 files, typecheck and frontend/PWA/server builds pass.

Read-only operational reconciliation and retained recovery row/object checks pass.
Live historical before/after remains unverified: current fixture and retained source
are distinct databases. Strict recovery schema hash differs on PostgreSQL 17.5/17.4
source-version comment; independent normalized schema/manifest validation passes.
Physical printing/printed QR scanning pending. All 13 additive migrations present.
QMS/signature/RMA remain deferred. No production deployment or main merge.
Private accounts/evidence remain ignored under .local-dev/.
Preserve unrelated local AGENTS.md changes.
