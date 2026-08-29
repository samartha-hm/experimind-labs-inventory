import { describe, it, expect } from "vitest";
import {
  generateBase32Secret,
  generateTotpCode,
  verifyTotpCode,
  generateBackupRecoveryCodes,
  generateOtpAuthUrl,
} from "../../utils/totp.ts";

describe("RFC 6238 TOTP & Multi-Factor Authentication Suite", () => {
  it("generates a valid Base32 TOTP secret", () => {
    const secret = generateBase32Secret(20);
    expect(secret).toHaveLength(20);
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });

  it("generates and verifies 6-digit TOTP codes for current time window", () => {
    const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    const code = generateTotpCode(secret, 0);

    expect(code).toHaveLength(6);
    expect(code).toMatch(/^\d{6}$/);

    const isValid = verifyTotpCode(secret, code);
    expect(isValid).toBe(true);
  });

  it("verifies TOTP code within ±1 time drift step", () => {
    const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    const pastCode = generateTotpCode(secret, -1); // 1 step in past
    expect(verifyTotpCode(secret, pastCode)).toBe(true);

    const futureCode = generateTotpCode(secret, 1); // 1 step in future
    expect(verifyTotpCode(secret, futureCode)).toBe(true);

    const invalidCode = "000000";
    expect(verifyTotpCode(secret, invalidCode)).toBe(false);
  });

  it("generates 8 formatted backup recovery codes", () => {
    const backupCodes = generateBackupRecoveryCodes(8);
    expect(backupCodes).toHaveLength(8);

    const uniqueSet = new Set(backupCodes);
    expect(uniqueSet.size).toBe(8);

    for (const code of backupCodes) {
      expect(code).toMatch(/^[A-F0-9]{5}-[A-F0-9]{5}$/);
    }
  });

  it("generates compliant otpauth:// URI for authenticator QR codes", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const uri = generateOtpAuthUrl("admin@experimindlabs.com", secret, "Experimind Labs");

    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("Experimind%20Labs%3Aadmin%40experimindlabs.com");
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain("issuer=Experimind%20Labs");
  });
});
