import { Request } from "express";

/**
 * Resolves the authenticated user's organization ID from request context.
 */
export function getTenantOrgId(req: Request): string {
  const userOrg = (req as any).user?.orgId || (req as any).user?.organization_id;
  if (userOrg) {
    return userOrg;
  }
  return "00000000-0000-0000-0000-000000000000";
}
