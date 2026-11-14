import express from "express";
import rateLimit from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.ts";
import { authenticateJwt } from "../../middleware/auth.ts";
import { requireTenant } from "../../middleware/tenant.ts";

export function mountAnalysis(app: express.Express) {
  const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: "AI analysis rate limit exceeded. Please try again later." } });
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
}
