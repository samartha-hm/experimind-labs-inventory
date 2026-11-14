import express from "express";
import { env } from "../../config/env.ts";
import { openApiSpec, renderSwaggerUiHtml } from "../../docs/openapi.ts";
import { AppDataSource } from "../../db";

export function mountHealth(app: express.Express) {
  app.get(["/health", "/healthz"], (_req, res) => {
    res.status(200).json({
      status: "healthy",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
      version: "1.0.0"
    });
  });

  app.get(["/ready", "/readyz"], async (_req, res) => {
    try {
      if (!AppDataSource.isInitialized) {
        return res.status(503).json({ status: "not_ready", db: "disconnected" });
      }
      await AppDataSource.query("SELECT 1");
      return res.status(200).json({ status: "ready", db: "connected" });
    } catch (err: any) {
      return res.status(503).json({ status: "error", error: err.message });
    }
  });

  app.get("/metrics", (_req, res) => {
    const memory = process.memoryUsage();
    res.status(200).json({
      uptime: process.uptime(),
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      },
      dbConnected: AppDataSource.isInitialized,
      timestamp: new Date().toISOString(),
    });
  });

  // ===== Interactive OpenAPI 3.0 Documentation =====
  app.get("/api/docs/openapi.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(openApiSpec);
  });

  app.get("/api/docs", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(renderSwaggerUiHtml("/api/docs/openapi.json"));
  });
}
