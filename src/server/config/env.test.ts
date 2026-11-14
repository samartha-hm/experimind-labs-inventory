import { expect, it } from "vitest";
import { parseEnvironment } from "./env";

it("provides development defaults and honors configured public URLs", () => {
  const config = parseEnvironment({ PUBLIC_ERP_URL: "https://erp.example", PUBLIC_SHOP_URL: "https://shop.example" });
  expect(config).toMatchObject({ port: 3000, appUrl: "https://erp.example", publicShopUrl: "https://shop.example" });
  expect(parseEnvironment({ APP_URL: "http://127.0.0.1:3000" }).appUrl).toBe("http://127.0.0.1:3000");
  expect(config.jwtSecret.length).toBeGreaterThanOrEqual(32);
});
it("rejects invalid production credentials and URLs without exposing their values", () => {
  expect(() => parseEnvironment({ NODE_ENV: "production" })).toThrow(/DATABASE_URL.*IDENTITY_DATABASE_URL.*JWT_SECRET/);
  expect(() => parseEnvironment({ DATABASE_URL: "secret" })).toThrow(/^Invalid environment settings: DATABASE_URL$/);
  expect(() => parseEnvironment({ PORT: "65536", PUBLIC_SHOP_URL: "file:///etc" })).toThrow(/PORT.*PUBLIC_SHOP_URL/);
});
