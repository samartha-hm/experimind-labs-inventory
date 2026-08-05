import { Request, Response, NextFunction } from "express";

const DEFAULT_UUID_ORG = "00000000-0000-0000-0000-000000000000";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getTenantOrgId(req: Request): string {
  const userOrg = (req as any).user?.orgId || (req as any).user?.organization_id;
  if (userOrg && UUID_REGEX.test(userOrg)) {
    return userOrg;
  }
  return DEFAULT_UUID_ORG;
}

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  const orgId = getTenantOrgId(req);
  if (!UUID_REGEX.test(orgId)) {
    return res.status(400).json({ error: "Invalid organization UUID format." });
  }
  (req as any).orgId = orgId;
  next();
}
