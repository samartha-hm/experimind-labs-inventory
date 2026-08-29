import { User } from "../entity/User.ts";
import { RefreshToken } from "../entity/RefreshToken.ts";
import { AppDataSource } from "../db.ts";
import { env } from "../config/env.ts";
import { validatePasswordStrength, generateSingleUseToken, hashToken } from "../utils/passwordPolicy.ts";
import { generateBase32Secret, verifyTotpCode, generateOtpAuthUrl, generateBackupRecoveryCodes } from "../utils/totp.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export interface LoginResult {
  mfaRequired?: boolean;
  mfaToken?: string;
  user?: User;
  token?: string;
  refreshToken?: string;
}

export class AuthService {
  private get userRepo() {
    return AppDataSource.getRepository(User);
  }

  private get tokenRepo() {
    return AppDataSource.getRepository(RefreshToken);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async register(
    email: string,
    password: string,
    name: string,
    role: string = "viewer"
  ): Promise<{ user: User; token: string; refreshToken: string }> {
    // Validate password policy
    const policyResult = validatePasswordStrength(password);
    if (!policyResult.isValid) {
      throw new Error(`Password policy violation: ${policyResult.reason}`);
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await this.userRepo.findOneBy({ email: cleanEmail });
    if (existing) {
      throw new Error("User with this email already exists");
    }

    const passwordHash = await this.hashPassword(password);

    const user = this.userRepo.create({
      email: cleanEmail,
      password_hash: passwordHash,
      name,
      role,
      is_active: true,
      failed_login_attempts: 0,
      firebase_uid: null,
      last_password_change: new Date(),
      password_history: [passwordHash],
    });

    const savedUser = await this.userRepo.save(user);

    const token = this.generateAccessToken(savedUser);
    const refreshToken = await this.generateRefreshToken(savedUser.id);

    return { user: savedUser, token, refreshToken };
  }

  async login(
    email: string,
    password: string
  ): Promise<LoginResult> {
    const cleanEmail = email.toLowerCase().trim();
    const user = await this.userRepo.findOneBy({ email: cleanEmail });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (!user.is_active) {
      throw new Error("Account has been deactivated. Please contact your system administrator.");
    }

    // Check account lockout status
    if (user.lockout_until && user.lockout_until > new Date()) {
      const minutesRemaining = Math.ceil(
        (user.lockout_until.getTime() - Date.now()) / (1000 * 60)
      );
      throw new Error(
        `Account is locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute(s).`
      );
    }

    if (!user.password_hash) {
      throw new Error("This account does not have a password set.");
    }

    const isValid = await this.validatePassword(password, user.password_hash);
    if (!isValid) {
      user.failed_login_attempts += 1;
      if (user.failed_login_attempts >= 5) {
        user.lockout_until = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
      }
      await this.userRepo.save(user);
      throw new Error("Invalid email or password");
    }

    // Reset lockout counters upon successful password verification
    user.failed_login_attempts = 0;
    user.lockout_until = null;
    await this.userRepo.save(user);

    // If user has 2FA enabled, issue temporary MFA challenge token
    if (user.mfa_enabled && user.mfa_secret) {
      const mfaToken = jwt.sign(
        { sub: user.id, type: "mfa_challenge" },
        env.jwtSecret,
        { expiresIn: "5m" }
      );
      return { mfaRequired: true, mfaToken };
    }

    const token = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    return { user, token, refreshToken };
  }

  async verifyMfaLogin(
    mfaToken: string,
    totpCode: string
  ): Promise<{ user: User; token: string; refreshToken: string }> {
    let decoded: any;
    try {
      decoded = jwt.verify(mfaToken, env.jwtSecret);
    } catch {
      throw new Error("MFA challenge token has expired or is invalid. Please sign in again.");
    }

    if (decoded.type !== "mfa_challenge" || !decoded.sub) {
      throw new Error("Invalid MFA challenge payload.");
    }

    const user = await this.userRepo.findOneBy({ id: decoded.sub });
    if (!user || !user.is_active || !user.mfa_secret) {
      throw new Error("User account is inactive or MFA is unconfigured.");
    }

    const cleanCode = totpCode.trim().toUpperCase();
    let isTotpValid = verifyTotpCode(user.mfa_secret, cleanCode);

    // Check backup recovery codes if not standard 6-digit TOTP
    if (!isTotpValid && user.mfa_backup_codes && user.mfa_backup_codes.includes(cleanCode)) {
      isTotpValid = true;
      user.mfa_backup_codes = user.mfa_backup_codes.filter(c => c !== cleanCode);
      await this.userRepo.save(user);
    }

    if (!isTotpValid) {
      throw new Error("Invalid two-factor authentication code.");
    }

    const token = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    return { user, token, refreshToken };
  }

  async setupMfa(userId: string): Promise<{ secret: string; otpAuthUrl: string; backupCodes: string[] }> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new Error("User not found.");

    const secret = generateBase32Secret(20);
    const backupCodes = generateBackupRecoveryCodes(8);
    const otpAuthUrl = generateOtpAuthUrl(user.email, secret, env.mfaIssuer);

    // Store pending secret until verified
    user.mfa_secret = secret;
    user.mfa_backup_codes = backupCodes;
    await this.userRepo.save(user);

    return { secret, otpAuthUrl, backupCodes };
  }

  async verifyAndEnableMfa(userId: string, totpCode: string): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user || !user.mfa_secret) throw new Error("MFA setup has not been initiated.");

    const isValid = verifyTotpCode(user.mfa_secret, totpCode);
    if (!isValid) {
      throw new Error("Invalid verification code. Please check your authenticator app.");
    }

    user.mfa_enabled = true;
    await this.userRepo.save(user);
    return true;
  }

  async disableMfa(userId: string, passwordConfirmation: string): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new Error("User not found.");

    if (user.password_hash) {
      const isValid = await this.validatePassword(passwordConfirmation, user.password_hash);
      if (!isValid) throw new Error("Incorrect password confirmation.");
    }

    user.mfa_enabled = false;
    user.mfa_secret = null;
    user.mfa_backup_codes = null;
    await this.userRepo.save(user);
    return true;
  }

  async generateForgotPasswordToken(email: string): Promise<string> {
    const user = await this.userRepo.findOneBy({ email: email.toLowerCase().trim() });
    if (!user) {
      // Do not leak email existence to callers
      return "If your email is registered, a password reset link has been dispatched.";
    }

    const { rawToken, tokenHash } = generateSingleUseToken();
    user.reset_token_hash = tokenHash;
    user.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
    await this.userRepo.save(user);

    return rawToken;
  }

  async resetPasswordWithToken(rawToken: string, newPassword: string): Promise<void> {
    const policyResult = validatePasswordStrength(newPassword);
    if (!policyResult.isValid) {
      throw new Error(`Password policy violation: ${policyResult.reason}`);
    }

    const tokenHash = hashToken(rawToken);
    const user = await this.userRepo.findOne({
      where: { reset_token_hash: tokenHash },
    });

    if (!user || !user.reset_token_expires || user.reset_token_expires < new Date()) {
      throw new Error("Password reset token is invalid or has expired.");
    }

    // Check against recent password history (prevent reuse of last 5 passwords)
    if (user.password_history && user.password_history.length > 0) {
      for (const oldHash of user.password_history) {
        if (await bcrypt.compare(newPassword, oldHash)) {
          throw new Error("You cannot reuse a recent password. Please choose a new password.");
        }
      }
    }

    const newHash = await this.hashPassword(newPassword);
    const history = user.password_history || [];
    history.unshift(newHash);
    user.password_history = history.slice(0, 5); // Retain last 5 hashes

    user.password_hash = newHash;
    user.reset_token_hash = null;
    user.reset_token_expires = null;
    user.failed_login_attempts = 0;
    user.lockout_until = null;
    user.last_password_change = new Date();
    await this.userRepo.save(user);
  }

  async refreshAccessToken(rawRefreshToken: string): Promise<{ token: string; refreshToken: string; user: { id: string; email: string; name: string; role: string; mfaEnabled: boolean } }> {
    const tokenHash = hashToken(rawRefreshToken);
    const tokenRecord = await this.tokenRepo.findOne({
      where: { token_hash: tokenHash, is_revoked: false },
    });

    if (!tokenRecord || tokenRecord.expires_at < new Date()) {
      throw new Error("Refresh token is invalid, revoked, or expired.");
    }

    const user = await this.userRepo.findOneBy({ id: tokenRecord.user_id });
    if (!user || !user.is_active) {
      throw new Error("User account is inactive or no longer exists.");
    }

    // Revoke old refresh token (Refresh Token Rotation)
    tokenRecord.is_revoked = true;
    await this.tokenRepo.save(tokenRecord);

    // Issue new access and refresh token pair
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(user.id);

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfa_enabled,
      },
    };
  }

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    const tokenRecord = await this.tokenRepo.findOne({ where: { token_hash: tokenHash } });
    if (tokenRecord) {
      tokenRecord.is_revoked = true;
      await this.tokenRepo.save(tokenRecord);
    }
  }

  public generateAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: (user as any).organization_id || "00000000-0000-0000-0000-000000000000",
    };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: (env.jwtExpiresIn as any) || "15m" });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const { rawToken, tokenHash } = generateSingleUseToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const record = this.tokenRepo.create({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      is_revoked: false,
    });
    await this.tokenRepo.save(record);

    return rawToken;
  }
}