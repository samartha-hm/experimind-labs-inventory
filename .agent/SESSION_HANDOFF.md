# Milestone 13M-D1V — 2026-10-18

Branch: feature/kit-builder-milestone-1.
Implementation checkpoint: bf0ee93b9c662612514a21675aba15a007045f00,
pushed and remote HEAD verified. This separate continuity commit follows.

Verdict: CONDITIONAL PASS. All three D1U token findings are closed in isolated
restricted-LOGIN tests. Independent review is required before D2; no operational
writer integration or production capability route was added.

Read docs/erp/ui-ux/MILESTONE_13M_D1V_TOKEN_LIFECYCLE.md and
MILESTONE_13M_D1V_ACCEPTANCE.md. Immutable atomic receipts bind exact request,
actor, tenant, action and operation key. Logout/refresh/session revocation serialize
against execution on the user row. Revoked/expired tokens also deny committed
retry; a new capability cannot recover an existing key through mutation execution.

Verification: focused PostgreSQL 37/37; final full suite 583/583 in 76 files with
--maxWorkers=2 (two passing runs); typecheck and frontend/PWA/server builds PASS.
Default workers twice timed out the existing packing QR/PDF test; isolated packing
19/19 passes. Assertions/timeouts unchanged. Worker contention is supported by
bounded-worker passes; default-worker reliability remains open.

Recovery PASS: eight ledger tables, 22 accounts/50 events/eight pinned functions;
operational fingerprints unchanged. Separate disposable PostgreSQL restart proves
receipt/revocation durability with no extra writes. Evidence: checked-in D1V
fingerprints and ignored .local-dev/13md1v-* logs.

Remaining: independent review, staging roles/ACLs/TLS/secrets/startup smoke,
existing runtime identity SELECT exposure and packing performance disposition.
Unrelated AGENTS.md remains uncommitted. No deployment, credential rotation,
company-data changes, main merge or reconciliation activation occurred.
Use /new or /compact for independent review before D2.
