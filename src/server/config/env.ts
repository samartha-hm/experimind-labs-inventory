import "dotenv/config";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const database = z.url({ protocol: /^postgres(?:ql)?$/ });
const webUrl = z.url({ protocol: /^https?$/ });
const flag = z.enum(["true", "false"]).default("false").transform(value => value === "true");
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().trim().min(1).default("0.0.0.0"),
  DATABASE_URL: database.optional(),
  IDENTITY_DATABASE_URL: database.optional(),
  RECEIPT_LEDGER_DATABASE_URL: database.optional(),
  JWT_SECRET: z.string().min(1).optional(),
  JWT_EXPIRES_IN: z.string().min(1).default("24h"),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("30d"),
  APP_URL: webUrl.optional(),
  PUBLIC_ERP_URL: webUrl.optional(),
  PUBLIC_SHOP_URL: webUrl.optional(),
  ALLOW_GUEST: flag,
  ENABLE_RLS: flag,
  GEMINI_API_KEY: z.string().default(""),
  MFA_ISSUER: z.string().min(1).default("Experimind Inventory"),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV !== "production") return;
  for (const key of ["DATABASE_URL", "IDENTITY_DATABASE_URL"] as const) {
    if (!value[key]) ctx.addIssue({ code: "custom", path: [key], message: "Required for production" });
  }
  if (!value.JWT_SECRET || value.JWT_SECRET.length < 32 || value.JWT_SECRET.includes("super-secret-jwt-key")) {
    ctx.addIssue({ code: "custom", path: ["JWT_SECRET"], message: "Secure production secret required" });
  }
});

export function parseEnvironment(input: NodeJS.ProcessEnv) {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error("Invalid environment settings: " + result.error.issues.map(i => i.path.join(".")).join(", "));
  const v = result.data;
  const publicErpUrl = v.PUBLIC_ERP_URL ?? v.APP_URL ?? "https://inventory.experimindlabs.com";
  return {
    nodeEnv: v.NODE_ENV, host: v.HOST, port: v.PORT,
    databaseUrl: v.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/experimind_inventory",
    jwtSecret: v.JWT_SECRET ?? randomBytes(32).toString("hex"),
    jwtExpiresIn: v.JWT_EXPIRES_IN, jwtRefreshExpiresIn: v.JWT_REFRESH_EXPIRES_IN,
    geminiApiKey: v.GEMINI_API_KEY, appUrl: v.APP_URL ?? publicErpUrl,
    publicErpUrl, publicShopUrl: v.PUBLIC_SHOP_URL ?? "https://shop.experimindlabs.com",
    allowGuest: v.ALLOW_GUEST, guestRole: "viewer", enableRls: v.ENABLE_RLS, mfaIssuer: v.MFA_ISSUER,
  };
}

export const env = parseEnvironment(process.env);
