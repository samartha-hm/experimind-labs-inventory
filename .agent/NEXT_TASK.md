# D3 next task — custody allocation and packing/QC

Continue from `2c61d44364541a9ffa1aef3ff6baf2efa3f9944c` on
`feature/kit-builder-milestone-1`. D3 remains BLOCKED; no new authorization needed.
Read `docs/erp/ui-ux/D3_COMPLETION_ACCEPTANCE.md` and SESSION_HANDOFF.md.

Implemented: immutable approved recipe, exclusive school-output claim, capped
recipe-material entitlement, trusted stock debit/material H→F, consumption-funded
pending-QC recipe-output custody, administrator issue/output HTTP and optional UI,
exact durable retries, restricted-role witnesses, nonempty restart/fresh restore.

1. Add conserved allocation from recipe output to exact school/grade/activity/
   pouch/kit/common/universal crate children, with explicit partial remainders,
   immutable lineage and exclusive ownership. Never consume the raw stock twice.
2. Implement authenticated packing and six-check QC acceptance/rejection/rework
   using that custody. Do not restore consumed F or reopen approved capacity.
3. Complete operator prerequisites and allocation/QC UI; verify whole-app
   mobile/tablet/keyboard accessibility and QR/PDF output.
4. Prove two-school stock competition, Science grade-specific common crates,
   universal crates only for explicit complete Grades 8–10 sets, and independent
   Math kits without crates, plus races, rollback, replay and nonempty recovery.

Keep unsupported legacy transitions guarded. Use additive migrations and isolated
synthetic databases only. Preserve unrelated AGENTS.md and .test-tmp/. No D4,
deployment, real inventory activation, main merge or force push. Use `/new` or
`/compact` with this handoff to continue without reopening the settled authority.
