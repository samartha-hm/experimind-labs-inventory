import { Request, Response, NextFunction } from "express";

/**
 * Express middleware to restrict route access to users with specified role(s).
 * Role Hierarchy / Matrix:
 * - 'viewer': read-only queries (GET)
 * - 'staff': create/update operations (POST, PUT, PATCH)
 * - 'admin': full admin authority including deletes, settings, user management
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: Missing authentication context" });
    }

    const userRole = req.user.role.toLowerCase();
    const hasRole = allowedRoles.some((role) => role.toLowerCase() === userRole);

    if (!hasRole && userRole !== "admin") {
      return res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' is not authorized to perform this operation. Required: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};
