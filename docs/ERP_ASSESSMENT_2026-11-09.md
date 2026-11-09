# ERP assessment — 9 November 2026

## Basis and limits

Assessment against `docs/erp/01_BUSINESS_REQUIREMENTS.md`, `03_TECHNICAL_BLUEPRINT.md`, the repository UI design skill, active navigation, selected implementation paths, tests and milestone acceptance records. Scores are engineering estimates, not measured completion percentages. Source presence, usable UI, synthetic acceptance and real operational acceptance are distinct.

This is a broader source and evidence audit, not an exhaustive line-by-line review or a fresh visual/browser/device/security certification. No live business records were changed. Unverified behavior remains unverified; old screenshots and milestone results do not establish current behavior. The separate inventory reference repository and kit-builder handover subtree were not fully audited.

## Overall assessment

| Dimension | Score /100 | Weight | Reason |
|---|---:|---:|---|
| Required workflow implementation | 75 | 35% | Strong kit/planning/transaction services; survey/tasks/returns and real completion remain weaker |
| UI/UX and truthful product behavior | 58 | 25% | Useful shell and shared controls; accessibility defects, inconsistent feedback and simulated reporting |
| Engineering and technical reliability | 78 | 20% | Typed modular stack, transaction boundaries and focused tests; frontend weight and legacy surface |
| Operational readiness | 35 | 20% | Latest handoff still records blocked acceptance and pilot NO-GO |
| **Weighted overall** | **63** | **100%** | 75×.35 + 58×.25 + 78×.20 + 35×.20 = 63.35, rounded |

Technology fit: **85/100**. React/Vite, Express/TypeScript and PostgreSQL/TypeORM fit a small, self-hosted operational ERP. A framework replacement is not justified by the findings. This is not a dependency vulnerability assessment or a claim that installed versions are current.

## UI/UX coverage

These scores reflect source and documented evidence. Contrast, visual alignment, interaction speed and device ergonomics need current rendered testing before final scores.

| Area | /100 | Assessment / remaining work |
|---|---:|---|
| Navigation and information architecture | 70 | Clear grouped shell; 16 destinations; broader source modules are not all exposed |
| Role-specific experience | 60 | Workspace policy exists; legacy handler role strings differ from normalized platform roles |
| Overview and next-action clarity | 65 | Operations queue exists; validate owner, blocker and next action with actual staff |
| Product-library and kit editing | 72 | Rich capability; validate long-form density and progression in current browser |
| Project workspace | 65 | Stage and revision evidence present; survey/task/service discoverability needs proof |
| Inventory tables and cards | 66 | Sticky header and mobile cards; row/card selection is mouse-only in ResponsiveDataView |
| Search and selection | 76 | Shared combobox supports search, ARIA and keyboard handling; focused logic tests pass |
| Forms and validation | 68 | Domain validators strong; screen-wide inline errors, focus movement and preservation unverified |
| Feedback and errors | 48 | Native alerts remain; some success messages report simulated actions |
| Loading / empty / recovery states | 62 | Shared primitives exist; presence does not prove consistent adoption |
| Mobile and tablet | 55 | Historical D5 viewport evidence; current inventory switches at 640px versus skill's 768px target |
| Keyboard accessibility | 45 | Inventory clickable divs and table rows lack keyboard equivalents |
| Screen-reader accessibility | 50 | Some ARIA primitives; full labels, announcements and focus-order audit absent |
| Contrast / typography / theme | 58 | Light/dark classes and numeric styling exist; 10–11px text occurs; contrast unmeasured |
| Touch ergonomics / safe areas | 55 | Some 44px controls and safe-area tokens; offline overlay fixed bottom-right needs device testing |
| Dialog behavior | 58 | Dialog dependency exists; native alerts persist; focus trap/restore needs rendered verification |
| Print / labels / scanning ergonomics | 64 | Dedicated functionality; physical printer/scanner and label acceptance unresolved |
| Offline UX and truthful status | 25 | Queue not called by app code; STOCK_COUNT not replayed; optimistic status copy overstates support |
| Perceived performance | 50 | Eager module imports; historical main bundle ~1.746MB; no fresh load-time profile |
| Onboarding and staff training | 45 | Documentation exists; staff task trials and measured learning time absent |

## Business and feature coverage

Scores grade usable completion against the stated scope, not quantity of code. Items described as legacy, simulated or unverified are not production-complete.

| Capability | /100 | Status and limitation |
|---|---:|---|
| Dynamic kit templates and quantity rules | 86 | Strong versioning/rule foundation; real user editing acceptance still needed |
| Prastuti planning | 87 | Strongest specialized workflow; production acceptance remains gated |
| Project and multi-school planning | 79 | Revisioned planning and site context exist; validate complete staff journey |
| Survey capture and revisions | 50 | Requirement established; complete operational survey journey not demonstrated |
| Tasks, dependencies, checklist, owner/date/priority | 50 | Must prove all required task behaviors in active UI, not legacy portfolio |
| Service-only and mixed project deliverables | 58 | Do not assume material pipeline covers service fulfillment |
| Optional quotations / commercial links | 65 | Planning supports commercial references; full quote lifecycle unverified |
| Item catalogue and inventory | 78 | Active UI and services; legacy paths and data quality remain concerns |
| Stock ledger and transactional boundaries | 84 | Strong trusted boundaries; physical truth not established by software tests |
| Reservations and commitments | 82 | Significant lineage/idempotency work; prove real operation and recovery |
| Warehouses, bins, transfers, counts | 72 | Active navigation; device and physical reconciliation acceptance pending |
| Purchase requests and approvals | 80 | Trusted chain exists; older receiving paths deliberately blocked |
| Suppliers, purchase orders, receipt and QC | 80 | Modern path stronger than legacy; staff acceptance still required |
| Production preparation and work orders | 74 | Workflow and recovery coverage; physical execution not certified |
| Packing and six-check QC | 70 | F8 BUILD PASS but QC BLOCKED; physical confirmation not completed |
| Labels, serialization and traceability | 70 | Dedicated code; physical print/scan proof outstanding |
| Dispatch, partial delivery and receipt | 74 | Historical synthetic D5 evidence; later trusted paths retain acceptance gaps |
| Installation, recipient acceptance, closure | 68 | Synthetic evidence; named staff and recipient operational proof missing |
| Reusable equipment checkout and return | 35 | Important requirement; complete return/damage/loss/reconciliation journey unproven |
| Internal make-to-stock | 60 | Production foundation; complete independent stocking journey needs verification |
| Attachments and evidence | 78 | Private attachment service and lineage controls; full UI usability not certified |
| Costing, valuation and margins | 52 | Services exist; authoritative project costing versus legacy local state needs separation |
| Operational reporting | 45 | Active Reports routes to a mock predictive screen; reliable report catalogue needed |
| Forecasting and ABC/XYZ analytics | 20 | Index-derived mock classifications; no demonstrated time-series model |
| Storefront management and separate Next app | 48 | Separate catalogue/cart/checkout/account source; fresh build/payment journey not verified |
| GST / invoice UI | 25 | Starts with hard-coded sample invoices; do not treat as accepted accounting software |
| Zoho integration UI | 10 | Timer-generated success logs and IDs; no demonstrated real sync in inspected screen |
| Workflow automation UI | 15 | Local seeded rules and simulated success; no demonstrated execution engine in screen |
| AI / copilot | — | Deferred/non-core; source presence is not a measured operational capability |
| Advanced QMS / CAPA / signatures / ECAD / 3D | — | Outside current priority scope; not certified or counted as missing core completion |
| HR/payroll and SaaS expansion | — | Explicitly deferred; no deduction for omission |

## Engineering and operations coverage

| Area | /100 | Assessment |
|---|---:|---|
| Architecture and domain separation | 83 | Modular monolith fits; legacy and trusted generations increase complexity |
| Types and business validation | 82 | Fresh typecheck previously passed in this review; strict quantity validation |
| Database consistency / idempotency / recovery | 84 | Significant scoped transaction/recovery evidence; not blanket certification |
| Authentication, RBAC and tenant boundaries | 78 | Dedicated controls and tests; UI role mismatch warrants resolution; no fresh penetration test |
| Auditability and evidence lineage | 82 | Strong trusted workflow emphasis; historical provenance unresolved |
| Automated testing | 82 | Focused tests pass; recorded large suite is historical, not rerun here |
| Accessibility and visual regression testing | 35 | No comprehensive current browser/a11y certification established |
| CI and release gates | 65 | Main/PR workflow covers root typecheck/tests/build; inspected CI lacks separate storefront/browser jobs |
| Frontend performance | 50 | Eager imports and enlarged precache budget; no user-centric timing evidence |
| Offline durability and isolation | 25 | Queue schema/replay incomplete; current-token replay and no user/tenant queue binding |
| Maintainability | 60 | Reusable components coexist with large legacy screens and duplicated behavior |
| Documentation and traceability | 62 | Extensive milestones; referenced requirements traceability CSV missing |
| Historical data / provenance | 30 | Baseline preservation is valuable; source truth and authorized activation unresolved |
| Backup / restore | 65 | Isolated restore/fingerprint evidence; business RPO/RTO drill not established |
| Deployment and monitoring | 40 | Synthetic readiness differs from validated host/staff operation |
| Human acceptance and pilot readiness | 25 | Latest handoff explicitly records blocked demo/D6 and pilot NO-GO |

## Concrete findings and priorities

1. **P1 — Make product claims truthful.** `src/features/analytics/PredictiveAnalyticsTab.tsx:29` classifies by array index and fabricates forecast days; its email action only toasts success. `src/App.tsx:392` mounts this as Reports. Replace with real operational reports or explicitly label demonstration data. Zoho (`ZohoIntegrationTab.tsx:51`) and automation (`AutomationTab.tsx:60`) simulate success; GST (`GSTEngineTab.tsx:43`) seeds example invoices. Those separate screens are not mounted in the inspected main App; do not conflate them with active functionality.
2. **P1 — Establish one authoritative operational path.** Legacy PO receiving is deliberately 503-blocked according to D2B2 evidence. Legacy `ProjectManagementService.ts:59` uses browser storage and initial-project merging; its portfolio screen was not found mounted in App. Label/retire legacy surfaces and prove active routes before migration.
3. **P1 — Finish human/physical acceptance.** Latest handoff and F8 records leave QC, intended-host rendering, devices, physical truth and historical authorization unresolved. Preserve existing safeguards; a disabled trusted action is not itself a defect.
4. **P2 — Fix offline promises.** `offlineSyncService.ts` declares STOCK_COUNT but autoSync only handles INBOUND/OUTBOUND/RELOCATE. No enqueueAction callers were found outside its definition. Failures are swallowed in persistence helpers; queue records lack actor/tenant binding and replay uses the current token. Do not advertise offline floor operation until scoped durable replay is implemented and tested.
5. **P2 — Make inventory selection keyboard accessible.** `ResponsiveDataView.tsx:48` and `:109` provide click handlers without focusable keyboard controls. This component is used by InventoryTab. Use explicit buttons/links and test keyboard operation.
6. **P2 — Unify role vocabulary and feedback.** `workspacePolicy.ts` accepts inventory_staff/project_staff and maps manager to admin; `App.tsx:125` and other handlers permit only raw admin/staff strings. Exact user impact depends on emitted auth roles. Normalize once and use consistent policies; retain server authorization. Replace native alerts with recoverable inline feedback.
7. **P2 — Finish required work before secondary expansion.** Demonstrate survey revisions, task dependency behavior, mixed services, equipment return and make-to-stock through real staff journeys.
8. **P2 — Measure UI behavior.** Test every active destination in light/dark, keyboard-only, screen reader, narrow mobile/tablet and desktop. Include modal focus, overflow, sticky elements, empty/error/loading states, slow network, duplicate submission and denied permissions. Current source checks cannot substitute for these results.
9. **P3 — Reduce delivery/maintenance cost.** Lazy-load major tabs, profile real bundles, align mobile breakpoints, restore requirement-to-screen/API/test traceability, and give storefront an explicit CI boundary.

## Verification record

- Earlier in this review: `npm run typecheck --silent` passed; three focused planning/template test files passed 28 tests after using workspace TEMP/TMP to avoid EPERM.
- This expanded pass: navigation, workspacePolicy, operationsQueue, smartSelect and smartComboboxFilter: **5 files, 23 tests passed**.
- These 51 focused tests do not cover all UI interactions or establish operational acceptance. No full-suite, fresh production build, storefront build, live integration, physical-device or new browser acceptance run was performed.
- Historical D5: synthetic browser journey and viewport checks; historical F8: BUILD PASS / QC BLOCKED. Latest handoff records 671 passing tests and 2 skipped; that count is historical.
- No application implementation or business data changed by this assessment. Scores should be revised after measured acceptance, not after adding more screens.
