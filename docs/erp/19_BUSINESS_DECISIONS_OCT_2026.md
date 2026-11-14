# Confirmed Business Decisions — 2026-10-08 (supersedes prior open questions)

1. Preserve **only actual inventory item names and descriptions** from the existing ERP/source inventory data. All current stock quantities, prices, SKUs/barcodes, locations, stock reservations and historical values are NOT authoritative.
2. Project → **many SchoolSites** → per-site grade/kit requirements, packing, delivery, surveys and installation. Central procurement and production aggregate across sites while retaining trace back to each school.
3. **SUPERSEDED by Oct 2026 Prastuti decision:** one grade-common crate per **Science grade set**, none for Maths; one universal crate per **complete Science Grade 8+9+10 set**. See `25_PRASTUTI_SET_AND_CRATE_RULES_CONFIRMED.md`.
4. Per-site/grade crate quantities may become configurable in a future approved process; first working release follows confirmed defaults.
5. The September 2026 Prastuti workbook is a **draft that needs corrections**. Keep original untouched; DO NOT promote to approved master, automatically issue POs, perform stock movements or dispatch using it. Use the worksheet as a provenance-marked import preview. Approved master will be supplied later.
6. Hosting is **local first**, ideally self-hosted on an office machine/server with Docker Compose + PostgreSQL; future migration to cloud must preserve database schema, file attachments, IDs, backups and user/tenant model.
7. No live database backup has been supplied; the uploaded repository is a source ZIP, not a database dump.
8. Internal team <25 users, responsibilities multi-role; accounting/GST can follow once operational core is stable.

No additional product requirements questions block safe development of the read-only Project Requirement Engine; actual production cutover must wait for stocktake and approved Prastuti master.

**LATEST / CONTROLLING DECISION:** Refer to `25_PRASTUTI_SET_AND_CRATE_RULES_CONFIRMED.md` for all universal crate and common crate quantities; do not use older one-per-school shortcuts.
