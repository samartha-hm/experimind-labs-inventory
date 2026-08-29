import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../db.ts";
import { Role } from "../entity/Role.ts";

/**
 * Express middleware to restrict route access to users with specified role(s).
 * Strictly checks against allowed roles list without unverified bypasses.
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: Missing authentication context" });
    }

    const userRole = req.user.role.toLowerCase();
    const hasRole = allowedRoles.some((role) => role.toLowerCase() === userRole);

    if (!hasRole) {
      return res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' is not authorized to perform this operation. Required: ${allowedRoles.join(", ")}`,
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

