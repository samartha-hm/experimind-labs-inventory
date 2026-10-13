# Session handoff

Date: 2026-10-13. Branch: feature/kit-builder-milestone-1.

Activities and Material Requirements: COMPLETE and pushed to GitHub (a0b0bc2).

Delivered: `KitActivity`/`KitMaterial` types nested in the existing `subjects` jsonb snapshot (no new migration needed — additive jsonb extension, no shape constraints); `normalizeActivities`/`normalizeMaterials` with validation (activity name 1–100 unique per grade, code ≤50, description ≤2000, instructions ≤5000, reference_url ≤500, max 100 activities/grade; material name 1–200, unit ≤20 default `pcs`, notes ≤500, quantity finite ≥0, max 100 materials/activity, duplicate `inventory_item_id` rejected); server-computed `complete = requiredQuantity > 0` so incomplete quantities are never production-ready; `validateMaterialReferences()` enforces tenant-scoped `inventory_item_id` existence (400) and is wired into `create()`/`change()`; `searchMaterials()` + `GET /materials?q=` picker over the existing inventory master (name/sku/description ILIKE, limit 20) registered before `/:id`; Product Library activity + material editors (add/edit/reorder/remove, Incomplete badge, debounced picker); `withActivities()` normalizes legacy kits lacking the `activities` key on open/save.

Verification: typecheck PASS; build PASS; full suite 282 passed / 0 failed (48 files); 11 new `normalizeActivities`/`normalizeMaterials` unit tests; 4 new integration tests (activities CRUD + snapshots + inventory non-mutation, structure validation, cross-tenant/missing material refs, picker auth/tenant). Browser walkthrough on embedded PostgreSQL 17.5 (port 55432): kit opens without white screen, activity editor renders under grades, material picker returns inventory items, Incomplete badge clears once quantity is set. Persistence-after-reload step not re-verified after the badge fix (dev server/DB restarted mid-walkthrough).

Next milestone (not started): BOMs, Packing, Crate Rules. Reuse embedded PostgreSQL in `D:\Experimindlabs\pgsql\pgtmp` (v17.5 works; v18.4 broken). Dev accounts in `.local-dev/development-accounts.json` (gitignored).

Preserve inventory names, fail-closed legacy APIs, tenant authorization. No merge to main, no force-push, no destructive DB scripts.
