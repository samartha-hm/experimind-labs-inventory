# Milestone 13J — future safe-write proposal (not implemented)

The Projects workspace is read-only. Further implementation requires review and authorization.

| Candidate action | Existing contract | Conditions before integration |
|---|---|---|
| Edit project/school allocations | Existing planning save with expected project revision, current database role, tenant ownership, immutable revision history | Separate write flag; explicit save; stable school/selection UUIDs; validation by existing service; 409 comparison/reload without overwriting; interrupted-save recovery by authoritative reload |
| Change kit requirement version | Existing save only accepts authorized approved kit snapshots | Explicit approved version/provenance choice; preserve per-school quantities and context; existing calculator preview; review changed demand; no automatic operational re-release |
| Archive project | Existing archive with revision and history | Review linked downstream records and existing service constraints before exposing; explicit confirmation and authoritative persistence feedback |
| Approve school requirements | No independent school approval entity/transition | Block until a scoped backend contract defines approvers, revision locking, audit, reversal and downstream effects |
| Reserve/procure/produce/pack/QC/deliver/install/complete/reopen | Separate operational services and independent permissions | Keep outside Projects writes. Each transition needs its own contract audit, concurrency/retry/idempotency and ledger tests, approval/provenance review and authorization |

Do not infer approval, close blockers automatically, recalculate packing or move inventory in this interface. Before any future writes, exercise two-tab conflicts, duplicate submissions, lost-response reload, cross-tenant denial, current-role checks and approved snapshot immutability against synthetic PostgreSQL. Capture before/after operational fingerprints and prove only the authorized API effect. Preserve legacy default and migration-free interface rollback.
