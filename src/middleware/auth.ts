import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.ts";

// Augment Express Request to include user info
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      role: string;
      orgId?: string;
    };
  }
}

export const authenticateJwt = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  // Environment-gated guest mode (STRICTLY FOR TEST/DEV ENVIRONMENTS)
  if (env.allowGuest && token === "guest-token-mock") {
    req.user = {
      id: "guest-uid",
      role: env.guestRole,
      orgId: "org-default-guest",
    };
    return next();
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload & {
      sub: string; // user id
      role: string;
      orgId?: string;
    };

    // Attach verified user payload to request
    req.user = {
      id: payload.sub,
      role: payload.role || "viewer",
      orgId: payload.orgId || "org-default",
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired JWT token" });
  }
};