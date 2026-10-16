# Milestone 13C — Precision Operations refinement

2026-10-16. Design review checkpoint; operational integration remains pending.
The existing DEV entry `/__design/13b#kit` and `#packing` now show 13C.
Synthetic fixtures and edits remain in memory; refresh restores the baseline.

## Kit Studio

Education, activity/BOM and physical inspector remain alongside each other at
desktop and 1024px landscape widths. Navigation collapses into the existing
accessible drawer before those columns become cramped. Portrait places education controls above a two-column editor and inspector;
the activity list scrolls independently and quantity/review panels use explicit
view switches instead of permanently expanding the page.

Activity selection links to pouch selection. Box → partition → pouch references
stay separate from material ownership. Shared microscopes name their grade
common-crate owner; the universal crate owns its balance. References create no
additional BOM demand. Mathematics retains independent selection and quantities.

Quantity inspection exposes grade counts, common rate and an explicit complete
Science 8–10 allocation. The minimum selected Science count is a capacity limit,
never an inferred complete-set allocation. The existing authoritative calculator
is unchanged. Invalid counts or missing Science 8 mappings block sample review,
including after navigating to another grade.

Approved v1 remains immutable and independent of draft v2. Comparison identifies
changed fields in text as well as color; the empty comparison is explicit.
Conflict simulation pauses editing, retains the draft and offers inspection;
ending that simulation never claims to merge server changes. Discard requires
confirmation. Search has an empty state; a labelled stress fixture supplies 24
long activity names and 12 additional packaging partitions without adding demand.

## Packing and QC

Package reference, fixture revision, school/destination and physical hierarchy
stay visible above the checklist. Enter-driven lookup accepts the exact sample
reference after trimming/case normalization and announces found/unknown feedback.
It does not connect to cameras or physical scanners.

Warehouse actions/selects have at least 56px targets; checklist rows are at least
72px with 24px checkboxes. Completion, operator handover and reviewer approval
are separate actions. The immutable sample reducer enforces role/stage rules:
Packing → Ready for review → Approved, or Rejected → Corrected → Reinspection
→ Ready for review → Approved. Notes are required for rejection/correction.
Reinspection clears old checks; correction alone does not resolve the exception.
Approval retains rejection and correction history. Role switching demonstrates
responsibilities and is explicitly not live authorization.

Loading, error, offline and permission denial disable operational-looking
actions. Unknown lookup hides package content. Recovery controls identify the
synthetic sample. Light/dark tokens, selected states, visible focus, reduced
motion and Radix dialog focus handling remain shared with the existing preview.

See [acceptance and evidence](MILESTONE_13C_ACCEPTANCE.md) and the
[bounded integration proposal](MILESTONE_13C_INTEGRATION.md).
