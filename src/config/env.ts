import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();

// Ensure a secure secret is always used
let effectiveJwtSecret = process.env.JWT_SECRET;
if (!effectiveJwtSecret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[FATAL] In production mode, process.env.JWT_SECRET must be set to a secure 32+ char secret.");
  } else {
    // Generate a secure ephemeral secret for development if none provided
    effectiveJwtSecret = crypto.randomBytes(32).toString("hex");
    console.warn("[SECURITY WARNING] No JWT_SECRET provided in environment. Generated ephemeral 256-bit development key.");
  }
} else if (process.env.NODE_ENV === "production") {
  if (effectiveJwtSecret.includes("super-secret-jwt-key") || effectiveJwtSecret.length < 32) {
    throw new Error("[FATAL] In production mode, process.env.JWT_SECRET must be at least 32 characters long and not use default patterns.");
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/experimind_inventory",
  jwtSecret: effectiveJwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m", // Reduced to 15m for security
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  allowGuest: process.env.ALLOW_GUEST === "true",
  guestRole: "viewer", // Strictly restricted to viewer role
  enableRls: process.env.ENABLE_RLS === "true",
  mfaIssuer: process.env.MFA_ISSUER ?? "Experimind Inventory",
};

