# D3 production, packing/QC and operator workflow

Verdict: **BLOCKED for integrated production execution**. The independently safe
slice provides authenticated read-only readiness, preserves historical visibility,
and prevents unsupported production, packing and downstream writes. It does not
claim approved demand can now run end to end through production and packing.

## Implemented boundary and operator experience

- Authenticated `GET /api/v1/production-planning/execution-readiness` and
  `/api/v1/packing/execution-readiness` return uncached execution status.
- Production and packing screens load status, disable mutation controls while
  pending or blocked, expose a retry on failure, and retain queues/history/detail.
  Packing workspace capabilities also carry the reason. QC completion text
  explicitly requires separate dispatch authorization.
- Production, packing, delivery and inherited installation/closure service
  transactions refuse execution before idempotency replay. Missing commitment
  tables do not enable the application. Only Vitest standalone fixtures without
  commitment tables exercise the legacy workflows.
- Explicit migration 22 activates only in the exact local synthetic test database
  and a `requirement_test_<32 hex>` schema. It is intentionally absent from
  automatic application migrations. Statement guards cover thirteen production,
  packing and downstream tables, including empty-table writes and truncate;
  stock inserts/updates reject production and packing references/movement types.
  Runtime, identity and ledger LOGIN roles receive read-only table privileges.
  Destructive rollback refuses to remove the guard.
- No claim release/recreation, historical lineage fabrication, schema activation
  against real data, deployment or D4 execution was performed.

## Missing contracts and accounting

`ReservationCommitmentService` and the migration-18 deferred witness deliberately
reject claim transfer, splitting and fulfillment. `TrustedLedgerAuthority` supports
reservation, PR, PO and receipt operations but has no production/packing capability
or adapter. A production work order identifies project/site/revision and a frozen
recipe, but does not bind exact approved kit/grade/selection obligations or allocate
cumulative output across work orders. Packing materializes a site without an
authoritative partial-output custody entitlement.

Enabling mutations requires one reviewed transactional contract that:

1. Binds each work order/input to current approved obligations and exact sources,
   checking cumulative demand and exclusive shared-material ownership.
2. Transfers source claims, records physical input issue/scrap, and records
   irreversible fulfillment without reopening demand or consuming it twice.
3. Gives each QC-accepted output a conserved custody identity; rejected/rework
   output must remain unavailable and partial output must be explicitly allocated.
4. Transfers eligible output to packing once, with authenticated capabilities,
   current tenant/role/session checks, revision checks and durable retry identity.
5. Connects package custody to separately authorized dispatch/installation/closure.

The new refusal checks preserve operational and commitment fingerprints. Existing
receipt recovery continues to reconcile unchanged approved/held/fulfilled balances
and exactly-once verified physical stock; it is not evidence of production custody.

## Business-rule acceptance classification

| Scenario | D3 integrated status |
| --- | --- |
| Science grade common crates, partial grade selections | BLOCKED: exact obligation/output allocation absent |
| Universal crate only for a complete set | BLOCKED: no authoritative complete-set custody entitlement |
| Independent Math kits | BLOCKED: no trusted kit-specific execution binding |
| Shared activity/pouch materials | BLOCKED: exclusive source transfer/consumption absent |
| Insufficient/unverified stock, partial production, rejection/rework | Legacy fixture coverage only; integrated writes refused |
| Duplicate/concurrent operator submissions | HTTP 409 with unchanged operational fingerprints |
| Cross-tenant historical detail / unauthenticated readiness | HTTP 404 / 401 |
| Direct owner and restricted LOGIN bypasses | SQL guards / ACL rejection |
| Read queues, histories and labels | Preserved; QR/PDF regression covered separately |

The original production/packing fixture tests remain useful regressions, including
partial QC, retries and stock movements. Their passes are not an operational D3
acceptance claim. Real scanner/printer, warehouse counts, staff usability and
independent security review remain prerequisites after the domain contracts exist.

## Verification evidence

- Full Vitest run: **582 passed, 1 skipped**, 77 files, 53.36 seconds. The skipped
  opt-in recovery suite was executed separately through the recovery script.
- `npm run typecheck --silent` and `npm run build --silent`: passed. Build retains
  the existing large-chunk warning; it is not a build failure.
- Scoped packing regression: **19 passed**. Print/reprint plus QR access-isolation
  test: **801 ms** on this machine; this is a regression measurement, not a real
  printer/scanner or concurrent-load SLA.
- Fresh integrated schema: `requirement_test_41a9c5932a9841e8967f23b48280c4d7`.
  Execution-boundary evidence records 13 guarded tables, three restricted LOGIN
  roles and 21 unchanged operational/commitment fingerprints.
- `scripts/verify-receipt-recovery.mjs`: passed before restart, after a verified
  PostgreSQL restart, and after nonempty restore into fresh database
  `experimind_receipt_restore_9ec118ca0e09f416`. Each phase checks 34 table
  fingerprints, restricted authenticated HTTP, 28-account replay, unchanged
  demand, exactly-once receipt handling and preserved D3 write denial.
- Local logs: `.local-dev/d3-full.log`, `d3-typecheck.log`, `d3-build.log`,
  `d3-label-performance.log`, `d3-recovery.log`; structured evidence:
  `.local-dev/13md2b2bs-evidence.json` and `d2b2bs-recovery-summary.json`.
  These synthetic evidence files are excluded from Git.
- Checkpoint branch: `feature/kit-builder-milestone-1`, based on
  `98fdae99f0d59a5ff5e0562f73f6b0c6ec4c40f9`. The final delivery message records
  the checkpoint's full SHA and verified remote equality. Unrelated `AGENTS.md`
  edits are excluded. D3 stops at this documented boundary; no D4 is started.
