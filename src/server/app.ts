import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { createServer as createViteServer } from "vite";
import { env } from "../config/env.ts";
import { errorHandler } from "../middleware/errorHandler.ts";
import type { TrustedLedgerAuthority } from "../security/TrustedLedgerAuthority";
import { mountAnalysis } from "./routes/analysis";
import { mountHealth } from "./routes/health";
import { mountApi } from "./routes/api";

export async function createApp(receiptAuthority?: TrustedLedgerAuthority) {

  const app = express();

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
  const allowedOrigins = [
    new URL(env.publicErpUrl).origin,
    new URL(env.publicShopUrl).origin,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    env.appUrl,
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || env.nodeEnv !== "production") {
        callback(null, true);
      } else if (origin.endsWith(".experimindlabs.com")) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  }));

  // Rate Limiters
  const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true });

  // Development asset requests must not consume the API request budget.
  app.use("/api", globalLimiter);

  // High-speed HTTP Gzip/Deflate compression
  app.use(compression());

  // Raw Buffer Parser for Razorpay Webhook HMAC Verification
  app.use("/api/public/webhook/razorpay", express.raw({ type: "application/json" }));

  // Parsers for JSON requests and cookies
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  // Simple request logger
  app.use((req, res, next) => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path}`
    );
    next();
  });

  mountHealth(app);
  mountApi(app, receiptAuthority);
  mountAnalysis(app);
  // ===== Vite Middleware for Development =====
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          } else if (filePath.includes("/assets/")) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      })
    );
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Centralized Error Handler Middleware
  app.use(errorHandler);
  return app;
}
