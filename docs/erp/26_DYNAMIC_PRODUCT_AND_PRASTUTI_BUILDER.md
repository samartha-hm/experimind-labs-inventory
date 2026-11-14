# 26 — Dynamic Product & Prastuti Kit Builder (V5 authoritative plan)

**Status:** APPROVED AS DESIGN INTENT from user request 2026-10-08. **Not implemented.** This document adds to, and takes precedence over, older instructions describing Prastuti as a mandatory seeded static kit or a fixed spreadsheet import. For confirmed crate quantity behavior, refer to `25_PRASTUTI_SET_AND_CRATE_RULES_CONFIRMED.md`.

## 1. Product principle

**An authorized Experimind employee must create, modify, test, approve, and publish ANY kit through the ERP UI, without touching source code, importing Excel, or asking a programmer.** Prastuti is an initial configurable product family, *not* a hardcoded schema. Start with an **empty catalog**, and allow an operator to build Prastuti from zero later. Historical Excel/PDF references may be imported to a staging/draft area only with human verification, and must not be mandatory for production or onboarding.

Use the existing React / Express / TypeORM / PostgreSQL stack; retrofit useful current kit/Prastuti UI and parsing code rather than deleting it. The master template editor is a core business function; do not defer it to a future “admin-only script.”

## 2. Two related graphs, not one rigid tree

**Educational/activity graph**: product family -> selectable subject -> grade/level -> activity -> materials and reuse requirements. Activities have codes (e.g., 8.4.1), names, instructions, attachments, optionality and links to required items. Grade and subject are **user-maintained categories**, not globally hardcoded enums; initial choices 8/9/10 + Science/Mathematics are illustrative.

**Packing/fulfillment graph**: product/version -> deliverable set -> physical container (activity box, common crate, universal crate, reusable case, etc.) -> partitions/compartments -> pouches -> physical content items. Items can be assigned to physical containers *independently of* which activity uses them. Several activities may share a pouch/partition and a material may serve multiple activities. Avoid naïve 1 activity = 1 pouch/partition and avoid multiplying shared equipment once per activity.

Tie the graphs together with explicit associations `activity_material`, `activity_pack_assignment` and `container_component`, using unique identities, UOM, quantity basis and scope. A `partition` is a **compartment of a physical box**, containing one or more pouches. The user should be able to manage locations of packed contents visually without enforcing a brittle fixed nesting depth.

## 3. Builder UI — MVP screen flow

1. **Product Library**: searchable list with Add Product / Clone / Archive, type=Prastuti/STEM/Robotics/Lab/Custom (editable, extensible).
2. **New Product Wizard**: name, description, category, version owner, available subject/grade options or generic variants, attachments; save draft immediately.
3. **Structure Editor**: accessible outline/table (drag-drop only as enhancement): Add Subject, Grade, Deliverable Set, Activity, Box, Partition, Pouch, Crate, Component. Inline quantity/units; duplicate/move/rename nodes; ordering; find usage; pictures/checklists. Keep educational and physical structures in **separate tabs** with a mapping/association view.
4. **Material Picker**: search existing real inventory item names/descriptions; request new inventory master item through validation; preserve stable IDs; unit selection/conversion and make/buy/prepare default. Unknown stock is not silently zero. Warn on duplicate/similar item names.
5. **Quantity Rule Editor**: safe rule presets (`PER_SELECTED_SET`, `PER_GRADE_SCIENCE_SET`, `PER_COMPLETE_SCIENCE_BUNDLE`, `PER_BOX`, `PER_POUCH`, `PER_CLASSROOM`, `PER_SITE`, `FIXED`, `OPTIONAL`, `CUSTOM_EXPLICIT`); choose multiplication scope, scope owner and rounding/UOM; explain rule in natural language. Rules are typed data, **never arbitrary JS/expression eval**.
6. **Test/Preview**: operator creates a hypothetical Project with multiple schools, quantities per selected subject/grade, explicitly entered complete science bundle counts; previews container counts and material needs traced to site -> set -> activity/packing -> item; no physical stock movements.
7. **Validate & Publish**: approvals, missing links/units, circular references, dangerous duplicate demand, incomplete quantities, unapproved materials and unknown conversion failures block publishing. Version increment with diff/approval. Allow draft save at any stage.
8. **Project Configure**: user selects a published version (or authorized one-off draft instance) and configures a project/site independently; overrides are site/project scoped and do not mutate the master.
9. **Labels/Manufacturing**: print pouch/box/crate labels from packing assignments, open QC tasks, and plan buy/make/prepare; production execution/inventory consumption deferred until the downstream modules are connected.

Every action must work via supported API and PostgreSQL with role checks; browser localStorage is permitted only for non-authoritative UI preferences, not for templates, quantities or approval state.

## 4. Model entities (suggested conceptual schema, evolve after repo audit)

- `product_family` (id, code, name, type, description, owner, status)
- `product_template` (id, family_id, code, name, description, current_published_version_id)
- `product_template_version` (id, template_id, version_number, status: draft/in_review/published/superseded, derived_from_version_id, created_by, approved_by, approved_at, content_hash, immutable_published_at)
- `template_variant` (id, version_id, dimension_type: grade/subject/other, value, display_name, sort_order, selectable)
- `template_node` (id, version_id, parent_id nullable, kind, code, title, description, sort_order, metadata_json, active), separating graph kind/relationships; parent links alone are insufficient for cross-activity reuse
- `template_node_link` (id, version_id, from_node_id, to_node_id, relation_type, packaging_location_id nullable)
- `template_component` (id, version_id, owning_node_id, inventory_item_id, quantity_decimal, base_unit, quantity_basis, rule_id nullable, loss_pct nullable, optionality, make_buy_prepare_policy)
- `template_quantity_rule` (id, version_id, typed_rule_json, scope, explanation)
- `template_attachment` (id, version_id, related_node_id, storage_pointer, sha256, mime, original_name)
- `template_change_audit` (id, template_id, version_id, actor_id, timestamp, action, old/new diff)
- `project_site_selection` (id, project_id, site_id, template_version_id, selection_snapshot_json, ordered_sets_json, complete_science_sets_explicit, status)
- `project_site_override` (id, selection_id, target_identity, operation, quantity, unit, reason, approved_by, actor_id)
- `requirement_snapshot` (id, selection_id, template_hash, rules_version, generated_at, trace_json, aggregate_json, state)

Prefer normalized relational columns for quantity, identity and FK-critical attributes; restrict JSON to typed extension/rule/snapshot payloads validated at API boundary. Use DB constraints and TypeORM migrations, transactional version publication, row concurrency control and idempotency keys for mutations. Prevent cross-tenant/site leakage. Consider immutable published version rows plus cloned drafts instead of in-place edits.

**Inventory links:** existing canonical item ID must be referenced; create aliases/duplicate review flow rather than automatically merging existing names. Existing stock values, prices and location data have *not* been verified. Keep opening stock `unknown` until counted, with ledger only for confirmed transactions.

## 5. Quantity rule semantics — confirmed Prastuti example

Per project site independently, inputs:

```
scienceSetsByGrade = {8: s8, 9: s9, 10: s10}
mathsSetsByGrade = {8: m8, 9: m9, 10: m10}
completeScienceSets = explicitly confirmed nonnegative integer
```

- Science grade-G common crates = `sG` (one per ordered **science grade set**, not per school).
- Maths common crate count = zero, regardless of maths sets.
- Universal science crate count = `completeScienceSets`, **only for complete Grade 8+9+10 Science bundle(s)**.
- Grade 8 Science alone -> zero universal crates, even if multiple copies.
- Maths-only -> zero universal crates.
- Each complete bundle consumes one set from each grade: validate `completeScienceSets <= min(s8,s9,s10)`; explicitly confirm this field, especially when quantities differ, and do not infer from school count or grade presence.
- A template created for another product type defines its own typed bundle and common-material rules. **Do not encode `Science`, `Maths`, `8`, `9` or `10` into DB constraints or generic calculation engine branches.** Implement the Prastuti rule as *configuration of* a generic set-and-bundle evaluator. Generic rule concepts may specify `bundle_components = [{variant:{grade:8, subject:Science}, qty:1}, ...]` and package scope `per_bundle`.
- Correctly distinguish **activity requirement quantity** from **physical packing content**. A component used by two activities but packed once belongs to one common shared location/quantity rule. Avoid double counting during aggregation.
- Preview produces traceable lines and conflicts, not stock transactions/reservations.
- Unknown inventory availability must render `UNKNOWN / STOCKTAKE REQUIRED`, not 0, even if planning demand is precise.

## 6. Versioned templates and safe changes

Draft -> Review -> Publish -> Supersede. Only draft contents editable; publishing creates immutable content hash, approved identity and deployment timestamp. Clone a published version to begin v2. Project selections retain `template_version_id` and full selected configuration snapshot; master v2 cannot silently alter ongoing projects. A deliberate update wizard must show demand delta, stock/reservation impact, and obtain approval. Audit metadata retained for critical edits.

Import wizard accepts XLSX/CSV/document references **only as a draft staging flow**: show line-level source, confidence, mapping, duplicate candidate, unresolved units/qty; operator approves each mapping; never synthesize a `qty=1` or `unitCost=50` without explicitly labelling placeholder. Unapproved source rows cannot publish or create procurement demands. Historical PDF pages have missing/handwritten values: no automatic production consumption from them.

## 7. Nonfunctional and local-first requirements

Build on PostgreSQL/Express/React/TypeORM. Run locally (single LAN-hosted server; containers desirable) with backups, restore runbook, attachment storage abstraction for future cloud object storage, migrations, role permissions, approval trail, unit and integration tests. No paid API dependency for creating kits or calculating demand. Keep file attachments out of Git, with DB pointers and portable backup/restore. Publishing/demand creation is permission-protected; at least Maker/Reviewer/Approver separation recommended where team size permits.

## 8. End-to-end acceptance criteria (write automated tests)

1. Fresh database **without any Prastuti seed**: operator creates a new product, a Science subject, Grade 8 variant, first activity, one box/partition/pouch and two materials via UI/API; saves draft; persists on reload.
2. Create a full Science G8+G9+G10 template with 1 common crate per grade-set plus a conditional 1 universal crate per explicit full bundle; publish version 1 after validation.
3. Site A orders G8 Science x2 only -> 2 G8 common crates, 0 universal.
4. Site A orders full G8+G9+G10 Science x2 -> 2 common crates for each grade, 2 universal.
5. Site B orders Maths G8+G9+G10 x3 -> 0 science common, 0 universal.
6. One NGO project contains A and B; site manifests separate, project aggregate item demand totals correct, shared materials not multiplied per activity.
7. Edit published version 1 -> rejected; clone to draft version 2, change one item/quantity, publish, existing Project A remains pinned to v1.
8. Project override changes Project A only, not site B or master; changes are audited.
9. Invalid rule, circular node/link, unknown/invalid unit, missing inventory item, unresolved duplicate, or invalid complete bundle count blocks publish/preview with actionable explanation.
10. Preview with all stock quantities unknown shows demand and `UNKNOWN` availability, **does not generate ledger lines or reservations**.
11. Operator can create totally different Robotics Kit from scratch and calculate quantities with no Prastuti-specific code changes.
12. Auth, role checks, transaction rollback, same-time edits/version conflict, import mapping and attachment access are tested.

## 9. Implementation order / slices

- **B0 — Safety baseline**: repo backup, dependency install/build test record, secure exposed Project/Production/Sticker routes, review existing `src/utils/prastutiTemplateEngine.ts` and static `src/data/prastutiKitsData.ts` for reuse/retirement, restrict unsafe import defaults and route permissions.
- **B1 — Persistent generic catalog**: additive DB migrations; CRUD for ProductFamily, Template, Version and custom variant selection; simple Product Library UI. Empty-first workflow; no static Prastuti seed required.
- **B2 — Authorable structure and components**: activity graph, packing graph, material picker, UOM, safe typed quantity rules and versioned drafts; UI from simple outline/table controls first; preserve existing inventory IDs.
- **B3 — Read-only preview**: adapt validated pure quantity engine into generic versioned-template evaluator; project/site configuration with explicit complete-set counts; traceable material demand and unknown-stock behavior.
- **B4 — Publish/approve/version/snapshot**: approval/diff, immutable version, Project/site overrides, tests.
- **B5 — Operations integration**: procurement, production, QC, packing, labels and site delivery, with transactional inventory ledger and stocktake gate.

**First user-visible demo:** Create an entirely new kit through UI without uploading a spreadsheet; save it, link known inventory item master records, generate read-only per-site demand and edit draft. This demo precedes full Prastuti data entry. Historical data entry is not a prerequisite to proving the builder works.

## 10. Exact code review targets already present in the uploaded repo

Inspect `src/utils/prastutiTemplateEngine.ts`, `src/data/prastutiKitsData.ts`, existing related tests, `ProjectManagementService` localStorage, relevant API routers and entity registration. In current parser, missing `qty` can default to **1** and missing `unitCost` to **50**; these are **unsafe for approved BOM import**. Replace implicit placeholder-to-real behavior with explicit unknown/unverified states for the new importer. Static Prastuti constants may remain *demonstration/legacy reference data only*, not required application startup seed or production truth.

**Source confidence:** All business rules in 5 follow this user's confirmations. Entity and route naming are *design proposals*, not already existing migrations. Uploaded old sheets are unapproved. No new application feature claimed implemented by this V5 document.
