# Experimind ERP — Learnings from Old Prastuti Sheet

**Source:** `prastuti old sheet.pdf` (11 pages, historical scanned paper checklist).
**Status:** Research/understanding only. **NOT an approved production master, BOM, current stock record, or packing standard.**
**Prepared:** 2026-10-08.

## 1. Confirmed from the historical document

### Page 1: Grade 8 Science, activity-level materials and common crate

The sheet has columns for activity number, activity name, materials, quantity, and checklist. Beside them is a **separate common-crate checklist** with shared tools/equipment (e.g., droppers, watch glass, tripod stand, beakers, spirit lamp, safety goggles, wire mesh, lighter). The positioning of one common-crate row alongside one activity row is a *page-layout convenience*, not evidence those records are a one-to-one relationship.

Examples of activity-linked material lines: Grade 8 8.4.1 magnesium ribbon and sandpaper; 8.6.1 bar magnets, toy cars, rubber bands; 8.7.1 MDF with hole, spring balance, sandpaper, thread; 8.8.1 tuning fork and glue-gun stick. Quantities may be counts, lengths, weights, container-fill instructions or free text. **Do not automatically normalize these into exact units without verification.**

### Page 2: Grade 8 packing/partitions and universal crate

- Distinct **partition checklist** and **stickers complete including activity sticker** checks.
- Partition entries may *group multiple activity numbers*, e.g., `8.4.1 to 8.4.5` and `8.10.1 to 8.10.3`.
- Also checks `chart box` and `common crate`.
- Separately identifies a **universal crate** and its contents (e.g., distilled water, thread roll, filter paper, blue nitrile gloves, tray, test-tube cleaner, washing bottle).

**Design implication:** An activity is a curriculum unit, a partition is a physical packing grouping, and a sticker is an independent verification step. They need separate records. Do not assume one activity = one pouch/partition.

### Pages 3–4: Grade 9 Science

Includes activity IDs, materials/quantities, checklists, and a **Grade 9 common-crate** tool checklist. Examples: 50 mL syringe, camphor, china dish, thermometer, sodium chloride, sugar, sand, corn starch, laser pointer; shared test tubes, holders, watch glass, flask, tripod, etc. Some activities have checked rows without completed material specifications; the page is a working execution sheet, not an exhaustive normalized BOM. Page 4 continues later grade 9 activities such as spring balance, pendulum, tuning fork, slinky, and soil-erosion chart.

### Pages 5–6: Grade 10 Science

Shows chemicals/consumables, experiments, activity materials, a **Grade 10 common crate**, and a **universal crate** section. Examples include sodium hydroxide solution, phenolphthalein indicator, magnesium ribbon, pH strips, vinegar, baking soda, continuity tester, iron nails, beakers, test tubes, optical bench and light box. Page 5 lists hydrochloric acid and lamp fuel under a universal-crate heading. Page 6 continues optical/electricity activities.

**Design implication:** Grade-specific lists can contribute items under a universal-crate heading; do not assume universal-crate contents are invariant across grades. Chemicals require validated specifications, packaging and controls before manufacturing or delivery; the historical handwritten instructions are not sufficient authorization.

### Pages 7–8: Separate Mathematics delivery checklists

Maths is structurally listed by grade **and box**, rather than the Science activity/material table:

- Grade 8: Box 1 and Box 2
- Grade 9: Box 1 and Box 2
- Grade 10: Box 1 and Box 2; `Box 3` heading present but no populated list in this old copy

Activities include probability spinner, exploding dots, algebra tiles, nets of solids, coordinate board, clinometer, Thales theorem, trigonometry board, area of circle, dividing a line segment, and Galton board/marbles.

Each activity has its own completeness check and **sticker** check. Page 8 also has a separate `Common` section (e.g., sphere/cone, magnetic board).

**Design implication:** `Subject` (`Science` / `Mathematics`) is needed independently of `Grade`; the same term `box` may be an actual kit container; common/shared materials might be subject-specific, not necessarily a second crate.

### Pages 9–11: Prastuti Manufacturing Follow-Up

These pages are tracking sheets, **not only BOMs**. They track activity number, activity name, remarks 1/2, client/date fields, and handwritten work notes/checkmarks. Page 11 has an **Online Procurement Section** and short codes:

- `PB` — Plastic Boxes
- `PC` — Plastic Covers
- `PN` — Partition
- `BS` — Box Stickering
- `CS` — Cover Stickering
- `8CC` — 8th Common Crate
- `9CC` — 9th Common Crate
- `10CC` — 10th Common Crate

**Design implication:** Packing material procurement, fabrication/preparation, checks and labeling are separately trackable work packages, sometimes at an activity, partition, box, crate, or project/school level. Codes should be preserved as legacy reference codes only until reconfirmed.

## 2. Confirmed current requirements from conversation (NOT inferred from the old PDF)

1. **One NGO/project can supply multiple schools** and destinations.
2. **Each school normally receives one universal crate**.
3. **Each school normally receives one common crate for each grade supplied**.
4. Prastuti is repeatable from templates and project-specific modifications must not overwrite masters.
5. The September assembly workbook is also provisional; a corrected master will be provided later.
6. **Only the existing inventory item names/details are reliable**. Prices, quantities, reservations, locations and other ERP values must be revalidated/initialized separately.
7. Application should be **locally hosted first** and cloud-portable in future.

## 3. Target business model affected by this PDF

```text
Project (e.g., NGO campaign)
└── School / Delivery Site (1..N)
    ├── Grade offering (0..N)
    │   ├── Subject: Science / Mathematics (selection to clarify)
    │   ├── Curriculum activity definitions
    │   │   └── Activity-material requirements
    │   ├── Physical packing definitions
    │   │   ├── Box/Crate
    │   │   ├── Partition / Pouch (mapping to clarify)
    │   │   └── Physical packed items
    │   └── Grade common crate (one per supplied grade; content rule versioned)
    └── Universal crate (one per school; contents built from applicable rules)
```

The **logical curriculum tree** and **physical packing tree** are distinct. Map activity/material requirements to their actual packing destinations; don't infer that each activity gets a dedicated pouch from these pages.

Also track independently:

- production/preparation tasks;
- purchase/online-procurement tasks;
- preparation/material checks;
- packing completeness;
- sticker/label verification;
- inspection/quality;
- school/site fulfillment and delivery.

## 4. Quantity-rule concerns to preserve

The old sheet mixes numbers (`2`, `5`, `40`), physical dimensions (`15cm × 20cm`), amounts (`50 gm`, `1 meter`), packaging (`small zip-lock packet`, `dropper bottle`), and fill directions (`75% in white small container`). These are **different data types** and must not be converted into a common quantity blindly.

Suggested fields (after confirmed master arrives): `amount`, `UOM`, `piece specification`, `container type`, `container capacity`, `fill fraction`, `packing destination`, `shared scope`, `subject`, `grade`, `activity`, `source version`, `review state`.

The PDF is a historical observation and can seed **candidate activity/material/packing references** with `REVIEW_REQUIRED`, but it must not seed production-ready BOM lines, stock quantities, active work orders, or chemical handling rules.

## 5. Questions requiring confirmation before freezing packaging semantics

1. **Science vs Maths offering:** At each school, does selecting Grade 8/9/10 Prastuti automatically include both Science and Mathematics, or can each subject be ordered independently? Is the single grade common crate shared between both subjects?
2. **Partition vs pouch:** In the Science checklists, multiple activity codes appear under one `partition`. Is a partition a compartment of a box, a physical activity pouch, or something else? Can several activities intentionally share one pouch/compartment?
3. **Universal crate content:** One universal crate per school is confirmed, but when several grades are supplied, should its contents be the combined (deduplicated/quantity-adjusted) requirements of all selected grades, or is there a fixed standard universal-crate contents list regardless of grades?

The actual counts per grade/subject and official material quantities should be validated when the corrected master is received, not inferred from this old scanned record.

## 6. Status and next steps

- **Done:** Inspected the 11-page old scan as a historical packaging and manufacturing-process source.
- **Done:** Identified distinct activity, materials, crate, partition, sticker, maths box, procurement and manufacturing-follow-up concepts.
- **Do next:** Confirm the three packaging/subject questions above.
- **Later:** Compare against the corrected production master; map item names to reviewed ERP catalog; publish versioned templates; then validate quantity-engine calculations with a real multi-school project.
