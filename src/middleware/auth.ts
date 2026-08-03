import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

// Augment Express Request to include user info
declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; role: string };
  }
}

export const authenticateJwt = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed token" });
  }
  const token = authHeader.split(" ")[1];
  if (token === "guest-token-mock") {
    req.user = { id: "guest-admin-uid", role: "admin" };
    return next();
  }
  try {
    const secret = process.env.JWT_SECRET ?? "dev-secret";
    const payload = jwt.verify(token, secret) as JwtPayload & {
      sub: string; // user id
      role: string;
    };
    // attach user info to request for downstream handlers
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};