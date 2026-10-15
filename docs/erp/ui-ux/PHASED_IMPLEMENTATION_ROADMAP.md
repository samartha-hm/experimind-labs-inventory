# Phased implementation roadmap

Proposed sequencing only. UI implementation requires user approval after 13A; no dates, staffing commitments, new modules or API expansion are implied. Relative effort: S = bounded pattern/surface, M = several related patterns and integration, L = domain workspace and substantial regression. These are comparative estimates, not elapsed-time promises.

| Phase | Bounded deliverable | Effort | Dependencies / risk / exit |
| --- | --- | --- | --- |
| 13A · completed strategy | Audit, journeys, IA, foundations, four workspace specs, evidence and decision brief | M | Current synthetic observations; staff/device assumptions remain open. Exit: docs validated and user reviews direction |
| **13B · approval requested** | Staff terminology/task validation; isolated shell and kit/packing concept refinement; token consolidation plan; one dialog/picker/outline primitive proof | M | Direction and test participants. Avoid global replacement. Exit: approved anatomy, accessibility proof and measured current task baselines; no business mutation change |
| 13C · Kit Studio | Educational/physical modes, selected-node inspector, explicit mapping, quantity trace, save/review/history | L | 13B primitive/nav decisions; prove existing read/write shape supports presentation. Shared-use/quantity/immutable-version risks. Exit: B1–B7, A03–A05 and staff review |
| 13D · Packing & QC | Package hierarchy, focused execution, selection/scan confirmation, checklist/QC/exception layout, audit/label context | L | 13B components and real workflow/hardware validation; can prototype before 13C completes, production changes remain bounded. Highest risks: wrong target, duplicate pick, permission/retry regression. Exit: D1–D7 and affected acceptance |
| 13E · Project and shared shell | Site/stage workspace, readiness links, return context, role-relevant My work, incremental navigation migration | L | Validated Kit/Packing object contexts, authorized API coverage; may start narrow shell work earlier. Deep-link/search contract gaps are explicit scope decisions. Exit: A/C criteria, legacy navigation parity |
| 13F · Remaining operational consistency | Apply proven tables/forms/status/recovery to purchasing, inventory, production and delivery surfaces one at a time; dark parity if valued | L, split into M slices | Accepted patterns and measured benefit; avoid a broad reskin hiding operational differences. Exit: affected A01–A16, accessibility and performance gates |
| Separate pilot activation | Existing physical label evidence, credentials/least privilege, recovery custody, named staff/warehouse/data authorization | Separate operational work | Milestone 12 gates remain open; UI approval does not approve rollout, real stock entry, merge or deployment |

## First approval scope

Approve the recommended visual direction and navigation **in principle**, then authorize only 13B. Its concrete output should be a small reviewable component proof and refined representative screens in an isolated synthetic context, with no endpoint/schema/ledger/RBAC change. Select a primitive foundation only after version/license/React 19 compatibility, keyboard/screen reader and bundle checks. The user reviews the result before 13C/13D implementation.

Search, durable deep links, shared views and notifications are presentation intentions with explicit API gaps to assess. If current contracts cannot support a promised interaction, choose an honest scoped alternative or request a separately bounded capability; never smuggle a new module into a UI task. No new role hierarchy or shared-device authentication model is assumed.

## Delivery and migration safeguards

Use incremental screen-level changes on the current feature branch after authorization. Retain old navigation entry points until parity is proved; adapters must preserve current API payloads, revision and idempotency behavior. Prefer reviewable workspace slices to a global component replacement. A legacy/new comparison path, if approved, is a UI navigation mechanism, not duplicate operational writes.

Each implementation slice records affected workflows, before/after user evidence, focused tests, accessibility states and performance change. Reverting a presentation slice must not require a data rollback or reinterpret historical ledger/approved snapshots. Do not ship a half-implemented mutation path with a fallback that can submit twice. Monitor factual error states and task completion with privacy-safe evidence only; telemetry backend is not authorized here.

## Major uncertainties to resolve

- **Domain vocabulary and ownership:** staff may use different crate/pouch terms or combine operator/QC duties; wrong labels undermine otherwise polished controls.
- **Data shape and scale:** outline/mapping can be presented only for relationships the accepted APIs actually expose. Large kit/package fixtures may justify virtualization later, not by assumption.
- **Hardware and environment:** scanner suffixes, label printers, gloves, screen orientation and connectivity are not validated by browser captures.
- **Permission differences:** platform navigation aliases do not equal mutation rights; assess every action with the existing backend capability checks.
- **Concurrency and recovery:** optimistic visual feedback must not override confirmed server revision, audit or idempotency semantics.
- **Operational readiness:** physical print/scan and existing security/recovery/pilot gates remain independent of design quality.

Prioritize 13C and 13D over decorative dashboard polish: they carry the greatest domain complexity and the most costly wrong-target/quantity mistakes. Review actual staff findings before committing to which implementation workspace comes first.
