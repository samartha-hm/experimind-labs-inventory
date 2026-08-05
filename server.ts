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

  // Security Headers & CORS
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: env.nodeEnv === "production" ? env.appUrl : true,
    credentials: true,
  }));

  // Rate Limiters
  const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, standardHeaders: true });

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
      const isConnected = AppDataSource.isInitialized;
      if (isConnected) {
        return res.status(200).json({ status: "ready", db: "connected" });
      }
      return res.status(503).json({ status: "not_ready", db: "disconnected" });
    } catch (err: any) {
      return res.status(503).json({ status: "error", error: err.message });
    }
  });

  // ===== Razorpay Webhook Public Endpoint =====
  app.use("/api/public/webhook", webhookRoutes);

  // ===== Versioned API (protected) =====
  app.use("/api/v1/auth", authLimiter, authRoutes);
  app.use("/api/v1/orders", orderRoutes);
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

  // ===== Existing AI analysis endpoint (unchanged) =====
  app.post("/api/analyze", async (req, res) => {
    try {
      const {
        inventory,
        kits,
        customPrompt,
        currentKitsPacked,
        selectedKitId,
      } = req.body;

      if (!inventory || !kits) {
        return res
          .status(400)
          .json({ error: "Missing inventory or kits data" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({
          error:
            "Gemini API key is not configured. Please add GEMINI_API_KEY under Settings > Secrets in AI Studio.",
        });
      }

      const client = getGeminiClient();

      const lowStockItems = inventory.filter(
        (item: any) => item.stockQty < item.threshold && !item.isCommon
      );
      const outOfStockItems = inventory.filter(
        (item: any) => item.stockQty === 0
      );

      const systemInstruction = `You are an expert Hardware supply-chain logistics manager and procurement analyst.
Your job is to analyze the stock levels, kit BOM requirements, and current shortages for the "Tester Pro" educational electronics kit.
Provide professional, highly structured, actionable guidance on:
1. Critical procurement needs (which components to order immediately, prioritising parts with lead times or absolute zero stock like MQ-135, Air Quality sensor, etc.).
2. Workarounds or kitting suggestions (e.g., if out of certain sensors, pack alternative kits or partial kits).
3. Draft a precise email or purchase list for suppliers that can be copy-pasted.
Keep the tone helpful, objective, and professional. Use markdown tables and lists for clarity.`;

      const prompt = `
Analyze the following inventory and kitting situation.
Selected Kit: ${selectedKitId || "All"}
Current stock list:
${JSON.stringify(
        inventory.map((item: any) => ({
          name: item.name,
          category: item.category,
          qty: item.stockQty,
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
        model: "gemini-3.5-flash",
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
      const errorStr = String(error);
      if (errorStr.includes("503") || errorStr.includes("UNAVAILABLE")) {
        console.warn("Gemini API is currently experiencing high demand.");
        return res.status(503).json({
          error:
            "The AI model is currently experiencing high demand. Please try again in a few moments.",
        });
      }

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