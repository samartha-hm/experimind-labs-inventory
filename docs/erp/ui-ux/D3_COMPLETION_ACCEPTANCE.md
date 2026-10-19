# D3 completion acceptance — incomplete

Verdict: **BLOCKED — D3 execution is not implemented or accepted.**

Starting branch: `feature/kit-builder-milestone-1`.
Starting commit: `ed1d9c06b0dc260a4a40042e875c0f6f2297064d`.
This document records the resolved approval decision and the limited verified
calculation slice. It does not replace missing HTTP, database or browser evidence.

## Resolved material authority

The user explicitly selected:

> Treat the approved recipe and claimed output quantity as authority for a separate, capped material entitlement.

Raw inputs need not appear in the school's approved material snapshot. Their
authority must instead retain the approved recipe identity/version, its frozen
canonical input quantities and scrap allowance, and the exclusively claimed
output quantity and its exact approved school/demand lineage.

The existing material entitlement trigger only authorizes material lines in the
school snapshot. A forward migration must represent recipe-derived entitlements
explicitly; relabelling them as snapshot material entitlements is invalid.
The decision is resolved. Its database implementation remains outstanding.

## Accounting and consumption contract

For every entitlement, `A = F + H + U`. Transfers change ownership of existing H;
they do not release it and open replacement capacity. Consumed F never decreases.
Material accounts and finished-deliverable accounts remain distinct.

For an exclusively claimed output quantity Q, derive each raw input allowance
once from the approved recipe: `input × Q / recipe yield × (1 + scrap% / 100)`.
Use exact canonical quantities, not floating point. A parent split partitions
that existing allowance, including its explicit remainder. It cannot independently
round each child's budget upward or reuse the parent after splitting.

The calculation module `src/features/production/recipeMaterialBudget.ts` implements
this arithmetic and exact partition validation. It confers **no authorization**,
performs no database writes and is not wired to an execution endpoint.
An inexact four-place material allowance or partial partition is rejected;
no stock quantum is silently invented. Other exact allocations remain representable.

Example: an approved 10-bottle output claim and a recipe using 2 L per bottle
derive A=20 L of raw material. A 6/4 bottle split partitions it into 12/8 L.
After an authorized 5 L issue, raw A=20, F=5, H=15, U=0. The finished-school
delivery obligation has not been fulfilled. A frozen 5% scrap allowance would
instead derive a total 21 L cap; extra loss cannot increase it automatically.

Issue must atomically debit verified physical stock and convert the same material
claim H to F, recording work order, recipe, source claim, location, actor, stock
entry and immutable retry/audit evidence. Failure rolls all of those back.
Returns, rejection, scrap and rework cannot restore F or create replacement capacity.

## Contract-to-implementation matrix

| Contract / workflow | Existing verified foundation | Missing execution integration |
| --- | --- | --- |
| Approved school demand | Frozen approvals, tenant/school identity, current revision checks | Bind work order and each output to exact frozen demand/kit/grade lineage |
| Reservation → production | Exclusive ledger claims and immutable source history | Atomic transfer and reservation SQL witness accepting the transferred owner; no release/reopen shortcut |
| Procurement coverage | Trusted PR/PO intervals and accepted receipt provenance | Carry that lineage into production without reopening demand |
| Recipe → raw material | Approved recipe model; new exact budget/partition calculator | Recipe-derived entitlement schema, immutable provenance, cumulative output funding and SQL enforcement |
| Material issue | Verified physical stock ledger and item/location locking | Trusted issue capability, material H→F, stock debit and deferred cross-table witness in one transaction |
| Produced assembly | Legacy work-order/batch entities | Conserved physical output custody linked to consumed inputs; duplicate output prevention |
| Pouch / kit / common / universal crate | Frozen packing assignments and explicit crate planning | Exclusive custody allocation of inputs/children to output; no second stock debit of already consumed material |
| Packing / six-check QC | Existing UI, legacy QC structures and labels | Trusted packing/QC writes, accepted/rejected custody and concurrency/retry witnesses |
| Operator actions | Authenticated read-only readiness with fail-closed guards | Supported authenticated mutations and mobile/tablet/keyboard browser acceptance |
| Dispatch / installation / closure | Explicitly blocked legacy transitions | D4; outside this request, never enabled as a D3 shortcut |

The legacy isolated production/packing tests do not establish the missing
integrated contracts. Existing D3 guards remain necessary and remain installed.

## Finished-output custody requirements

Assemblies, completed pouches, packed kit units, grade-specific common crates,
complete-set universal crates and QC-accepted packed outputs require conserved
identities. Each must retain tenant, school, approval revision, kit selection,
demand line, work order and authoritative input lineage where applicable.

Created/pending-QC/rejected/accepted/packed transitions must not allocate the same
physical output twice. Rejected or incomplete outputs cannot be dispatched.
Custody creation must not invent finished inventory or mark school delivery F.
These are required contracts, not implemented functionality in this slice.

## Kit rules and synthetic scenarios

Existing `requirementPlanning.test.ts` covers explicit Science common/universal
allocation, independent Math selection and shared activity/pouch demand:

- Two complete Science Grades 8–10 sets: six common crates, two universal crates.
- Three extra Grade 8 Science sets: three common crates, zero universal crates.
- Matching partial grade quantities do not infer complete-set allocation.
- Packing assignments do not duplicate shared physical material requirements.

Those planning assertions passed again alongside the new calculation tests.
Production-to-packing consumption and custody assertions for these scenarios
are still required; planning results alone do not establish execution acceptance.

## Verification for this slice

Command (repository-local TEMP/TMP used for Vitest's sandboxed transform cache):

```powershell
node node_modules/vitest/vitest.mjs run src/features/production/__tests__/recipeMaterialBudget.test.ts src/features/inventory/__tests__/physicalQuantity.test.ts src/features/projects/__tests__/requirementPlanning.test.ts --reporter=dot
npm run typecheck --silent
```

Focused tests: **57 passed, three files**. This includes 23 new calculation tests
covering authority arithmetic, scrap, canonical quantities, exact partial output,
stock range/precision, duplicate inputs, whole-parent conservation, duplicate
children and rejection of inexact partial allocations. Final typecheck: **PASS**.

The first Vitest attempt failed before collecting tests because the sandbox TEMP
cache rename returned EPERM. Re-running with repository-local TEMP/TMP passed.
No test assertion was weakened and no database or operational action was enabled.

## Outstanding acceptance gates

Not run as D3 completion evidence: integrated authenticated HTTP execution,
two-school stock competition, concurrent issues/packing, excessive output claims,
wrong-school/cross-tenant attacks, revoked authorization, token replay, failure
after stock/event mutation, unknown-response retry, SQL bypass attempts, full
suite, frontend/PWA/server builds, QR/PDF performance, browser accessibility,
nonempty restart, fresh restore, stock/event replay and output custody reconciliation.

Historical checkpoint evidence remains in `D3_PRODUCTION_PACKING_EXECUTION_REPORT.md`;
it must not be presented as evidence for the unimplemented execution path.

There is no remaining material-approval business question. D3 remains incomplete
because the database, trusted execution adapters, custody and operator actions
have not been implemented. Continue that authorized work without asking for a
new milestone authorization. Do not claim PASS from this calculation slice.
