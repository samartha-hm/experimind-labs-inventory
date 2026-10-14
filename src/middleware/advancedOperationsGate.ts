import type { RequestHandler } from "express";
import { authenticateJwt } from "./auth.ts";
import { requireTenant } from "./tenant.ts";

/** Older advanced mutations lack verified ownership/idempotency. Keep read-only
 * tenant-scoped history available; packing QC uses its separately tested API. */
export const advancedOperationsGate: RequestHandler = (req,res,next) => {
  if (["GET","HEAD","OPTIONS"].includes(req.method)) { next(); return; }
  authenticateJwt(req,res,error=>{
    if(error){next(error);return;}
    void requireTenant(req,res,tenantError=>{
      if(tenantError){next(tenantError);return;}
      res.status(503).json({code:"ADVANCED_OPERATIONS_DISABLED",error:"Advanced QMS and signature mutations require ownership and ledger verification before pilot use."});
    });
  });
};
