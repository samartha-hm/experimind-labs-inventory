# Inventory Master Preservation — SAFETY CONTRACT

- User confirmed only existing **item names and descriptions** are reliable.
- Do not equate the CSV with the live PostgreSQL database. The source CSV is a reviewable candidate list, not a confirmed database export.
- `source_data/inventory_master_candidates.csv` contains **only source row number, item name and description**. It intentionally excludes previous quantity, price, category, location, barcode and IDs.
- CSV had 322 rows; all 322 names nonempty, 31 nonempty descriptions; duplicate name groups exist. No automatic merge or SKU generation in the candidate file.
- Actual PostgreSQL migration: back up database first; export and reconcile the current names/descriptions from live `inventory_items`; perform human review of duplicates and missing descriptions; retain legacy item IDs via explicit mapping when migrating; only later establish quantities through documented physical stocktake (opening balance movements), prices and locations through new verified entries.
- UI must show `Stock NOT VERIFIED` / quantity unknown. **Unknown is null, never zero.** Do not calculate purchasing shortage or promise available stock using old quantities.
- Block `scripts/seed_real_inventory.ts` and `npm run db:seed:real`: it reads old quantity/price and writes them, and deletes visual warehouse tables.
- Block `npm run db:clean` unless safely backed up, explicitly authorized and independently checked.
- For procurement quantities and production, use approved BOM/template version AND verified stock. Until then allow planning previews only.
