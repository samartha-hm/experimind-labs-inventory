import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import jwt from "jsonwebtoken";
import type { Server } from "node:http";
import { env } from "../../config/env.ts";
import { legacyOperationsGate, legacyOperationalPaths } from "../legacyOperationsGate.ts";

describe("legacy operational HTTP access boundary", () => {
  let server: Server;
  let baseUrl: string;
  let handlerCalls = 0;
  beforeAll(async () => {
    const app = express();
    app.use(legacyOperationalPaths, legacyOperationsGate());
    app.use((_req, res) => { handlerCalls++; res.json({ leaked: true }); });
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test server port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  function token(role: string, orgId?: string) {
    return jwt.sign({ sub: "test-user", role, orgId }, env.jwtSecret, { expiresIn: "1m" });
  }
  const tenantA = "11111111-1111-4111-8111-111111111111";
  const tenantB = "22222222-2222-4222-8222-222222222222";
  it.each(legacyOperationalPaths)("protects all methods on %s", async path => {
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      const response = await fetch(`${baseUrl}${path}/test`, { method });
      expect(response.status).toBe(401);
    }
  });
  it("rejects malformed tokens", async () => {
    expect((await fetch(`${baseUrl}/api/projects`, { headers: { Authorization: "Bearer invalid" } })).status).toBe(401);
  });
  it.each([undefined, "invalid", "00000000-0000-0000-0000-000000000000"])("rejects missing or invalid tenant %s", async orgId => {
    expect((await fetch(`${baseUrl}/api/projects`, { headers: { Authorization: `Bearer ${token("admin", orgId)}` } })).status).toBe(403);
  });
  it("rejects viewer writes", async () => {
    expect((await fetch(`${baseUrl}/api/projects`, { method: "POST", headers: { Authorization: `Bearer ${token("viewer", tenantA)}` } })).status).toBe(403);
  });
  it("cannot leak shared legacy state to either tenant, including admins", async () => {
    for (const orgId of [tenantA, tenantB]) {
      for (const path of legacyOperationalPaths) {
        const response = await fetch(`${baseUrl}${path}/other-tenant-id`, { headers: { Authorization: `Bearer ${token("admin", orgId)}` } });
        expect(response.status).toBe(503);
        expect(await response.json()).toHaveProperty("code", "LEGACY_OPERATIONS_DISABLED");
      }
    }
    expect(handlerCalls).toBe(0);
  });
});
