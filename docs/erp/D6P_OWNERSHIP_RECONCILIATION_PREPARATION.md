# D6-P ownership reconciliation preparation

Status: **DRAFT / NOT AUTHORIZED** ownership contract; **D6 software BLOCKED**; **operational pilot NO-GO**. This milestone implements diagnostics only. It does not authorize O1–O10 or an ownership migration. Starting commit: `06dcb719185db60642867af3f8188d3bc1dc05e1`.

## Delivered diagnostic boundary

The inventory/stocktake screen contains Project material reconciliation. Enter a project UUID. `GET /api/v1/stocktakes/material-reconciliation/:project` requires a signed, unexpired session, current active user, permitted current role and matching organization. Cross-tenant project identities return 404. Readers are admin, super_admin, manager, inventory_staff, staff, viewer, project_staff and editor. The service accepts only the runtime reader pool, uses a read-only repeatable-read transaction and rechecks live authorization with a fresh statement after that transaction. HTTP responses use `Cache-Control: no-store`; changing identity/input invalidates pending UI responses.

The following sources are separate evidence lanes. They retain source identities, original units/decimal strings, school selectors, revisions and immutable event/claim references rather than inventing a common quantity.

| Dimension | Authoritative evidence |
| --- | --- |
| Approved demand / procurement A, F, H, U | commitment_accounts, entitlements, balances, claims, events and sources; account table exposes cache H and claim H separately |
| PR claims / PO source coverage | commitment_pr_lines, commitment_po_lines, commitment_po_coverage half-open source intervals; PO coverage is a subset of PR H |
| Accepted / pending / rejected / quarantined receipts | purchase_goods_receipts, commitment_receipts and commitment_receipt_decisions, linked through project planning lines in the PO |
| Physical S / exclusive R | verified stock_ledger movements and item/location/verified-unit balances; physical_stock_scopes; project_stock_reservations and production_input_reservations; competing active reservations within the same tenant |
| Recipe / work-order authority | production_recipes, production_work_orders, commitment_work_orders and commitment_work_order_materials |
| Issued consumption | production_input_issues and commitment_work_order_issues; consumption does not prove the proposed procurement ownership link or discharge payables |
| Output custody / material claims | production_output_custody, separate material/recipe_material/slot accounts, claims and immutable events |
| School fulfillment | planning_sites, requirement_approvals, packing plans/allocations/QC, dispatch/package units and delivery receipts; slot F remains separate from output H |
| Residual holds / closure | existing trustedProjectProgress blockers plus exact account/claim residuals, including missing balance caches; migration-32 guard unchanged |
| Unsupported history | commitment_reconciliation_cases remain evidence of unsupported provenance, never activation authority |

No unlike units are added. Verified physical totals group by item, location and verified unit, never by school entitlement or commitment H. An empty source is distinct from an unavailable source. Each lane is bounded at 500 records; a 501st row marks it incomplete and adds a provenance blocker. This bounded preview cannot certify a larger project's complete reconciliation; a future paginated/export reader would be needed. No balancing action is offered. Financial obligations are explicitly outside this reader's assessment.

Issues use six categories: missing provenance, unapproved transfer authority, conflicting claims, stale source, incomplete delivery and unresolved disposition. The snapshot SHA-256 is a deterministic comparison digest of the returned evidence, not a signature, approval, stored witness or new ledger event.

## Deterministic fixtures and conservation

Detached, synthetic snapshots in `materialReconciliation.fixtures.ts` cover received-unused material; partial/QC-rejected/pending/quarantined receipts; issue without an ownership link; a shared SKU across schools/grades/units; partial delivery with output H retained; cancellation after partial issue; overlapping source coverage; claim H without a balance cache; and unsupported historical provenance. They never write a database or manufacture successful transfer/discharge events. Conflicting fixtures model diagnostic input, not permitted ledger writes.

| Property | Current approved-contract verification |
| --- | --- |
| Demand/material conservation | Exact six-place integer arithmetic; database A >= F + H; cache H equals summed claim H; active claim quantity = held + fulfilled + released |
| Exact source coverage | Adjacent half-open intervals allowed, sub-unit overlap detected; actual synthetic coverage intervals checked disjoint; existing PR/PO writer rejection/retry regressions retained |
| Physical debit / exclusivity | Existing authoritative receipt, reservation and work-order integration checks retained; reader fingerprints prove no new stock/commitment writes |
| Receipt/QC idempotency | Existing restricted receipt decision and exact-key retry regressions retained |
| School/grade/subject lineage | Fixture selectors and separate units preserved; entitlement/project/approval tenant lineage checked; existing school-bound packing/delivery guards retained |
| Authorization | Signed-session validation, live revoked session, changed current role and other-tenant project denial; real browser HTTP 403/404 and error display |
| Residual closure denial | Every synthetic tenant project with account H or claim H must remain blocked; existing missing-cache and material-ownership guard regressions retained |
| Restart / fresh restore | Same diagnostic hash before/restart/restore, event replay and table fingerprints; no reconciliation event is generated |

Proposed O1–O10 settlement outcomes are not success expectations. Current approved recipe-material consumption remains valid while the absent procurement-to-production ownership contract is reported separately.

## Read-only future implementation impact preview

This is a technical dependency map, not executable migration SQL. No new migration or grant is included.

| Future policy dependency | Existing entities / migrations | Required future design after signed policy and separate engineering authorization |
| --- | --- | --- |
| O1–O4 source coverage versus exclusive material responsibility | 15 commitment ledger; 18 physical reservations; 19 PR; 20 PO; 21 receipt commitments; 22 receipt decisions; 23 recipe authority; 24 work-order authority | New append-only, source-linked responsibility transition witness: tenant/project/school/item/unit, exact PR/PO coverage intervals, approved receipt lineage, predecessor/successor claim, signed contract/version/scope, approved quantities and revision. Separate supplier/payables identifiers; no implicit financial transfer |
| O5 issue settlement | production_input_issues, stock_ledger, commitment_work_order_issues (24) | Approved immutable ownership-link witness must precede any responsibility discharge; link each exact physical issue once to only the corresponding transferred quantity. Preserve the existing physical debit; never post another debit. Supplier/payables unchanged |
| O6–O7 remainder disposition | reservations, claims, recipe authority, supply/work-order histories | Distinct append-only retained/release/reuse/supplier-return/cancellation/reassignment disposition witnesses with reason, approvers, quantity/unit, scope and predecessor evidence. New business contracts for unapproved dispositions; quarantine/loss/conversion cannot be hidden as consumption |
| O8 output / school settlement | 25 packing; 26 delivery; production_output_custody, trusted_packing_allocations, package hierarchy, dispatch units and receipts | Immutable output-to-school quantity mapping with unit conversion/yield basis, school/grade/subject, package parent/child allocation and accepted subset. Partial, damaged/lost, duplicate and unequal-unit cases require explicit decisions; no assumed numerical equality |
| O9 operational closure / financial tail | 27 completion; 32 residual material ownership closure guard | Keep zero account/claim residual guard, including missing cache. Separately approved finance controls for unpaid invoices, accruals, credits, supplier disputes/retentions/tax/reconciliation remain distinct from material holds; no closure bypass |
| O10 authorization / evidence | TrustedLedgerAuthority, databaseBoundary, restricted runtime/identity/ledger roles; existing live-session and immutable trigger guards | Narrow security-definer writers with fixed search paths, tenant checks and revoked PUBLIC/runtime direct writes. Named independent business approvals bound to revision/scope; no self-approval or synthetic signature |

Future writers need one atomic transaction locking exact source intervals, affected claims/accounts, physical reservations and school/output mappings in deterministic order. They must reject stale revisions and competing coverage, conserve quantities by unit, append witnesses and derive caches atomically. Idempotency must bind tenant, actor, operation key, complete normalized payload and immutable result; altered retries conflict. A database uniqueness constraint must prevent a second discharge for the same linked issue or acknowledgment. Live session/tenant checks and separated approvals must occur at the restricted writer boundary, not merely in a browser.

Browser execution controls may be developed only after policy approval and separately authorized implementation: source selection and transfer approval, linked issue settlement, remainder dispositions, output acceptance mapping and financial-tail closure workflow. Their previews must disclose exact before/after balances, units and source evidence. This milestone adds none of those controls.

Upgrade planning must inventory existing unmatched claims and unsupported historical records without automatic activation/backfill. A future migration requires a signed applicability boundary, conflict report, verified nonempty backup/restore, restricted-role grant review and explicit operator rollout authorization. Mixed versions must fail closed on unknown witnesses. Recovery must replay append-only witnesses and compare physical/commitment/financial lanes separately. Rollback must disable new commands and retain all evidence; it cannot delete witnesses, restore an older balance over later issues, or reverse stock/financial effects by assumption. Any compensating operation needs its own approved contract.

## Business choices still unresolved

All O1–O10 register entries in the [ownership contract](D6C_OWNERSHIP_DECISION_CONTRACT_DRAFT.md) remain unsigned. Source code cannot supply named accountable owners, approved transfer scope/effective date, whether procurement H changes on handover, ownership of unused material, reuse/return/cancellation/reassignment rights, unequal output-to-deliverable conversion, partial/damaged/lost acceptance, or financial-tail owners/controls. Policy approval alone does not authorize implementation or activation.

## Verification evidence

Full regression: **82 files passed, two skipped; 628 tests passed, two skipped** (dedicated recovery tests are opt-in). Initial focused tests: **50 passed**. Database assertions cover 30 conserved accounts, 40 conserved claims and 16 projects denied closure for residual holds; all 34 reader lanes were available. Typecheck and PWA/server builds passed.

Authenticated Edge component acceptance uses the real reconciliation component, built application CSS and restricted HTTP backend with a synthetic profile. Desktop 1440×900, tablet 768×1024 and phone 390×844 passed keyboard submission, keyboard evidence expansion, visible residual closure blockers and no document overflow. Invalid input clears stale evidence; real foreign-tenant project access returns 404 and a changed live role returns 403. No browser mutation requests or console errors occurred. An empty foreign-tenant planning draft is synthetic boundary setup only: no approval, stock or ownership claim. Full-application and intended-host acceptance remain outside this component result.

Dedicated recovery: **before, clean local PostgreSQL restart and nonempty fresh-database restore all PASS**. The selected project's diagnostic SHA-256 remains `26453e92f07bd907ac82bcbe08f2ade43f869e9d5a93239e6704d8114417cce1` across all phases. Restricted-role ledger replay, unchanged reader fingerprints, exact retries and residual-hold closure denial pass. These are isolated synthetic recovery checks; they do not establish production recovery or authorize activation. The first expanded browser-boundary run failed because no foreign-tenant project existed; the empty draft setup corrected that test-data gap and the final complete harness passed.

Private synthetic artifacts live under `.local-dev/`: `d6p-focused.log`, `d6p-full.log`, `d6p-typecheck-final.log`, `d6p-build-final.log`, `d6p-recovery.log`, `d6p-browser/acceptance.json`, three responsive screenshots, `d67-evidence.json`, `d67-recovery-summary.json` and `d67-recovery-{before,restart,restore}.json/log`. No credentials or private evidence artifacts belong in the commit.
