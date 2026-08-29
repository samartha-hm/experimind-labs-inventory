import bcrypt from "bcryptjs";
import { User } from "../entity/User.ts";
import { AuditLog } from "../entity/AuditLog.ts";
import { AppDataSource } from "../db.ts";

export class UserService {
  private get repo() {
    return AppDataSource.getRepository(User);
  }

  async listUsers(organizationId?: string): Promise<User[]> {
    const where: any = {};
    if (organizationId) {
      where.organization_id = organizationId;
    }
    return this.repo.find({
      where,
      select: ["id", "email", "name", "role", "is_active", "created_at", "updated_at"],
    });
  }

  async inviteUser(email: string, name: string, role: string, actorId: string, organizationId?: string, password?: string): Promise<User> {
    const existing = await this.repo.findOneBy({ email: email.toLowerCase().trim() });
    if (existing) {
      throw new Error(`User with email '${email}' already exists.`);
    }

    const orgId = organizationId || "00000000-0000-0000-0000-000000000000";

    // Normalize role to valid enum values: 'admin', 'editor', 'viewer', 'employee'
    let normalizedRole = (role || "viewer").toLowerCase().trim();
    if (normalizedRole === "staff" || normalizedRole === "member") {
      normalizedRole = "employee";
    }
    const validRoles = ["admin", "editor", "viewer", "employee"];
    if (!validRoles.includes(normalizedRole)) {
      normalizedRole = "viewer";
    }

    let password_hash: string | undefined = undefined;
    if (password) {
      password_hash = await bcrypt.hash(password, 10);
    }

    const user = this.repo.create({
      email: email.toLowerCase().trim(),
      name,
      role: normalizedRole,
      password_hash,
      organization_id: orgId,
      is_active: true,
    });
    const saved = await this.repo.save(user);

    // Audit log
    await this.logUserAudit(actorId, orgId, "USER_INVITED", saved.id, null, { email, role: normalizedRole });
    return saved;
  }

  async updateUserRole(targetUserId: string, newRole: string, actorId: string, organizationId?: string): Promise<User> {
    if (targetUserId === actorId) {
      throw new Error("Users cannot modify their own security role.");
    }

    const where: any = { id: targetUserId };
    if (organizationId) {
      where.organization_id = organizationId;
    }

    const user = await this.repo.findOneBy(where);
    if (!user) {
      throw new Error("Target user not found or access denied.");
    }

    const oldRole = user.role;
    user.role = newRole;
    const updated = await this.repo.save(user);

    // Audit log
    await this.logUserAudit(actorId, organizationId || user.organization_id || "00000000-0000-0000-0000-000000000000", "ROLE_CHANGED", user.id, { role: oldRole }, { role: newRole });
    return updated;
  }

  async updateUserStatus(targetUserId: string, isActive: boolean, actorId: string, organizationId?: string): Promise<User> {
    if (targetUserId === actorId) {
      throw new Error("Users cannot deactivate their own account.");
    }

    const where: any = { id: targetUserId };
    if (organizationId) {
      where.organization_id = organizationId;
    }

    const user = await this.repo.findOneBy(where);
    if (!user) {
      throw new Error("Target user not found or access denied.");
    }

    const oldStatus = user.is_active;
    user.is_active = isActive;
    const updated = await this.repo.save(user);

    // Audit log
    await this.logUserAudit(actorId, organizationId || user.organization_id || "00000000-0000-0000-0000-000000000000", "STATUS_CHANGED", user.id, { is_active: oldStatus }, { is_active: isActive });
    return updated;
  }

  async updateUser(targetUserId: string, updates: { name?: string; role?: string; password?: string; is_active?: boolean }, actorId: string, organizationId?: string): Promise<User> {
    const where: any = { id: targetUserId };
    if (organizationId) {
      where.organization_id = organizationId;
    }

    const user = await this.repo.findOneBy(where);
    if (!user) {
      throw new Error("Target user not found or access denied.");
    }

    const before = { name: user.name, role: user.role, is_active: user.is_active };

    if (typeof updates.name === "string") {
      user.name = updates.name.trim();
    }

    if (updates.role) {
      let normalizedRole = updates.role.toLowerCase().trim();
      if (normalizedRole === "staff" || normalizedRole === "member") normalizedRole = "employee";
      if (normalizedRole === "manager") normalizedRole = "editor";
      const validRoles = ["admin", "editor", "viewer", "employee"];
      if (validRoles.includes(normalizedRole)) {
        if (targetUserId === actorId && normalizedRole !== "admin") {
          throw new Error("Admins cannot revoke their own administrator role.");
        }
        user.role = normalizedRole;
      }
    }

    if (updates.password) {
      user.password_hash = await bcrypt.hash(updates.password, 10);
    }

    if (typeof updates.is_active === "boolean") {
      if (targetUserId === actorId && !updates.is_active) {
        throw new Error("Users cannot deactivate their own account.");
      }
      user.is_active = updates.is_active;
    }

    const updated = await this.repo.save(user);

    // Audit log
    await this.logUserAudit(actorId, organizationId || user.organization_id || "00000000-0000-0000-0000-000000000000", "USER_UPDATED", user.id, before, {
      name: updated.name,
      role: updated.role,
      is_active: updated.is_active,
    });

    return updated;
  }

  async deleteUser(targetUserId: string, actorId: string, organizationId?: string): Promise<{ success: boolean; message: string }> {
    if (targetUserId === actorId) {
      throw new Error("You cannot delete your own active account.");
    }

    const where: any = { id: targetUserId };
    if (organizationId) {
      where.organization_id = organizationId;
    }

    const user = await this.repo.findOneBy(where);
    if (!user) {
      throw new Error("User not found.");
    }

    if (user.email === "admin@experimindlabs.com") {
      throw new Error("The master system administrator account cannot be deleted.");
    }

    const before = { email: user.email, name: user.name, role: user.role };
    await this.repo.remove(user);

    // Audit log
    await this.logUserAudit(actorId, organizationId || "00000000-0000-0000-0000-000000000000", "USER_DELETED", targetUserId, before, null);
    return { success: true, message: `User ${before.email} removed successfully.` };
  }

  private async logUserAudit(actorId: string, organizationId: string, action: string, targetId: string, before: any, after: any) {
    const auditRepo = AppDataSource.getRepository(AuditLog);
    const audit = auditRepo.create({
      organization_id: organizationId || "00000000-0000-0000-0000-000000000000",
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
