# V5 first coding agent prompt — Dynamic Kit Builder priority

Repository: `repository/experimind-labs-inventory-main/` (or canonical GitHub checkout).

Read only relevant source and these authoritative files first: `AGENTS.md`, `docs/erp/26_DYNAMIC_PRODUCT_AND_PRASTUTI_BUILDER.md`, `docs/erp/25_PRASTUTI_SET_AND_CRATE_RULES_CONFIRMED.md`, `docs/erp/27_DYNAMIC_BUILDER_IMPLEMENTATION.md`, `.agent/NEXT_TASK.md`.

**Our business requirement has changed from spreadsheet-driven Prastuti to an EMPTY-FIRST, UI-AUTHORABLE, GENERIC KIT BUILDER.** Any authorized employee must be able to create Prastuti entirely inside ERP later: subject, grade, activity, box, partition, pouch, materials, common crate, universal crate and conditional quantity rules. Prastuti itself must be stored as an editable approved/published template, not code constants. The old PDFs and worksheets are UNAPPROVED references and cannot silently seed production BOMs.

Existing ERP inventory **names/descriptions only** are trusted. Do not alter or delete them. Existing prices, stock, locations and code parsing defaults are not verified. Project can contain multiple school sites with different quantities. The confirmed universal crate belongs only to an explicitly ordered COMPLETE science G8+G9+G10 set: two full sets mean two universal crates; a G8-only science order gets none; maths never receives crates.

Execute a small, working first milestone:
1. Establish real source baseline: npm ci, build, test or typecheck. Record actual outputs. Never run db:clean or seed scripts against company database.
2. Protect operational routes (Project/Production/Sticker) with authentication, authorization and tenant safeguards.
3. Review and propose non-destructive schema for generic product family/template/version/variants/activities/packing nodes/typed quantity rules; **implement a first PostgreSQL CRUD slice**.
4. Implement Product Library + New Draft form persisted in PostgreSQL and start an editor in which a user can add a new kit and a component through UI. Don't wait for Prastuti workbook.
5. Add relevant automated tests, update agent handoff and report files/commands/results. Never claim the whole ERP is complete.

For next milestones follow `docs/erp/27_DYNAMIC_BUILDER_IMPLEMENTATION.md`. Avoid sweeping refactors. Request approval before changing canonical inventory identifiers, erasing data or making irreversible schema changes.
