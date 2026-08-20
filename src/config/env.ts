import dotenv from "dotenv";
dotenv.config();

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes("super-secret-jwt-key")) {
    throw new Error("[FATAL] In production mode, process.env.JWT_SECRET must be set to a secure 32+ char secret.");
  }
  if ((process.env.JWT_SECRET?.length ?? 0) < 32) {
    throw new Error("[FATAL] JWT_SECRET must be at least 32 characters long for production security.");
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/experimind_inventory",
  jwtSecret: process.env.JWT_SECRET ?? "super-secret-jwt-key-experimind-labs-inventory-2026-secure",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  allowGuest: process.env.ALLOW_GUEST === "true",
  guestRole: process.env.GUEST_ROLE ?? "viewer",
};
