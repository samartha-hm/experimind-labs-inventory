# Next task

Review Milestone 13M-A backend enforcement before authorizing approval UI work.
Read docs/erp/ui-ux/MILESTONE_13M_A_BACKEND_CONTRACT.md,
MILESTONE_13M_A_ACCEPTANCE.md and MILESTONE_13M_A_FINGERPRINTS.json.
Implementation commit: 5354085; final continuity HEAD follows it.

Admin self-approval is explicitly allowed. Current approved revision execution
is enforced; historical/superseded execution is blocked without backfill.
Review cross-cutting database guards and separately authorize historical
reconciliation or override policy. Do not implement approval UI, deploy, merge
main or enter real inventory without further authorization.
All 557 tests, typecheck and frontend/PWA/server builds pass.
Preserve unrelated AGENTS.md. Start with /new or /compact.
