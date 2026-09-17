import { Router } from "express";
import { requireTenant } from "../../middleware/tenant";
import { requireRole } from "../../middleware/auth";
import { AppDataSource } from "../../db";
import { InventoryItem } from "../../entity/InventoryItem";
import { Vendor } from "../../entity/Vendor";
import { Customer } from "../../entity/Customer";
import { Bin } from "../../entity/Bin";
import { Warehouse } from "../../entity/Warehouse";
import { StockLedgerService } from "../../services/StockLedgerService";

const router = Router();
const stockLedgerService = new StockLedgerService();

// POST /api/v1/bulk-import/items
router.post("/items", requireTenant, requireRole("staff", "admin"), async (req, res) => {
  const orgId = (req as any).orgId;
  const user = (req as any).user;
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "No rows provided for import" });
  }

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const itemRepo = queryRunner.manager.getRepository(InventoryItem);
    const whRepo = queryRunner.manager.getRepository(Warehouse);
    const defaultWh = await whRepo.findOne({ where: { organization_id: orgId } });
    const defaultWhId = defaultWh ? defaultWh.id : "00000000-0000-0000-0000-000000000000";

    const inserted: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.name || row["Item Name"] || row["Product Name"];
      const sku = row.sku || row.sku_code || row["SKU"] || `SKU-${Date.now().toString().slice(-4)}-${i}`;
      const category = row.category || row["Category"] || "General";
      const uom = row.uom || row.unit || row["UOM"] || "pcs";
      const price = Number(row.unit_price || row.price || row["Price"] || row["Unit Cost"]) || 0;
      const stock = Number(row.stock_qty || row.quantity || row["Stock Qty"] || row["Quantity"]) || 0;
      const bin = row.bin || row.location || row["Bin"] || "Default Shelf";
      const mpn = row.mpn || row["MPN"] || row["Part Number"];
      const footprint = row.footprint || row["Footprint"] || row["Package"];
      const mounting = row.mounting || row["Mounting"] || row["Mounting Type"];
      const msl = row.msl || row["MSL"] || row["MSL Rating"];
      const manufacturer = row.manufacturer || row["Manufacturer"] || row["Brand"];

      if (!name) {
        errors.push(`Row ${i + 1}: Item name is required`);
        continue;
      }

      // Check if SKU exists
      let item = await itemRepo.findOne({ where: { sku, organization_id: orgId } });
      if (!item) {
        item = itemRepo.create({
          organization_id: orgId,
          sku,
          name,
          category,
          unit: uom,
          base_price: price,
          quantity: stock,
          threshold: 10,
          bin_location: bin,
          is_common: false,
          mpn: mpn || undefined,
          package_footprint: footprint || undefined,
          mounting_type: mounting || "SMD",
          msl_rating: msl || "MSL 1",
          manufacturer: manufacturer || undefined,
        });
        item = await itemRepo.save(item);
      } else {
        item.quantity = Number(item.quantity) + stock;
        if (mpn) item.mpn = mpn;
        if (footprint) item.package_footprint = footprint;
        if (mounting) item.mounting_type = mounting;
        if (msl) item.msl_rating = msl;
        if (manufacturer) item.manufacturer = manufacturer;
        item = await itemRepo.save(item);
      }

      inserted.push(item);

      // If initial stock was imported, write to Stock Ledger
      if (stock > 0) {
        await StockLedgerService.postEntry({
          organizationId: orgId,
          itemId: item.id,
          itemName: item.name,
          itemSku: item.sku,
          warehouseId: defaultWhId,
          binLocation: bin,
          transactionType: "MANUAL_ADJUSTMENT",
          qtyDelta: stock,
          unitCost: price,
          referenceType: "BULK_CSV_IMPORT",
          referenceId: `CSV-${Date.now()}`,
          reasonCode: "INITIAL_OPENING_BALANCE",
          notes: `Batch CSV import row ${i + 1}`,
          actorId: user?.id,
          actorName: user?.email
        });
      }
    }

    if (errors.length > 0 && inserted.length === 0) {
      await queryRunner.rollbackTransaction();
      return res.status(400).json({ error: "Bulk import failed", errors });
    }

    await queryRunner.commitTransaction();
    res.json({
      message: `Successfully imported ${inserted.length} items.`,
      importedCount: inserted.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (e: any) {
    await queryRunner.rollbackTransaction();
    res.status(500).json({ error: `Bulk Import Error: ${e.message}` });
  } finally {
    await queryRunner.release();
  }
});

export default router;
