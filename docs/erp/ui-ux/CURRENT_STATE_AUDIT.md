# Current state audit

2026-10-15 · Discovery only · Baseline `d3bd7d57a9470b7a4385e84ac428a3e18ee90238`, branch `feature/kit-builder-milestone-1`.

## Evidence and limits

Read the accepted [browser results](../38_BROWSER_ACCEPTANCE_RESULTS.md), [pilot-readiness record](../39_PILOT_READINESS_AND_FINAL_ACCEPTANCE.md), [workflow model](../02_WORKFLOWS.md), [confirmed crate rules](../25_PRASTUTI_SET_AND_CRATE_RULES_CONFIRMED.md) and [builder design intent](../26_DYNAMIC_PRODUCT_AND_PRASTUTI_BUILDER.md). Older design-intent schemas are not evidence of implemented entities. Current implementation was selectively inspected in the sources below.

Live read-only browsing used the local authenticated development app at `127.0.0.1:3100`, synthetic fixture records, and the current Inventory Staff session. Overview, Product Library, saved Kit Builder and a multi-school project with supply, production, packing and delivery sections were inspected. No inventory or workflow mutations were submitted. Other role experiences were assessed from source and historical acceptance, not fresh signed-in role sessions. No staff interviews, measured task timings, full accessibility audit or concept tests occurred. See [evidence register](EVIDENCE_REGISTER.md).

## Prioritized findings

Priority expresses design urgency, not a newly demonstrated backend defect.

| Priority | Observed evidence | Consequence / proposed response |
| --- | --- | --- |
| P1 | Kit editor combines metadata, activities, material assignments, physical containers, crate rules, preview, approval and save in a long page | High navigation and comparison burden. Linked outlines, contextual inspector and persistent save/version state; preserve both domain graphs |
| P1 | Packing renders packages as repeated rows with parent UUIDs and separate checklist/QC controls | Hierarchy and selected target are hard to scan. Tree/list with readable ancestry, sticky selected-package context and explicit selection scope |
| P1 | At 390 px, open navigation obscures form content; floating history competes with bottom navigation | Narrow-screen reachability and focus risk. Modal navigation, safe-area aware controls; verify focus manually before claiming WCAG compliance |
| P1 | Project planning warning says operational release is disabled while downstream supply/production/packing sections are present | Message scope can confuse staff. Stage-specific verified-stock and release prerequisites; preserve server gates |
| P2 | Project page serially embeds planning, supply, production, packing, delivery and attachments; tablet capture reaches packing only below production | Handoffs and next action require lengthy scanning. Project stage navigation and a persistent site/revision context |
| P2 | Overview emphasizes aggregate cards: 12 shortages, 4 replenishment, 0 fulfillment, 0 project kits in this fixture | Counts alone do not convey owner, urgency or next action. Role-relevant actionable queue with linked explanations; counts are not a business baseline |
| P2 | Header and floating history expose repeated history actions; dense header has search, shortcuts and quick create | Visual competition and possible overlap. One contextual history entry and a simplified shell |
| P2 | Current navigation uses mixed groupings such as Projects & Prastuti and Replenishment | Operational responsibility is less explicit. Test domain labels and role starts without removing existing destinations |

## Architecture and reuse

`package.json` declares React `^19.0.1`, Vite `^6.2.3`, TypeScript `~5.8.2`, Tailwind `^4.1.14`, Lucide, Motion and Recharts. These are declared ranges, not a lockfile/version audit. Express/TypeORM/PostgreSQL contracts remain authoritative. App navigation is state-driven; no routing, query-cache, headless table or accessible primitive package is declared there. Adding deep links or aggregate search requires a bounded technical design, not a presumed existing endpoint.

| Source | Relevant finding |
| --- | --- |
| `src/features/core/navigation.ts` | Permission-filtered groups and tab destinations |
| `src/features/core/workspacePolicy.ts` | Platform navigation aliases and role-specific default tabs |
| `src/features/kit-builder/ProductLibrary.tsx` | Dirty-state unload protection, save revision, approval of saved immutable version, history |
| `src/features/projects/ProjectPlanningTab.tsx` | Saved/clean project prerequisite, demand revision, stale-calculation guard, serial operational panels |
| `src/features/packing/PackingPanel.tsx` | Revision-aware operations, retry idempotency key reuse, role-specific actions, package/QC audit |
| `src/features/core/OperationsWorkspace.tsx` | Aggregate overview cards and module links |
| `src/index.css` | Existing spacing/radius/shadow/motion/touch/safe-area tokens |

Source paths identify inspected responsibilities; implementation must resolve exact current locations before editing. Existing SmartCombobox, SmartSelect, CommandPaletteModal, ResponsiveDataView, EmptyState, SkeletonLoader, OfflineStatusBar, ToastContext and RequireRole are reuse candidates, not accessibility-certified components. Inventory barcode/QR and PDF dependencies already exist. Consolidate rather than replace them without evidence.

Navigation aliases map legacy `viewer` to project navigation, while accepted API behavior denies viewer writes. Navigation visibility is **not** write authority. Keep server authorization and tenant scope unchanged; derive action affordances from actual capabilities.

## Non-negotiable safeguards

Two related graphs: educational activity/material use and physical placement. Shared pouch links do not multiply material demand. Partition means a physical compartment, not activity or pouch. Science common crates follow each selected grade set; Maths has no common crate. Universal crates require explicitly confirmed complete Science sets: a nonnegative integer no greater than each grade's Science count, never an inferred minimum. Approved versions and project snapshots remain immutable; unknown stock is unknown, not zero.

Revision conflicts, actor-bound idempotency, exact quantities/units, QC availability, split delivery, installation acceptance, signed attachment access and tenant boundaries survive any presentation change. Historical A01–A16 and 476-test results are prior evidence, not rerun in 13A. Physical label print/scan, development privileges, recovery credential/custody and named pilot authorization remain unresolved operational gates.
