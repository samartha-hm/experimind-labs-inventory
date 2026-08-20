import { User } from "../entity/User.ts";
import { RefreshToken } from "../entity/RefreshToken.ts";
import { AppDataSource } from "../db.ts";
import { env } from "../config/env.ts";
import { validatePasswordStrength, generateSingleUseToken, hashToken } from "../utils/passwordPolicy.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

    const existing = await this.userRepo.findOneBy({ email: email.toLowerCase().trim() });
    if (existing) {
      throw new Error("User with this email already exists");
    }

    const passwordHash = await this.hashPassword(password);

    const user = this.userRepo.create({
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name,
      role,
      is_active: true,
      failed_login_attempts: 0,
      firebase_uid: null,
    });

    const savedUser = await this.userRepo.save(user);

    const token = this.generateAccessToken(savedUser);
    const refreshToken = await this.generateRefreshToken(savedUser.id);

    return { user: savedUser, token, refreshToken };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: User; token: string; refreshToken: string }> {
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
      // Increment failed attempts
      user.failed_login_attempts += 1;
      if (user.failed_login_attempts >= 5) {
        // Lock account for 15 minutes
        user.lockout_until = new Date(Date.now() + 15 * 60 * 1000);
      }
      await this.userRepo.save(user);

      throw new Error("Invalid email or password");
    }

    // Reset lockout counters upon successful authentication
    user.failed_login_attempts = 0;
    user.lockout_until = null;
    await this.userRepo.save(user);

    const token = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    return { user, token, refreshToken };
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

    user.password_hash = await this.hashPassword(newPassword);
    user.reset_token_hash = null;
    user.reset_token_expires = null;
    user.failed_login_attempts = 0;
    user.lockout_until = null;
    await this.userRepo.save(user);
  }

  async refreshAccessToken(rawRefreshToken: string): Promise<{ token: string; refreshToken: string; user: { id: string; email: string; name: string; role: string } }> {
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

  private generateAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: (user as any).organization_id || "00000000-0000-0000-0000-000000000000",
    };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: "12h" });
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