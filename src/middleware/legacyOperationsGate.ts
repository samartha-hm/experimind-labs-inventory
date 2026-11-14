import { Router } from "express";
import { authenticateJwt, requireRole } from "./auth.ts";

/** Legacy global stores have no tenant ownership. Never expose their records. */
export function legacyOperationsGate() {
  const gate = Router();
  gate.use(authenticateJwt);
  gate.use((req, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId)
      || orgId === "00000000-0000-0000-0000-000000000000") {
      res.status(403).json({ error: "An explicit organization is required" });
      return;
    }
    next();
  });
  gate.use(requireRole("admin", "staff"));
  gate.use((_req, res) => {
    res.status(503).json({
      error: "Legacy operations unavailable until tenant-aware persistence is implemented",
      code: "LEGACY_OPERATIONS_DISABLED",
    });
  });
  return gate;
}

export const legacyOperationalPaths = [
  "/api/v1/projects", "/api/projects", "/api/v1/production", "/api/production",
  "/api/v1/stickers", "/api/stickers", "/api/v1/qc", "/api/qc",
  "/api/v1/traceability", "/api/traceability",
];
