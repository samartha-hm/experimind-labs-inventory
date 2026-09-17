import { Router, Request, Response } from "express";
import { AppDataSource } from "../../db.ts";
import { SerialNumber, SerialStatus } from "../../entity/SerialNumber.ts";
import { InventoryItem } from "../../entity/InventoryItem.ts";
import { SerializationService, FLAGSHIP_PRODUCTS } from "../../services/SerializationService.ts";

const router = Router();
const serialRepo = AppDataSource.getRepository(SerialNumber);
const itemRepo = AppDataSource.getRepository(InventoryItem);

// List serial numbers with flexible search & filtering
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId;
    const { itemId, status, warehouseId, q } = req.query;

    const queryBuilder = serialRepo
      .createQueryBuilder("serial")
      .leftJoinAndSelect("serial.inventoryItem", "item");

    if (orgId) {
      queryBuilder.andWhere("serial.organizationId = :orgId", { orgId });
    }
    if (itemId) {
      queryBuilder.andWhere("serial.inventoryItemId = :itemId", { itemId });
    }
    if (status) {
      queryBuilder.andWhere("serial.status = :status", { status });
    }
    if (warehouseId) {
      queryBuilder.andWhere("serial.warehouseId = :warehouseId", { warehouseId });
    }
    if (q) {
      queryBuilder.andWhere(
        "(serial.serialNumber ILIKE :q OR item.name ILIKE :q OR serial.batchNumber ILIKE :q)",
        { q: `%${q}%` }
      );
    }

    queryBuilder.orderBy("serial.createdAt", "DESC");
    const serials = await queryBuilder.getMany();

    res.json({ success: true, data: serials });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Single serial number lookup (for barcode scanning & pedigree audit)
router.get("/lookup/:serialNumber", async (req: Request, res: Response): Promise<void> => {
  try {
    const { serialNumber } = req.params;
    const orgId = (req as any).orgId || (req as any).organizationId;

    const serial = await serialRepo.findOne({
      where: {
        serialNumber,
        ...(orgId ? { organizationId: orgId } : {}),
      },
      relations: ["inventoryItem"],
    });

    if (!serial) {
      res.json({ success: true, data: null });
      return;
    }

    res.json({ success: true, data: serial });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk register serial numbers
router.post("/bulk", async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId;
    const { serialNumbers, inventoryItemId, warehouseId, binId, batchNumber, unitCost, warrantyMonths, notes } = req.body;

    if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      res.status(400).json({ success: false, message: "serialNumbers array is required" });
      return;
    }
    if (!inventoryItemId) {
      res.status(400).json({ success: false, message: "inventoryItemId is required" });
      return;
    }

    const item = await itemRepo.findOne({ where: { id: inventoryItemId } });
    if (!item) {
      res.status(404).json({ success: false, message: "Inventory item not found" });
      return;
    }

    let warrantyExpiryDate: Date | undefined;
    if (warrantyMonths && Number(warrantyMonths) > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() + Number(warrantyMonths));
      warrantyExpiryDate = d;
    }

    const createdSerials: SerialNumber[] = [];

    for (const rawSerial of serialNumbers) {
      const serialStr = String(rawSerial).trim();
      if (!serialStr) continue;

      // Check duplicate in org
      const existing = await serialRepo.findOne({
        where: { serialNumber: serialStr, ...(orgId ? { organizationId: orgId } : {}) },
      });

      if (existing) {
        continue; // Skip already registered
      }

      const newSerial = serialRepo.create({
        serialNumber: serialStr,
        inventoryItemId,
        warehouseId: warehouseId || "WH-MAIN-01",
        binId: binId || item.bin_location || "A-01",
        status: "IN_STOCK" as SerialStatus,
        batchNumber: batchNumber || item.batch_number,
        unitCost: unitCost !== undefined ? Number(unitCost) : Number(item.base_price || 0),
        warrantyExpiry: warrantyExpiryDate,
        notes: notes || `Registered via bulk intake`,
        history: [
          {
            timestamp: new Date().toISOString(),
            action: "INITIAL_REGISTRATION",
            status: "IN_STOCK",
            user: (req as any).user?.name || "System Admin",
            location: `${warehouseId || "WH-MAIN-01"} / ${binId || "A-01"}`,
            notes: "Initial serialized intake and verification",
          },
        ],
        organizationId: orgId,
      });

      const saved = await serialRepo.save(newSerial);
      createdSerials.push(saved);
    }

    res.status(201).json({
      success: true,
      registeredCount: createdSerials.length,
      data: createdSerials,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update serial number lifecycle status
router.patch("/:id/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = (req as any).orgId || (req as any).organizationId;
    const { status, location, notes, referenceId } = req.body;

    const serial = await serialRepo.findOne({
      where: { id, ...(orgId ? { organizationId: orgId } : {}) },
      relations: ["inventoryItem"],
    });

    if (!serial) {
      res.status(404).json({ success: false, message: "Serial number record not found" });
      return;
    }

    const previousStatus = serial.status;
    serial.status = status as SerialStatus;
    if (location) {
      serial.binId = location;
    }
    if (notes) {
      serial.notes = notes;
    }

    const historyEntry = {
      timestamp: new Date().toISOString(),
      action: `STATUS_CHANGE_${previousStatus}_TO_${status}`,
      status: status as SerialStatus,
      user: (req as any).user?.name || "Warehouse Staff",
      location: location || serial.binId || "Warehouse Floor",
      referenceId: referenceId || undefined,
      notes: notes || `Status updated from ${previousStatus} to ${status}`,
    };

    serial.history = [...(serial.history || []), historyEntry];

    const saved = await serialRepo.save(serial);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete serial number
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = (req as any).orgId || (req as any).organizationId;

    const serial = await serialRepo.findOne({
      where: { id, ...(orgId ? { organizationId: orgId } : {}) },
    });

    if (!serial) {
      res.status(404).json({ success: false, message: "Serial number record not found" });
      return;
    }

    await serialRepo.remove(serial);
    res.json({ success: true, message: "Serial number removed" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/serial-numbers/generate-standard
 * Generate standardized serial numbers (EXP-[CODE]-26-XXXX) for flagship products
 */
router.post("/generate-standard", async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const { productCode = "ANB", count = 1, year = 26 } = req.body;

    const startSeq = await SerializationService.getNextSequenceNumber(productCode, Number(year), orgId);
    const numToGen = Math.max(1, Math.min(1000, Number(count) || 1));
    const generated: string[] = [];

    for (let i = 0; i < numToGen; i++) {
      generated.push(SerializationService.generateSerial(productCode, startSeq + i, Number(year)));
    }

    res.json({
      success: true,
      productCode: productCode.toUpperCase(),
      productInfo: FLAGSHIP_PRODUCTS[productCode.toUpperCase()] || null,
      count: generated.length,
      serialNumbers: generated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/serial-numbers/pair-jig
 * Pair programming jig telemetry (UID, MAC) with signed Serial QR & thermal label format
 */
router.post("/pair-jig", async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = (req as any).orgId || (req as any).organizationId || "00000000-0000-0000-0000-000000000000";
    const {
      serialNumber,
      chipUid,
      macAddress,
      firmwareVersion,
      qcPassed = true,
      operatorId,
      inventoryItemId,
      warehouseId,
      binId,
    } = req.body;

    if (!serialNumber) {
      res.status(400).json({ success: false, message: "serialNumber is required" });
      return;
    }

    const pairing = SerializationService.pairJigDevice({
      serialNumber,
      chipUid,
      macAddress,
      firmwareVersion,
      qcPassed: Boolean(qcPassed),
      operatorId,
    });

    // Look up or create serial number record
    let serial = await serialRepo.findOne({
      where: { serialNumber, organizationId: orgId },
    });

    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: qcPassed ? "QC_PASSED_JIG_PAIRED" : "QC_FAILED_JIG_PAIRED",
      status: qcPassed ? ("IN_STOCK" as SerialStatus) : ("SCRAPPED" as SerialStatus),
      user: operatorId || (req as any).user?.name || "Jig Auto-Flash",
      location: binId || "Testing & Programming Jig",
      referenceId: chipUid || macAddress,
      notes: `Flashed firmware: ${firmwareVersion || "v1.0.0"} | Chip UID: ${chipUid || "N/A"} | MAC: ${pairing.macAddress || "N/A"} | Signature: ${pairing.signature}`,
    };

    if (serial) {
      serial.status = qcPassed ? "IN_STOCK" : "SCRAPPED";
      serial.history = [...(serial.history || []), auditEntry];
      serial.notes = `UID: ${chipUid || "N/A"} | MAC: ${pairing.macAddress || "N/A"}`;
      await serialRepo.save(serial);
    } else if (inventoryItemId) {
      serial = serialRepo.create({
        organizationId: orgId,
        inventoryItemId,
        serialNumber,
        status: qcPassed ? "IN_STOCK" : "SCRAPPED",
        warehouseId: warehouseId || undefined,
        binId: binId || "QC-STAGING",
        notes: `UID: ${chipUid || "N/A"} | MAC: ${pairing.macAddress || "N/A"}`,
        history: [auditEntry],
      });
      await serialRepo.save(serial);
    }

    res.json({
      success: true,
      data: {
        serial,
        pairing,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
