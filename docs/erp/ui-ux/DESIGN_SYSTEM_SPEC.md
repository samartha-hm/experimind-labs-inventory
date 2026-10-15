# Design system specification

13B status: [the implemented subset](MILESTONE_13B.md) uses scoped tokens and Radix Dialog. The broader proposal below is not globally adopted or staff/device accepted.

Proposed foundation for Direction A, with a focused warehouse mode. Values are design candidates to validate, not claims of measured contrast or adopted dependencies. Keep existing React/TypeScript/Vite/Tailwind architecture and consolidate `src/index.css` tokens before adding parallel styling systems.

## Foundations

| Token family | Proposed contract |
| --- | --- |
| Typography | Existing Inter/system stack; body 14/20 px desktop, 16/24 forms/touch; supporting 12/16; headings 18/24, 24/32. Use tabular numerals for quantities; existing monospace stack only for IDs/codes. Do not depend on a new remote font |
| Spacing | Existing 4 px base; 4/8/12/16/24/32/48/64 steps. Workspace gutters 24 desktop, 16 tablet, 12 phone |
| Density | Comfortable rows 48 px, compact comparison rows 36–40 px with accessible control hit areas; warehouse controls/rows at least 48 px. Remember preference per supported user/device context |
| Layout | Shell + object header + workspace; readable forms max roughly 760 px; comparison/table surfaces may expand. Inspector 320–400 px desktop, full-width sheet on tablet |
| Shape | Consolidate existing radius tokens: 6 controls, 10 panels, 14 dialogs; reserve larger rounding for exceptional containers. Borders distinguish surfaces; shadows mainly overlays |
| Motion | Existing 150/200/300 ms tokens; use 150–200 ms opacity/position for panels, no decorative stock/status animation. Reduced motion removes transforms and smooth scrolling |

Semantic token names: `surface.canvas`, `surface.panel`, `surface.raised`, `text.primary`, `text.secondary`, `border.default`, `accent.default`, `focus.ring`, `status.info/success/warning/danger/neutral`. Example light candidates: canvas `#F8FAFC`, panel `#FFFFFF`, primary text `#0F172A`, secondary `#475569`, border `#CBD5E1`, accent `#4338CA`. Dark candidates: canvas `#0F172A`, panel `#1E293B`, primary `#F8FAFC`, secondary `#CBD5E1`, border `#64748B`, accent `#A5B4FC`. Measure each actual text/background and interactive state pair before accepting it. Do not use subtle borders or color alone to communicate a required action.

Light is the first validated operational theme; dark is a later parity option where staff value it. Both use the same semantic tokens, status labels and focus behavior. Avoid a partial dark theme across newly styled and legacy panels. Existing CSS safe-area and touch tokens should become the shared source of truth.

## Component architecture and foundation choice

Layer 1: tokens and native HTML semantics. Layer 2: audited interaction primitives (focus management, dialog, menu, combobox, disclosure). Layer 3: shared patterns (ObjectHeader, StatusBadge, QuantityCell, RevisionNotice, ErrorSummary, DataTable, ContextDrawer). Layer 4: domain compositions (KitNodeInspector, QuantityTrace, PackageChecklist, SiteReadiness). Proposed names express responsibilities, not files to create in 13A.

Reuse current EmptyState, SkeletonLoader, ToastContext, OfflineStatusBar, SmartCombobox/SmartSelect, CommandPaletteModal and ResponsiveDataView after behavior/accessibility review. Keep Lucide for consistent labeled icons, Motion only where useful, Recharts for genuinely informative charts and existing barcode/PDF utilities for established flows.

Preferred candidate: **React Aria Components** for accessible interactive behavior with Tailwind styling. Alternative: **Radix Primitives**, especially if its controlled dialog/menu APIs better fit existing wrappers. Lowest-dependency alternative: native controls plus narrowly repaired existing components. Evaluate one dialog, one async item picker and one selection/outline pattern for React 19 integration, screen reader behavior, bundle impact and maintenance. Select one primitive family, not both. A new table library is unnecessary for the first slice; start with semantic HTML tables and existing responsive presentation. Virtualization or a headless table engine needs measured scale and a separate proof.

Official capability references: [React Aria](https://react-aria.adobe.com/), [Radix introduction](https://www.radix-ui.com/primitives/docs/overview/introduction). Current package versions/compatibility and licenses must be checked at adoption; no install occurred in 13A.

## Tables, filters and bulk scope

Tables have a caption or accessible name, real headers, explicit units, stable row IDs and readable empty/loading/error states. Right-align numeric quantities; distinguish zero, unknown, not applicable and loading. Use existing exact quantity representations; no floating-point conversion or rounding that changes operational meaning. Material identity, destination and exceptions must survive column reduction.

Filters show active chips, clear-all, result count and loading indicator. Preserve sort/filter/page/scroll on return; cancel stale queries. Distinguish personal view preference from authoritative shared state. Sticky headers cannot cover focused cells. Narrow layouts use a prioritized record list with labeled detail or a clearly named horizontally scrollable table, not unlabeled stacked numbers.

Checkbox bulk selection says “3 packages in School A selected.” Filtering cannot silently expand selection to unseen records. Clear or explicitly reconcile selection when site, batch or revision changes. Each bulk mutation lists affected IDs/count and unsupported items; do not imply atomicity or partial success rules absent from the current API. Do not add select-all-across-server-results without contract support.

## Forms, overlays and approvals

Persistent labels, units and help text precede placeholders. Validate on meaningful blur or submit, preserve values, focus error summary and link to each invalid field/node. Numeric entry accepts only the current contract's units/ranges and makes conversions visible. Never coerce an empty complete-set count to zero or unknown stock to zero.

Use a drawer for non-destructive contextual inspection and short edits; use a dialog for a focused decision; use a full workspace for long/branching editing. Dialogs have an accessible name, initial focus, focus containment, Escape/cancel where safe and focus restoration. Dirty state is explicit before closing or switching context. Do not layer several modal editors. On a tablet, inspector opens as a full-width sheet with context and a clear return action.

Approval review shows saved revision, immutable-version consequence, validation summary and actor capability. Existing backend rules decide eligibility. “Approve version” differs from “Save draft”; disabled actions explain prerequisites. Archive, reopen, QC reject and other reasoned actions retain required reason/evidence. Do not offer a generic undo for posted operations; corrections use supported compensating/reopen flows and audit history.

## Status, feedback and recovery contracts

| State | Required presentation / behavior |
| --- | --- |
| Initial loading | Stable skeleton, named busy region, no fake zeros; retain context header |
| Empty | Explain whether no records, no filter matches, or no permission; one relevant permitted next action |
| Saving | “Saving draft…” with double-submit guard; show “Saved rN” only after confirmed response |
| Validation failure | Summary + field/node links; retain entered values and pending context |
| Network failure | Persistent actionable message; distinguish definite rejection from outcome unknown; don't claim success |
| Offline | Read-only cached/non-authoritative view clearly marked if supported; keep edits in memory and warn before exit. No automatic operational write queue or sensitive draft persistence without separate design |
| 409 conflict | Preserve local draft; display server revision and compare affected fields; reload only by choice, reapply deliberately; never auto-retry stale writes |
| Outcome unknown | Reconcile existing status/audit and retry using the same supported idempotency identity; never create a fresh key just to dismiss an error |
| 401 / 403 | Reauthentication or permission explanation without exposing data; no false saved state. Respect accepted recovery and tenant boundaries |
| Success | Inline status and polite announcement with object/revision; toast optional, audit link for operational transitions |

Front-end optimism is limited to reversible view state (selection, disclosure, sorting) and clearly unsaved local edits. Stock picks, receipts, accepted output, approval, dispatch and closure await server confirmation. UI updates must preserve the existing revision and retry-key lifecycle.

## Accessibility and input

Target [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/): evaluate text/non-text contrast, reflow, names/roles/states, keyboard operation, status announcements, error identification and focus visibility across complete workflows. Minimum product hit areas 44 px general/48 px warehouse are stronger than AA's 24 px criterion with exceptions. Preserve readable 200% text zoom and test 400% reflow; wider data tables may need an explicitly explained scroll region.

Command menu is visibly available and optionally Ctrl/Cmd+K when it does not conflict with browser/assistive behavior. Outline uses a documented keyboard model, with visible move-up/down/reparent alternatives to dragging. Escape closes the current reversible layer; Enter never posts a stock operation unexpectedly. QR/scanner input must not steal focus from text fields; confirm target identity before an operational action. Do not assume scanner mode until staff hardware is tested. Announce package selection and result status without reading every quantity update repeatedly.

Accessibility, visual-state, contract and operational regression evaluation is specified in the [quality plan](QUALITY_GATES_AND_TEST_PLAN.md). Primitive libraries reduce implementation burden; they do not establish conformance.
