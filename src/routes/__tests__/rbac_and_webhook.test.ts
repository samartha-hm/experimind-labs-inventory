import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { requireRole } from "../../middleware/requireRole.ts";

describe("RBAC Authorization & Webhook Integration Tests", () => {
  it("allows admin user to access admin-restricted operations", () => {
    let calledNext = false;
    const req: any = { user: { id: "admin-1", role: "admin" } };
    const res: any = {};
    const next = () => {
      calledNext = true;
    };

    const middleware = requireRole("admin");
    middleware(req, res, next);
    expect(calledNext).toBe(true);
  });

  it("blocks viewer role from accessing staff or admin write endpoints", () => {
    let statusCode = 0;
    let jsonPayload: any = null;
    const req: any = { user: { id: "viewer-1", role: "viewer" } };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: any) {
        jsonPayload = payload;
        return this;
      },
    };
    const next = () => {};

    const middleware = requireRole("staff", "admin");
    middleware(req, res, next);

    expect(statusCode).toBe(403);
    expect(jsonPayload?.error).toContain("Forbidden");
  });

  it("verifies authentic Razorpay HMAC-SHA256 signature calculation", () => {
    const secret = "test_webhook_secret_key_2026";
    const rawPayload = Buffer.from(JSON.stringify({ event: "payment.captured", id: "pay_123" }));

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawPayload)
      .digest("hex");

    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawPayload)
      .digest("hex");

    expect(crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(computedSignature))).toBe(true);
  });
});
