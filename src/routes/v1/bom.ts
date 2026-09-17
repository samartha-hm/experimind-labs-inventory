import { Router, Request, Response } from "express";
import { BomService } from "../../services/BomService.ts";
import { EcadParserService } from "../../services/EcadParserService.ts";
import { AppDataSource } from "../../db.ts";
import { BomNode } from "../../entity/BomNode.ts";
import { ComponentAlternate } from "../../entity/ComponentAlternate.ts";
import { InventoryItem } from "../../entity/InventoryItem.ts";

const router = Router();
const bomRepo = AppDataSource.getRepository(BomNode);
const altRepo = AppDataSource.getRepository(ComponentAlternate);
const itemRepo = AppDataSource.getRepository(InventoryItem);

/**
 * GET /api/v1/bom/tree/:itemId
 * Fetch full recursive multi-level BOM assembly tree with live stock health
 */
router.get("/tree/:itemId", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const { itemId } = req.params;

    const result = await BomService.getAssemblyTree(itemId, orgId);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to resolve BOM tree.",
    });
  }
});

/**
 * GET /api/v1/bom/shortage-analysis/:itemId
 * Production Run Shortage Analyzer for target build quantity
 */
router.get("/shortage-analysis/:itemId", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const { itemId } = req.params;
    const quantity = parseInt(req.query.quantity as string, 10) || 1;

    const result = await BomService.analyzeProductionShortages(itemId, quantity, orgId);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to analyze shortages.",
    });
  }
});

/**
 * POST /api/v1/bom/nodes
 * Create a new BOM relationship node
 */
router.post("/nodes", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const {
      parent_item_id,
      child_item_id,
      quantity = 1,
      scrap_percentage = 0,
      reference_designators = [],
      find_number,
      assembly_phase = "SMT_TOP",
      do_not_populate = false,
      notes,
    } = req.body;

    if (!parent_item_id || !child_item_id) {
      return res.status(400).json({
        success: false,
        error: "Both parent_item_id and child_item_id are required.",
      });
    }

    if (parent_item_id === child_item_id) {
      return res.status(400).json({
        success: false,
        error: "Item cannot have a recursive BOM node referencing itself.",
      });
    }

    const node = bomRepo.create({
      organization_id: orgId,
      parent_item_id,
      child_item_id,
      quantity: Number(quantity),
      scrap_percentage: Number(scrap_percentage),
      reference_designators: Array.isArray(reference_designators)
        ? reference_designators
        : EcadParserService.expandDesignators(reference_designators),
      find_number: find_number ? parseInt(find_number, 10) : undefined,
      assembly_phase,
      do_not_populate: Boolean(do_not_populate),
      notes,
    });

    const saved = await bomRepo.save(node);
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/v1/bom/nodes/:id
 * Update an existing BOM node
 */
router.put("/nodes/:id", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const { id } = req.params;
    const {
      quantity,
      scrap_percentage,
      reference_designators,
      find_number,
      assembly_phase,
      do_not_populate,
      notes,
    } = req.body;

    const node = await bomRepo.findOne({
      where: { id, organization_id: orgId },
    });

    if (!node) {
      return res.status(404).json({ success: false, error: "BOM node not found." });
    }

    if (quantity !== undefined) node.quantity = Number(quantity);
    if (scrap_percentage !== undefined) node.scrap_percentage = Number(scrap_percentage);
    if (reference_designators !== undefined) {
      node.reference_designators = Array.isArray(reference_designators)
        ? reference_designators
        : EcadParserService.expandDesignators(reference_designators);
    }
    if (find_number !== undefined) node.find_number = parseInt(find_number, 10);
    if (assembly_phase !== undefined) node.assembly_phase = assembly_phase;
    if (do_not_populate !== undefined) node.do_not_populate = Boolean(do_not_populate);
    if (notes !== undefined) node.notes = notes;

    const updated = await bomRepo.save(node);
    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/v1/bom/nodes/:id
 * Delete a BOM node
 */
router.delete("/nodes/:id", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const { id } = req.params;

    const node = await bomRepo.findOne({
      where: { id, organization_id: orgId },
    });

    if (!node) {
      return res.status(404).json({ success: false, error: "BOM node not found." });
    }

    await bomRepo.remove(node);
    return res.status(200).json({ success: true, message: "BOM node deleted." });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/bom/nodes/:id/alternates
 * Add an approved / drop-in alternate part to a BOM node
 */
router.post("/nodes/:id/alternates", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const { id } = req.params;
    const { alternate_item_id, preference_rank = 1, approval_status = "APPROVED", engineering_notes } = req.body;

    const node = await bomRepo.findOne({
      where: { id, organization_id: orgId },
    });

    if (!node) {
      return res.status(404).json({ success: false, error: "BOM node not found." });
    }

    const alternateItem = await itemRepo.findOne({
      where: { id: alternate_item_id, organization_id: orgId },
    });

    if (!alternateItem) {
      return res.status(404).json({ success: false, error: "Alternate inventory item not found." });
    }

    const alternate = altRepo.create({
      bom_node_id: node.id,
      alternate_item_id: alternateItem.id,
      preference_rank: parseInt(preference_rank, 10),
      approval_status,
      engineering_notes,
    });

    const saved = await altRepo.save(alternate);
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/v1/bom/alternates/:id
 * Remove an alternate part
 */
router.delete("/alternates/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alt = await altRepo.findOne({ where: { id } });
    if (!alt) {
      return res.status(404).json({ success: false, error: "Alternate not found." });
    }
    await altRepo.remove(alt);
    return res.status(200).json({ success: true, message: "Alternate removed." });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/bom/ingest-cad
 * Ingest and preview EDA CAD BOM (KiCad, Altium, EasyEDA, CSV)
 */
router.post("/ingest-cad", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const { csvContent, formatHint = "AUTO", parentItemId } = req.body;

    if (!csvContent || typeof csvContent !== "string") {
      return res.status(400).json({
        success: false,
        error: "csvContent (string) is required.",
      });
    }

    const parseResult = EcadParserService.parseCsvContent(csvContent, formatHint);

    // Fetch existing inventory catalog to perform auto-matching
    const items = await itemRepo.find({
      where: { organization_id: orgId },
      select: ["id", "sku", "name", "mpn", "package_footprint", "quantity", "base_price"],
    });

    const itemByMpn = new Map<string, any>();
    const itemBySku = new Map<string, any>();
    items.forEach((item) => {
      if (item.mpn) itemByMpn.set(item.mpn.toLowerCase().trim(), item);
      if (item.sku) itemBySku.set(item.sku.toLowerCase().trim(), item);
    });

    const mappedRows = parseResult.rows.map((row) => {
      let matchedItem: any = null;

      if (row.mpn) {
        matchedItem = itemByMpn.get(row.mpn.toLowerCase().trim()) || itemBySku.get(row.mpn.toLowerCase().trim());
      }
      if (!matchedItem && row.value) {
        matchedItem = itemBySku.get(row.value.toLowerCase().trim());
      }

      return {
        ...row,
        matchedItemId: matchedItem?.id,
        matchedItemSku: matchedItem?.sku,
        matchedItemName: matchedItem?.name,
        matchedItemStock: matchedItem?.quantity ?? 0,
        matchedItemPrice: matchedItem?.base_price ?? 0,
      };
    });

    let diff: any = null;
    if (parentItemId) {
      const existingNodes = await bomRepo.find({
        where: { parent_item_id: parentItemId, organization_id: orgId },
        relations: ["child_item"],
      });
      diff = EcadParserService.diffBoms(existingNodes, mappedRows);
    }

    return res.status(200).json({
      success: true,
      data: {
        format: parseResult.format,
        totalComponents: parseResult.totalComponents,
        totalUniqueLines: parseResult.totalUniqueLines,
        rows: mappedRows,
        diff,
        warnings: parseResult.warnings,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/bom/commit-cad
 * Commit parsed CAD BOM rows into database for a given parent assembly
 */
router.post("/commit-cad", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const { parentItemId, rows, createMissingItems = true } = req.body;

    if (!parentItemId || !Array.isArray(rows)) {
      return res.status(400).json({
        success: false,
        error: "parentItemId and rows (array) are required.",
      });
    }

    const parentItem = await itemRepo.findOne({
      where: { id: parentItemId, organization_id: orgId },
    });

    if (!parentItem) {
      return res.status(404).json({ success: false, error: "Parent assembly item not found." });
    }

    // Process inside transaction
    const createdNodes = await AppDataSource.transaction(async (manager) => {
      const results: BomNode[] = [];

      for (const row of rows) {
        let childItemId = row.matchedItemId;

        // If no matching item and createMissingItems is enabled, create it
        if (!childItemId && createMissingItems) {
          const generatedSku = `COMP-${(row.mpn || row.value || "PART").replace(/[^a-zA-Z0-9]/g, "-").toUpperCase().slice(0, 20)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const newItem = manager.create(InventoryItem, {
            organization_id: orgId,
            sku: generatedSku,
            name: `${row.value || row.mpn || "Component"} (${row.footprint || "SMD"})`,
            description: row.description || `CAD Ingested: ${row.designators?.join(", ")}`,
            category: "Electronics",
            mpn: row.mpn || row.value,
            package_footprint: row.footprint || "0603",
            mounting_type: "SMD",
            msl_rating: "MSL 1",
            parametric_specs: row.parametricSpecs || {},
            base_price: 0.1,
            price_markup_pct: 30,
            quantity: 0,
            unit: "pcs",
            threshold: 50,
            is_common: true,
            is_subassembly: false,
            is_sellable: false,
          });

          const savedItem = await manager.save(InventoryItem, newItem);
          childItemId = savedItem.id;
        }

        if (!childItemId) continue;

        // Check if a BOM node already exists between parent and child
        let node = await manager.findOne(BomNode, {
          where: { parent_item_id: parentItemId, child_item_id: childItemId, organization_id: orgId },
        });

        if (node) {
          node.quantity = Number(row.quantity);
          node.reference_designators = row.designators || [];
          node.do_not_populate = Boolean(row.dnp);
          node.assembly_phase = row.assemblyPhase || "SMT_TOP";
        } else {
          node = manager.create(BomNode, {
            organization_id: orgId,
            parent_item_id: parentItemId,
            child_item_id: childItemId,
            quantity: Number(row.quantity),
            scrap_percentage: 0,
            reference_designators: row.designators || [],
            assembly_phase: row.assemblyPhase || "SMT_TOP",
            do_not_populate: Boolean(row.dnp),
          });
        }

        const savedNode = await manager.save(BomNode, node);
        results.push(savedNode);
      }

      return results;
    });

    return res.status(200).json({
      success: true,
      message: `Committed ${createdNodes.length} BOM lines successfully.`,
      data: createdNodes,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/bom/vendor-po-export
 * Export component shortage list directly as vendor-ready PO CSV (LCSC, Robu.in, Mouser India)
 */
router.post("/vendor-po-export", async (req: Request, res: Response) => {
  try {
    const { shortages, vendor = "LCSC", itemId, quantity } = req.body;
    const targetVendor = (String(vendor).toUpperCase() || "LCSC") as "LCSC" | "ROBU" | "MOUSER";

    let shortageList = shortages;
    if ((!shortageList || shortageList.length === 0) && itemId) {
      const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
      const analysis = await BomService.analyzeProductionShortages(itemId, Number(quantity) || 1, orgId);
      shortageList = analysis.shortages;
    }

    if (!shortageList || shortageList.length === 0) {
      return res.status(200).json({
        success: true,
        csv: "",
        filename: `PO_${targetVendor}_EMPTY.csv`,
        count: 0,
      });
    }

    const csv = BomService.generateVendorPoCsv(shortageList, targetVendor);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `PO_${targetVendor}_${dateStr}.csv`;

    return res.status(200).json({
      success: true,
      csv,
      filename,
      count: shortageList.length,
      vendor: targetVendor,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
