import { AppDataSource } from "../db.ts";
import { ElectronicSignature, SignatureMeaning } from "../entity/ElectronicSignature.ts";
import { User } from "../entity/User.ts";
import { AuthService } from "./AuthService.ts";
import { AuditService } from "./AuditService.ts";
import { verifyTotpCode } from "../utils/totp.ts";
import crypto from "crypto";

export interface SignRecordParams {
  organizationId?: string;
  userId: string;
  passwordConfirmation: string;
  totpCode?: string;
  entityType: string;
  entityId: string;
  recordDataToHash: any;
  meaning: SignatureMeaning;
  comments?: string;
  ipAddress?: string;
  sessionId?: string;
}

export interface SignatureVerificationResult {
  isSignatureValid: boolean;
  signerName: string;
  signedAt: Date;
  meaning: string;
  tamperDetected: boolean;
  reason?: string;
}

export class ElectronicSignatureService {
  private static userRepo = AppDataSource.getRepository(User);
  private static sigRepo = AppDataSource.getRepository(ElectronicSignature);
  private static authService = new AuthService();

  /**
   * Re-authenticates the user and binds a 21 CFR Part 11 electronic signature to the record state.
   */
  public static async signRecord(params: SignRecordParams): Promise<ElectronicSignature> {
    const orgId = params.organizationId || "00000000-0000-0000-0000-000000000000";

    // 1. Fetch user and verify authentication credentials
    const user = await this.userRepo.findOneBy({ id: params.userId });
    if (!user || !user.is_active) {
      throw new Error("Signer account is inactive or not found.");
    }

    if (!user.password_hash) {
      throw new Error("Password authentication is not configured for this user.");
    }

    const isPasswordValid = await this.authService.validatePassword(
      params.passwordConfirmation,
      user.password_hash
    );

    if (!isPasswordValid) {
      throw new Error("Electronic signature rejected: Incorrect password confirmation.");
    }

    // If user has 2FA enabled, verify TOTP
    if (user.mfa_enabled && user.mfa_secret) {
      if (!params.totpCode) {
        throw new Error("Two-factor authentication code is required to complete electronic signature.");
      }
      const isTotpValid = verifyTotpCode(user.mfa_secret, params.totpCode);
      if (!isTotpValid) {
        throw new Error("Electronic signature rejected: Invalid two-factor verification code.");
      }
    }

    // 2. Hash target record state
    const recordPayloadString = typeof params.recordDataToHash === "string"
      ? params.recordDataToHash
      : JSON.stringify(params.recordDataToHash);

    const recordHash = crypto.createHash("sha256").update(recordPayloadString).digest("hex");
    const signedAt = new Date();

    // 3. Compute cryptographic signature binding digest
    const signaturePayload = JSON.stringify({
      recordHash,
      signerId: user.id,
      signerName: user.name,
      meaning: params.meaning,
      timestamp: signedAt.getTime(),
    });
    const signatureDigest = crypto.createHash("sha256").update(signaturePayload).digest("hex");

    // 4. Save signature in atomic transaction and log audit event
    return await AppDataSource.transaction(async (manager) => {
      const signature = manager.create(ElectronicSignature, {
        organization_id: orgId,
        signer_user_id: user.id,
        signer_printed_name: user.name,
        signer_role_title: user.role,
        entity_type: params.entityType,
        entity_id: String(params.entityId),
        signature_meaning: params.meaning,
        comments: params.comments || undefined,
        ip_address: params.ipAddress || undefined,
        session_id: params.sessionId || undefined,
        record_hash: recordHash,
        signature_digest: signatureDigest,
        auth_method: user.mfa_enabled ? "PASSWORD_PLUS_TOTP" : "PASSWORD_REAUTH",
        signed_at: signedAt,
      });

      const savedSig = await manager.save(ElectronicSignature, signature);

      // Log in immutable Audit Log
      await AuditService.logEvent(
        {
          organizationId: orgId,
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          sessionId: params.sessionId,
          ipAddress: params.ipAddress,
          action: `E_SIGNATURE_${params.meaning}`,
          entityType: params.entityType,
          entityId: String(params.entityId),
          afterState: {
            signatureId: savedSig.id,
            meaning: params.meaning,
            signer: user.name,
            recordHash,
          },
          reasonCode: `21 CFR Part 11 Electronic Signature manifested by ${user.name}`,
        },
        manager
      );

      return savedSig;
    });
  }

  /**
   * Verifies if a signed record's current state still matches the cryptographic signature hash.
   */
  public static async verifyRecordSignature(
    signatureId: string,
    currentRecordState: any
  ): Promise<SignatureVerificationResult> {
    const sig = await this.sigRepo.findOne({
      where: { id: signatureId },
    });

    if (!sig) {
      return {
        isSignatureValid: false,
        signerName: "Unknown",
        signedAt: new Date(),
        meaning: "UNKNOWN",
        tamperDetected: true,
        reason: "Electronic signature record not found.",
      };
    }

    const currentPayload = typeof currentRecordState === "string"
      ? currentRecordState
      : JSON.stringify(currentRecordState);

    const currentHash = crypto.createHash("sha256").update(currentPayload).digest("hex");

    if (currentHash !== sig.record_hash) {
      return {
        isSignatureValid: false,
        signerName: sig.signer_printed_name,
        signedAt: sig.signed_at,
        meaning: sig.signature_meaning,
        tamperDetected: true,
        reason: `Record has been modified after signature was recorded. Expected hash: ${sig.record_hash}, current: ${currentHash}`,
      };
    }

    return {
      isSignatureValid: true,
      signerName: sig.signer_printed_name,
      signedAt: sig.signed_at,
      meaning: sig.signature_meaning,
      tamperDetected: false,
    };
  }

  public static async listSignaturesForEntity(
    entityType: string,
    entityId: string,
    orgId: string = "00000000-0000-0000-0000-000000000000"
  ) {
    return await this.sigRepo.find({
      where: {
        organization_id: orgId,
        entity_type: entityType,
        entity_id: String(entityId),
      },
      order: { signed_at: "DESC" },
    });
  }
}
