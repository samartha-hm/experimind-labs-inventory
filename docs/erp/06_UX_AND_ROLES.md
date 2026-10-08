# UI / UX, Permissions and Practical Workflows

## UX principles

- Staff should see **what to do next**, not dozens of generic ERP modules.
- Optimize common warehouse/production actions for mobile and barcode scanner; desktop for planning/quotations.
- Show errors/sources: every demand row drill-down explains *which grade, template version and packing rule produced it*.
- Do not expose ERP accounting jargon to packing operators.
- Status badges should be meaningful and non-contradictory; display separate axes for purchase/production/packing.
- Spreadsheet-like import/export is essential for existing kit data, but validate duplicates/UOM and preview changes before import.

## Recommended navigation

Dashboard, Projects, Templates & Kits, Inventory, Procurement, Preparation & Production, Quality, Packing & Dispatch, Customers & Sales, Suppliers, Reports, Administration; Storefront in later rollout.

## Project workspace

Tabs: Overview, Discovery & Site, Requirements, Quantity Plan, Tasks, Purchasing, Make/Prepare, QC, Packing, Delivery & Setup, Files, History. Hide irrelevant tabs by project type and permissions.

## Create project wizard

1. Type: customer/internal stock/R&D/workshop/lab setup.
2. Customer/site or internal objective.
3. Select published product/kit templates and versions.
4. Enter quantity inputs **separately**: G8 kit count, G8 common crate count, G9 kit count, etc., universal crate count. Do not auto-multiply ambiguous common crates.
5. Customize requirements/optional lines.
6. Preview expanded demand with provenance; save as project version. Project creation itself changes no physical stock.

## Quantity planning table

`Item | Demand | On Hand | Reserved elsewhere | Reserved for this project | Free now | Incoming | Short now | Source trace | Action`.

Actions depending on permission: select substitution, create procurement request, create production plan, reserve stock, edit project overrides, review explanation.

## Operator tasks

Task list filtered to assigned person; due date, dependencies, checklist, linked item/requirement, attachments. Common actions: complete cutting, check chemical preparation, QC, bag items, print label, pack/seal, scan dispatch. One person can see multiple responsibility queues.

## Permissions

Separate *permissions* from *responsibility labels*. User can have multiple permission bundles and assignments. Examples: Project.Create, Requirement.Edit, Template.Publish, Stock.Reserve, Stock.Adjust, PO.Approve, Production.Complete, QC.Release, Package.Seal, Delivery.Dispatch, Survey.Edit, Customer.View, Finance.View. Admin escalation for write-off/correction.

## Audit & help

Task/document views show last actor and change history; exportable evidence. Avoid punitive surveillance or unnecessary monitoring; record only operationally relevant details.

## Mobile/offline

Online-first v1. If offline capture is implemented later, stage scans with idempotency IDs and explicit sync status; never let offline clients invent balances. Mobile friendly means responsive UI; a native app is not a requirement.
