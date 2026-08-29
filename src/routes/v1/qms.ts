import { Router } from "express";
import { QmsService } from "../../services/QmsService.ts";
import { authenticateJwt } from "../../middleware/auth.ts";
import { requireTenant } from "../../middleware/tenant.ts";
import { requireRole } from "../../middleware/requireRole.ts";

const router = Router();

// ==========================================
// 1. INSPECTIONS
// ==========================================
router.get("/inspections", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const list = await QmsService.listInspections(req.user.orgId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/inspections", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const inspection = await QmsService.createInspection({
      organizationId: req.user.orgId,
      itemId: req.body.itemId,
      lotNumber: req.body.lotNumber,
      purchaseOrderId: req.body.purchaseOrderId,
      batchQuantity: Number(req.body.batchQuantity || 1),
      sampleSize: req.body.sampleSize ? Number(req.body.sampleSize) : undefined,
      inspectorName: req.user.name || "Quality Inspector",
      inspectorUserId: req.user.id,
    });
    res.status(201).json(inspection);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/inspections/:id/results", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const updated = await QmsService.recordInspectionResult(req.params.id, {
      status: req.body.status,
      checklist: req.body.checklist || [],
      defectCount: Number(req.body.defectCount || 0),
      dispositionNotes: req.body.dispositionNotes,
      inspectorName: req.user.name,
    });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// 2. DEVIATIONS (NCR)
// ==========================================
router.get("/deviations", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const list = await QmsService.listDeviations(req.user.orgId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/deviations", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const deviation = await QmsService.createDeviation({
      organizationId: req.user.orgId,
      title: req.body.title,
      severity: req.body.severity,
      description: req.body.description,
      sourceEventType: req.body.sourceEventType,
      sourceReferenceId: req.body.sourceReferenceId,
      itemId: req.body.itemId,
      lotNumber: req.body.lotNumber,
      affectedQuantity: Number(req.body.affectedQuantity || 0),
      immediateContainmentAction: req.body.immediateContainmentAction,
      reportedByName: req.user.name,
    });
    res.status(201).json(deviation);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/deviations/:id", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const updated = await QmsService.updateDeviation(req.params.id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// 3. CAPAS
// ==========================================
router.get("/capas", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const list = await QmsService.listCapas(req.user.orgId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/capas", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const capa = await QmsService.createCapa({
      organizationId: req.user.orgId,
      title: req.body.title,
      problemStatement: req.body.problemStatement,
      sourceDeviationId: req.body.sourceDeviationId,
      leadInvestigatorName: req.user.name,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
    });
    res.status(201).json(capa);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/capas/:id", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const updated = await QmsService.updateCapa(req.params.id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// 4. ENGINEERING CHANGE ORDERS (ECO)
// ==========================================
router.get("/ecos", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const list = await QmsService.listChangeRequests(req.user.orgId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/ecos", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const eco = await QmsService.createChangeRequest({
      organizationId: req.user.orgId,
      title: req.body.title,
      changeType: req.body.changeType,
      targetKitId: req.body.targetKitId,
      targetItemId: req.body.targetItemId,
      reasonForChange: req.body.reasonForChange,
      impactAssessment: req.body.impactAssessment,
      proposedChanges: req.body.proposedChanges,
      initiatorName: req.user.name,
    });
    res.status(201).json(eco);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/ecos/:id", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const updated = await QmsService.updateChangeRequest(req.params.id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// 5. RMAS
// ==========================================
router.get("/rmas", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const list = await QmsService.listRmas(req.user.orgId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/rmas", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const rma = await QmsService.createRma({
      organizationId: req.user.orgId,
      customerId: req.body.customerId,
      customerName: req.body.customerName,
      salesOrderId: req.body.salesOrderId,
      reasonForReturn: req.body.reasonForReturn,
      customerNotes: req.body.customerNotes,
      lines: req.body.lines || [],
    });
    res.status(201).json(rma);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/rmas/:id/disposition", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const updated = await QmsService.processRmaDisposition(
      req.params.id,
      req.body.lineDispositions || [],
      req.user.name || "RMA Clerk"
    );
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
