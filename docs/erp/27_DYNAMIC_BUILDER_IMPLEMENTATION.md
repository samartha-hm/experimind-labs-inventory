# V5 Dynamic Builder — Coding execution plan

**Instruction to agent:** This document replaces the previous assumption that an approved Excel workbook must be available before the first functional Prastuti product can be created. The ERP shall support authoring entirely from a blank database. Reference `docs/erp/26_DYNAMIC_PRODUCT_AND_PRASTUTI_BUILDER.md` for definitions and validation.

## MVP mission

Deliver a working **Kit Builder V1** in the existing application. Start blank: create Product -> Subject/Variant -> Activity -> Box -> Compartment/Partition -> Pouch -> Item/quantity/rule; save -> preview -> publish. Grade 8/9/10 Science and Maths are **editable template content**, not hardwired schemas; configure Science grade common and three-grade universal crate behavior as rules.

### Tasks in dependency order

1. Capture baseline `npm ci`, `npm test`, `npm run build` (or available commands); don't alter original inventory names/descriptions and don't run destructive seed/clean scripts. Secure operational routes with auth + tenant boundaries.
2. Audit existing Prastuti parser, static dataset and functions, document which portions to reuse. Code for import must not silently replace unknown units/quantities/prices with real-looking defaults.
3. Make additive migrations and API: product templates, immutable versions, variant definitions, structure nodes/links, component definitions/rules, audit and attachments. Do not use localStorage as persistence.
4. Build Product Library / New Draft / Structure Editor / Material Picker / Preview screens. Support editing generic products and empty-first use; don't prioritize drag-and-drop over functional controls.
5. Implement generic **typed** quantity-rule interpreter and adapter for grade common crates + universal crate only with explicitly configured full Science bundle. Keep the existing pure engine as an isolated source of tests and migrate it without regression.
6. Build project/site selection and override snapshots, versioning, diff, role authorization, pub/sub review (approval workflow), completeness checks.
7. Write tests including 12 acceptance criteria in doc 26; record actual test outputs, migration rollback and local deployment runbook.

### Delivery contract for every PR

List changed files, DB migrations, tests executed/results, one screenshot or walkthrough path, data preservation impact, unresolved questions, and updates to `.agent/NEXT_TASK.md`, `.agent/PROJECT_STATE.md`, `.agent/DECISIONS.md`, `.agent/SESSION_HANDOFF.md`. Do not mark completed without running tests. Keep one functional, reviewable vertical slice per PR.

### Constraints

- No hardcoded activity master, fixed grades, or mandatory Excel import.
- No invented/assumed approved Prastuti quantities and no destructive DB seeding.
- No physical stock changes during preview, requirement or reservation creation.
- Product template can also represent other kits, and projects can serve multiple sites.
- Configuration schema and typed evaluator must be testable without a browser.
- Full project build integration and final deployment still require actual verification.
