import { AppDataSource } from "../db";
import { Role } from "../entity/Role";
import { User } from "../entity/User";

export interface CreateRoleDto {
  name: string;
  code: string;
  description?: string;
  color?: string;
  permissions: string[];
}

export class RbacService {
  private get roleRepo() {
    return AppDataSource.getRepository(Role);
  }
  private get userRepo() {
    return AppDataSource.getRepository(User);
  }

  async listRoles(organizationId?: string): Promise<Role[]> {
    const orgId = organizationId || "00000000-0000-0000-0000-000000000000";
    return this.roleRepo.find({
      where: [
        { organization_id: orgId },
        { is_system: true }
      ],
      order: { is_system: "DESC", name: "ASC" }
    });
  }

  async getRoleByCode(code: string, organizationId?: string): Promise<Role | null> {
    const orgId = organizationId || "00000000-0000-0000-0000-000000000000";
    return this.roleRepo.findOne({
      where: [
        { code, organization_id: orgId },
        { code, is_system: true }
      ]
    });
  }

  async createRole(dto: CreateRoleDto, organizationId?: string): Promise<Role> {
    const orgId = organizationId || "00000000-0000-0000-0000-000000000000";
    
    // Check if code exists
    const existing = await this.roleRepo.findOne({
      where: { code: dto.code, organization_id: orgId }
    });
    if (existing) {
      throw new Error(`Role with code "${dto.code}" already exists.`);
    }

    const role = this.roleRepo.create({
      organization_id: orgId,
      name: dto.name,
      code: dto.code,
      description: dto.description || "",
      color: dto.color || "indigo",
      is_system: false,
      permissions: dto.permissions || []
    });

    return this.roleRepo.save(role);
  }

  async updateRole(id: string, dto: Partial<CreateRoleDto>, organizationId?: string): Promise<Role> {
    const orgId = organizationId || "00000000-0000-0000-0000-000000000000";
    const role = await this.roleRepo.findOne({ where: { id, organization_id: orgId } });
    if (!role) {
      throw new Error("Role not found");
    }

    if (role.is_system && dto.code && dto.code !== role.code) {
      throw new Error("Cannot change code of a system role");
    }

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.color !== undefined) role.color = dto.color;
    if (dto.permissions !== undefined) role.permissions = dto.permissions;

    return this.roleRepo.save(role);
  }

  async deleteRole(id: string, organizationId?: string): Promise<void> {
    const orgId = organizationId || "00000000-0000-0000-0000-000000000000";
    const role = await this.roleRepo.findOne({ where: { id, organization_id: orgId } });
    if (!role) {
      throw new Error("Role not found");
    }
    if (role.is_system) {
      throw new Error("System roles cannot be deleted");
    }

    await this.roleRepo.remove(role);
  }

  async assignUserRole(userId: string, roleCode: string, organizationId?: string): Promise<User> {
    const orgId = organizationId || "00000000-0000-0000-0000-000000000000";
    const user = await this.userRepo.findOne({ where: { id: userId, organization_id: orgId } });
    if (!user) {
      throw new Error("User not found");
    }

    user.role = roleCode as any;
    return this.userRepo.save(user);
  }
}
