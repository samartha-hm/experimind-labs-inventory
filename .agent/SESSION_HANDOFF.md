# Milestone 13M-B independent backend review — 2026-10-18

Branch: feature/kit-builder-milestone-1. Review/fix checkpoint:
5dc279714683e64b3626c318e0c8435acd24c5dc, pushed and remote hash verified.
This separate continuity commit follows it.

Verdict: CONDITIONAL PASS. Reproduced a P1 packing bypass: additional/substitute
execution changes could alter approved demand. Additive migration 14 now rejects
nonempty changes on project packing rows; save and approve a new requirement
revision instead. No historical rows were rewritten. Historical/superseded
execution remains blocked; reconciliation and cumulative demand budgets require
separate business decisions. Admin self-approval remains explicitly allowed.

Read docs/erp/ui-ux/MILESTONE_13M_B_INDEPENDENT_REVIEW.md and
MILESTONE_13M_B_FINGERPRINTS.json. The report distinguishes static route tracing
from representative adversarial HTTP/service/database tests. Modified code:
src/db.ts, src/migration/1792454400014-HardenApprovedPackingDemand.ts and
src/routes/__tests__/requirementApproval.integration.test.ts.

Verified on isolated synthetic PostgreSQL: 20 focused tests; full suite 76 files /
566 tests; typecheck and frontend/PWA/server builds pass. Frontend chunk-size
warning remains. Evidence covers 22 table fingerprints, approval races, injected
failures and rollback, durable retries, quantity reconciliation, pinned Kit versions
and unknown versus verified-zero stock. Approval causes no operational changes.

Stop for review. No approval UI, deployment, main merge or production-data change.
Preserve the unrelated unstaged AGENTS.md modification. Next: review this backend
checkpoint and decide whether to authorize one bounded current-revision approval
UI task. Start with /new or /compact.
