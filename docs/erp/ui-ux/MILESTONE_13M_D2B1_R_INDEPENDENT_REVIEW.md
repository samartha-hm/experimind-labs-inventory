# Milestone 13M-D2B1-R — independent purchase-request commitment review

## 1. Verdict: CONDITIONAL PASS

Reviewed 18 October 2026 on `feature/kit-builder-milestone-1`. Audited implementation
SHA: `46eb1cf097a9b9dc67bf6b3da20bcc16c5731bdc`; local HEAD and live GitHub branch
HEAD matched before review. The sole initial working-tree change was unrelated
`AGENTS.md`; it is preserved and excluded from review commits.

No reproducible D2B1 accounting or authorization defect was demonstrated within
the isolated synthetic boundary. No implementation fix or permanent regression
test was added. Acceptance does not authorize operational activation. Historical
reconciliation, private credentials/pools and the existing identity SELECT exposure
remain deployment blockers. The known packing-label timeout reproduced.

Read repository directives, session handoff, D2B1 implementation report and D2A-R
review. Independently inspected the PR/reservation services, requirement approval,
trusted capability executor, role provisioning, D2A/D2B1 triggers and witnesses,
legacy procurement service, and the actual adversarial PostgreSQL cases.

## 2. Confirmed PR accounting

| Operation | Confirmed result |
| --- | --- |
| Create | One immutable canonical line binds tenant/project/school/material/unit to the exact current approved snapshot. Manual and verified-shortage bases are explicit. |
| Increase | Opens only the positive quantity delta against shared unused capacity. Existing PR/reservation holds reduce that capacity. |
| Reduce | Releases only exclusively owned, untouched held source slices. Matching totals alone are insufficient evidence. |
| Review/approve | Status, revision and attribution change; approved demand and held quantity do not increase. Approval grants no PO authority. |
| Cancel | Releases eligible H atomically; keeps historical line quantity and attribution. An existing linked PO prevents release certification. |
| Historical/superseded | Unmapped PR identity, changed approval or demand revision cannot authorize adjustment, release or retry. Reconciliation is required. |

`U = A - F - H >= 0`; PR operations change H, never F. Approved demand comes from
frozen material lines, summed once into the canonical school/material account.
The account uniqueness constraint prevents another obligation/selector from
claiming the same material demand. Other schools retain independent capacity;
grade/common/universal/Maths selectors do not mint duplicate material allowance.

PR quantities accept exact positive four-decimal stock units and are represented
in the six-decimal planning ledger. Wrong units and subprecision/invalid quantities
fail. PR input cannot supply a new conversion; the canonical unit and upstream
frozen conversion provenance remain authoritative. Positive physical stock limits
shortage sizing but grants no approved demand or reservation.

Deferred witnesses check immutable mapping/binding, exact line identity, held
totals, source ownership, no parent/retired/fulfilled claims, and no downstream PO.
Direct unmatched release/consume attempts fail without accounting changes.

## 3. PO bypass and direct-call challenges

The D2B1 gate checks an integrated `purchase_request_id` before enumerating planning
lines. Fourteen additional independent denial probes passed, with nine accounting
and operational table fingerprints unchanged after each attempt:

- Omitted, SQL-null, empty, object, string, numeric and null-member planning lines:
  integrated PR references failed with PostgreSQL `23514`.
- Forged project/school lines did not hide an integrated PR reference (`23514`).
- Nonexistent PR and wrong-tenant PR references failed composite foreign keys
  (`23503`); unrelated IDs did not become an alternative authorization path.
- Calling `SupplyPlanningService.order` directly with an owner connection, a valid
  approved mapped PR and synthetic vendor still failed the downstream gate.
- Restricted runtime SQL could not create the missing-lines PO; caller-supplied
  actor UUIDs could not alter PR approval or ledger events (`42501`).

The existing rerun regression also inserted a corrupt linked PO with empty lines
under an owner-only, rollback-only disabled-trigger fixture. Re-enabled receipt
insertion and `commitment_pr_check` both rejected that lineage; rollback restored
all observed fingerprints. Full-line and empty-line PO attempts also failed.

Wrong school/project, tenant, approval and revision inputs fail before PR authority
is established. Historical/ambiguous mappings remain blocked, not inferred from
quantity equality. Existing approval gates cover unintegrated project execution.
These results concern activated demand and integrated PR lineage; they do not
establish a global prohibition on unrelated, unattributed legacy procurement.
No production PO/receipt writer cutover or downstream capability was enabled.

## 4. Tenant/RBAC and token boundary

Rerun PostgreSQL cases provisioned distinct restricted LOGIN runtime, identity and
ledger roles and checked actual session identities/ACLs. Runtime direct writes to
PR mappings, PRs, claims, sources, projections, ledger/audit receipts and protected
bindings failed. Pinned invoker functions and schema permissions resist runtime
search-path/settings impersonation. Schema owner compromise is outside this claim.

Trusted execution derives actor and tenant from signed credentials and live
database identity/session state. Foreign administrator/session identities, forged
actor/organization payloads, ordinary access-token substitution, wrong issuer or
audience (including array audience), wrong execution scope, expiry and revoked
roles/sessions failed. Shared boundary cases include logout and expiry during lock
waits; authentication is rechecked after waiting and before commit. PR-specific
logout and live role-downgrade cases also rejected pending capabilities.

Ledger credentials are privileged server authority: accepting an untrusted actor
UUID in an ordinary service call is not a substitute for the trusted adapter.
No public operational adapter was activated by this review.

## 5. Concurrency, idempotency and failures

Real PostgreSQL transactions verified last-capacity PR races, partial adjustments,
adjustment versus cancellation, stale revisions and shared reservation capacity.
An additional simultaneous PR-versus-reservation race issued both capabilities
before execution: one reservation won 0.1, the PR failed insufficient demand.
The account ended A=2.4, F=0, H=2.4, U=0, including a preexisting synthetic H=2.3.
Exactly one operational source claim remained; immutable-event replay matched.

Exact lost-response retries return the original immutable receipt without another
claim. Same key/conflicting payload, new capability on an already used key,
same bearer with a new key, duplicate PR/line identity under different keys and
over-capacity fresh IDs fail. Current session and approval checks still apply to
committed retries. Injected PR audit failure rolled back PR, claims, events,
bindings and authorization receipt. Foundation cases also exercised PostgreSQL
`40001` and `40P01` rollback followed by caller same-key retry.

## 6. Reconciliation, recovery and verification

Fresh nonempty dump/restore/replay passed: 27 accounts, 83 immutable events,
14 equal table fingerprints, 13 pinned functions, restored deferred witnesses and
receipt gate. Replay reconciled A/F/H; PR and reservation projections/source
ownership and execution bindings remained consistent. Audit attribution and
authorization receipts were included. Physical inventory, stock ledger and
unrelated production/packing/delivery fingerprints remained unchanged. Recovery
used a separate synthetic schema; production role/ACL reprovisioning is still
required because the dump deliberately excludes owners and privileges.

| Current verification | Result |
| --- | --- |
| Unmodified targeted PostgreSQL/HTTP suite | 37/37 PASS |
| Full suite, one worker | 582 passed; one existing packing-label test exceeded 5000 ms; 76 files |
| Isolated unchanged packing retry | 19/19 PASS |
| Targeted suite with temporary independent mixed-source race | 37/37 PASS; extension removed afterward |
| Additional independent SQL/service denial probes | 14/14 PASS |
| Typecheck; frontend/PWA/server builds | PASS; PWA precache 15 entries |
| Nonempty recovery and mixed-source replay | PASS |

No timeout or assertion was weakened. The full suite is **not** reported as an
all-green run. Initial sandbox Vitest temp-file denial required an authorized
elevated run; an independent probe initially lacked a vendor fixture, and the
temporary race probe initially read `authorized` instead of `approved`. Corrected
synthetic probes passed; these were probe setup errors, not product defects.

Commands: `node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs
run [target-files] --maxWorkers=1 --reporter=dot`, `npm run typecheck --silent`,
`npm run build --silent`, and the existing `scripts/review-commitment-recovery.mjs`
with `COMMITMENT_RECOVERY_MILESTONE=13md2b1` under `--import tsx`.
All database work was confined to guarded localhost synthetic test schemas.
See [fresh fingerprints and independent probe outcomes](MILESTONE_13M_D2B1_R_FINGERPRINTS.json).

## 7. Required remediation and exact D2B2 prerequisites

1. Obtain separate authorization for D2B2. Define immutable PR-line to PO-line
   identity, exact partial quantities/units and exclusive source ownership before
   implementing a PO writer. Transfer coverage atomically without a second H.
2. Specify approval supersession, cancellation, partial ordering, returns to PR
   coverage, encumbrance and terminal-state rules. Never release source capacity
   based solely on a mutable PO status or matching aggregate quantities.
3. Extend narrowly scoped trusted capability actions, live RBAC/revocation and
   payload/key binding; retain private pools and restrict SQL to the required
   tables/functions. Exercise direct service and restricted-role bypasses again.
4. Verify same-key retry, conflicting keys, partial competing transfers,
   cancellation/adjustment races, serialization/deadlock recovery and atomic audit
   failure. Reconcile all source claims and A/F/H/U after nonempty restore/replay.
5. Keep historical/ambiguous PRs and POs quarantined until an operator proves
   immutable lineage. No automatic matching, attachment, activation or release.
6. Keep receipts/QC and reservation fulfillment blocked until separately defined
   quantity, physical-posting, F-transition and rejection/quarantine contracts are
   authorized and reviewed. Production, packing and delivery integration remain
   outside D2B2's PO commitment scope.
7. Before any operational activation, provision and smoke-test private credentials,
   pools, TLS, keys, roles/ACLs and startup checks; resolve the previously documented
   identity SELECT exposure and track/fix intermittent packing-label reliability.

## 8. GitHub verification and stop boundary

Audited GitHub SHA: `46eb1cf097a9b9dc67bf6b3da20bcc16c5731bdc`, verified through
live `git ls-remote origin refs/heads/feature/kit-builder-milestone-1`.
Review documentation is pushed on the same feature branch; the separate continuity
checkpoint records its verified review-commit SHA, and the final response records
the final local/remote HEAD comparison. No force-push, main merge, deployment,
real inventory change, historical activation or operational cutover occurred.
Stop after D2B1-R; use `/new` or `/compact` before another milestone.
