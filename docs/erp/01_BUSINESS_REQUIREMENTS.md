# Experimind — Confirmed Business and Product Requirements

**Source:** Direct answers during the ERP discovery conversation, plus clearly flagged design implications. Date 2026-10-08.

## Business activities

Experimind Labs operates across STEM/educational kits, science and mathematics activities, Prastuti, school laboratory supply and setup, workshops/teacher training, DIY kits, electronics/IoT and robotics products, laser-cut/fabricated components, chemical preparation, custom institutional orders, R&D, prototypes, and planned online retail. Other project/product types must remain possible without hardcoding a school-specific app.

Products may include **Prastuti multi-grade/class kit deployments, activity boxes, pouches, grade-specific common crates, a project-wide universal crate, DIY Solar Fan / Automatic Street Light / Continuity Toy, charts, name boards, laboratory equipment, installation services, training, workshop kits, robotics or IoT solutions.** These are examples, not an exhaustive catalog.

**Primary tenant:** Experimind's own internal operations. Fewer than 25 users initially. One physical stock location currently. Multiple responsibilities per employee; no one-person-one-role assumptions.

## Actual commercial/project workflow

A school, NGO or other organization contacts Experimind; staff discover needs and may inspect a site, measure rooms, record electrical points/furniture/existing equipment, plan a solution, quote and seek approval. Quotation can occur before or after further planning. Once approved, staff divide work, source/procure, make/prepare, verify/QC, assemble, pack/label, travel to the site, deliver/setup, then close the project. **Projects sometimes exist before confirmation** (proposals, repeat stock preparation, prototypes, R&D).

**Architecture decision:** Project is the operational container; quotations and sales orders are linked commercial records, not mandatory prerequisites. Avoid artificially forcing every project through all phases.

## Confirmed cases

- Repeated Prastuti template deployments for School A/B/C with grade- or school-specific modifications.
- One project may include several grades, DIY kits, charts, name boards, equipment, and services.
- Aim for one delivery, but allow multiple partial deliveries and setup after delivery.
- Every physical activity pouch gets an activity sticker; every box gets a box sticker; only selected individual items get stickers.
- Shared equipment exists as grade-specific **common crates** plus a project-wide **universal crate**.
- Some materials are consumables; other equipment is reusable during workshops and returned; the same equipment may be given away under different projects.
- Most fabrication/preparation occurs internally: laser cutting, chemical preparation, wire cutting, printing, assembly, bagging, charts and other fabrication.
- Internally produced **finished components/products are real inventory** for future orders.
- Support both buying for a specific project and purchasing for general stock replenishment.
- Buyer/responsible purchaser receives and approves purchase requests before buying; exact purchase-value approval policy remains to be determined.
- Site survey captures rooms, dimensions, photos, electrical/furniture needs, existing equipment, requirements, drawings, files, and notes. Multiple revisions should be preserved.
- Tasks need assignee, date, priority, dependencies, checklist, status, attachments, link to requirement; one person may perform many functions.
- Project-driven, internal prepare-for-stock, workshop returns, planned storefront are all required at architectural level.
- Operational costing/estimated revenue/profit first; complete accounting/GST later.

## Core business value

Operators must quickly answer **what is required, how much, why, how it is packed, where it comes from, what is in stock, who owns the next action, what is blocked, what is ready, and whether it has actually been delivered and installed**.

## Operational scope, not generic enterprise ERP

High priority: project engine, site survey, template/kit master, scoped quantity planning, inventory/reservations, purchasing, preparation/production, QC, packing/labels, delivery/setup, tasks, flexible access, and reporting.

Secondary: storefront integration, more detailed costing, finance/GST, equipment return tracking enhancements.

Defer unless justified: 3D warehouse/digital twin, full CAPA/e-signature complex regulatory frameworks, speculative AI, forecasting, advanced MSL/reel workflows, elaborate PLM, generic HR/payroll, corporate multi-tenant SaaS.

## Boundaries

- A Project can be customer-linked or internal.
- A product/kit template is reusable; projects can customize instantiated versions **without altering the published master**.
- A project requirement is *demand*, not stock and not necessarily an inventory item (e.g., site installation is a service task).
- A manufacturing BOM is a recipe for how an inventory item is made; a project kit template defines deliverables and physical packing composition.
- A finished product may be manufactured into stock before any customer places an order.
- One physical location presently, but structure should allow bins and future sites without implementing advanced WMS prematurely.

## Commercial scope

We must allow survey → planning → quote/approval OR early quote → survey/revision → approval. Multiple quote revisions and approval evidence may be needed. Avoid making quotation stage a database constraint. Customer signoff should be recordable without assuming a full accounting invoice exists.

## Non-negotiable free deployment

Self-hostable and operable with no required proprietary ERP, API, third-party SaaS or per-user license. Optional integration fees may exist but must not break core offline/local operation.

## Requirement IDs

See `13_REQUIREMENTS_TRACEABILITY.csv`. These IDs are stable references for PRs/tests/agent progress. Do not renumber existing IDs; add new ones.
