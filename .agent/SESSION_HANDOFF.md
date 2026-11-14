# Release handoff — 2026-11-14

Release checkpoint `7214037` on `feature/kit-builder-milestone-1` includes catalog-backed BOM and project readiness, FabLab custody, and storefront ATP and ERP fulfillment.

All 755 tests in 100 files passed on isolated PostgreSQL. ERP and storefront lint, typechecks and production builds passed. Storefront ESLint reported zero warnings. On isolated PostgreSQL, the production runner applied FabLabLoans1793232000033 once, granted runtime access and executed zero migrations on repeat.

Deployment requires a valid STOREFRONT_ORG_ID and an existing inventory schema. Run the production migration plan and apply commands in README.md using the deployment migration role.
