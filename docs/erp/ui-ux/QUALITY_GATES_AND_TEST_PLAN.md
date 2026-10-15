# Quality gates and evaluation plan

13A supplies discovery and specifications only. No concept usability test, fresh A01–A16 execution, performance baseline or WCAG conformance assessment has passed in this phase. Proposed thresholds below need approval and a measured baseline on agreed devices/data.

## Baseline versus targets

| Dimension | Current evidence | Proposed release target / method |
| --- | --- | --- |
| Task success | Historical functional A01–A16; no staff usability rate | At least 90% unassisted completion across priority scenarios, 100% for critical destination/approval identification; report per task and role, not just aggregate |
| Time | Not measured | At least 25% lower median active task time for repeat kit mapping and packing tasks against measured current UI; preserve accuracy and report small-sample uncertainty |
| Interaction count | No task count baseline | At least 20% fewer meaningful navigation/context-switch actions for the same scenarios; separately count required safety confirmations rather than removing them to improve a score |
| Learnability | No staff baseline | After one standardized introduction, at least 80% complete a second comparable task without prompting; document errors and terminology confusion |
| Accessibility | Narrow-screen overlay observed; no full audit | WCAG 2.2 AA across complete selected workflows; no unresolved critical/serious automated findings plus manual keyboard/screen reader/zoom checks |
| Performance | No timing/instrumentation baseline | Proposed p75 LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 on agreed representative hardware/network; local selection feedback ≤100 ms; measure backend wait separately |
| Responsive use | DOM widths match viewport at sampled 390/1024/1440 px; control reachability not proved | At 390/768/1024/1440 px all required controls reachable; no overlay-obscured focus or page-level accidental overflow; explicit table scroll only where necessary |
| Data consistency | Historical exact-once/revision/tenant acceptance and source guards | Zero changed business outcomes, duplicate stock effects, tenant leaks or silent stale overwrites in the regression/failure matrix |
| Visual consistency | Existing shared tokens and mixed patterns | All changed screens use audited shared patterns/tokens; light states complete before dark parity claim |

The percentages are decision thresholds, not statistical confidence claims. Time targets require repeated comparable tasks with current and proposed interfaces; if the baseline is already fast, favor safe accuracy over a forced percentage. Performance numbers are budgets to validate, not current application measurements. Large synthetic fixture: propose 100 activities and 500 packages, then revise to observed staff scale; never import real stock for a benchmark without authorization.

## Moderated staff study

Recruit 6–8 actual staff covering design, project management, inventory/purchasing, production, packing/QC and dispatch/installation; overlap is acceptable but report uncovered responsibilities. Include an occasional user and the actual tablet/scanner setup. Ask permission to observe/record; use synthetic records and redact personal metadata. No production mutation is needed.

Tasks: (1) link two activities to one pouch and explain why demand does not double; (2) configure A/B schools and diagnose missing complete-set confirmation; (3) explain a stock shortage and handoff; (4) identify a package/site, record a simulated exception and determine QC readiness; (5) diagnose partial delivery versus installation completion. Use a counterbalanced current/concept order where prototype fidelity permits; static diagrams support comprehension questions, not execution-time comparisons. Use equal instructions and matched complexity. Do not ask leading questions or silently assist.

Record success, errors, prompting, active time, navigation/context switches, attempted unsafe actions, recovery time and post-task ease (1–7). Separate prototype limitation from design failure. A participant who guesses the right destination without identifying it fails the safety-identification criterion. Record qualitative observations as anonymized role/task evidence, not invented quotations. Synthesize top issues, revise concept, then retest the highest-risk failures before broader implementation.

## Expert heuristic review

Two reviewers if available assess visibility of state, domain language, user control, consistency, error prevention/recovery, recognition, efficiency and visual hierarchy. Include a domain owner for shared-pouch/crate/approval semantics. Score 0 none, 1 cosmetic, 2 friction, 3 task-blocking/repeated serious confusion, 4 unsafe business interpretation. Record source screen/task, evidence, affected role, recommendation and retest outcome. Any severity-4 issue blocks release; severity-3 needs resolution or explicit bounded acceptance.

## Accessibility and responsive matrix

Manual: full keyboard journey, visible focus and correct restore, dialog containment, outline selection, no drag-only actions, browser find unaffected, errors linked to fields/nodes, polite status announcement, 200% text zoom and 400% reflow. Test Windows screen reader/browser combination agreed with staff (e.g. NVDA + Chromium) and a touch/screen reader combination if used. Assess forced colors, reduced motion, both approved themes and contrast for every changed state. Automated scanning complements these checks and does not certify AA.

Test sidebar open/closed, inspector/sheet/dialog, sticky footer and safe areas, long labels, long IDs, translated-length text, unknown quantities, zero, large decimals and empty/filter-empty views at the four specified widths. Scanner suffixes, double taps, accidental Enter and gloves are hardware validation questions, not established use conditions.

## Contract and safety regressions after implementation

| Existing acceptance | Required preservation / focused additions |
| --- | --- |
| A01–A03 | Navigation/role reachability, catalog validation, saved draft reload, immutable approval; keyboard mapping and dirty/conflict cases |
| A04–A05 | Multi-site quantities, common/universal 6/2 vs 3/0, explicit missing confirmation block, trace and unchanged preview ledger |
| A06–A07 | Stock verification, exact-once posting/reservation, stale revision; no UI retry identity regression |
| A08–A09 | Procurement/receipt QC and production input/output rules; pending/rejected output unavailable, no duplicate input buying |
| A10–A11 | Packing exceptions/reassembly/QC, safe selection, exact-once picks, labels/PDF/QR, denied signed-out/cross-tenant access |
| A12–A14 | Split delivery/POD/failure/return/retry, immutable manifests, installation blockers and close/reopen/accept without reposting stock |
| A15–A16 | Viewer/staff denial, tenant isolation, unsaved edits and expired authentication/reauthentication recovery |

Use isolated synthetic fixtures, approved test harnesses and before/after invariant checks. Inject validation errors, request timeout before/after commit, duplicate submission, delayed out-of-order responses, 409 and permission changes. Assert visible state matches confirmed server outcome and idempotency keys follow current retry contracts. Do not update backend rules merely to make a UI test pass. Targeted component/contract tests first; full milestone checks follow repository requirements when application code actually changes.

## Gates

G0 discovery approval: choose direction, IA, first slice and unresolved staff assumptions. G1 foundation proof: semantic tokens, primitive decision, accessible dialog/picker/navigation and build/bundle evidence. G2 Kit Studio: B1–B7 plus A03–A05 and staff comprehension. G3 Packing: D1–D7 plus A10–A15 and real device review. G4 project/shell rollout: A/C criteria and affected end-to-end matrix. G5 operational activation: separate existing pilot authorization, least privilege, recovery custody and physical label evidence; a UI pass cannot satisfy these.

For **13A only**, validate required document presence, local Markdown targets, safe well-formed SVGs, evidence exclusion, diff whitespace and scope; no application build/backend regression is warranted for docs-only changes. Record actual results in continuity, distinct from this future plan.
