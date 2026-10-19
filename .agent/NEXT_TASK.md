# D3 next task — exclusive material authority

Implement a trusted transaction that binds an approved school-output claim to
one immutable trusted recipe version and one work order, and derives the capped
material entitlements using the existing exact recipe budget helper. Prevent
cross-school allocation and reuse of the output claim. No stock mutation until
this exclusive authority is established.

Then implement Priority 1 physical material issue and exactly-once H-to-F through
the immutable stock/commitment ledgers, with authenticated HTTP success/denial,
concurrency, rollback, independent availability and accounting reconciliation.

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
