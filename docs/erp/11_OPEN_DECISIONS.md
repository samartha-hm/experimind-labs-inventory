# Unresolved Business / Engineering Decisions

**Do not silently consider the following confirmed.** At build time, use reversible defaults or seek business input if blocking and high impact.

| ID | Decision | Current safe posture |
|---|---|---|
| Q-01 | Exact count of grade-common crates per school/grade/kit grouping | Explicitly input/derive from verified template, never equal kit quantity by default |
| Q-02 | Universal crate scoping when multiple schools/delivery batches share a project | Explicit project/delivery group |
| Q-03 | SKU policy for fabricated outputs and transient WIP | Stockable output only when reused/stocked; confirm examples |
| Q-04 | Priority when multiple projects contend for available stock | Authorized explicit reservation; no hidden automatic priority |
| Q-05 | Purchase-value approval threshold | Single authorized buyer approval, threshold configurable later |
| Q-06 | What qualifies as QC passed vs released to stock | Separate QC status from physical receipt; quarantine by default if inspection required |
| Q-07 | What a packaged finished kit is in stock (unit identity vs nested components) | Never double count finished kit and consumed components |
| Q-08 | Stock issue for workshop returnable items vs customer-owned giveaways | Per-project issue disposition |
| Q-09 | Customer confirmation & quote revision handling | Versioned quotes, manually approved confirmation records initially |
| Q-10 | Site survey/installation handover signature format | Attach files/photos and completion status; signature later if needed |
| Q-11 | Real Prastuti Grade 8/9/10 quantities, items, UOM, packaging breakdown | **Real workbook recovered in source_data; quantities/scope still require normalization and approval** |
| Q-12 | Final repository license, current code paths, test/build status | **Must verify from actual clone** |
| Q-13 | Hosting/deployment OS, hardware and backups | Document after setup; internal self-host target |
| Q-14 | Real packaging dimension & custom sticker templates | Keep label templates configurable |
| Q-15 | Which current advanced modules remain connected at cutover | Defer decision until real dependency graph |
| Q-16 | Whether finance or invoicing should be bundled in early quotation screens | Operative costing and quote records first; no full GL |

Resolved decisions are documented in `.agent/DECISIONS.md` and should only move from this table when approved or empirically verified.


**Confirmed postscript 2026-10-08:** See `19_BUSINESS_DECISIONS_OCT_2026.md`. Only inventory item masters are known real; one project may serve multiple schools; local-first hosting; real workbook recovered. Q-01/02 remain for crate counts by site.
