import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.ts";

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

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload & {
      sub: string;
      role: string;
      orgId?: string;
    };

    req.user = {
      id: payload.sub,
      role: payload.role || "viewer",
      orgId: payload.orgId || "00000000-0000-0000-0000-000000000000",
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired JWT token" });
  }
};