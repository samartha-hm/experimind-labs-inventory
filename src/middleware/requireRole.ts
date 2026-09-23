import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../db.ts";
import { Role } from "../entity/Role.ts";

/**
 * Express middleware to restrict route access to users with specified role(s).
 * Strictly checks against allowed roles list without unverified bypasses.
 */
const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 4,
  admin: 4,
  manager: 3,
  editor: 3,
  staff: 3,
  employee: 2,
  member: 2,
  viewer: 1,
  observer: 1,
  guest: 1,
};

const ROLE_ALIASES: Record<string, string[]> = {
  admin: ["admin", "super_admin"],
  super_admin: ["admin", "super_admin"],
  manager: ["manager", "editor", "staff", "admin", "super_admin"],
  editor: ["manager", "editor", "staff", "admin", "super_admin"],
  staff: ["manager", "editor", "staff", "admin", "super_admin"],
  employee: ["employee", "member", "staff", "editor", "manager", "admin", "super_admin"],
  member: ["employee", "member", "staff", "editor", "manager", "admin", "super_admin"],
  viewer: ["viewer", "observer", "guest", "employee", "member", "staff", "editor", "manager", "admin", "super_admin"],
  observer: ["viewer", "observer", "guest", "employee", "member", "staff", "editor", "manager", "admin", "super_admin"],
};

export type CoreRole = "admin" | "inventory_staff" | "project_staff";
export type CoreCapability =
  | "replenishment_request"
  | "receive_stock"
  | "adjust_stock"
  | "transfer_stock"
  | "fulfill_orders"
  | "manage_users";

const CORE_ROLE_ALIASES: Record<CoreRole, Set<string>> = {
  admin: new Set(["admin", "super_admin"]),
  inventory_staff: new Set(["staff", "manager", "editor", "warehouse_staff", "procurement"]),
  project_staff: new Set(["viewer", "observer", "guest", "employee", "member", "user", "intern"]),
};

const CAPABILITY_ROLES: Record<CoreCapability, CoreRole[]> = {
  replenishment_request: ["admin", "inventory_staff", "project_staff"],
  receive_stock: ["admin", "inventory_staff"],
  adjust_stock: ["admin", "inventory_staff"],
  transfer_stock: ["admin", "inventory_staff"],
  fulfill_orders: ["admin", "inventory_staff"],
  manage_users: ["admin"],
};

export function normalizeCoreRole(role: string | null | undefined): CoreRole | null {
  const normalized = (role || "").toLowerCase().trim();
  return (Object.keys(CORE_ROLE_ALIASES) as CoreRole[])
    .find((coreRole) => CORE_ROLE_ALIASES[coreRole].has(normalized)) || null;
}

/**
 * Express middleware to restrict route access to users with specified role(s).
 * Supports role hierarchy and role aliases (e.g. editor/manager/staff, employee/member, viewer).
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: Missing authentication context" });
    }

    const userRole = (req.user.role || "viewer").toLowerCase().trim();
    const userLevel = ROLE_HIERARCHY[userRole] ?? 1;

    // Check if user satisfies any of the allowed roles via level or alias
    const hasRole = allowedRoles.some((role) => {
      const targetRole = role.toLowerCase().trim();
      const targetLevel = ROLE_HIERARCHY[targetRole] ?? 1;
      
      // Direct match
      if (userRole === targetRole) return true;
      // Alias match
      if (ROLE_ALIASES[targetRole]?.includes(userRole)) return true;
      // Hierarchy level match (e.g. admin >= staff >= employee >= viewer)
      if (userLevel >= targetLevel) return true;
      
      return false;
    });

    if (!hasRole) {
      return res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' is not authorized to perform this operation. Required: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};

export const requireCapability = (...requiredCapabilities: CoreCapability[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: Missing authentication context" });
    }

    const coreRole = normalizeCoreRole(req.user.role);
    const allowed = requiredCapabilities.some((capability) => {
      return coreRole !== null && CAPABILITY_ROLES[capability].includes(coreRole);
    });

    if (!allowed) {
      return res.status(403).json({
        error: `Forbidden: Core role '${coreRole || req.user.role}' lacks required capability: ${requiredCapabilities.join(", ")}`,
      });
    }

    next();
  };
};

/**
 * Fine-grained RBAC permission middleware.
 * Checks if the user's role grants the requested permission string(s).
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: Missing authentication context" });
    }

    const userRole = req.user.role;
    const orgId = req.user.orgId || "00000000-0000-0000-0000-000000000000";

    // Super admin role always has all permissions
    if (userRole.toLowerCase() === "super_admin" || userRole.toLowerCase() === "admin") {
      return next();
    }

    try {
      const roleRepo = AppDataSource.getRepository(Role);
      const roleRecord = await roleRepo.findOne({
        where: [
          { organization_id: orgId, code: userRole },
          { code: userRole }, // global fallback
        ],
      });

      if (!roleRecord || !roleRecord.permissions) {
        return res.status(403).json({
          error: `Forbidden: No permissions assigned to role '${userRole}'`,
        });
      }

      const hasAll = requiredPermissions.every((p) => roleRecord.permissions.includes(p));
      if (!hasAll) {
        return res.status(403).json({
          error: `Forbidden: Role '${userRole}' lacks required permission(s): ${requiredPermissions.join(", ")}`,
        });
      }

      next();
    } catch (err: any) {
      return res.status(500).json({ error: "Permission verification failed", details: err.message });
    }
  };
};
