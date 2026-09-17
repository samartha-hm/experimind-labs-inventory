import { Router, Request, Response } from "express";
import { BomService } from "../../services/BomService.ts";
import { AppDataSource } from "../../db.ts";
import { InventoryItem } from "../../entity/InventoryItem.ts";
import { StockLot } from "../../entity/StockLot.ts";

const router = Router();
const itemRepo = AppDataSource.getRepository(InventoryItem);
const lotRepo = AppDataSource.getRepository(StockLot);

/**
 * GET /api/v1/hardware/workbench
 * High-Density Component Workbench Query with Parametric Filters
 */
router.get("/workbench", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const {
      footprint,
      mountingType,
      mslRating,
      search,
      inStockOnly,
      category,
      limit = "100",
      offset = "0",
    } = req.query;

    const qb = itemRepo
      .createQueryBuilder("item")
      .where("item.organization_id = :orgId", { orgId });

    if (search) {
      qb.andWhere(
        "(LOWER(item.name) LIKE :q OR LOWER(item.sku) LIKE :q OR LOWER(item.mpn) LIKE :q OR LOWER(item.description) LIKE :q)",
        { q: `%${(search as string).toLowerCase()}%` }
      );
    }

    if (footprint) {
      qb.andWhere("item.package_footprint = :footprint", { footprint });
    }

    if (mountingType) {
      qb.andWhere("item.mounting_type = :mountingType", { mountingType });
    }

    if (mslRating) {
      qb.andWhere("item.msl_rating = :mslRating", { mslRating });
    }

    if (category) {
      qb.andWhere("item.category = :category", { category });
    }

    if (inStockOnly === "true") {
      qb.andWhere("item.quantity > 0");
    }

    qb.orderBy("item.updated_at", "DESC")
      .take(Math.min(parseInt(limit as string, 10) || 100, 500))
      .skip(parseInt(offset as string, 10) || 0);

    const [items, total] = await qb.getManyAndCount();

    // Fetch active reels and lots for these items
    const itemIds = items.map((i) => i.id);
    let lots: StockLot[] = [];
    if (itemIds.length > 0) {
      lots = await lotRepo
        .createQueryBuilder("lot")
        .where("lot.item_id IN (:...itemIds) AND lot.organization_id = :orgId AND lot.current_quantity > 0", {
          itemIds,
          orgId,
        })
        .orderBy("lot.created_at", "DESC")
        .getMany();
    }

    const lotsByItemId = new Map<string, StockLot[]>();
    for (const lot of lots) {
      const list = lotsByItemId.get(lot.item_id) || [];
      list.push(lot);
      lotsByItemId.set(lot.item_id, list);
    }

    const augmentedItems = items.map((item) => ({
      ...item,
      lots: lotsByItemId.get(item.id) || [],
      activeReelCount: (lotsByItemId.get(item.id) || []).filter((l) => l.package_type === "FULL_REEL").length,
    }));

    return res.status(200).json({
      success: true,
      total,
      data: augmentedItems,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/hardware/lots/:id/split
 * Split a master reel into a child cut-tape / sample lot
 */
router.post("/lots/:id/split", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const { id } = req.params;
    const { splitQuantity, targetPackageType = "CUT_TAPE", targetFeederSlot } = req.body;

    const result = await BomService.splitReelToCutTape({
      parentLotId: id,
      splitQuantity: Number(splitQuantity),
      targetPackageType,
      targetFeederSlot,
      organizationId: orgId,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully split ${splitQuantity} units into child lot ${result.childLot.lot_number}`,
      data: result,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/hardware/lots/:id/msl-action
 * Update Moisture Sensitivity Level (MSL) exposure state (OPEN / SEAL / BAKE)
 */
router.post("/lots/:id/msl-action", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const { id } = req.params;
    const { action, bakeTempC, bakeHours } = req.body;

    if (!["OPEN", "SEAL", "BAKE"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Action must be one of: OPEN, SEAL, BAKE",
      });
    }

    const updatedLot = await BomService.updateMslStatus({
      lotId: id,
      action,
      bakeTempC: bakeTempC ? Number(bakeTempC) : undefined,
      bakeHours: bakeHours ? Number(bakeHours) : undefined,
      organizationId: orgId,
      operatorId: (req.user as any)?.id,
    });

    return res.status(200).json({
      success: true,
      message: `MSL status updated to ${action}`,
      data: updatedLot,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
