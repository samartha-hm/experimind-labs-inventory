import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(`[SERVER_ERROR] [${new Date().toISOString()}] ${req.method} ${req.url}:`, err);

  if (err.message?.startsWith("Validation failed")) {
    return res.status(400).json({ error: err.message });
  }

  if (err.message === "Unauthorized") {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  if (err.message === "Forbidden") {
    return res.status(403).json({ error: "Forbidden: Access denied" });
  }

  if (err.message === "Not found" || err.name === "EntityNotFoundError") {
    return res.status(404).json({ error: "Resource not found" });
  }

  const statusCode = err.status || err.statusCode || 500;
  const responsePayload = {
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message || "Unknown error",
  };

  res.status(statusCode).json(responsePayload);
};
