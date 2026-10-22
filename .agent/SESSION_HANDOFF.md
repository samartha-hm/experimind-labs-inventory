# Session handoff — 2026-10-19

Branch: `feature/kit-builder-milestone-1`.
Code checkpoint: `d53a87ff8fb50d7ce509baced4ba9b2a9aa7540d`, pushed;
full local/remote SHA matched before this documentation update.

D3 is authorized and incomplete. A safe prerequisite now publishes immutable,
approved canonical recipe versions through the existing session capability
writer: `POST /api/v1/production-planning/recipe-versions`. It requires current
admin authority, Idempotency-Key and a server-issued X-Ledger-Capability.
There is no public capability issuer or operator UI for this action.

Migration 23 activates only in isolated synthetic requirement_test schemas.
It leaves historical recipes untrusted and unchanged. Publication inserts and
its immutable authorization receipt commit atomically; all other execution
writes remain guarded. Stock and commitment fingerprints remain unchanged.

Changed: recipe publication service/migration, trusted authority, database
boundary, production router/server wiring and authenticated HTTP tests.
See `docs/erp/ui-ux/D3_TRUSTED_RECIPE_PUBLICATION.md` for contract and evidence.

Fresh checks: isolated requirement integration 37/37; final full suite 605 passed,
1 opt-in recovery skipped (two workers, 120-second expanded boundary timeout);
typecheck and frontend/PWA/server builds passed. Earlier runs exposed temporary
storage configuration and harness timeout failures, corrected before final pass.
No new restart/restore or ledger-replay acceptance was performed.

Next: implement exclusive school-output claim binding and recipe-derived capped
material entitlements, then trusted atomic physical issue/H-to-F with HTTP proof.
Priority 1 material issue itself, finished-output custody, packing/QC integration
and operator mutations remain unimplemented. Read D3_COMPLETION_ACCEPTANCE.md.
No further milestone authorization is needed. Preserve unrelated AGENTS.md.
No deployment, real stock activation, dispatch or D4. Use `/compact` or `/new`.

## 2026-10-22 D3 trusted work-order authority update

Added exclusive approved-output claim binding to an immutable trusted recipe,
recipe-derived capped material entitlements, and trusted material issue. Issue
atomically updates the production reservation and writes the physical stock
ledger, commitment consume event, immutable authorization result, audit record,
and issue witness. A deferred PostgreSQL constraint validates the full evidence
chain; verified unreserved stock and current physical coverage are required.
The actual authenticated HTTP integration suite passed 37/37 against the isolated
synthetic PostgreSQL database. Typecheck and production build passed.

D3 remains incomplete: finished-output custody, packing/QC integration, operator
mutations and recovery acceptance are still outstanding. Report:
`docs/erp/ui-ux/D3_PRODUCTION_PACKING_EXECUTION_REPORT.md`. No real-data activation,
deployment, dispatch or D4. Preserve unrelated root `AGENTS.md` edits.
