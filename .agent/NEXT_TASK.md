# D3 next task — finished-output custody and packing/QC

Exclusive school-output claim binding, recipe-derived capped material
entitlements, and trusted atomic physical material issue/H-to-F are implemented
with authenticated HTTP proof and PostgreSQL commit-time evidence validation.
Continue D3 by creating conserved finished-output custody for partial production
and QC acceptance/rejection/rework, then transfer eligible output to packing
exactly once with authenticated mutations and durable retry identity. Preserve
all current production/downstream write guards and all historical untrusted
recipes; do not add dispatch, deployment, real-data activation or D4.

Recipe publication prerequisite is implemented in code checkpoint
`d53a87ff8fb50d7ce509baced4ba9b2a9aa7540d`:
`POST /api/v1/production-planning/recipe-versions`, canonical units only,
admin/session capability required, synthetic migration 23 explicit activation.
See `docs/erp/ui-ux/D3_TRUSTED_RECIPE_PUBLICATION.md` and
`docs/erp/ui-ux/D3_COMPLETION_ACCEPTANCE.md`.

D3 remains incomplete. Keep all other execution guards; do not route approved
recipes through legacy material issue. Historical recipe families remain
untrusted. Custody, packing/QC, UI mutations and recovery acceptance follow
Priority 1. No dispatch, deployment, real data activation or D4.
Preserve unrelated AGENTS.md. No new authorization needed. Use `/compact`.
