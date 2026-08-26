import { AppDataSource } from "../db.ts";
import { PurchaseOrder } from "../entity/PurchaseOrder.ts";
import { PurchaseOrderLine } from "../entity/PurchaseOrderLine.ts";
import { SalesOrder } from "../entity/SalesOrder.ts";
import { SalesOrderLine } from "../entity/SalesOrderLine.ts";
import { WarehouseTransfer } from "../entity/WarehouseTransfer.ts";
import { WarehouseTransferLine } from "../entity/WarehouseTransferLine.ts";
import { CycleCount } from "../entity/CycleCount.ts";
import { CycleCountLine } from "../entity/CycleCountLine.ts";
import { InventoryItem } from "../entity/InventoryItem.ts";
import { StockLedgerService } from "./StockLedgerService.ts";

export interface POReceiptLineInput {
  lineId: string;
  itemId: string;
  receivingQty: number;
  putawayBin?: string;
  lotNumber?: string;
  notes?: string;
}

export interface SOFulfillmentLineInput {
  lineId: string;
  itemId: string;
  fulfillQty: number;
  sourceBin?: string;
}

export class WmsOperationService {
  private static poRepo = AppDataSource.getRepository(PurchaseOrder);
  private static poLineRepo = AppDataSource.getRepository(PurchaseOrderLine);
  private static soRepo = AppDataSource.getRepository(SalesOrder);
  private static soLineRepo = AppDataSource.getRepository(SalesOrderLine);
  private static transferRepo = AppDataSource.getRepository(WarehouseTransfer);
  private static transferLineRepo = AppDataSource.getRepository(WarehouseTransferLine);
  private static cycleCountRepo = AppDataSource.getRepository(CycleCount);
  private static cycleCountLineRepo = AppDataSource.getRepository(CycleCountLine);
  private static itemRepo = AppDataSource.getRepository(InventoryItem);

  // ==========================================
  // 1. INBOUND PO RECEIVING DOCK WORKFLOW
  // ==========================================
  public static async receivePurchaseOrder(
    poId: string,
    receiptLines: POReceiptLineInput[],
    actorName: string = "Receiving Clerk",
    orgId: string = "00000000-0000-0000-0000-000000000000"
  ) {
    const po = await this.poRepo.findOne({
      where: { id: poId },
      relations: ["lines"],
    });

    if (!po) {
      throw new Error(`Purchase Order ${poId} not found`);
    }

    let allFullyReceived = true;

    for (const receipt of receiptLines) {
      if (receipt.receivingQty <= 0) continue;

      const poLine = po.lines?.find((l) => l.id === receipt.lineId || l.inventory_item_id === receipt.itemId);
      if (!poLine) continue;

      const prevRec = Number(poLine.qty_received || 0);
      const newRec = prevRec + Number(receipt.receivingQty);
      poLine.qty_received = newRec;
      await this.poLineRepo.save(poLine);

      if (newRec < Number(poLine.qty_ordered)) {
        allFullyReceived = false;
      }

      // Look up item metadata
      const invItem = await this.itemRepo.findOne({ where: { id: poLine.inventory_item_id } });

      // Post atomic movement to Immutable Stock Ledger
      await StockLedgerService.postEntry({
        organizationId: orgId,
        itemId: poLine.inventory_item_id,
        itemName: invItem?.name || receipt.itemId,
        itemSku: invItem?.sku || receipt.itemId,
        binLocation: receipt.putawayBin || undefined,
        lotNumber: receipt.lotNumber,
        qtyDelta: Number(receipt.receivingQty),
        unitCost: Number(poLine.unit_cost || 0),
        transactionType: "PO_RECEIPT",
        referenceType: "purchase_order",
        referenceId: po.po_number || po.id,
        reasonCode: `PO Receiving (${receipt.receivingQty} units)`,
        notes: receipt.notes || `Received at dock against PO ${po.po_number}`,
        actorName,
      });
    }

    // Check if any other lines in PO are still pending
    for (const line of po.lines || []) {
      if (Number(line.qty_received || 0) < Number(line.qty_ordered)) {
        allFullyReceived = false;
        break;
      }
    }

    po.status = allFullyReceived ? "received" : "sent";
    await this.poRepo.save(po);

    return po;
  }

  // ==========================================
  // 2. OUTBOUND SO PICK / PACK / SHIP PIPELINE
  // ==========================================
  public static async fulfillSalesOrder(
    soId: string,
    fulfillmentLines: SOFulfillmentLineInput[],
    carrier?: string,
    trackingNumber?: string,
    actorName: string = "Fulfillment Dispatcher",
    orgId: string = "00000000-0000-0000-0000-000000000000"
  ) {
    const so = await this.soRepo.findOne({
      where: { id: soId },
      relations: ["lines"],
    });

    if (!so) {
      throw new Error(`Sales Order ${soId} not found`);
    }

    for (const fl of fulfillmentLines) {
      if (fl.fulfillQty <= 0) continue;

      const soLine = so.lines?.find((l) => l.id === fl.lineId || l.inventory_item_id === fl.itemId);
      if (!soLine) continue;

      soLine.qty_shipped = (Number(soLine.qty_shipped) || 0) + Number(fl.fulfillQty);
      await this.soLineRepo.save(soLine);

      const invItem = await this.itemRepo.findOne({ where: { id: soLine.inventory_item_id } });

      // Post atomic deduction to Stock Ledger
      await StockLedgerService.postEntry({
        organizationId: orgId,
        itemId: soLine.inventory_item_id,
        itemName: invItem?.name || fl.itemId,
        itemSku: invItem?.sku || fl.itemId,
        binLocation: fl.sourceBin || undefined,
        qtyDelta: -Math.abs(Number(fl.fulfillQty)),
        unitCost: Number(soLine.unit_price || 0),
        transactionType: "SO_SHIPMENT",
        referenceType: "sales_order",
        referenceId: so.so_number || so.id,
        reasonCode: `SO Pick & Dispatch (${fl.fulfillQty} units)`,
        notes: `Shipped via ${carrier || "Courier"} tracking #${trackingNumber || "N/A"}`,
        actorName,
      });
    }

    so.status = "shipped";
    await this.soRepo.save(so);

    return so;
  }

  // ==========================================
  // 3. MULTI-STAGE STOCK TRANSFERS
  // ==========================================
  public static async createTransfer(data: {
    organizationId?: string;
    sourceWarehouse: string;
    sourceBin?: string;
    destinationWarehouse: string;
    destinationBin?: string;
    notes?: string;
    createdByName?: string;
    lines: Array<{
      itemId: string;
      itemName: string;
      itemSku: string;
      requestedQty: number;
      sourceBin?: string;
      destinationBin?: string;
    }>;
  }) {
    const transferCount = await this.transferRepo.count();
    const transferNumber = `TR-${new Date().getFullYear()}-${String(transferCount + 1).padStart(4, "0")}`;

    const transfer = this.transferRepo.create({
      organization_id: data.organizationId || "00000000-0000-0000-0000-000000000000",
      transfer_number: transferNumber,
      source_warehouse_code: data.sourceWarehouse,
      source_bin: data.sourceBin,
      destination_warehouse_code: data.destinationWarehouse,
      destination_bin: data.destinationBin,
      status: "draft",
      notes: data.notes,
      created_by_name: data.createdByName || "Warehouse Coordinator",
      lines: data.lines.map((l) =>
        this.transferLineRepo.create({
          item_id: l.itemId,
          item_name: l.itemName,
          item_sku: l.itemSku,
          requested_qty: l.requestedQty,
          received_qty: 0,
          source_bin: l.sourceBin || data.sourceBin,
          destination_bin: l.destinationBin || data.destinationBin,
        })
      ),
    });

    return await this.transferRepo.save(transfer);
  }

  public static async dispatchTransfer(
    transferId: string,
    carrier?: string,
    trackingNumber?: string,
    actorName: string = "Dispatcher"
  ) {
    const transfer = await this.transferRepo.findOne({
      where: { id: transferId },
      relations: ["lines"],
    });

    if (!transfer) throw new Error("Transfer not found");
    if (transfer.status !== "draft") throw new Error(`Cannot dispatch transfer in '${transfer.status}' status`);

    // Deduct stock from source bin and log ledger TRANSFER_OUT
    for (const line of transfer.lines || []) {
      await StockLedgerService.postEntry({
        organizationId: transfer.organization_id,
        itemId: line.item_id,
        itemName: line.item_name,
        itemSku: line.item_sku,
        binLocation: line.source_bin || transfer.source_bin,
        qtyDelta: -Math.abs(Number(line.requested_qty)),
        transactionType: "TRANSFER_OUT",
        referenceType: "stock_transfer",
        referenceId: transfer.transfer_number,
        reasonCode: `Transfer Out to ${transfer.destination_warehouse_code}`,
        notes: `In-transit via ${carrier || "Internal Transport"}`,
        actorName,
      });
    }

    transfer.status = "in_transit";
    transfer.carrier = carrier;
    transfer.tracking_number = trackingNumber;
    transfer.dispatched_at = new Date();
    return await this.transferRepo.save(transfer);
  }

  public static async receiveTransfer(
    transferId: string,
    receiptLines?: Array<{ lineId: string; receivedQty: number; destinationBin?: string }>,
    actorName: string = "Receiving Operator"
  ) {
    const transfer = await this.transferRepo.findOne({
      where: { id: transferId },
      relations: ["lines"],
    });

    if (!transfer) throw new Error("Transfer not found");
    if (transfer.status !== "in_transit") throw new Error("Transfer must be in_transit to be received");

    for (const line of transfer.lines || []) {
      const match = receiptLines?.find((r) => r.lineId === line.id);
      const qtyToReceive = match ? match.receivedQty : Number(line.requested_qty);
      const destBin = match?.destinationBin || line.destination_bin || transfer.destination_bin;

      line.received_qty = qtyToReceive;
      await this.transferLineRepo.save(line);

      // Add stock to destination bin and log ledger TRANSFER_IN
      await StockLedgerService.postEntry({
        organizationId: transfer.organization_id,
        itemId: line.item_id,
        itemName: line.item_name,
        itemSku: line.item_sku,
        binLocation: destBin,
        qtyDelta: Math.abs(qtyToReceive),
        transactionType: "TRANSFER_IN",
        referenceType: "stock_transfer",
        referenceId: transfer.transfer_number,
        reasonCode: `Transfer In from ${transfer.source_warehouse_code}`,
        notes: `Putaway in bin ${destBin || "General Bay"}`,
        actorName,
      });
    }

    transfer.status = "received";
    transfer.received_at = new Date();
    return await this.transferRepo.save(transfer);
  }

  // ==========================================
  // 4. ABC CYCLE COUNTING & PHYSICAL AUDITS
  // ==========================================
  public static async createCycleCount(data: {
    organizationId?: string;
    title: string;
    warehouseCode?: string;
    targetZoneOrCategory?: string;
    isBlindCount?: boolean;
    assignedAuditorName?: string;
    notes?: string;
  }) {
    const orgId = data.organizationId || "00000000-0000-0000-0000-000000000000";
    const auditCount = await this.cycleCountRepo.count();
    const auditNumber = `CC-${new Date().getFullYear()}-${String(auditCount + 1).padStart(4, "0")}`;

    // Select inventory items for this count
    let itemsQuery = this.itemRepo.createQueryBuilder("i").where("i.organization_id = :orgId", { orgId });
    if (data.targetZoneOrCategory && data.targetZoneOrCategory !== "ALL") {
      itemsQuery.andWhere("(i.category = :target OR i.bin_location LIKE :targetLike)", {
        target: data.targetZoneOrCategory,
        targetLike: `%${data.targetZoneOrCategory}%`,
      });
    }

    const items = await itemsQuery.getMany();

    const countLines: CycleCountLine[] = items.map((item) => {
      const line = new CycleCountLine();
      line.item_id = item.id;
      line.item_name = item.name;
      line.item_sku = item.sku;
      line.bin_location = item.bin_location;
      line.system_qty = Number(item.quantity || 0);
      line.unit_cost = Number(item.base_price || 0);
      line.counted_qty = undefined;
      line.variance_qty = 0;
      line.variance_value = 0;
      return line;
    });

    const cycleCount = this.cycleCountRepo.create({
      organization_id: orgId,
      audit_number: auditNumber,
      title: data.title || "Periodic Cycle Audit",
      warehouse_code: data.warehouseCode || "WH-MAIN-01",
      target_zone_or_category: data.targetZoneOrCategory || "All Categories",
      status: "in_progress",
      is_blind_count: data.isBlindCount !== undefined ? data.isBlindCount : true,
      assigned_auditor_name: data.assignedAuditorName || "Warehouse Lead",
      notes: data.notes,
      lines: countLines,
    });

    return await this.cycleCountRepo.save(cycleCount);
  }

  public static async submitCountResults(
    countId: string,
    counts: Array<{ lineId: string; countedQty: number; reason?: string }>
  ) {
    const cycleCount = await this.cycleCountRepo.findOne({
      where: { id: countId },
      relations: ["lines"],
    });

    if (!cycleCount) throw new Error("Cycle count audit not found");

    let totalVarianceVal = 0;

    for (const line of cycleCount.lines || []) {
      const recorded = counts.find((c) => c.lineId === line.id);
      if (recorded && recorded.countedQty !== undefined) {
        line.counted_qty = recorded.countedQty;
        line.variance_qty = Number(line.counted_qty) - Number(line.system_qty);
        line.variance_value = Number((line.variance_qty * Number(line.unit_cost || 0)).toFixed(2));
        line.variance_reason = recorded.reason || (line.variance_qty === 0 ? "Exact Match" : "Physical Discrepancy");
        totalVarianceVal += line.variance_value;
        await this.cycleCountLineRepo.save(line);
      }
    }

    cycleCount.total_variance_value = Number(totalVarianceVal.toFixed(2));
    cycleCount.status = "pending_review";
    return await this.cycleCountRepo.save(cycleCount);
  }

  public static async approveAndPostVariance(
    countId: string,
    approverName: string = "Operations Manager"
  ) {
    const cycleCount = await this.cycleCountRepo.findOne({
      where: { id: countId },
      relations: ["lines"],
    });

    if (!cycleCount) throw new Error("Cycle count audit not found");
    if (cycleCount.status !== "pending_review") throw new Error("Cycle count must be pending_review before approval");

    for (const line of cycleCount.lines || []) {
      if (line.counted_qty !== undefined && Number(line.variance_qty) !== 0) {
        // Adjust inventory ledger with the exact variance delta
        await StockLedgerService.postEntry({
          organizationId: cycleCount.organization_id,
          itemId: line.item_id,
          itemName: line.item_name,
          itemSku: line.item_sku,
          binLocation: line.bin_location,
          qtyDelta: Number(line.variance_qty),
          unitCost: Number(line.unit_cost),
          transactionType: "CYCLE_COUNT_VARIANCE",
          referenceType: "cycle_count",
          referenceId: cycleCount.audit_number,
          reasonCode: `Cycle Audit Discrepancy: ${line.variance_reason || "Stock Reconciled"}`,
          notes: `Audited by ${cycleCount.assigned_auditor_name}, Approved by ${approverName}`,
          actorName: approverName,
        });
      }
    }

    cycleCount.status = "approved_posted";
    cycleCount.approved_by_name = approverName;
    cycleCount.completed_at = new Date();
    return await this.cycleCountRepo.save(cycleCount);
  }

  public static async listTransfers(orgId: string = "00000000-0000-0000-0000-000000000000", status?: string) {
    const where: any = { organization_id: orgId };
    if (status && status !== "ALL") where.status = status;
    return await this.transferRepo.find({
      where,
      relations: ["lines"],
      order: { created_at: "DESC" },
    });
  }

  public static async listCycleCounts(orgId: string = "00000000-0000-0000-0000-000000000000") {
    return await this.cycleCountRepo.find({
      where: { organization_id: orgId },
      relations: ["lines"],
      order: { created_at: "DESC" },
    });
  }
}

function notesTracking(carrier?: string, trackingNumber?: string): string {
  if (!carrier && !trackingNumber) return "";
  return `Carrier: ${carrier || "Standard"} | Tracking: ${trackingNumber || "N/A"}`;
}
