# Milestone 8 — Production and in-house preparation

Production Command and saved project workspaces use the same authenticated production panel. Current database roles authorize actions: staff create and operate orders; managers/admins approve recipes and release orders; inventory staff/managers/admins inspect output. Every write requires an actor-bound idempotency key and expected revision.

## Recipes and work orders

Create an independent recipe with an inventory output, explicit yield/unit, inventory inputs, expected scrap percentages, instructions and optional chemical specification/concentration. Inputs must use canonical units or an explicit active tenant conversion. Approved recipes are immutable; create a new draft version to revise one. Orders snapshot the recipe and calculated inputs. A manual explicit recipe is also supported; no formulation is inferred.

Create a manual or project/site-linked order with quantity, due date, priority, employee/team and instructions. Project-linked orders preserve the requirement revision and site. Release, reserve verified inputs, then start. Reservations do not move physical stock and compete with project allocations under the same item locks. Unknown or incomplete physical coverage blocks reservations. Outputs require an existing verified scope, including an explicitly counted zero opening for newly manufactured items.

Record actual input issues and included scrap at verified locations. Issues consume reserved quantities and post negative movements exactly once. Record partial output batches only after sufficient useful inputs have been issued. Pending output is unavailable. Inspect portions as accepted, rejected or rework; resubmission returns rework to pending inspection. Only acceptance posts positive stock. Finish an order after all recorded output has resolved QC; partial completion/cancellation requires a reason and releases unused input reservations. Accepted stock is retained. No automatic project fulfillment, dispatch, procurement or recipe-driven chemical calculations occur.

## Planning and preservation

Previews subtract both project and production allocations from free stock and show active production as incoming. Physical stock remains the existing verified stock_ledger; no second balance source or legacy inventory-master updates. Project/site trace and immutable history persist. Production history prevents site removal, and active work prevents project archival. Recalculation is read-only.

Migrations 1791763200005 and 1791763200006 are additive. The first creates production records and extends existing ledger/capacity guards, preserving previous trigger definitions. The second adds deferred issue/allocation/QC/input reconciliation. Empty rollback/reapply is tested; populated rollback refuses history loss. Preserve populated schemas and use a forward repair. Apply only through the guarded isolated-development migration helper; never reset retained data.

## Verified acceptance

Authenticated development HTTP/PostgreSQL scenarios PASS: laser order plans 10 m, issues 6 m including 1 m scrap, records 5 m output, accepts 3 m and rejects 2 m; make-for-stock accepts two 1 m batches; a two-school project links and accepts a further 1 m. Inputs end at 11 m from 20 m; accepted output totals 6 m. Exact issue replay posts once. Repeated project previews show 3.3 m gross demand without ledger changes or automatic allocation. Existing inventory masters and historical ledger remain unchanged.

Eleven production integration tests cover units, validation, approval, immutable versions, partial QC/rework, concurrency, tenant/RBAC, allocations, rollback and reconciliation. Full suite: 418 tests/56 files; typecheck and frontend/PWA/server builds PASS.

Visual/browser acceptance remains pending because runtime bootstrap returned EPERM. In a browser-enabled session, open Production Command, create/approve a recipe, release/reserve/start an order, issue inputs, enter two batches and inspect portions; reload order/history and project previews. Verify controls, persistence and shortage/incoming displays. Synthetic retained records and credentials are ignored under .local-dev. Stop for review; no Milestone 9, merge or deployment.
