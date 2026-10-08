# Real Prastuti Workbook — Source Data & Safe Import Plan

**Found in user's previously shared Project files.** The original workbook is included unchanged at:

`source_data/SEP26 PRASTUTHI ASSEMBLY SOP  and Items.xlsx`

**SHA-256:** `1c86a1cf835de5000580731e0226ac0ae038690ccb8d62cc7319b5dd6985d2bd`

This is a real Experimind operational spreadsheet, **not the synthetic JSON fixtures** in `fixtures/`.

## Verified sheet inventory

| Sheet | Used area | Purpose |
|---|---|---|
| Grade 8 Component Checklist | A1:J108 | G8 items, activity, prep/pack status |
| Grade 9 Component Checklist | A1:I77 | G9 items and prep/pack status |
| Grade 10 Component Checklist | A1:I104 | G10 items and prep/pack status |
| 9TH SCIENCE | A1:M135 | activity items and separate `Common Crate` / `Universal Crate` columns |
| 10TH SCIENCE | A1:H173 | activity items and separate `Common Crate` / `Universal Crate` columns |
| Master Progress Dashboard | A1:K20 | snapshot of preparation/packing progress |
| Comments & Doubts | A1:I9 | operational issues requiring followup |
| Additional sheets | various | maths, old versions, activity dashboards, video tracking |

The workbook's dashboard states **237 total component entries** (Grade 8: 74, Grade 9: 68, Grade 10: 95) and describes **72 activities** across the three grades (23, 24, 25). These are workbook *dashboard labels*, not independently deduplicated SKU counts or a guaranteed final approved BOM. Previous generic claims of "209+ materials / 79 activities" should **not be treated as verified facts** for this workbook.

## Import readiness: staging only

This workbook contains many **unstructured preparation quantities**, such as `full dropper bottle`, `1 set (6 slides)`, and `250 g in universal crate`. It also contains item names with formatting variants. It is unsuitable for automatic production purchasing until rows are normalized and reviewed. Do not silently convert strings into numeric quantities.

The raw CSV exports in `source_data/raw_exports/` preserve cell values of the chosen worksheets for easier agent inspection. They are not final schema-ready BOMs. The original workbook takes precedence if inconsistencies exist.

### Safe import workflow

1. Import originals into a **staging** table with source workbook/sheet/row, raw description, quantity text and optional `Common Crate`/`Universal Crate` source cells.
2. Normalize item names / units into a candidate Item Master mapping; avoid creating a duplicate for minor spelling variants.
3. Map each activity code and grade to `KitTemplateVersion`, `Activity`, and relevant packing group.
4. Split `quantity_text` into `quantity_numeric`, `unit`, `package_size` and `confidence`; mark ambiguous strings `REVIEW_REQUIRED`.
5. For items described in the common/universal columns, create separate typed template lines with **explicit site/grade crate scopes**, not per-kit defaults.
6. Distinguish `prepped` and `packed` historical spreadsheet flags from actual ERP inventory availability; **do not migrate these as live stock balances**.
7. Add crosswalks from spreadsheet rows to any existing database item IDs, preserving the original real inventory item records.
8. Produce a review report: duplicate candidates, ambiguous quantity, missing unit, crate-scope ambiguities, unknown SKU, incompatible UOM, chemical-storage/packing warnings.
9. Obtain approval for each template version before publication and before auto-generating procurement quantities.
10. Run a multi-school dry-run and compare one complete physical packing manifest with reality.

### Required per-row provenance

`source_filename, sheet_name, spreadsheet_row_number, source_activity_code, source_item_name, raw_quantity_text, mapped_item_id, site_scope, grade_scope, packing_unit_type, normalized_quantity, uom, review_status, reviewed_by, reviewed_at`.

### Do not assume

- Every sheet is the same production version.
- Dashboard row counts equal unique SKUs.
- Common crate contents are multiplied per activity.
- Universal crate contents exist once for an NGO project with multiple schools.
- Prepped/packed historical flags prove live warehouse stock.
- Blank quantities mean 1.
