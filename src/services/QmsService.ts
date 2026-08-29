import { AppDataSource } from "../db.ts";
import { QualityInspection, InspectionStatus } from "../entity/QualityInspection.ts";
import { Deviation, DeviationSeverity, DeviationStatus, DeviationDisposition } from "../entity/Deviation.ts";
import { Capa, CapaStatus } from "../entity/Capa.ts";
import { ChangeRequest, ChangeStatus } from "../entity/ChangeRequest.ts";
import { Rma, RmaStatus } from "../entity/Rma.ts";
import { RmaLine, RmaDisposition } from "../entity/RmaLine.ts";
import { InventoryItem } from "../entity/InventoryItem.ts";
import { StockLedgerService } from "./StockLedgerService.ts";
import { AuditService } from "./AuditService.ts";
import crypto from "crypto";

export class QmsService {
  private static inspectionRepo = AppDataSource.getRepository(QualityInspection);
  private static deviationRepo = AppDataSource.getRepository(Deviation);
  private static capaRepo = AppDataSource.getRepository(Capa);
  private static changeRepo = AppDataSource.getRepository(ChangeRequest);
  private static rmaRepo = AppDataSource.getRepository(Rma);
  private static rmaLineRepo = AppDataSource.getRepository(RmaLine);
  private static itemRepo = AppDataSource.getRepository(InventoryItem);

  // ==========================================
  // 1. QUALITY INSPECTION
  // ==========================================
  public static async createInspection(data: {
    organizationId?: string;
    itemId: string;
    lotNumber?: string;
    purchaseOrderId?: string;
    batchQuantity: number;
    sampleSize?: number;
    inspectorName?: string;
    inspectorUserId?: string;
  }): Promise<QualityInspection> {
    const orgId = data.organizationId || "00000000-0000-0000-0000-000000000000";
    const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
    const inspNum = `QC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}-${rand}`;

    const inspection = this.inspectionRepo.create({
      organization_id: orgId,
      inspection_number: inspNum,
      item_id: data.itemId,
      lot_number: data.lotNumber,
      purchase_order_id: data.purchaseOrderId,
      batch_quantity: data.batchQuantity,
      sample_size_inspected: data.sampleSize || Math.min(data.batchQuantity, 10),
      defect_count: 0,
      status: "PENDING_INSPECTION",
      inspector_name: data.inspectorName,
      inspector_user_id: data.inspectorUserId,
      checklist_results: [],
    });

    return await this.inspectionRepo.save(inspection);
  }

  public static async recordInspectionResult(
    inspectionId: string,
    results: {
      status: InspectionStatus;
      checklist: Array<{ parameter: string; specification: string; measured_value: string; pass: boolean }>;
      defectCount: number;
      dispositionNotes?: string;
      inspectorName?: string;
    }
  ): Promise<QualityInspection> {
    const inspection = await this.inspectionRepo.findOne({
      where: { id: inspectionId },
      relations: ["item"],
    });

    if (!inspection) throw new Error("Quality inspection record not found");

    inspection.checklist_results = results.checklist;
    inspection.defect_count = results.defectCount;
    inspection.status = results.status;
    inspection.disposition_notes = results.dispositionNotes;
    if (results.inspectorName) inspection.inspector_name = results.inspectorName;
    inspection.inspected_at = new Date();

    // If inspection failed, automatically trigger a Deviation (NCR)
    if (results.status === "FAILED") {
      const deviation = await this.createDeviation({
        organizationId: inspection.organization_id,
        title: `Inbound Quality Inspection Failure: ${inspection.item?.name || "Material"}`,
        severity: "MAJOR",
        description: `Inspection ${inspection.inspection_number} failed with ${results.defectCount} defect(s). Notes: ${results.dispositionNotes || "None"}`,
        sourceEventType: "INSPECTION_FAILURE",
        sourceReferenceId: inspection.inspection_number,
        itemId: inspection.item_id,
        lotNumber: inspection.lot_number,
        affectedQuantity: inspection.batch_quantity,
        reportedByName: inspection.inspector_name || "Quality Inspector",
      });
      inspection.deviation_id = deviation.id;
    }

    return await this.inspectionRepo.save(inspection);
  }

  public static async listInspections(orgId: string = "00000000-0000-0000-0000-000000000000") {
    return await this.inspectionRepo.find({
      where: { organization_id: orgId },
      relations: ["item"],
      order: { created_at: "DESC" },
    });
  }

  // ==========================================
  // 2. DEVIATIONS (NCR - NON-CONFORMANCE)
  // ==========================================
  public static async createDeviation(data: {
    organizationId?: string;
    title: string;
    severity?: DeviationSeverity;
    description: string;
    sourceEventType?: string;
    sourceReferenceId?: string;
    itemId?: string;
    lotNumber?: string;
    affectedQuantity?: number;
    immediateContainmentAction?: string;
    reportedByName?: string;
  }): Promise<Deviation> {
    const orgId = data.organizationId || "00000000-0000-0000-0000-000000000000";
    const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
    const devNum = `NCR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}-${rand}`;

    const dev = this.deviationRepo.create({
      organization_id: orgId,
      deviation_number: devNum,
      title: data.title,
      severity: data.severity || "MAJOR",
      status: "OPEN",
      description: data.description,
      source_event_type: data.sourceEventType,
      source_reference_id: data.sourceReferenceId,
      item_id: data.itemId,
      lot_number: data.lotNumber,
      affected_quantity: data.affectedQuantity || 0,
      immediate_containment_action: data.immediateContainmentAction,
      disposition: "PENDING",
      reported_by_name: data.reportedByName || "Floor Operator",
    });

    return await this.deviationRepo.save(dev);
  }

  public static async updateDeviation(
    deviationId: string,
    updates: {
      status?: DeviationStatus;
      rootCauseAnalysis?: string;
      disposition?: DeviationDisposition;
      dispositionRationale?: string;
      investigatedByName?: string;
      approvedByName?: string;
    }
  ): Promise<Deviation> {
    const dev = await this.deviationRepo.findOneBy({ id: deviationId });
    if (!dev) throw new Error("Deviation record not found");

    if (updates.status) dev.status = updates.status;
    if (updates.rootCauseAnalysis) dev.root_cause_analysis = updates.rootCauseAnalysis;
    if (updates.disposition) dev.disposition = updates.disposition;
    if (updates.dispositionRationale) dev.disposition_rationale = updates.dispositionRationale;
    if (updates.investigatedByName) dev.investigated_by_name = updates.investigatedByName;
    if (updates.approvedByName) dev.approved_by_name = updates.approvedByName;
    if (updates.status === "CLOSED") dev.closed_at = new Date();

    return await this.deviationRepo.save(dev);
  }

  public static async listDeviations(orgId: string = "00000000-0000-0000-0000-000000000000") {
    return await this.deviationRepo.find({
      where: { organization_id: orgId },
      order: { created_at: "DESC" },
    });
  }

  // ==========================================
  // 3. CAPA (CORRECTIVE & PREVENTIVE ACTION)
  // ==========================================
  public static async createCapa(data: {
    organizationId?: string;
    title: string;
    problemStatement: string;
    sourceDeviationId?: string;
    leadInvestigatorName?: string;
    dueDate?: Date;
  }): Promise<Capa> {
    const orgId = data.organizationId || "00000000-0000-0000-0000-000000000000";
    const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
    const capaNum = `CAPA-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}-${rand}`;

    const capa = this.capaRepo.create({
      organization_id: orgId,
      capa_number: capaNum,
      title: data.title,
      status: "INITIATED",
      problem_statement: data.problemStatement,
      source_deviation_id: data.sourceDeviationId,
      lead_investigator_name: data.leadInvestigatorName || "Quality Lead",
      due_date: data.dueDate,
      root_cause: "",
      corrective_actions: [],
      preventive_actions: [],
    });

    return await this.capaRepo.save(capa);
  }

  public static async updateCapa(
    capaId: string,
    updates: {
      status?: CapaStatus;
      fiveWhysAnalysis?: string;
      rootCause?: string;
      correctiveActions?: any[];
      preventiveActions?: any[];
      effectivenessCriteria?: string;
      effectivenessVerificationResults?: string;
      isEffective?: boolean;
      qaApproverName?: string;
    }
  ): Promise<Capa> {
    const capa = await this.capaRepo.findOneBy({ id: capaId });
    if (!capa) throw new Error("CAPA record not found");

    if (updates.status) capa.status = updates.status;
    if (updates.fiveWhysAnalysis) capa.five_whys_analysis = updates.fiveWhysAnalysis;
    if (updates.rootCause) capa.root_cause = updates.rootCause;
    if (updates.correctiveActions) capa.corrective_actions = updates.correctiveActions;
    if (updates.preventiveActions) capa.preventive_actions = updates.preventiveActions;
    if (updates.effectivenessCriteria) capa.effectiveness_criteria = updates.effectivenessCriteria;
    if (updates.effectivenessVerificationResults) capa.effectiveness_verification_results = updates.effectivenessVerificationResults;
    if (updates.isEffective !== undefined) capa.is_effective = updates.isEffective;
    if (updates.qaApproverName) capa.qa_approver_name = updates.qaApproverName;
    if (updates.status === "CLOSED") capa.closed_at = new Date();

    return await this.capaRepo.save(capa);
  }

  public static async listCapas(orgId: string = "00000000-0000-0000-0000-000000000000") {
    return await this.capaRepo.find({
      where: { organization_id: orgId },
      order: { created_at: "DESC" },
    });
  }

  // ==========================================
  // 4. ENGINEERING CHANGE ORDERS (ECO / CHANGE CONTROL)
  // ==========================================
  public static async createChangeRequest(data: {
    organizationId?: string;
    title: string;
    changeType?: string;
    targetKitId?: string;
    targetItemId?: string;
    reasonForChange: string;
    impactAssessment?: string;
    proposedChanges?: any;
    initiatorName?: string;
  }): Promise<ChangeRequest> {
    const orgId = data.organizationId || "00000000-0000-0000-0000-000000000000";
    const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
    const ecoNum = `ECO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}-${rand}`;

    const cr = this.changeRepo.create({
      organization_id: orgId,
      eco_number: ecoNum,
      title: data.title,
      change_type: data.changeType || "BOM_MODIFICATION",
      status: "DRAFT",
      target_kit_id: data.targetKitId,
      target_item_id: data.targetItemId,
      reason_for_change: data.reasonForChange,
      impact_assessment: data.impactAssessment,
      proposed_changes: data.proposedChanges,
      initiator_name: data.initiatorName || "Manufacturing Engineer",
    });

    return await this.changeRepo.save(cr);
  }

  public static async updateChangeRequest(
    ecoId: string,
    updates: {
      status?: ChangeStatus;
      impactAssessment?: string;
      ccbApproverName?: string;
      effectiveDate?: Date;
    }
  ): Promise<ChangeRequest> {
    const cr = await this.changeRepo.findOneBy({ id: ecoId });
    if (!cr) throw new Error("Engineering Change Order not found");

    if (updates.status) cr.status = updates.status;
    if (updates.impactAssessment) cr.impact_assessment = updates.impactAssessment;
    if (updates.ccbApproverName) cr.ccb_approver_name = updates.ccbApproverName;
    if (updates.effectiveDate) cr.effective_date = updates.effectiveDate;

    return await this.changeRepo.save(cr);
  }

  public static async listChangeRequests(orgId: string = "00000000-0000-0000-0000-000000000000") {
    return await this.changeRepo.find({
      where: { organization_id: orgId },
      order: { created_at: "DESC" },
    });
  }

  // ==========================================
  // 5. REVERSE LOGISTICS & RMA
  // ==========================================
  public static async createRma(data: {
    organizationId?: string;
    customerId?: string;
    customerName?: string;
    salesOrderId?: string;
    reasonForReturn: string;
    customerNotes?: string;
    lines: Array<{
      itemId: string;
      serialNumber?: string;
      lotNumber?: string;
      quantityReturned: number;
      conditionGrade?: string;
    }>;
  }): Promise<Rma> {
    const orgId = data.organizationId || "00000000-0000-0000-0000-000000000000";
    const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
    const rmaNum = `RMA-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}-${rand}`;

    const rma = this.rmaRepo.create({
      organization_id: orgId,
      rma_number: rmaNum,
      customer_id: data.customerId,
      customer_name: data.customerName,
      sales_order_id: data.salesOrderId,
      status: "REQUESTED",
      reason_for_return: data.reasonForReturn,
      customer_notes: data.customerNotes,
      lines: data.lines.map((l) => {
        const line = new RmaLine();
        line.item_id = l.itemId;
        line.serial_number = l.serialNumber;
        line.lot_number = l.lotNumber;
        line.quantity_returned = l.quantityReturned;
        line.condition_grade = l.conditionGrade || "GOOD_ORIGINAL_BOX";
        line.disposition = "PENDING";
        return line;
      }),
    });

    return await this.rmaRepo.save(rma);
  }

  public static async processRmaDisposition(
    rmaId: string,
    lineDispositions: Array<{
      lineId: string;
      disposition: RmaDisposition;
      inspectionNotes?: string;
      targetBin?: string;
    }>,
    actorName: string = "RMA Inspector"
  ): Promise<Rma> {
    return await AppDataSource.transaction(async (manager) => {
      const rma = await manager.findOne(Rma, {
        where: { id: rmaId },
        relations: ["lines", "lines.item"],
      });

      if (!rma) throw new Error("RMA record not found");

      for (const itemDisp of lineDispositions) {
        const line = rma.lines.find((l) => l.id === itemDisp.lineId);
        if (!line) continue;

        line.disposition = itemDisp.disposition;
        line.inspection_notes = itemDisp.inspectionNotes;
        await manager.save(RmaLine, line);

        // If disposition is RESTOCK_TO_GENERAL, add units back to inventory via StockLedger
        if (itemDisp.disposition === "RESTOCK_TO_GENERAL") {
          await StockLedgerService.postEntry({
            organizationId: rma.organization_id,
            itemId: line.item_id,
            itemName: line.item?.name || "RMA Returned Item",
            itemSku: line.item?.sku || "RMA-ITEM",
            binLocation: itemDisp.targetBin || "RETURNS-BAY",
            lotNumber: line.lot_number,
            serialNumber: line.serial_number,
            qtyDelta: Number(line.quantity_returned),
            transactionType: "RETURN_RESTOCK",
            referenceType: "rma",
            referenceId: rma.rma_number,
            reasonCode: `RMA Restock (${rma.rma_number})`,
            notes: itemDisp.inspectionNotes || "Restocked following return inspection",
            actorName,
          });
        }
      }

      rma.status = "COMPLETED";
      rma.received_at = new Date();
      return await manager.save(Rma, rma);
    });
  }

  public static async listRmas(orgId: string = "00000000-0000-0000-0000-000000000000") {
    return await this.rmaRepo.find({
      where: { organization_id: orgId },
      relations: ["lines", "lines.item"],
      order: { created_at: "DESC" },
    });
  }
}
