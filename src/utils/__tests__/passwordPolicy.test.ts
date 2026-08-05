import { describe, it, expect } from "vitest";
import { validatePasswordStrength, generateSingleUseToken, hashToken } from "../passwordPolicy.ts";

describe("Password Policy & Security Token Tests", () => {
  it("accepts strong passwords meeting all complexity criteria", () => {
    const result = validatePasswordStrength("StrongP@ssw0rd2026!");
    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("rejects passwords shorter than 10 characters", () => {
    const result = validatePasswordStrength("P@ss1");
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("at least 10 characters");
  });

  it("rejects passwords missing special characters or digits", () => {
    const result = validatePasswordStrength("passwordwithoutdigit");
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("uppercase letter, one lowercase letter");
  });

  it("generates 32-byte single use raw token and matching SHA-256 hash", () => {
    const { rawToken, tokenHash } = generateSingleUseToken();
    expect(rawToken).toBeDefined();
    expect(rawToken.length).toBe(64); // 32 hex bytes = 64 hex characters
    expect(tokenHash).toBe(hashToken(rawToken));
  });
});
