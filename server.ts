import "reflect-metadata";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { env } from "./src/config/env.ts";
import { AppDataSource } from "./src/db.ts";
import authRoutes from "./src/routes/v1/auth.ts";
import { authenticateJwt } from "./src/middleware/auth.ts";
import { requireTenant } from "./src/middleware/tenant.ts";
import { errorHandler } from "./src/middleware/errorHandler.ts";
import inventoryRoutes from "./src/routes/v1/inventory.ts";
import warehouseRoutes from "./src/routes/v1/warehouse.ts";
import binRoutes from "./src/routes/v1/bin.ts";
import kitRoutes from "./src/routes/v1/kit.ts";
import vendorRoutes from "./src/routes/v1/vendor.ts";
import customerRoutes from "./src/routes/v1/customer.ts";
import purchaseOrderRoutes from "./src/routes/v1/purchase-order.ts";
import salesOrderRoutes from "./src/routes/v1/sales-order.ts";
import transactionRoutes from "./src/routes/v1/transaction.ts";
import reportRoutes from "./src/routes/v1/report.ts";
import settingRoutes from "./src/routes/v1/setting.ts";
import webhookRoutes from "./src/routes/v1/webhook.ts";
import userRoutes from "./src/routes/v1/users.ts";
import orderRoutes from "./src/routes/v1/orders.ts";

import auditLogRoutes from "./src/routes/v1/audit-log.ts";
import warehouseVisualRoutes from "./src/routes/v1/warehouse-visual.ts";
import serialNumberRoutes from "./src/routes/v1/serial-number.ts";
import imageProxyRoutes from "./src/routes/v1/image-proxy.ts";
import { stockLedgerRouter } from "./src/routes/v1/stock-ledger.ts";
import { wmsOperationsRouter } from "./src/routes/v1/wms-operations.ts";
import rbacRoutes from "./src/routes/v1/rbac.ts";
import sessionRoutes from "./src/routes/v1/session.ts";
import bulkImportRoutes from "./src/routes/v1/bulk-import.ts";
import storefrontRoutes from "./src/routes/v1/storefront.ts";
import realtimeRoutes from "./src/routes/v1/realtime.ts";
import eSignatureRoutes from "./src/routes/v1/e-signature.ts";
import qmsRoutes from "./src/routes/v1/qms.ts";
import auditEventsRoutes from "./src/routes/v1/audit-events.ts";

// Initialize Postgres (with retry)
async function connectDatabase(retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await AppDataSource.initialize();
      console.log("✅ PostgreSQL connected");
      return;
    } catch (err) {
      console.error(`❌ DB connection attempt ${attempt}/${retries} failed:`, (err as Error).message);
      if (attempt === retries) {
        throw err;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function startServer() {
  // Connect to database first
  await connectDatabase();
  const app = express();
  const PORT = env.port;

  // Trust Reverse Proxies (Nginx / Cloudflare / Ingress)
  app.set("trust proxy", 1);

  // Security Headers with Content Security Policy & CORS
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
          connectSrc: ["'self'", "ws:", "wss:", "https:", "http:"],
        },
      },
      crossOriginOpenerPolicy: false,
      originAgentCluster: false,
    })
  );
  app.use(cors({
    origin: env.nodeEnv === "production" ? env.appUrl : true,
    credentials: true,
  }));

  // Rate Limiters
  const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: env.nodeEnv === "production" ? 100 : 1000, standardHeaders: true });
  const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: "AI analysis rate limit exceeded. Please try again later." } });

  app.use(globalLimiter);

  // Raw Buffer Parser for Razorpay Webhook HMAC Verification
  app.use("/api/public/webhook/razorpay", express.raw({ type: "application/json" }));

  // Parsers for JSON requests and cookies
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  // Simple request logger
  app.use((req, res, next) => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url}`
    );
    next();
  });

  // Healthcheck Endpoints for Load Balancers & Kubernetes
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  app.get("/readyz", async (_req, res) => {
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

  // ===== Public Asset & Webhook Endpoints =====
  app.use("/api/public/webhook", webhookRoutes);
  app.use("/api/public/storefront", storefrontRoutes);
  app.use("/api/v1/image-proxy", imageProxyRoutes);

  // ===== Versioned API (protected) =====
  app.use("/api/v1/auth", authLimiter, authRoutes);
  app.use("/api/v1/orders", authenticateJwt, requireTenant, orderRoutes);
  app.use("/api/v1/users", authenticateJwt, requireTenant, userRoutes);
  app.use("/api/v1/inventory", authenticateJwt, requireTenant, inventoryRoutes);
  app.use("/api/v1/warehouse", authenticateJwt, requireTenant, warehouseRoutes);
  app.use("/api/v1/bin", authenticateJwt, requireTenant, binRoutes);
  app.use("/api/v1/kit", authenticateJwt, requireTenant, kitRoutes);
  app.use("/api/v1/vendor", authenticateJwt, requireTenant, vendorRoutes);
  app.use("/api/v1/customer", authenticateJwt, requireTenant, customerRoutes);
  app.use("/api/v1/purchase-order", authenticateJwt, requireTenant, purchaseOrderRoutes);
  app.use("/api/v1/sales-order", authenticateJwt, requireTenant, salesOrderRoutes);
  app.use("/api/v1/transaction", authenticateJwt, requireTenant, transactionRoutes);
  app.use("/api/v1/report", authenticateJwt, requireTenant, reportRoutes);
  app.use("/api/v1/setting", authenticateJwt, requireTenant, settingRoutes);
  app.use("/api/v1/audit-log", authenticateJwt, requireTenant, auditLogRoutes);
  app.use("/api/v1/warehouse-visual", authenticateJwt, requireTenant, warehouseVisualRoutes);
  app.use("/api/v1/serials", authenticateJwt, requireTenant, serialNumberRoutes);
  app.use("/api/v1/stock-ledger", authenticateJwt, requireTenant, stockLedgerRouter);
  app.use("/api/v1/wms", authenticateJwt, requireTenant, wmsOperationsRouter);
  app.use("/api/v1/rbac", authenticateJwt, requireTenant, rbacRoutes);
  app.use("/api/v1/sessions", authenticateJwt, requireTenant, sessionRoutes);
  app.use("/api/v1/bulk-import", authenticateJwt, requireTenant, bulkImportRoutes);
  
  // Realtime & Compliance Extensions
  app.use("/api/v1/stream", realtimeRoutes);
  app.use("/api/v1/e-signature", eSignatureRoutes);
  app.use("/api/v1/qms", qmsRoutes);
  app.use("/api/v1/audit-events", auditEventsRoutes);

  // ===== Protected AI analysis endpoint =====
  app.post("/api/analyze", aiLimiter, authenticateJwt, requireTenant, async (req, res) => {
    try {
      const {
        inventory,
        kits,
        customPrompt,
        currentKitsPacked,
        selectedKitId,
      } = req.body;

      if (!env.geminiApiKey) {
        return res.status(503).json({
          error: "Gemini API key is not configured.",
        });
      }

      const client = new GoogleGenAI({ apiKey: env.geminiApiKey });

      const outOfStockItems = (inventory || []).filter(
        (i: any) => (i.quantity ?? 0) <= 0
      );
      const lowStockItems = (inventory || []).filter(
        (i: any) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= (i.threshold ?? 5)
      );

      const systemInstruction = `
You are an expert Warehouse Management and Production Planning Copilot for Experimind Labs.
Analyze the provided laboratory inventory stock levels, BOM requirements, kit pack states, and shortage risks.
Provide clear, actionable recommendations with root causes, priority badges [CRITICAL | WARNING | NORMAL], and concrete procurement/replenishment actions.
`;

      const prompt = `
Current Inventory Status:
${JSON.stringify(
        (inventory || []).map((item: any) => ({
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          threshold: item.threshold,
          isCommon: item.isCommon,
        })),
        null,
        2
      )}

Active BOM kit definitions:
${JSON.stringify(kits, null, 2)}

Key Issues observed:
- Out of stock items: ${JSON.stringify(
        outOfStockItems.map((i: any) => i.name)
      )}
- Low stock items (below safety threshold): ${JSON.stringify(
        lowStockItems.map((i: any) => i.name)
      )}

User is asking: "${customPrompt ||
        "Generate an inventory audit and procurement action list."}"
`;

      const response = await client.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({
        analysis: response.text ?? "No analysis generated.",
      });
    } catch (error: any) {
      console.error("Gemini analysis error:", error);
      res.status(500).json({
        error:
          error.message ?? "An error occurred during Gemini AI analysis.",
      });
    }
  });

  // ===== Vite Middleware for Development =====
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Centralized Error Handler Middleware
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
  });
}

// Lazy-loaded GoogleGenAI client to avoid crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is required but not set."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});