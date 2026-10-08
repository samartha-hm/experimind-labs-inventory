# Prastuti Science/Mathematics Set and Crate Rules — Business-confirmed October 2026

**Status: ACCEPTED — supersedes earlier one-per-school and one-per-grade assumptions.**

## Product configuration

- A school can select Science, Mathematics, or both for any supplied grade.
- Every Grade 8/9/10 **Science set** contains its own activity boxes, partitions, pouches, and **one Science grade-common crate**.
- Mathematics has its own activity boxes, partitions and activity materials. **No mathematics common crate** exists.
- A **universal crate is Science-only**, and belongs to **one complete Prastuti Science set containing Grades 8, 9, and 10**.
- Each complete Science set contains one of each grade's Science set; therefore two complete Science sets receive **two** universal crates (not one shared per school).
- A Grade 8 Science-only order gets **zero** universal crates. Mathematics-only gets **zero** universal crates.
- The source's physical partition is a compartment in a box that contains activity pouches. Activity != pouch != partition; several activities can share a partition.
- The preceding scanned/September worksheets are **reference only**, not approved bills of materials. Do not create purchasing quantities, stock issues, or real work orders from unverified sheet quantities.

## Explicit quantity definitions for a school/site

```json
{
  "siteId": "school-A",
  "scienceSetsByGrade": {"8": 2, "9": 2, "10": 2},
  "mathsSetsByGrade": {"8": 0, "9": 0, "10": 0},
  "completeScienceSets": 2
}
```

The `completeScienceSets` value is an **explicit order/configuration field**. It is not inferred from the fact that all three grades appear, nor inferred from the number of schools. Validate it is an integer >= 0 and is no greater than any of the science grade counts. When grade quantities differ, the operator must identify how many complete Grade 8+9+10 sets they intend: do not silently apply the `min(gradeCounts)` heuristic. If missing, block an automatic universal-crate calculation until supplied; the UI can suggest a value but must require confirmation.

## Calculation

For school `s` and grade `g`:

```text
scienceActivitySetCount(s,g) = scienceSetsByGrade[g]
scienceCommonCrateCount(s,g) = scienceSetsByGrade[g]
mathActivitySetCount(s,g) = mathsSetsByGrade[g]
mathCommonCrateCount(s,g) = 0
universalScienceCrateCount(s) = completeScienceSets
```

When a project covers many schools, calculate per-site packing **first** and then aggregate compatible item demand across sites for procurement/production. The project global inventory shortage must not erase school/site ownership or packing destinations. Universal crates remain attributable to the correct site and complete set.

## Acceptance cases

| School order | Science common crates | Universal crates |
| --- | --- | --- |
| Grade 8 Science x1 | G8: 1 | 0 |
| Grade 8 Science x2 | G8: 2 | 0 |
| Full Science Grades 8+9+10 x1 | G8: 1; G9: 1; G10: 1 | 1 |
| Full Science Grades 8+9+10 x2 | G8: 2; G9: 2; G10: 2 | 2 |
| Maths Grades 8+9+10 x2 | None | 0 |
| Science x1 full + Maths x2 for each grade | G8/G9/G10: 1 | 1 |
| School A full Science x2; School B Grade 8 Science x3 | A: 2 each; B: G8: 3 | A: 2; B: 0 |
| Science G8=30, G9=20, G10=25 without explicit complete-set count | Unambiguous per-grade common: 30/20/25 | **BLOCK / ASK** |

## Safe operational constraints

- Quantities are not trusted merely because existing database numbers are populated; only item names and descriptions were confirmed reliable.
- Version the eventual approved Prastuti template; preserve project-specific overrides and school/site identity.
- Never mutate physical stock while expanding templates, deriving crate counts, or calculating shortage.
- Any per-site subject/grade line must be keyed by grade **and** subject to avoid combining Maths and Science.

## Source provenance

User directly confirmed these rules in conversation; reference evidence in `source_data/prastuti old sheet.pdf` and `docs/erp/24_OLD_SHEET_LEARNINGS.md` when present. Exact material quantities are not yet approved.
