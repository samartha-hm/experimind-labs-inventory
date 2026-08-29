import { Router } from "express";
import { ElectronicSignatureService } from "../../services/ElectronicSignatureService.ts";
import { authenticateJwt } from "../../middleware/auth.ts";
import { requireTenant } from "../../middleware/tenant.ts";

const router = Router();

/**
 * POST /api/v1/e-signature/sign
 * Execute 21 CFR Part 11 electronic signature with re-authentication
 */
router.post("/sign", authenticateJwt, requireTenant, async (req: any, res) => {
  const {
    passwordConfirmation,
    totpCode,
    entityType,
    entityId,
    recordData,
    meaning,
    comments,
  } = req.body;

  if (!passwordConfirmation || !entityType || !entityId || !meaning) {
    return res.status(400).json({
      error: "Missing required fields: passwordConfirmation, entityType, entityId, meaning",
    });
  }

  try {
    const signature = await ElectronicSignatureService.signRecord({
      organizationId: req.user.orgId,
      userId: req.user.id,
      passwordConfirmation,
      totpCode,
      entityType,
      entityId,
      recordDataToHash: recordData || { id: entityId, type: entityType },
      meaning,
      comments,
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
      sessionId: req.headers["x-session-id"] || undefined,
    });

    res.status(201).json({
      success: true,
      message: "Electronic signature recorded successfully.",
      signature: {
        id: signature.id,
        signerName: signature.signer_printed_name,
        role: signature.signer_role_title,
        meaning: signature.signature_meaning,
        signedAt: signature.signed_at,
        recordHash: signature.record_hash,
        signatureDigest: signature.signature_digest,
      },
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/v1/e-signature/verify
 * Verify a signed record's integrity against its signature digest
 */
router.post("/verify", authenticateJwt, requireTenant, async (req, res) => {
  const { signatureId, currentRecordData } = req.body;
  if (!signatureId || !currentRecordData) {
    return res.status(400).json({ error: "signatureId and currentRecordData are required" });
  }

  try {
    const result = await ElectronicSignatureService.verifyRecordSignature(signatureId, currentRecordData);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * GET /api/v1/e-signature/entity/:entityType/:entityId
 */
router.get("/entity/:entityType/:entityId", authenticateJwt, requireTenant, async (req: any, res) => {
  try {
    const signatures = await ElectronicSignatureService.listSignaturesForEntity(
      req.params.entityType,
      req.params.entityId,
      req.user.orgId
    );
    res.json(signatures);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
