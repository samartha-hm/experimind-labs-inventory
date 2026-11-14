import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../db.ts";
import { User } from "../entity/User.ts";

const DEFAULT_UUID_ORG = "00000000-0000-0000-0000-000000000000";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getTenantOrgId(req: Request): string {
  const userOrg = (req as any).user?.orgId || (req as any).user?.organization_id;
  if (userOrg && UUID_REGEX.test(userOrg)) {
    return userOrg;
  }
  return DEFAULT_UUID_ORG;
}

export async function requireTenant(req: Request, res: Response, next: NextFunction) {
  const orgId = getTenantOrgId(req);
  if (orgId === DEFAULT_UUID_ORG || !UUID_REGEX.test(req.user?.id ?? "")) {
    return res.status(403).json({ error: "Explicit organization and user required." });
  }
  try {
    const current = await AppDataSource.getRepository(User).findOneBy({
      id: req.user!.id, organization_id: orgId, is_active: true,
    });
    if (!current) return res.status(403).json({ error: "Organization access denied." });
    req.user!.role = current.role;
    (req as any).orgId = orgId;
    next();
  } catch {
    return res.status(503).json({ error: "Organization access verification unavailable." });
  }
}
