# ERP build batches — 2026-11-09

User direction: continue building and plan longer work sessions with faster delivery. This supplements the [excellence plan](ERP_EXCELLENCE_PLAN_2026-11-09.md); it does not replace confirmed requirements or authorize deployment, company-data changes or unapproved ownership policies.

## Delivery method

Keep the current React/Express/PostgreSQL web application and installable PWA. Its existing contracts, revisions and tenant boundaries support incremental delivery; no demonstrated requirement justifies a rewrite, native wrapper or microservices. Reconsider only against a concrete capability or measured performance gap.

Complete a coherent workflow batch in one session, including related corrections, affected UX states and verification. Do not stop for permission between ordinary authorized fixes. Keep edits reviewable with logical commits; one remote-verified code checkpoint and one compact handoff per completed batch. If interrupted, record incomplete work without claiming acceptance.

Run affected tests during development, then full tests, typecheck and production build once at batch review. Repeat broader checks only for subsequent material changes or failures. Reuse current specifications and evidence instead of re-auditing the whole repository. Maintain a requirement-to-evidence checklist within each batch: implemented, freshly verified, blocked, or deferred.

## Ordered work packages

| Batch | Work and concrete output | Exit evidence |
| --- | --- | --- |
| 1. Dynamic builder reliability | Complete save/approval/archive recovery; then exercise these together with item selection, revisions, quantities and published history. Fix demonstrated connected failures rather than adding policy infrastructure. | Targeted error/permission/conflict tests; synthetic browser save/reopen/history walkthrough; immutable versions and tenant boundaries preserved. Synthetic save/reopen/history, approval/archive, viewer restrictions and controlled read recovery verified. |
| 2. Builder visual acceptance | Use the existing Precision Operations tokens and Studio design. Review library/editor/preview at 375px, tablet, desktop and 4K; light/dark, keyboard/focus, touch targets, long names, empty/loading/error/read-only states. Fix measured discrepancies as one visual batch. | Before/after captures with viewport and commit; keyboard checks; no clipping, inaccessible controls or misleading state. No pixel-perfect claim based on node tests alone. |
| 3. Project planning to shortages | Walk one synthetic multi-school project through dynamic template selection, independent subject/grade counts, explicit complete sets, site overrides, requirement approval and shortage review. Fix contract-backed gaps through service/API/UI together. | Persist/reopen/version history; stale/repeat/cross-tenant denial; demand totals and site destinations reconcile without stock mutation during planning. |
| 4. Purchasing to finished stock | Follow that demand through PR/PO, partial receipts/QC, production issue/return and finished output using existing accepted contracts. Repair only required broken links; preserve exclusive coverage and stock conservation. | Isolated PostgreSQL transaction/race/reversal tests; UI workflow proof; stock and commitment totals reconcile. No automatic migration or authority activation. |
| 5. Packing to delivery | Verify supported packing, six QC checks, package labels, partial dispatch, destination/custody, installation and closure. Separate software verification from physical inspection. | Synthetic workflow and retry evidence; real print/scan/inspection acceptance only from authorized staff and intended hardware. D6 remains blocked until its actual gates pass. |
| 6. Required supporting workflows | Complete concrete gaps in essential tasks/site surveys, reusable workshop issue/returns and operational reporting, one workflow per batch. Defer optional accounting, forecasts, storefront checkout and integrations. | GitHub approach comparison for unfamiliar features; supported data/API/UI; returns reconcile; reports expose source, freshness and completeness. |
| 7. Release acceptance | Consolidate evidence, fix remaining critical defects, measure realistic data/device performance and rehearse intended-host backup/restore and update/rollback. | Every mandatory release gate passes in its named environment, including provenance, operational recovery and staff/device acceptance. No averaged score overrides a failed gate. |

## Research and reuse

Before an unfamiliar capability, search GitHub and compare at least two relevant open-source approaches, recording links, exact license/version, contract fit and reasons for selection. Inspect the existing research register first. Prefer adapting a proven pattern within the current application over introducing a framework or copying an entire ERP. Verify licensing before reusing code. Familiar corrections to existing event handlers do not need a new research round.

## Faster without hiding blockers

- Group related error, permission and state fixes with their workflow; avoid another whole-product audit for every button.
- Reuse shared tokens and proven controls; introduce abstractions only for demonstrated repeated behavior.
- Use synthetic fixtures and existing isolated services; never reset company data or restart a healthy service merely for convenience.
- Keep moving on independent authorized software work when physical, provenance or host gates are blocked. Record exactly what remains blocked; do not fabricate evidence.
- Ask only when a required action has a genuine unresolved business outcome, needs missing access or falls outside authorization. Present the specific action and example, not an abstract policy package.

Current next executable task: complete batch 2 visual coverage, then batch 3 project planning to shortages. Session handoff remains the authority for the immediate continuation and latest verified checks. D6 BLOCKED and pilot NO-GO remain unchanged.
