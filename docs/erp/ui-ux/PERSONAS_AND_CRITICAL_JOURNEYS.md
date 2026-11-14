# Staff tasks and critical journeys

These are task-based role hypotheses grounded in accepted workflows, current source and read-only browsing. They are not demographic personas or interview findings. Actual staffing may combine roles; backend permissions remain authoritative.

| Staff responsibility | Main decision / information | Proposed entry |
| --- | --- | --- |
| Administrator / project manager | Which site is blocked, who owns it, which revision is approved? | My work → project readiness |
| Kit/product designer | Does educational use map correctly to physical contents and tested quantity rules? | Kit Studio → draft / immutable version |
| Warehouse/inventory | What is verified, available, reserved and physically located? | Inventory → verification / reservations |
| Purchasing | What net shortage needs buying, for which project, with which receipts/QC outstanding? | Purchasing → shortages / orders |
| Production | Which approved recipe and input reservations can be released; what output passed QC? | Production → assigned work |
| Packer / QC inspector | Which package and destination; what remains; what evidence allows acceptance? | Packing & QC → assigned packages |
| Dispatch / installation | Which immutable manifest, receipt exception or installation task remains? | Delivery & installation → assigned deliveries |

## J1 · Design and approve a reusable kit

**Objective / entry:** designer opens Product Library (proposed Kit Studio), creates or edits a draft. **Essential information:** stable template identity, draft revision, approved versions, activity code/instructions, item identity/UOM, quantity basis, physical placement and shared usage.

**Actions / decisions:** define subject and grade; add activities/materials; create box, compartment and pouch; associate several activities with a shared pouch; configure common/universal rules; save; test multiple school scenarios; authorized reviewer approves the saved immutable version. **Exceptions:** missing item/unit, duplicate demand, incomplete complete-set confirmation, stale revision, dirty draft on approval, failed save. Preserve the draft and point to the offending node; do not silently infer quantities or approve unsaved changes.

**Handoff:** designer → approver → project planner selecting a specific approved version. **Risk:** lost edits, mistaken version, counting shared material twice. **Current friction:** long nested form and distant preview/approval. **Opportunity:** linked outlines, find usages, persistent save state, traceable read-only preview and a review summary. Validate the actual division of author/reviewer duties.

## J2 · Configure a multi-school project and explain demand

**Objective / entry:** project manager opens Projects, selects an approved kit version and schools/sites. **Essential information:** per-site grades/sets, explicit complete Science sets, scoped overrides, demand revision and source version.

**Actions / decisions:** configure School A with two each of Science grades 8/9/10 and explicitly two complete sets; School B with three grade-8 sets and zero complete sets; save and calculate; inspect site breakdown then compatible aggregation. Expected crates: A six common/two universal; B three common/zero universal. **Exceptions:** absent complete-set confirmation blocks the affected calculation; invalid counts or dirty project require correction/save; revised upstream demand requires review before operational actions.

**Handoff:** planner → warehouse, purchaser and production coordinator using the same demand revision. **Risk:** cross-school leakage, stale demand or master-template mutation through a site override. **Current friction:** planning and execution share a lengthy page and broad warning. **Opportunity:** explicit Planning/Readiness/Execution context, site switcher, provenance drill-down and a visible revision freshness notice.

## J3 · Verify stock, reserve, procure and receive

**Objective / entry:** warehouse opens project readiness or inventory verification; purchaser follows a net-shortage link. **Essential information:** location, verified/on-hand/reserved/available quantities, UOM, project/demand revision, incoming orders and production allocations.

**Actions / decisions:** verify opening counts through existing approval/post flow; reserve eligible stock; review remaining shortage; purchase the correct shortfall; receive and QC with project trace. Buy inputs for in-house preparation only once. **Exceptions:** unknown stock remains unknown; stale reservation revision, partial receipts, rejected QC, unavailable conversion or supplier delay get explicit recovery actions. Rejected/pending receipts are not available stock.

**Handoff:** warehouse → purchasing → receipt inspector → warehouse/project planner. **Risk:** oversubscription, duplicate orders, wrong-location picks or interpreting unknown as zero. **Current friction:** serial project panels and competing lists. **Opportunity:** stock provenance panel and shortage-to-order breadcrumbs; keep issue/receive approvals explicit. Purchasing live experience was not separately exercised in 13A.

## J4 · Prepare components and accept usable output

**Objective / entry:** production operator opens assigned preparation work or linked project demand. **Essential information:** immutable approved recipe, planned/actual yield, input reservations and locations, team, due date, scrap/rework and output QC.

**Actions / decisions:** review work order; reserve/release existing eligible inputs; record actual issues and output; inspector accepts eligible output, making only accepted quantity available. **Exceptions:** unverified input, partial availability, rejects, rework and changed demand remain distinct. A retry reconciles the original operation instead of duplicating stock movement.

**Handoff:** planner/warehouse → operator → QC → packing. **Risk:** issue twice, count rejected output as ready, confuse recipe with educational kit. **Current friction:** production forms sit above packing in the project scroll. **Opportunity:** independent work queue with explicit source project and recipe context, quantity reconciliation and next-owner handoff. Recipe semantics remain unchanged.

## J5 · Assemble, pack, inspect and release a site batch

**Objective / entry:** packer opens assigned batch or scans an existing authorized package label. **Essential information:** project/site, batch/demand revision, package ancestry, required/picked/packed/QC quantities, material locations and checklist.

**Actions / decisions:** select package; pick eligible material; complete assembly checklist; record exception/rework if needed; inspector evaluates the existing six QC checks; authorized approver releases readiness only when requirements pass; preview/reprint the existing label. **Exceptions:** shortage, wrong destination, rejected QC, missing checklist, partial pick, stale revision, pause/reopen and corrected exception require visible reason/status. Ready packages remain protected; reopening is privileged and reasoned.

**Handoff:** warehouse/production → packer → inspector/approver → dispatch. **Risk:** acting on wrong package, hidden multi-selection, duplicate pick, reused labels interpreted as new packages. **Current friction:** flat UUID-based ancestry and scattered package/QC controls. **Opportunity:** readable hierarchy, sticky target, visible bulk scope, scanned-ID confirmation and audit drawer. Staff must validate whether separate packer and inspector assignments exist in practice.

## J6 · Dispatch split deliveries and confirm destination receipt

**Objective / entry:** dispatch opens ready packages for one destination. **Essential information:** immutable manifest, source site, selected package identities, already dispatched/received quantities and receipt evidence.

**Actions / decisions:** select permitted ready packages; review destination/count; create existing dispatch; capture partial receipt, failure/return/retry and POD through supported flows. Reprinting does not create another dispatch or deduct stock again. **Exceptions:** mixed sites, stale package state, permission denial, missing evidence and partial failure stay visible with recovery owner.

**Handoff:** packing approver → dispatcher → school recipient → project manager. **Risk:** duplicate dispatch, destination mismatch, treating partial POD as complete. **Current friction:** delivery is another downstream section of the same project page. **Opportunity:** destination-centric queue and manifest summary with explicit remaining packages. No claim of fresh dispatch execution in discovery.

## J7 · Install, resolve issues and accept completion

**Objective / entry:** installer opens assigned delivered site; project manager reviews closure readiness. **Essential information:** delivery receipts, whether installation is required, survey/tasks, open issues, attachments, acceptance/reopen history.

**Actions / decisions:** record installation notes and tasks; resolve issues; submit completion for authorized acceptance; reopen with reason if needed. Delivery-only sites follow their existing rules. **Exceptions:** unresolved issue blocks acceptance; delivered does not imply installed; failed upload or expired authentication preserves recoverable text without implying attachment success.

**Handoff:** recipient/dispatcher → installer → reviewer/project manager. **Risk:** premature closure, missing evidence, confusing site and overall project completion. **Current friction:** progress is distributed among delivery, installation and project fields. **Opportunity:** site readiness checklist with linked evidence and explicit last blocker/owner.

## Highest-value staff validation

Recruit actual representatives across all seven responsibility groups, including an occasional user and a tablet/scanner user; roles may overlap. Ask: Which three tasks dominate a shift? Where do you return to paper? What do staff call a partition, pouch, common crate and complete set? Who may correct or reopen QC? Which scanner emits what suffix? Are gloves, shared terminals, interrupted connectivity, local language or printing constraints present? How is a blocked handoff assigned today? Which mistake costs most to recover? Which status/count must be readable across a bench? Observe these tasks rather than asking staff to endorse a visual style.
