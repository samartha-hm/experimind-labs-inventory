# Priority workspace specifications

Proposals awaiting approval. [Concept diagrams](workspace-concepts.svg) show anatomy, not working or user-tested UI. Every workspace retains current API contracts, revision checks, exact units, permissions and audit behavior. Missing backend capabilities are reported as gaps, not silently added.

## A · Dashboard and navigation

**Anatomy / hierarchy:** global shell; role-relevant “My work” heading; short actionable queue grouped Assigned / Blocked / Awaiting review; recent objects; compact aggregate overview below. Queue row: object + project/site, reason, owner if known, due information if present, status and one permitted next action. Never manufacture due dates or ownership from incomplete data.

**Main path:** open My work → inspect blocker explanation → open the exact project/site/stage → perform supported task → return to the same queue/filter. Search and a labeled Create menu remain visible; quick create includes only permitted existing types. Aggregates link to their contributing records and distinguish unavailable count from zero.

**Desktop/tablet:** desktop queue fills the available width with an optional detail peek. Tablet closes the sidebar, keeps labels and hides secondary summary rather than reducing hit areas. Phone shows one-column work items and a modal navigation drawer; remove competing floating history controls.

**States:** loading keeps headings stable; empty queue says whether no assignment or no matching filter and offers existing browse actions; partial count failures affect only their section; offline labels freshness; inaccessible linked item returns a permission-safe message; dirty downstream edits use the common conflict/leave contract. Dashboard itself does not create a new mutation endpoint.

**Input / authority:** tab order starts with skip link and main heading, then queue and visible actions; keyboard and touch use identical routes. Viewer sees read-only facts; role starts and queue inclusion do not grant mutation rights. Announce filter result count politely, not every aggregate refresh.

**Acceptance:** (A1) each actionable row leads to the correct authorized object and destination; (A2) back restores queue state; (A3) no undefined/unknown value displays as zero; (A4) sidebar/history cannot obscure the focused control at 390/768/1024/1440 px; (A5) all current destinations remain reachable for the same roles; (A6) no private count/search result crosses tenant scope.

## B · Kit Studio — educational structure and physical packing

### Anatomy

Persistent header: kit name/category, Draft rN / Approved vN, saved/unsaved state, Save draft and Review approval. Secondary actions: history, preview and archive with current authority. Workspace modes: **Learning structure**, **Packing structure**, **Mapping**, **Quantity preview**. Desktop may display related outlines side by side; each remains navigable separately. This refines the accepted separate-view model without flattening it.

Learning outline: subject → grade → activity → material usage. Physical outline: deliverable/container → box or crate → partition/compartment → pouch → physical contents, following supported node kinds rather than enforcing a new rigid depth. A selected-node inspector presents name/code, instructions/reference, item identity, UOM, quantity rule and associations appropriate to the node. A “Used by 3 activities” link reveals all associations. Mapping links are relationships, not duplicate inventory rows.

Always distinguish **educational requirement**, **physical placement**, **shared use**, **container component** and **quantity basis**. Common and universal crates are first-class typed configurations. User-maintained subject/grade labels remain configurable; Prastuti examples must not become global enums or a hardcoded calculator.

### Main paths and safeguards

1. Open draft; identify its saved revision and approved-version references. Create/edit activity and choose existing material by stable identity and unit. Show unknown availability as unknown.
2. Create/select physical compartment and pouch. Associate two activities with the same pouch using an explicit multi-select picker. “Move placement” changes location only; it does not add educational demand. “Add material usage” is a different action.
3. Configure quantity via supported typed rules and plain-language scope summary, e.g. “one common crate for every selected Science grade set.” Advanced fields retain validated current values; no expression evaluator or new rule engine.
4. Preview a saved draft against multiple sites. Trace a number through site → selected set/rule → material/component → placement. Show educational use alongside physical content without summing both as independent demand. Preview is read-only and never reserves stock.
5. Review validation, saved revision and proposed immutable version. Approve through the existing capability and confirmation flow. Continue editing the draft only under its existing semantics; approved versions and referenced project snapshots remain read-only.

Preview example fixture: School A has Science 8/9/10 ×2 and explicitly two complete sets → six common, two universal crates. School B has grade 8 ×3 and explicitly zero complete sets → three common, zero universal. Missing explicit complete-set confirmation blocks the affected preview; quantities 30/20/25 do not imply twenty complete sets. Plain zero confirmation and missing confirmation are different.

### Layout, states and input

Desktop: outline roughly 260 px, working area flexible, inspector roughly 360 px; combined view only where all three remain readable. Tablet: Learning/Packing segmented views with a context-preserving inspector sheet; Mapping uses selected source plus searchable destinations, not tiny crossing lines. Phone supports inspection and focused edits; full composition is optimized for desktop/tablet, with no hidden mandatory action.

Empty draft offers Add subject/grade/activity and Add container with a short domain example. Loading shows outline/inspector skeleton without editable phantom nodes. Validation panel links to the exact node and does not disappear when changing mode. Failed save preserves entered data. A 409 retains local and server revision for deliberate comparison; never overwrites or auto-merges quantity/placement edits. Approval remains blocked on dirty/invalid draft as today. Read-only users can inspect approved versions, mappings and preview if existing permissions allow, with no edit affordances pretending to be active.

Keyboard: arrow-key outline navigation with documented focus/selection distinction, Enter opens inspector, explicit move-up/down/choose-parent commands parallel drag. Reparenting validates allowed node relationships; Escape cancels a pending move. Material picker announces result count and selected identity. Touch uses visible Add/Move menus and 48 px row actions rather than precision drag. Focus returns to the selected node after closing a sheet; deleting/moving uses existing allowed semantics and preserves a sensible next selection.

### Acceptance

- B1: existing A03 kit create/save/reload/approve behavior survives with unchanged requests, revisions and permissions.
- B2: two activities can visibly share one pouch; moving its placement changes no quantity, ledger entry or educational association unintentionally.
- B3: partition, pouch and activity remain distinct, and common/universal components keep explicit scope/UOM and traceability.
- B4: A/B example gives 6/2 and 3/0; missing complete-set confirmation blocks; no inferred minimum.
- B5: approved version and any project snapshot are unchanged by later draft editing; review shows the saved revision actually being approved.
- B6: unsaved leave, failed save, authentication expiry and stale revision never falsely report success or discard local edits without choice.
- B7: every supported node edit/association/reorder is usable without dragging or a mouse; narrow layout retains the selected node and validation links.

## C · Multi-school project workspace

**Anatomy / hierarchy:** project header with status, revision and save state; school/site selector with explicit destination; stage navigation **Plan / Readiness / Supply / Production / Packing / Delivery & installation / Evidence & history**. Project-wide totals and site-specific totals are labeled separately. A compact readiness summary shows required, reserved, incoming/production, ready and remaining quantities according to existing semantics; it does not collapse all progress into one percent.

**Main path:** choose approved kit version → configure each school's quantities and explicit complete sets → save → calculate → inspect warnings and trace → follow linked shortage/work package → return to original site/stage. Site overrides are visibly scoped and never edit the reusable master. Demand revision and related-work freshness stay in the context header.

**Desktop/tablet:** desktop compares schools in a table, with detail drawer and sticky site header. Tablet uses a labeled site list and single-site detail with next/previous school control; stage navigation scrolls independently without hiding content. A change of site resets only context-dependent selection after dirty-state confirmation. Consolidated demand can be viewed separately with destinations preserved.

**States / authority:** no schools offers existing add-site flow; loading distinguishes project from demand; failed calculation retains saved config and shows which revision produced the last valid result. Dirty config explains why operational panels/calculation are unavailable under current rules. Stale downstream revision links to review, never silently rebases work. Existing project writer/read-only distinctions persist; stock operations retain their separate capabilities. Render precise verified-stock prerequisites instead of a misleading page-wide “release disabled” statement.

**Input:** labeled site switcher, keyboard-accessible stage links, no nested modal chain, error summary links to school/field. Tablet actions remain at least 44–48 px and maintain destination in view. History is a contextual readable event view with exact source detail available, rather than raw JSON as the primary interaction.

**Acceptance:** (C1) A04/A05 site/version/quantity cases pass; (C2) site changes never leak one site's counts, overrides or package selection to another; (C3) saved/dirty/demand revision states are unambiguous; (C4) linked inventory/order/work detail returns to the same site/stage/filter; (C5) current production, reservation, delivery and closure gates remain enforced; (C6) no simultaneous calculation response can replace a newer requested result.

## D · Warehouse Packing and QC execution

### Anatomy and hierarchy

Header: project → school/site → batch, packing status, revision, assignment if present, readiness blockers. Left region: searchable package outline/list grouped by existing physical hierarchy, displaying readable container name, kind, state and remaining work; full identity copyable. Center: selected package with ancestry and Required / Picked / Packed / QC passed / Remaining / Shortage quantities, units and relevant material/location context. Right or subsequent region: assembly checklist, exceptions, QC and permitted next action. Audit history and label preview are contextual drawers.

Default focused mode limits task switching while keeping destination and selected package visible. Supervisors may use a denser batch overview. UI stage labels describe existing states; they do not create a new packing state machine.

### Main execution path

1. Open assigned order or resolve an existing label via authorized lookup. Show matching site, batch and package before any mutation. Unknown, cross-tenant, archived or mismatched codes produce a safe lookup result, not an implicit new package.
2. Select one package. Show ancestry such as School A / Common crate 2 / Compartment / Pouch and whether it shares activity links. Select required material and eligible location; review partial quantity and reservation context; submit current pick action once.
3. Complete current assembly checklist or record rework/exception with reason. Corrections reference the original exception and preserve its history. Do not hide unresolved exception behind a green aggregate badge.
4. Inspector completes the current material, quantity, placement, packaging, stickers and instructions checks. Accept only under existing prerequisites/capabilities; reject keeps notes and recovery path. No “accept all” bypass of required checks or separate authorization.
5. Authorized readiness/release follows existing order rules. Privileged reopen requires reason; pause/resume and assignment keep current guards. Label preview/reprint uses the existing 103 × 80 mm layout and package identity; no new pick or dispatch event.

### Selection, errors and collaboration

Multi-package mode is explicit and visually separate from single-package execution. Banner lists count, site/batch and affected package identities; unsupported mixed selection cannot be submitted. “Select visible” and “Clear” are unambiguous. Switching site, batch or revision reconciles selection; scan does not silently add a package to bulk selection. Existing supported batch behavior determines whether an action is available; no new bulk endpoint is presumed.

During mutation, keep the target locked in view and show pending. Double tap is guarded. Timeout with uncertain outcome preserves the existing retry identity and offers reconciliation; do not treat it as definite failure and create another stock pick. 409 preserves notes and asks operator to review latest package/order revision. Network/offline disables new operational submission with a clear explanation; no automatic queued picks. Authentication/permission failure never displays a success badge. Server audit remains the source of actor/time, not the browser clock.

### Desktop, tablet and permissions

Desktop: queue/outline plus selected package and checklist inspector. Tablet landscape: 280 px package list plus focused detail; portrait: package list → full detail with sticky destination/title and Back to batch. Footer primary action respects safe areas and never covers a focused field. Phone supports scan/lookup, checklist and review with labeled detail; high-density comparisons can open separately. Hardware scanner behavior is conditional on staff validation; keyboard/text entry always remains available.

Use visible 48 px scan, checklist and operational buttons, large status text and no hover-only instructions. Tab moves through package, quantity/location, checklist and next action; checkbox Space changes one selected state. Scanner suffix Enter must not post an operation. Alerts announce rejected/error outcomes once; polite updates report confirmed results. No forced auto-advance after an exception or while notes are being entered.

Current PackingPanel source distinguishes writer, approver and inspector roles: approval/reopen is restricted more narrowly than general writes; inventory_staff can inspect under current rules. Preserve those exact checks and server enforcement. Read-only users may inspect permitted status/history but cannot submit. Assignment does not grant authority and must not be confused with permissions.

### Acceptance

- D1: A10 two-site assembly, exception correction, multi-package selection, reject/reassemble/QC-ready and exact-once picks retain existing behavior.
- D2: destination, full package identity and ancestry remain accessible before every action; no selection leaks across school/batch changes.
- D3: checklist and six QC checks retain prerequisites; approver-only release/reopen and required reason cannot be bypassed by the new layout.
- D4: double submit, timeout/retry, 409, 401/403 and offline states cannot duplicate a pick, falsely accept QC or lose typed notes without warning.
- D5: preview/reprint preserves package/ledger state and QR destination; physical print/scan acceptance remains pending real hardware evidence.
- D6: all primary actions work with keyboard and touch at 768/1024 px without hidden footer fields; no action requires drag, hover or scanner hardware.
- D7: dispatch consumes existing ready-package semantics and immutable manifests; delivery, installation and project closure remain separate.

All four workspace specs are subject to the [quality gates](QUALITY_GATES_AND_TEST_PLAN.md). No success criterion is marked passed merely because it is described here.
