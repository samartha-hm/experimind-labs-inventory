import crypto from "crypto";
import { AppDataSource } from "../db";
import { Session } from "../entity/Session";

export class SessionService {
  private get sessionRepo() {
    return AppDataSource.getRepository(Session);
  }

  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async createSession(
    userId: string,
    refreshToken: string,
    organizationId?: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<Session> {
    const orgId = organizationId || "00000000-0000-0000-0000-000000000000";
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const session = this.sessionRepo.create({
      user_id: userId,
      organization_id: orgId,
      refresh_token_hash: tokenHash,
      device_info: deviceInfo || "Web Browser (Desktop)",
      ip_address: ipAddress || "127.0.0.1",
      location: "Verified Session",
      expires_at: expiresAt,
      is_revoked: false
    });

    return this.sessionRepo.save(session);
  }

  async validateAndTouchSession(refreshToken: string): Promise<Session | null> {
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.sessionRepo.findOne({
      where: { refresh_token_hash: tokenHash, is_revoked: false }
    });

    if (!session) return null;
    if (new Date() > session.expires_at) {
      session.is_revoked = true;
      await this.sessionRepo.save(session);
      return null;
    }

    session.last_active_at = new Date();
    return this.sessionRepo.save(session);
  }

  async listUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepo.find({
      where: { user_id: userId, is_revoked: false },
      order: { last_active_at: "DESC" }
    });
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, user_id: userId }
    });
    if (session) {
      session.is_revoked = true;
      await this.sessionRepo.save(session);
    }
  }

  async revokeAllOtherSessions(currentRefreshToken: string, userId: string): Promise<number> {
    const currentHash = this.hashToken(currentRefreshToken);
    const sessions = await this.sessionRepo.find({
      where: { user_id: userId, is_revoked: false }
    });

    let revokedCount = 0;
    for (const session of sessions) {
      if (session.refresh_token_hash !== currentHash) {
        session.is_revoked = true;
        await this.sessionRepo.save(session);
        revokedCount++;
      }
    }
    return revokedCount;
  }
}
