import { User } from "../entity/User.ts";
import { AuditLog } from "../entity/AuditLog.ts";
import { AppDataSource } from "../db.ts";

export class UserService {
  private get repo() {
    return AppDataSource.getRepository(User);
  }

  async listUsers(): Promise<User[]> {
    return this.repo.find({
      select: ["id", "email", "name", "role", "is_active", "created_at", "updated_at"],
    });
  }

  async inviteUser(email: string, name: string, role: string, actorId: string): Promise<User> {
    const existing = await this.repo.findOneBy({ email: email.toLowerCase().trim() });
    if (existing) {
      throw new Error(`User with email '${email}' already exists.`);
    }

    const user = this.repo.create({
      email: email.toLowerCase().trim(),
      name,
      role: role || "viewer",
      is_active: true,
    });
    const saved = await this.repo.save(user);

    // Audit log
    await this.logUserAudit(actorId, "USER_INVITED", saved.id, null, { email, role });
    return saved;
  }

  async updateUserRole(targetUserId: string, newRole: string, actorId: string): Promise<User> {
    if (targetUserId === actorId) {
      throw new Error("Users cannot modify their own security role.");
    }

    const user = await this.repo.findOneBy({ id: targetUserId });
    if (!user) {
      throw new Error("Target user not found.");
    }

    const oldRole = user.role;
    user.role = newRole;
    const updated = await this.repo.save(user);

    // Audit log
    await this.logUserAudit(actorId, "ROLE_CHANGED", user.id, { role: oldRole }, { role: newRole });
    return updated;
  }

  async updateUserStatus(targetUserId: string, isActive: boolean, actorId: string): Promise<User> {
    if (targetUserId === actorId) {
      throw new Error("Users cannot deactivate their own account.");
    }

    const user = await this.repo.findOneBy({ id: targetUserId });
    if (!user) {
      throw new Error("Target user not found.");
    }

    const oldStatus = user.is_active;
    user.is_active = isActive;
    const updated = await this.repo.save(user);

    // Audit log
    await this.logUserAudit(actorId, "STATUS_CHANGED", user.id, { is_active: oldStatus }, { is_active: isActive });
    return updated;
  }

  private async logUserAudit(actorId: string, action: string, targetId: string, before: any, after: any) {
    const auditRepo = AppDataSource.getRepository(AuditLog);
    const audit = auditRepo.create({
      organization_id: "org-default",
      actor_id: actorId,
      action,
      entity_type: "User",
      entity_id: targetId,
      before,
      after,
    });
    await auditRepo.save(audit);
  }
}
