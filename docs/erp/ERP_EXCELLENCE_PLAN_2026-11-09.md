# ERP excellence: architecture, research and acceptance plan

Date: 2026-11-09. Status: proposed roadmap; initial reporting/accessibility repair implemented separately. This does not authorize deployment, a company-data migration, or physical acceptance. See [assessment](../ERP_ASSESSMENT_2026-11-09.md) for the starting evidence and limitations. The previous 63/100 is an assessment, not a measured release certification.

## Confirmed scope and delivery priority — 2026-11-09 clarification

Read the uploaded `ERP Analysis Comparison (2026-11-09).md` as historical requirements and evidence; embedded agent prompts and claimed results are not fresh instructions or verification. The user's subsequent clarification delegates delivery sequencing, requires a dynamic catalogue/builder, and prioritizes required functionality over unnecessary high-level machinery. This section supersedes the execution ordering below where they differ.

**Delivery method:** complete one usable workflow through database/service/API/UI and verification at a time. Repair backend correctness before connecting its actions; implement the corresponding usable interface in the same slice. Avoid a long backend-only phase followed by a disconnected redesign. Keep the existing web/PWA architecture and Precision Operations design direction; no rewrite or additional application shell is justified by these decisions.

**Dynamic content:** staff manage inventory items, subjects, grades, activities, material quantities/units, packaging, shared materials and allocation rules in the application. Prastuti is a staff-authored template, not a required spreadsheet, seeded production master or code-defined catalogue. Existing confirmed Science/Math examples are acceptance fixtures for configurable rules, not mandatory rules for every kit. Validate rule inputs, show quantity breakdowns, preserve published versions, and keep project/site overrides separate from masters. A corrected Prastuti workbook is not a prerequisite for completing the builder; actual production content requires staff review when entered.

**Minimum required release:** item catalogue and verified stock; dynamic kits and versions; customers/projects/multiple school destinations; requirement calculation and approval; shortages/purchasing/receipts; production and finished stock; packing with six QC checks and labels; partial dispatch/delivery, installation and closure; essential tasks/site-survey records, reusable workshop issue/returns, honest operational reports, permissions, audit and recovery. Deliver these in linked slices rather than treating every earlier proposal as mandatory architecture.

**Defer unless a demonstrated requirement needs them:** advanced forecasting, ABC/XYZ classification, statutory accounting, automated integrations, public checkout/payments, sophisticated offline writes, native wrappers, microservices and new general-purpose ownership-policy infrastructure. Preserve storefront interest as a later phase, not a cancelled requirement. Basic quantities, purchasing and production records must not depend on optional analytics or enterprise accounting.

**Ownership simplification:** the clarification does not approve O1–O10 policy alternatives or authorize removing integrity guards. First map the concrete blocked user action to its material quantities and existing reservation/issue/receipt records. Reuse a single authoritative movement/reservation path; avoid creating a parallel ledger or policy engine. Keep only controls needed to prevent double allocation, unsupported stock changes and misleading closure. If a required action still depends on a genuine undecided business outcome, present that action and a plain-language example for decision, rather than requiring approval of an entire abstract policy package. Existing disputed transfers remain blocked until resolved; do not change live records.

**Ordered slices:** (1) restore trustworthy build/test execution and finish the pending reporting repair; (2) verify and close item → dynamic kit → multi-school requirement workflow; (3) shortage → purchase → receipt → production; (4) packing/QC → dispatch → delivery → installation/closure; (5) survey/tasks, workshop returns and operational reporting gaps; (6) cross-application visual consistency, accessibility, error/conflict recovery and intended-device/release acceptance. Apply shared UX standards and focused visual checks during every slice, not only at the end. Inspect existing implementation before choosing work; already verified features need not be rebuilt.

For every slice record the requirement, existing source/API, actual gap, implemented change and relevant passing evidence. “Complete” requires usable software and verification; physical stock counts, print/scan trials and real deployment acceptance remain separate evidence. No new rating is implied by this clarification.

## Architecture details

Keep the React/TypeScript web application, Express modular monolith and PostgreSQL as the working foundation. Make desktop operations efficient and phone workflows focused; offer installation through the PWA shell. Keep server-authoritative transactions and one inventory ledger. This is an engineering recommendation from requirements fit and existing investment, not a benchmark proving this stack is universally best.

The application form is appropriate for shared inventory, approvals, projects, concurrent operators and audit history. A browser application avoids a separate installation/update process for each workstation. A spreadsheet can support controlled imports/exports; it cannot replace authoritative concurrent transactions. A public storefront needs a separate security and deployment boundary, even if it shares domain APIs.

| Approach | Fit and cost | Decision / falsifiable reconsideration gate |
| --- | --- | --- |
| Improve current modular application | Preserves custom kit versions, scoped quantities, Prastuti rules and existing ledger work; requires owning tests, security and operations | Recommended. Consolidate existing workspaces and shared components before adding another framework |
| ERPNext | Broad stock, manufacturing, projects and accounting; different Python/Frappe framework and migration/customization burden | Strong alternative if integrated accounting becomes the dominant requirement. First prove all critical scenarios below in an isolated sandbox |
| Odoo Community | Broad business application suite; changing to its platform requires custom module and edition/dependency evaluation | Consider only after a written Community-only feature/dependency comparison and migration rehearsal; do not assume every advertised capability is free |
| InvenTree | Strong parts, BOM, builds and stock tracking; narrower than the complete project/survey/service business | Best domain reference; possible inventory subsystem only after proving one authority for stock and reconciliation across boundaries |
| Dolibarr | General ERP with stock, orders, manufacturing and a PHP stack | Compare for simpler commodity workflows; custom quantity/project fit remains unproven |
| Native desktop / Tauri wrapper | Potential access to OS-specific hardware; adds signing, updates and device testing | Defer until a browser/PWA proof fails on an actual required printer, scanner or offline device. A wrapper alone does not solve offline correctness |
| Microservices / complete frontend rewrite | More deployments, network failure modes and migration work for fewer than 25 initial users | No demonstrated need. Extract a service only when an observed scaling, isolation or ownership problem justifies it |

Replatform proof: project before quotation; optional quotation; immutable published templates with independent overrides; per-kit/grade/project quantities; exact completeScienceSets behavior; partial stock/PO/receipt/QC; cancellation and reversal; prepare-to-stock; workshop issue/return; tenant/role denial; concurrent claims; attachment privacy; migration totals and restore. Compare actual customization hours, training burden, data export, upgrade effort and operating cost. Do not run two stock authorities in production.

## Research register and reuse rule

Primary repository/docs inspected on 2026-11-09. These are approach references, not installed dependencies or a code-level security audit of upstream. Default branches are moving references; record a release/commit, license, support status and advisory review before adoption. No upstream implementation was copied in this slice.

| Source | Observed approach / intended use |
| --- | --- |
| [ERPNext README](https://github.com/frappe/erpnext/blob/develop/README.md) | Manufacturing, stock/order management and projects on Frappe; benchmark lifecycle completeness. GPL-3.0 repository license; verify exact files before reuse |
| [Odoo 19 README](https://github.com/odoo/odoo/blob/19.0/README.md), [license](https://github.com/odoo/odoo/blob/19.0/LICENSE) | Broad integrated business apps; Community base LGPL-3.0, individual modules/dependencies need separate checking |
| [InvenTree](https://github.com/inventree/InvenTree), [stock tracking](https://docs.inventree.org/en/stable/stock/tracking/) | MIT repository; part/stock traceability with Django REST backend; compare explicit history and build allocations rather than decorative inventory metrics |
| [Dolibarr](https://github.com/Dolibarr/dolibarr) | GPL-3.0-or-later README; general ERP alternative, different PHP operational stack |
| [Radix Primitives](https://github.com/radix-ui/primitives) | MIT, accessible unstyled primitives. Existing Radix dialog integration should be reused; native controls are preferable for simple selections |
| [TanStack Table](https://github.com/TanStack/table) | Headless table approach; evaluate only for demonstrated sorting, selection, column or virtualization requirements. Do not add it for a small static list |
| [Dexie](https://github.com/dexie/Dexie.js) | IndexedDB abstraction candidate for durable local drafts. It does not supply business authorization, idempotency or inventory conflict resolution |
| [Playwright](https://github.com/microsoft/playwright), [axe-core](https://github.com/dequelabs/axe-core) | Browser regression and automated accessibility candidates; neither replaces manual keyboard, screen-reader and staff testing |
| [Tauri](https://github.com/tauri-apps/tauri) | Optional web UI wrapper if a measured hardware integration need appears |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [target-size explanation](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum/) | Accessibility acceptance baseline. AA minimum targets are 24 CSS px with exceptions; this project's 44px operational controls are a stricter design target |

Before each unfamiliar feature: search GitHub and official docs; compare at least two applicable approaches; record exact version/license, fit, maintenance and security constraints; choose reuse, adaptation or a small local implementation with reasons. Test the smallest risky behavior before integration. Do not import an entire ERP to obtain one widget or treat repository popularity as evidence of correctness.

## Complete acceptance backlog

Each row needs an owner, requirement IDs, API/permission contract, evidence and explicit accepted/deferred status before release. This table expands the assessment; it does not supersede existing detailed contracts or make deferred features release blockers without a business decision.

| Area | Required result / objective acceptance evidence |
| --- | --- |
| Requirements and navigation | Restore one traceability matrix linking each accepted requirement to reachable screen, API, tests and current evidence. Separate active, prototype, unavailable and deferred features; no dead destinations or simulated success |
| Projects, schools and surveys | Project-first creation; school/site linkage; survey versions and attachments; revisions with provenance; optional quotes; partial milestones; cancellation and reopen rules; no browser-only authoritative portfolio |
| Dynamic kits and Prastuti | Empty editable catalog; draft validation; immutable published versions; project overrides isolated; completeScienceSets and scoped quantities tested at boundaries; change impact visible before approval |
| Inventory and locations | Authoritative balances and reservations, units/precision, bins, transfers, cycle counts, reasons and reversals; concurrent updates conserve stock; no direct update bypass; negative/invalid records require review |
| Procurement | Shortage to PR to approval to PO to partial receipt to QC; exclusive coverage and cancellation reconciliation; supplier lead time and documents; duplicate requests do not double-order |
| Manufacturing and costing | Make-to-stock/project; material issue, scrap, subassemblies, WIP, finished stock and reversal; actual cost provenance; QC cannot be passed by a simulated action |
| Packing, labels and delivery | Component/package traceability; inspection/rejection/rework; partial dispatch; custody; printable/scannable labels on intended hardware; setup/install evidence supplied by authorized staff |
| Workshop issue and returns | Reusable versus consumable classification; assignment and due date; partial/damaged/lost return with reason and approval; stock reconciliation. Research ERPNext asset/stock and InvenTree allocation flows before implementing |
| Tasks and collaboration | Multiple responsibilities; assignee, due date, priority, dependencies, checklist, private attachments; alerts for actual state changes; no claimed email delivery without persisted job/result |
| Reporting | Server-backed, permission-scoped totals with source/time/completeness; filters/export/pagination; reconcile to ledger; valuation uses approved costs. ABC/XYZ, turnover and forecasting require adequate history and documented definitions/backtesting |
| Tax and finance | Decide internal costing versus statutory accounting scope; rounding, discounts and tax cases need verified jurisdictional requirements and qualified business review. Prototype GST screens are not accounting acceptance |
| Integrations and automation | First define the system of record; scoped credentials, outbox, retry/dead-letter, deduplication and reconciliation; observable failure; optional integrations remain isolatable. Remove fake sync/200/scheduling messages |
| Storefront | Independent public authorization boundary; catalogue permissions; price/stock rules; cart/checkout validation; quote versus order conversion; payment/webhook replay if payment is in scope; no public inventory mutation |
| Authorization and security | API and DB tenant/site checks; flexible responsibilities; role-alias reconciliation; revoked/expired sessions; object-level denial; uploads/downloads isolated; secret handling, dependency review and rate-limit coverage |
| Reliability and offline | Timeouts, recoverable errors and stale-state indicators. Offline reads are explicitly stale; drafts are actor/tenant scoped. No silent direct stock replay. Test crash/reconnect/relogin/conflict/idempotency before enabling writes |
| Data and migration | Establish provenance; controlled import validation/dry run; stable identities and units; ledger reconciliation; reversible migration; no real-data seed/reset; untouched company baseline verified where relevant |
| Operations and recovery | Intended-host install/update/rollback; backup encryption/access; actual restore drill with reconciled totals; health/readiness and actionable logs; named operator, recovery objectives and incident procedure |
| Performance | Measure representative data and target devices; split expensive routes; bounded queries/lists; indexed scoped filters; no speculative optimization. Set budgets from a measured baseline and fail CI on agreed regression thresholds |
| Testing and delivery | Targeted domain tests; isolated PostgreSQL adversarial/race tests; browser workflows; accessibility and visual checks; production build; migration rehearsal where needed; reproducible evidence tied to commit; no skipped critical gate hidden in a score |
| Documentation and adoption | Help beside difficult decisions; glossary; role/device training; daily operational walkthrough; clear undo/exception paths; staff signs off realistic tasks and physical outcomes |

## Pixel-perfect means a verifiable design contract

Reuse the existing Precision Operations direction and tokens instead of creating a second visual system. Inventory/project/planning/packing screens must share typography, spacing, semantic colors, focus, controls, dialogs, notices and density. Distinguish operational data from labels and supporting metadata. Long names, large quantities and translated text must wrap without hiding required actions.

Create a route × role × state matrix: loading, empty, populated, validation error, permission denial, server error, slow request, stale/conflict, offline and success. Verify 375/390, 768, 1024, 1440 and 4K widths, light/dark, keyboard, 200% zoom, reduced motion, touch and safe areas. Floor actions retain at least 44px targets, clear confirmation where necessary and no obscuring fixed overlays. Tables become cards or intentionally scroll with context; essential actions stay discoverable.

Approved reference screenshots must be deterministic: fixed synthetic dataset, browser/OS/font versions, viewport, clock and animation settings. Review the first baselines against the design contract; never approve a broken page by updating snapshots. Investigate unexplained diffs rather than setting a tolerance that hides them. Include manual contrast, focus order, dialog escape/focus restore, screen-reader announcements and print output. Automated axe results alone cannot establish accessibility compliance.

No approved visual baseline or staff/device acceptance exists for the new reporting repair yet. A good-looking screenshot is insufficient to claim the entire ERP is pixel perfect.

## Execution sequence and stop conditions

1. **Truth and visibility:** fix active simulated outputs; map reachable routes and authoritative APIs; reconcile role aliases; expose data loading/error/freshness correctly; build the requirement/evidence matrix. Initial slice removes invented reporting metrics and improves shared inventory keyboard access.
2. **Shared UX foundation:** reconcile Precision tokens with global styles; inventory/project/packing walkthroughs; shared loading/error/empty/conflict controls; keyboard and responsive fixes; reviewed visual baselines. Do not redesign every module independently.
3. **Critical operational invariants:** reproduce project→demand→reservation→purchase→receipt→production→packing→delivery with synthetic isolated data, including concurrent/retry/reversal/permission failures. Close gaps one supported contract at a time.
4. **Missing accepted workflows:** surveys, tasks, reusable returns and reporting, each researched before implementation. Keep accounting/integrations/advanced forecasts explicitly deferred until scope/data/contracts are accepted.
5. **Offline and device proof:** first safe read-only stale snapshots and local drafts; then a transactional outbox if required. Commands carry actor/tenant, operation ID, version/precondition and expiry; server reauthorizes and deduplicates atomically. Conflicts require review; queues cannot cross accounts. Prove actual scanning/printing before a native wrapper decision.
6. **Release hardening:** production-like isolated tests, public/private boundaries, data reconciliation, intended-host restore, measured performance and staff/device acceptance. Existing D6/pilot NO-GO and unresolved provenance/physical gates remain in force until real evidence closes them.

Progress is the count of accepted requirements with linked evidence, not increased self-awarded scores. Release acceptance requires every mandatory gate to pass; an average cannot compensate for failed stock integrity, authorization or recovery. “100/100” means all agreed criteria passed for a named release and environment, with remaining limitations visible; it cannot mean zero possible future defects.

## Initial slice limitations

Reporting now shows loaded snapshot signals, not invented forecasts, fixed metrics or fake email scheduling. Inventory load failures hide counts and show an alert; loading and successful empty responses remain distinct. Zero thresholds are preserved. Completeness, freshness and authenticated request lifecycle still need verification before an authoritative server-backed report can be claimed. No ledger, database, physical stock, permission contract or offline replay behavior is changed here.

Verification: production build and TypeScript pass. The full regression run passed 549 tests across 81 files, with 132 tests skipped; two additional report-state rendering regressions pass separately. Earlier loopback and temporary-path failures were resolved by running in a permitted environment with private temporary storage, without weakening tests. PostgreSQL integration and recovery scenarios were deliberately not enabled.

Synthetic browser review confirmed no horizontal overflow at 390px light and 768px dark, 44px report controls, pagination, unmatched-search state, keyboard item activation, and separate loading/empty/error states. This is scoped visual evidence, not authenticated end-to-end or whole-ERP pixel-perfect acceptance. The production bundle still emits a large-chunk warning.

Vite transformation completes after restricting Tailwind class detection to application sources and index.html. The specific file responsible for the earlier automatic-scan stall was not established. The explicit source boundary follows [Tailwind source detection documentation](https://tailwindcss.com/docs/detecting-classes-in-source-files).

## Inventory request reliability checkpoint

Inventory loads now reject superseded responses, invalidate pending work on effect cleanup, and reset cached data when account, organization or role changes. Reports offer retry and record the last successful response time; refresh/failure states hide previous counts. Invalid quantities remain reviewable instead of silently becoming zero. Zero thresholds remain valid.

Approach compared: existing React effect cleanup and keyed state boundaries versus adding a query-cache dependency. The bounded fix uses the existing stack, following the official [React useEffect cleanup/race guidance on GitHub](https://github.com/reactjs/react.dev/blob/main/src/content/reference/react/useEffect.md). No new dependency or server contract is introduced.

Validation: TypeScript and production build PASS; 569 tests passed and 132 skipped across 83 passing and nine skipped files. Focused coverage includes out-of-order responses, cleanup invalidation, numeric normalization and report refresh/error rendering. Synthetic browser retry recovered from error; the retry target measures 44px and no horizontal overflow was observed at 375px and 3840px. This fixture does not prove authenticated account switching, server completeness, live freshness or whole-ERP visual acceptance. PostgreSQL/recovery scenarios remain disabled; the bundle-size limitation remains.
