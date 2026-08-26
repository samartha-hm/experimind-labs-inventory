import { Router, Request, Response } from "express";
import { AppDataSource } from "../../db.ts";
import { PhysicalRack } from "../../entity/PhysicalRack.ts";
import { FloorPlanLayout } from "../../entity/FloorPlanLayout.ts";
import { CustomElementType } from "../../entity/CustomElementType.ts";

const router = Router();
const rackRepo = AppDataSource.getRepository(PhysicalRack);
const floorPlanRepo = AppDataSource.getRepository(FloorPlanLayout);
const elementTypeRepo = AppDataSource.getRepository(CustomElementType);

// =========================================================================
// 1. PHYSICAL RACKS (VisualStockRoom Storage Matrix)
// =========================================================================

// List physical racks
router.get("/physical-racks", async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId;
    const warehouseCode = req.query.warehouseCode as string;

    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (warehouseCode) where.warehouseCode = warehouseCode;

    const racks = await rackRepo.find({
      where,
      order: { code: "ASC" },
    });

    res.json({ success: true, data: racks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk upsert / save physical racks
router.post("/physical-racks/bulk", async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId;
    const { racks } = req.body;

    if (!Array.isArray(racks)) {
      res.status(400).json({ success: false, message: "Expected racks to be an array" });
      return;
    }

    const savedRacks: PhysicalRack[] = [];
    for (const r of racks) {
      let existing = await rackRepo.findOne({
        where: { code: r.code, ...(orgId ? { organizationId: orgId } : {}) },
      });

      if (!existing) {
        existing = rackRepo.create({
          code: r.code,
          name: r.name || r.code,
          zone: r.zone || "Zone A",
          type: r.type || "steel_shelf",
          warehouseCode: r.warehouseCode || "WH-MAIN-01",
          shelves: r.shelves || [],
          gridConfig: r.gridConfig,
          organizationId: orgId,
        });
      } else {
        existing.name = r.name ?? existing.name;
        existing.zone = r.zone ?? existing.zone;
        existing.type = r.type ?? existing.type;
        existing.warehouseCode = r.warehouseCode ?? existing.warehouseCode;
        existing.shelves = r.shelves ?? existing.shelves;
        existing.gridConfig = r.gridConfig ?? existing.gridConfig;
      }

      const saved = await rackRepo.save(existing);
      savedRacks.push(saved);
    }

    res.json({ success: true, data: savedRacks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create single physical rack
router.post("/physical-racks", async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId;
    const { code, name, zone, type, warehouseCode, shelves, gridConfig } = req.body;

    if (!code || !name) {
      res.status(400).json({ success: false, message: "Code and Name are required" });
      return;
    }

    const rack = rackRepo.create({
      code,
      name,
      zone: zone || "Zone A",
      type: type || "steel_shelf",
      warehouseCode: warehouseCode || "WH-MAIN-01",
      shelves: shelves || [],
      gridConfig,
      organizationId: orgId,
    });

    const saved = await rackRepo.save(rack);
    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update single physical rack
router.put("/physical-racks/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = (req as any).orgId || (req as any).organizationId;
    const updates = req.body;

    const rack = await rackRepo.findOne({
      where: { id, ...(orgId ? { organizationId: orgId } : {}) },
    });

    if (!rack) {
      res.status(404).json({ success: false, message: "Physical rack not found" });
      return;
    }

    Object.assign(rack, updates);
    const saved = await rackRepo.save(rack);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete physical rack
router.delete("/physical-racks/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = (req as any).orgId || (req as any).organizationId;

    const rack = await rackRepo.findOne({
      where: { id, ...(orgId ? { organizationId: orgId } : {}) },
    });

    if (!rack) {
      res.status(404).json({ success: false, message: "Physical rack not found" });
      return;
    }

    await rackRepo.remove(rack);
    res.json({ success: true, message: "Physical rack deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. 2D FLOOR PLAN LAYOUTS (FloorPlanDesignerTab)
// =========================================================================

// Get floor plan layout for warehouse
router.get("/floorplan/:warehouseCode", async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouseCode } = req.params;
    const orgId = (req as any).orgId || (req as any).organizationId;

    const layout = await floorPlanRepo.findOne({
      where: { warehouseCode, ...(orgId ? { organizationId: orgId } : {}) },
    });

    res.json({
      success: true,
      data: layout || { warehouseCode, elements: [], templates: [] },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Save / Upsert floor plan layout
router.post("/floorplan/:warehouseCode", async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouseCode } = req.params;
    const orgId = (req as any).orgId || (req as any).organizationId;
    const { elements, templates } = req.body;

    let layout = await floorPlanRepo.findOne({
      where: { warehouseCode, ...(orgId ? { organizationId: orgId } : {}) },
    });

    if (!layout) {
      layout = floorPlanRepo.create({
        warehouseCode,
        elements: elements || [],
        templates: templates || [],
        organizationId: orgId,
      });
    } else {
      if (elements !== undefined) layout.elements = elements;
      if (templates !== undefined) layout.templates = templates;
    }

    const saved = await floorPlanRepo.save(layout);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 3. CUSTOM ELEMENT TYPES (FloorPlan Custom Categories)
// =========================================================================

// List custom element types
router.get("/element-types", async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId;
    const types = await elementTypeRepo.find({
      where: orgId ? { organizationId: orgId } : {},
      order: { createdAt: "ASC" },
    });
    res.json({ success: true, data: types });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create custom element type
router.post("/element-types", async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId;
    const { key, label, iconEmoji, defaultColor } = req.body;

    if (!key || !label) {
      res.status(400).json({ success: false, message: "Key and Label are required" });
      return;
    }

    const elemType = elementTypeRepo.create({
      key,
      label,
      iconEmoji: iconEmoji || "📦",
      defaultColor: defaultColor || "#3b82f6",
      organizationId: orgId,
    });

    const saved = await elementTypeRepo.save(elemType);
    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
