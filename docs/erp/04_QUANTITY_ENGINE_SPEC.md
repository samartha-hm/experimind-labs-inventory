> **Authoritative crate rules updated 2026-10-08:** Read `docs/erp/25_PRASTUTI_SET_AND_CRATE_RULES_CONFIRMED.md` before coding. Earlier crate defaults in prior documents are superseded.

# Requirement / Kit Quantity Engine — Normative Specification

**Purpose:** Turn a hierarchy of project deliverables into exact, explainable required quantities while preserving physical packaging hierarchy. This is **not** a generic BOM `multiply every nested qty` algorithm.

## 1. Required independently controlled counts — 2026-10-08 controlling rules

The calculation must accept **per-school**, **subject-qualified**, **per-grade set counts**, including a separate **explicit number of complete Grades 8+9+10 Science sets** per school.

- Science activity sets per grade: G8, G9, G10 separately.
- Mathematics activity sets per grade: G8, G9, G10 separately.
- Science common crate counts = the corresponding Science grade set quantities (1 common crate **per set**).
- Maths common crates = **0**.
- Science universal crates = explicitly counted complete Grades 8+9+10 Science sets (1 per complete set).
- Grade-only Science orders or Maths-only orders produce **0** universal crates.
- For G8=30, G9=20, G10=25, do not assume `min()` complete sets or one school-wide universal crate; request/validate an explicit complete-set count.
- Subject-qualified keys and preserved site identity are mandatory for traceable demand.
- Box/pouch counts come from approved packaging definitions or explicit project overrides; never assume 1 pouch = 1 activity.
- Optional inclusions, custom additions/removals and approved UOM conversions must remain traceable.

See `25_PRASTUTI_SET_AND_CRATE_RULES_CONFIRMED.md` for full business cases and acceptance tests.

## 2. Quantity bases

| Basis | Multiplier example | Notes |
|---|---|---|
| `PER_KIT` | Science G8 sets=30 | Subject- and grade-specific |
| `PER_GRADE_COMMON_CRATE` | Science G8 sets=30 ⇒ G8 common crates=30 | One common per Science grade set; none for Maths |
| `PER_PROJECT_UNIVERSAL_CRATE` | 2 complete 8+9+10 Science sets ⇒ 2 universal crates | Never count per school; 0 for grade-only/Maths-only |
| `PER_PROJECT` | project=1 | Fixed project-level supplies |
| `PER_BOX` | box count from packing definition | Explicit, not inferred from kit count blindly |
| `PER_POUCH` | pouch count from packing definition | Explicit |
| `FIXED` | quantity once | Avoid nested multiplicity |
| `CUSTOM` | user-provided validated formula/quantity | Do not execute arbitrary JS expressions |

`OPTIONAL`, `REUSABLE`, `SHARED`, `CONSUMABLE` are **semantic attributes**, not themselves multiplication bases. Reusable means ownership/return handling for a workshop; shared means common logical allocation; packaging rules determine counting basis.

## 3. Published templates and project overrides

Published template version is immutable. Project instantiation stores a version reference and immutable base snapshot/links. Project changes become scoped overrides (remove line, replace quantity/rule, add line, change packaging), audited with actor and reason. Future template versions never mutate live projects automatically.

## 4. Expansion algorithm

1. For preview load a versioned DRAFT or APPROVED template snapshot; only APPROVED versions may become operational after stock verification.
2. Resolve all nested references; detect cycles and depth/size explosion. Packaging nodes organize **where items go**, not necessarily multiply material quantities.
3. For each item requirement line, evaluate its explicit quantity basis against context.
4. Apply optional inclusion, exclusions and project overrides.
5. Normalize UOM with verified conversion table and item-specific packaging conversions if needed.
6. Emit a **trace row** (project, templateVersion, requirementId, itemId, basis, multiplier, qtyPerBasis, extendedQty, UOM, package destination, fulfillment method).
7. Aggregate eligible lines by item + normalized UOM + stocking/fulfillment constraints. Do not merge items requiring separate lot/serial/installation destinations without preserving the source trace.
8. Persist a versioned **Demand Calculation** with its inputs hash and provenance; do not mutate physical inventory.
9. Compare against authoritative stock/active reservations/quarantine and incoming PO separately to compute **short now**, **expected later**.
10. Allow explicit authorized reservations as separate atomic operations.

## 5. Example with intentionally synthetic parts

SYNTHETIC GENERIC MULTIPLIER EXAMPLE ONLY (NOT the confirmed Prastuti default): previously used kit quantities G8=30, G9=20, G10=25 with manually supplied G8=1, G9=1, G10=1 crate counts and 1 universal. Real Prastuti Science instead requires **30/20/25 common crates**, and the **universal count must be explicitly configured** as complete Science sets. Any synthetic old counts are test fixture inputs only, not business rules.

- G8 has LED qty=2 `PER_KIT` → 60.
- G9 has LED qty=1 `PER_KIT` → 20.
- G10 has LED qty=1 `PER_KIT` → 25.
- Every grade common crate has safety goggles qty=3 per crate → 9 total, **not** 225.
- Universal crate has multimeter qty=2 per crate → 2 total, **not** 150.
- Universal consumable glue kit qty=1 project-wide → 1.

LED total=105, goggles=9, multimeter=2 in the **legacy synthetic fixture only**. These are **not an approved Prastuti BOM or standard crate ratios**. Confirmed Prastuti rules are in document 25.

## 6. Availability and shortage

On-hand 120, active other-project reservations 20, quarantine 0 → available 100. If new demand 150, short now=50. Incoming PO 30 is shown as expected receipt, not available today. When a portion is already reserved **for the same project**, calculate additional reservation need from unfulfilled project demand rather than double-counting. Guard with row locking or equivalent atomic conditional updates.

## 7. Special cases

- A finished kit in stock may fulfill a project kit line directly. Don't explode and simultaneously procure its parts unless additional kits need production.
- Production waste/yield is applied by the **manufacturing BOM/production plan**, not indiscriminately to every project deliverable.
- Grade common crates can be retained as a separate physical unit even when their component material requirements aggregate for procurement.
- Partial delivery must preserve packed identity and residual demand.
- UOM conversion errors, negative/NaN/overflow quantities, unknown item IDs, unknown basis, duplicate template version lines and recursive cycles fail with descriptive errors.
- Decimal quantities require exact decimal handling in production (e.g. PostgreSQL NUMERIC / tested decimal library). The starter uses ordinary Number for demonstrative integer fixtures only.

## 8. Test gates

1. Per-kit grade math; 2. per-grade common crate counted once; 3. universal counted once; 4. optional excluded/included; 5. project override doesn't mutate template; 6. UOM mismatch rejected; 7. no stock mutation; 8. same inputs deterministic; 9. cyclic nested template rejected in production; 10. large realistic project bounded; 11. cross-project reservation race; 12. finished-stock vs manufacture-shortage planning.
