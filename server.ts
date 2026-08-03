import "reflect-metadata";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { AppDataSource } from "./src/db.ts";
import authRoutes from "./src/routes/v1/auth.ts";
import { authenticateJwt } from "./src/middleware/auth.ts";
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
import dotenv from "dotenv";

dotenv.config();

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
  const PORT = Number(process.env.PORT ?? 3000);

  // Parsers for JSON requests
  app.use(express.json({ limit: "10mb" }));

  // Simple request logger
  app.use((req, res, next) => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url}`
    );
    next();
  });

  // ===== Legacy shop routes (to be added later) =====
  // Example: app.use("/api/assets", legacyAssetRoutes);
  // For now we leave a placeholder comment.

  // ===== Versioned API (protected) =====
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/inventory", authenticateJwt, inventoryRoutes);
  app.use("/api/v1/warehouse", authenticateJwt, warehouseRoutes);
  app.use("/api/v1/bin", authenticateJwt, binRoutes);
  app.use("/api/v1/kit", authenticateJwt, kitRoutes);
  app.use("/api/v1/vendor", authenticateJwt, vendorRoutes);
  app.use("/api/v1/customer", authenticateJwt, customerRoutes);
  app.use("/api/v1/purchase-order", authenticateJwt, purchaseOrderRoutes);
  app.use("/api/v1/sales-order", authenticateJwt, salesOrderRoutes);
  app.use("/api/v1/transaction", authenticateJwt, transactionRoutes);
  app.use("/api/v1/report", authenticateJwt, reportRoutes);
  app.use("/api/v1/setting", authenticateJwt, settingRoutes);

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

  // Global error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  });

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