import crypto from "crypto";

/**
 * Validates password strength policy:
 * - Minimum 10 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 numeric digit
 * - At least 1 special character (@$!%*?&#)
 */
export function validatePasswordStrength(password: string): { isValid: boolean; reason?: string } {
  if (!password || password.length < 10) {
    return { isValid: false, reason: "Password must be at least 10 characters long." };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return {
      isValid: false,
      reason: "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
    };
  }

  return { isValid: true };
}

/**
 * Generates a single-use random token string and its SHA-256 hash.
 */
export function generateSingleUseToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
