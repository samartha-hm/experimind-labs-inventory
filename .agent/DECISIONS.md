# Architecture Decision Records

Accepted = directly user-confirmed or clear invariant; Proposed = require implementation validation/business approval. Never rewrite history; append superseding ADRs.

## ADR-001 — Project-first operations — ACCEPTED 2026-10-08
**Decision:** Project is the operational container; quotations/sales orders are linked and may arise at different stages. **Reason:** NGO/school process includes survey and planning before confirmation; internal/R&D/preparation projects can predate orders.

## ADR-002 — Free self-hostable application — ACCEPTED
**Decision:** no mandatory paid third-party service, per-user ERP license, or hosted proprietary backend. Optional service costs allowed and must be isolatable.

## ADR-003 — Versioned, editable project-specific Prastuti — ACCEPTED
**Decision:** published reusable kit templates instantiate independent project requirements with custom overrides; other projects and master unaffected.

## ADR-004 — Scope-specific quantity planning — ACCEPTED
**Decision:** per-kit, per-grade common crate and project universal crate tracked separately; auto-calculation is the core feature.

## ADR-005 — Prepare-to-stock and prepare-to-project — ACCEPTED
**Decision:** internally fabricated or assembled reusable finished outputs are stockable for later orders.

## ADR-006 — Single physical site initially — ACCEPTED
**Decision:** one location in first deployment with bin support and extensible warehouse hierarchy.

## ADR-007 — Flexible multi-responsibility access — ACCEPTED
**Decision:** fewer than 25 staff initially; users can hold multiple roles/responsibilities; rigid designations inappropriate.

## ADR-008 — Site survey, tasks, packing, multiple delivery, workshop returns — ACCEPTED
**Decision:** site surveys/versioned files; linked tasks; activity/box/selective item stickers; common/universal crate structure; multiple batches, delivery and setup; occasional equipment return.

## ADR-009 — Full accounting deferred — ACCEPTED
**Decision:** prioritize operations, costs and sales amounts now; full double-entry and GST integration later.

## ADR-010 — Keep verified existing stack — PROPOSED
**Decision:** preserve React/Vite/Express/TypeORM/PostgreSQL where confirmed; actual repo manifest must be inspected first.

## ADR-011 — Additive, reversible migrations — PROPOSED
**Decision:** strangler pattern, dry-run + rollback gates; review after baseline audit.

## ADR-012 — Project common crate count explicit — PROPOSED default protecting correctness
**Decision:** don't assume one common crate per kit. User described class-specific common crates, not exact standard crate count for every situation; preserve as explicit input until confirmed by data.

## ADR-013 — Multi-school customer projects — ACCEPTED 2026-10-08
**Decision:** A parent project may contain many distinct school sites/delivery destinations, each with independent requirements, site survey, packing, delivery and setup. Project-wide procurement/production may aggregate demand only while maintaining per-site traceability.

## ADR-014 — Preserve actual inventory item masters — ACCEPTED 2026-10-08
**Decision:** Existing inventory items are real. Preserve IDs/crosswalk, data, descriptions and import provenance. Validate on-hand stock quantities separately before posting opening balances.

## ADR-015 — Local-first, cloud-portable hosting — ACCEPTED 2026-10-08
**Decision:** self-host on LAN/local server initially; containerized PostgreSQL and persistent attachments with backups; optional later cloud migration without proprietary mandatory services.

## ADR-016 — Real Prastuti workbook recovered — VERIFIED FILE 2026-10-08
**Evidence:** `source_data/SEP26 PRASTUTHI ASSEMBLY SOP  and Items.xlsx`; crate scopes are now confirmed as one universal per complete Grades 8–10 Science set and one grade-common crate per Science grade set. However, individual component quantities in the workbook remain provisional; review ambiguous quantities.

## 2026-10-08 confirmed V3
- Real inventory data: only names/descriptions trusted; old quantity, price and location invalid.
- SUPERSEDED by ADR-017: universal crates are per complete 8/9/10 Science set; common crates are per Science grade set.
- Draft SEP26 workbook not approved, must be replaced later.
- Source ZIP uploaded, verified; local hosting first/cloud later.

## ADR-017 — Prastuti Science-only crate rules and complete Science set scope — ACCEPTED
**Supersedes conflicting statements in ADR-004, ADR-012, ADR-016 and V3 documents.** Science/Mathematics can be ordered independently. Common crates: one per Science grade set; no Maths common crates. Universal crate: one per **complete three-grade Science set**, none for grade-only orders or maths-only. Two complete Science sets receive two universal crates. For uneven grade counts, explicitly record complete Science set count: do not infer it. See `docs/erp/25_PRASTUTI_SET_AND_CRATE_RULES_CONFIRMED.md`.

## 2026-10-08 V5 — Kit Builder is product source of truth

User requires that Prastuti can be created, edited and approved directly through the ERP at a later time; old workbook is optional staging, not mandatory dependency. Use generic product/kit authoring and typed quantity rules; document 26 supersedes spreadsheet-first/hardcoded master assumptions. No business data migrated or implementation completed by this documentation revision.

## ADR-018 — Baseline source and implementation gate — 2026-10-08
VERIFIED: V5 handover source archive selected for baseline because it includes required specifications and continuity. No canonical Git history present. Git/Docker/psql unavailable on PATH. 228 Vitest tests and typecheck/build pass after dependency installation; legacy 13-test crate engine is not compliant with doc 25.
PROPOSED: feature/kit-builder-milestone-1 on canonical checkout; additive generic catalog/draft-version tables in a separate development database. No branch, schema or company-data changes made. Existing tenant fallback/global legacy state requires fail-closed isolation, not merely added middleware. Canonical checkout requested from user.

## ADR-019 — Canonical checkout and legacy API gate — ACCEPTED implementation 2026-10-08
Canonical URL found in docs/erp/17_REPO_AND_ENV_SETUP.md. Git installed and repository cloned to D:/Experimindlabs/ERP/erp-development. Feature branch created from 03bf7d6; no history rewrite or push.
Legacy Project/Production/Sticker/QC provisioning/Traceability stores lack tenant ownership. Gate all versioned/legacy aliases before dispatch: JWT then explicit nonzero UUID tenant then admin/staff role, then 503. No tenant receives shared records, including admins. This intentionally suspends these HTTP workflows until persistence isolation is implemented; local UI/service code is not migrated by this change. Alternatives rejected: auth-only or configurable tenant whitelist would still expose unverified shared state.
16 real HTTP tests added; 244 total tests pass. No schema/company-data changes. V5 specs and continuity copied into canonical checkout for future agents.

## ADR-020 — Draft Kit CRUD model and development verification — IMPLEMENTED 2026-10-08
User explicitly approved this slice after containment gate, withholding production/merge/push approval. Schema explained before changes: additive product_templates stable tenant identity and product_template_versions version-specific content; no legacy inventory changes. Composite parent/tenant FK and explicit creator/editor IDs; archive retains rows. Future graph/material/packing tables can reference version UUID; no rigid Prastuti schema or full engine implemented.
Authorization: header JWT plus active current user DB lookup matching subject/organization; current DB role controls reads/writes. Client ownership/state/version fields rejected. Viewer read-only; admin/staff/manager/editor/inventory_staff/project_staff write roles (super_admin supported). Existing role aliases kept explicit for this new API rather than relying on permissive legacy hierarchy. Missing/default zero organization rejected.
Transaction creates both rows; parent row locking plus revision prevents lost updates; API only mutates drafts. Soft archive rather than irreversible delete. Published-version immutability/publication workflow remains future scope.
Separate portable PostgreSQL cluster on 127.0.0.1:55432, two named development/test DBs; scripts guard target and initialize ONLY empty database. Bootstrap existing metadata to support real ERP login/UI without executing legacy migration/seed chain. Synthetic fixture users only; empty catalog. Tests use retained unique synthetic schemas. Migration up applied, down not run. No company-data access.
Verified UI-created Prastuti survives actual ERP process restart, edit saved as revision 2. 254 tests/46 files including 10 PG integration cases PASS; typecheck/build PASS. Fixed global form selector accidentally matching dark: class substrings in light mode; request logs omit query tokens; dev server HOST configurable and demo bound to loopback.

## ADR-021 — Permanent GitHub checkpoint workflow — ACCEPTED 2026-10-08
Direct user authorization: GitHub is authoritative; after successful checks, create logical commits, push the feature branch, verify remote hash, then commit/push the short handoff and verify again. Never force-push, rewrite shared history, merge main or deploy without approval. Supersedes earlier no-push restriction; no next feature milestone authorized by this review.
Review publication safeguard: no shared development account password is committed; fresh setup generates random credentials in ignored local storage. Existing development accounts and database are not modified. Git author identity for these agent commits is Codex <codex@localhost> (per-command configuration, no global identity change).

## ADR-022 — Version-owned physical packing snapshots — IMPLEMENTED 2026-10-13
Milestone 3 extends the existing subjects JSONB: each grade owns an ordered box/partition/pouch tree with stable UUIDs, names, optional codes/notes, pouch activity references and inventory location references. This bounded version-owned content saves atomically with educational requirements and revision history; no migration, backfill or additional inventory master is required. Packing references do not add material demand or change stock.
Server validation enforces hierarchy, size limits, UUID uniqueness, sibling name/code uniqueness and same-grade activity references. Tenant-scoped inventory validation runs under transaction read locks; display labels are authoritative inventory-name snapshots. Embedded references have no database foreign keys: an out-of-band inventory deletion after saving can orphan an old reference; the next save rejects it. Cross-version reporting may later require a relational projection.
Rollback needs no down migration. Older application code may ignore packing and strip it when resaving, so preserve revision rows and avoid saving packing drafts with pre-M3 code. Existing migration up/down smoke verification runs only in synthetic test schemas. No company data, development accounts, seeds or stock were changed.

## ADR-023 — Configurable crates and explicit previews — IMPLEMENTED 2026-10-13
User authorized Milestone 4. Ordered common/universal/custom crate definitions live under subjects in existing version-owned JSONB with stable IDs, inventory materials, quantities, units, notes and optional/reusable flags. Entire definitions are revision-snapshotted; existing tenant-scoped validation and transactional revision locks apply. No migration/backfill/seed or hardcoded catalog. ADR-022 embedded-reference and older-application rollback limitations apply.

Generic typed rules support selected subject/grade components, explicit complete bundles, fixed quantities and explicit project/site counts. Complete counts are required even for partial selections (zero), bounded by every component and never inferred. Subject quantities are independent. Prastuti is employee configuration: grade-specific Science crates, no Mathematics crate, and universal crates per explicitly confirmed complete Science 8–10 bundle.

Preview context is transient: no master edits, operational records or inventory transactions. Optional definitions require inclusion; reasoned overrides replace crate counts or final material quantities. Reusable flags describe requirements without reducing demand automatically. Decimal calculations have six-place precision, bounds and trace lines. Packing references add no demand. Published versions stay immutable; publication/Project Integration remain outside scope.

## ADR-024 — Immutable approvals and school planning — IMPLEMENTED 2026-10-13

User authorized Milestone 5. Explicit approval copies a validated saved draft into a published version with approval provenance; drafts remain editable. Planning foreign keys accept only tenant-owned approved versions. Database triggers enforce published and revision immutability.

Projects own ordered school sites, selections, quantity contexts and reasoned overrides. Transactional parent locking plus revisions prevents lost updates. Project defaults are validated independently; school overrides take precedence. Shared project/site crate rules require explicit allocation and reject duplicate positive allocations. Reusable flags and packing references never silently reduce or duplicate requirements.

Explicit active tenant unit conversions use exact six-place arithmetic and preserve source/factor provenance. Unconvertible quantities remain separate with warnings. Gross demand is independent of untrusted historical balances: verified stock, reservations, ATP, incoming and shortages are null, and operational release is blocked. No operational writes or production-data import.

Additive migration 1791417600002 applied only to the isolated development database. Down is verified on empty synthetic schemas and refuses populated projects/approvals; preserve populated schema and use a forward fix or disable access. No production migration, merge or deployment.

## ADR-025 — Approved counts in the existing stock ledger — IMPLEMENTED 2026-10-14

Milestone 6 uses the existing PostgreSQL stock_ledger as the sole verified quantity source. Nullable physical provenance distinguishes approved counts from unverified historical movements; no historical values are backfilled or corrected. Immutable scopes contain only unit/location metadata. The existing four-place ledger precision is retained; count parsing/conversion uses exact integer arithmetic and rejects inexact quantities.

Tenant-scoped draft/review/approve/post sessions carry revision snapshots and entry actor provenance. Current database roles authorize approval. Atomic posting locks sessions and sorted inventory items, validates reviewed balance/sequence and inserts unique ledger entries exactly once. Posted counts/events/verified movements are immutable; new approved counts provide corrections. Legacy inventory/location movement paths cannot change verified stock. Partial coverage stays Unverified; later approved postings explicitly attest complete coverage without changing original scope metadata.

Read-only project previews derive verified on-hand and unreserved availability from verified ledger sums. Missing coverage/unit compatibility leaves stock and shortage null. Unsupported reservations, incoming and projected shortages remain null; operational release is blocked. Additive migration 1791504000003 has empty rollback/reapply coverage and refuses populated rollback. Development-only application; no company data, procurement, production or deployment.

## ADR-026 — Verified allocations and approved purchasing — IMPLEMENTED 2026-10-14

Milestone 7 adds tenant-owned revisioned reservations, purchase requests and receipts while extending existing purchase orders and stock_ledger. Physical verification remains the Milestone 6 scope/provenance model. Reservations never change on-hand; fulfillment and accepted receipts post auditable movements exactly once. Sorted item locks and database capacity guards protect concurrent writers; ledger guards prevent physical stock falling below active allocations.

Planning uses exact decimal arithmetic and explicit unit conversions. Free stock excludes all active reservations; immediate shortage credits this project's reservations and fulfilled supply. Projected shortage additionally credits its approved incoming. Pending/quarantined receipts remain incoming but unavailable; rejected receipts consume order allowance and require a new approved order for replacement. Unknown physical stock remains Unverified.

Request/order review and approval require current-user roles. Reviewed lines are immutable. QC is required by default; an explicitly approved non-QC line permits posting on receipt. Idempotency keys bind actor/input, immutable events retain revision snapshots, and receipts preserve project/site/supplier provenance. No autoallocation, production or historical-price backfill. Manual purchase orders are unvalued; commercial valuation is outside this milestone.

Migration 1791676800004 preserves the installed ledger guard for reversible empty rollback. Populated rollback refuses history loss; use a forward repair or disable access. Only isolated development/test databases were used.

## ADR-027 — Explicit production inputs and QC-gated stock — IMPLEMENTED 2026-10-14

Independent versioned recipes carry explicit inventory inputs, yield, scrap allowance and chemical metadata; approved versions and order snapshots are immutable. Production allocations share verified-stock capacity with project reservations. Actual input issues alone consume physical stock; pending/rejected/rework output does not add stock. QC acceptance posts to the existing stock_ledger exactly once. Decimal conversions, item locks, revisions, actor-bound idempotency and deferred database reconciliation protect history and concurrent operations.

Project/site orders preserve demand revision and contribute incoming quantities to read-only previews. Accepted output never automatically fulfills or dispatches a project. Output requires explicit verified coverage, including a counted zero opening. Legacy masters/history remain unchanged. Empty additive migration rollback restores prior guards; populated rollback refuses data loss. No chemical inference, procurement expansion, dispatch or production deployment.

## ADR-028 — Package custody and controlled project completion — IMPLEMENTED 2026-10-14

Dispatch exclusively claims immutable tenant-owned QC-ready package hierarchies. Custody events reference original packing picks and authoritative ledger entries. Dispatch, POD, returns, installation, closure and reprinting never deduct stock again. Returns quarantine unreceived physical packages without fabricating an inventory receipt.

Current database roles, actor/input-bound idempotency, immutable revisions and project locks govern execution and acceptance. Completion evaluates every school and outstanding supply; explicit authorized exception closure records blockers and reason. Closed projects fence operational writes until audited reopening. Installation acceptance preserves assignment, checklist, issue, recipient and site traceability. Secure attachment storage and browser visual acceptance remain unavailable/pending; text acknowledgement and read-only manifests are implemented.

## ADR-029 — Bounded Precision Operations foundation — IMPLEMENTED 2026-10-15

The user approved Direction A with focused Packing/QC for Milestone 13B only.
Use a DEV-only lazy preview with synthetic in-memory fixtures, scoped light/dark
tokens and Radix Dialog 1.3.1. The measured minimal dialog bundle is smaller than
React Aria Components 1.22.1; advanced collection controls remain a later decision.
Quantity previews invoke the unchanged authoritative calculator. Approved fixture
revisions remain independent. No API, schema, ledger, RBAC or historical changes.
Existing ERP stays reachable; production does not expose the prototype.

Browser prototype acceptance and frontend checks pass. Database-enabled regression
and authenticated smoke remain blocked by unavailable isolated PostgreSQL/backend.
No staff usability testing occurred. User review, device/accessibility validation
and explicit 13C authorization precede wider integration. No rollout is approved.
