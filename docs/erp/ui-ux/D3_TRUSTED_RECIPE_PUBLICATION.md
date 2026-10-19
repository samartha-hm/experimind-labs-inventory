# D3 trusted recipe publication — partial implementation

Code checkpoint: `d53a87ff8fb50d7ce509baced4ba9b2a9aa7540d`.
Branch: `feature/kit-builder-milestone-1`; local/remote full SHA matched.
This implements an immutable recipe prerequisite. It does not complete Priority 1
material issue or establish D3 acceptance.

## HTTP mutation

`POST /api/v1/production-planning/recipe-versions`

Requires a real authenticated admin/super_admin session, Idempotency-Key and
X-Ledger-Capability issued internally for the exact `publishRecipe` request.
There is no public issuer or operator UI. Without the trusted writer the route
returns 503; without capability it returns 403. Cross-session, payload, stale
predecessor and state conflicts return 409 without partial persistence.

Body: name, definition and optional predecessor version UUID. Definition uses
existing recipe fields: tenant output_item_id, canonical unit, positive yield,
inputs with tenant item_id/unit/quantity, optional matching canonical_quantity,
scrap_percent and notes. Accepts one to 100 distinct inputs. Canonical inventory
units only: client conversion factors/identities are rejected. Exact four-place
quantities and scrap allowance are validated with the existing bigint helper
and database guards. Notes are bounded strings.

Success returns 201 with `{id, family, version}`. First publication starts a new
family; predecessor publishes a new immutable version in that trusted family.
Concurrent publications from one predecessor produce one winner. Exact retries
using the same capability return the same result; a replacement capability
reusing a committed operation key conflicts under the existing authority policy.

## Persistence and preservation

RecipePublicationService runs inside TrustedLedgerAuthority's existing writer
transaction, retaining live session checks, actor attribution, operation-key
serialization and immutable authorization evidence. Migration 23 permits writer
INSERT only on recipes; runtime and identity remain read-only. Recipe UPDATE,
DELETE and TRUNCATE remain guarded, including owner-level statement execution.
A deferred constraint requires matching authorization evidence in the same
transaction. An orphan recipe insert cannot commit.

Activation is explicit and restricted to `experimind_kitbuilder_test` and isolated
`requirement_test_<32 hex>` schemas. The test harness activates migration 23
after migration 22 and reprovisions existing boundary roles. It is not registered
for automatic application startup. Historical rows retain null authority_key;
historical families cannot become trusted publication lineage. Down migration
refuses evidence deletion; preserve evidence and use a reviewed forward change.
No persistent development or real-data activation was performed.

## Fresh verification — 2026-10-19

- Requirement integration: 37/37 passed, including publication checks over real
  localhost authenticated HTTP and separate runtime/identity/writer LOGIN pools.
- Concurrent duplicate HTTP requests and retry: one recipe, same result.
- Concurrent predecessor HTTP publications: one success, one conflict.
- Missing session/capability/writer, changed payload, conflicting operation key,
  cross-tenant inventory and cross-session capability: denied without writes.
- Invalid/overprecise quantities and forged canonical quantity: rejected.
- Runtime/identity inserts, writer updates and owner updates: denied.
- Direct writer insert without authorization evidence: transaction rejected.
- Injected authorization-write failure: recipe and receipt both absent.
- Two successful immutable versions reconcile to two actor-attributed receipts.
- Stock ledger, commitment events, balances and claims: counts and row hashes
  unchanged. Recipes are tenant-global; school/output authority is not created.
- Final full suite: 605 passed, one opt-in recovery skipped, 77 passing files;
  `--maxWorkers=2 --testTimeout=30000 --hookTimeout=120000`, 265.48 seconds.
- Typecheck and frontend/PWA/server builds passed; existing chunk warning only.

Earlier default-worker/build-concurrent runs had setup/test timeouts; using a
source-local TEMP also correctly failed private-storage root checks. External
TEMP and bounded workers resolved those failures. The expanded combined boundary
case needed 120 seconds; its isolated rerun and final full run passed. No new
restart, restore, after-restore HTTP or custody replay acceptance was performed.

## Remaining execution work

Priority 1 material issue is unimplemented. Add exclusive approved school-output
claim binding, recipe-derived material entitlements, work-order ownership and
independent physical availability, then atomic stock issue/H-to-F and progress.
Prove duplicate/overdraw/stale/cross-school denial and injected rollback over
HTTP before implementing output custody and packing/QC/operator mutations.
All those execution paths remain guarded. No dispatch, delivery, compensation,
deployment, main merge, historical activation or D4 is enabled by this slice.
