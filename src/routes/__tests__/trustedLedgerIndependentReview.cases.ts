import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { DataSource } from "typeorm";
import { expect } from "vitest";
import { env } from "../../config/env";
import type { User } from "../../entity/User";
import type { AuthService } from "../../services/AuthService";
import type { TrustedLedgerAuthority } from "../../security/TrustedLedgerAuthority";

/** D1U finding characterizations: successful attacks are findings, NOT security PASS. */
export async function independentIdentityReview(input: {
  runtime: DataSource; identity: DataSource; writer: DataSource; auth: AuthService;
  authority: TrustedLedgerAuthority; admin: User; token: string; account: string;
  entitlement: string; password: string; evidence: Record<string, unknown>;
}) {
  const { runtime, writer, auth, authority, admin, token, account, entitlement, evidence } = input;
  const identities = [];
  for (const pool of [runtime, input.identity, writer])
    identities.push((await pool.query("SELECT current_user AS login, session_user AS session"))[0]);
  expect(new Set(identities.map(r => r.login)).size).toBe(3);
  for (const r of identities) expect(r.login).toBe(r.session);
  const op = () => ({ kind: "open" as const, payload: { claim: randomUUID(), quantity: "0.001",
    source: { kind: "synthetic:test" as const, id: randomUUID(), slice: "whole" } } });
  const execute = async (bearer: string) => authority.execute(bearer, account, entitlement,
    randomUUID(), "D1U synthetic finding characterization", op());
  // A SQL attacker can decode, but cannot alter a real signature or substitute identities.
  const [header, payload, signature] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  for (const substitute of [{ sub: randomUUID() }, { orgId: randomUUID() }]) {
    const altered = Buffer.from(JSON.stringify({ ...claims, ...substitute })).toString("base64url");
    await expect(execute(`${header}.${altered}.${signature}`)).rejects.toThrow();
  }
  await expect(execute(`${header}.${payload}.${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`)).rejects.toThrow();
  await expect(execute(jwt.sign({ ...claims, purpose: "password_reset" }, env.jwtSecret))).rejects.toThrow();
  await expect(execute(jwt.sign({ ...claims, nbf: Math.floor(Date.now()/1000)+3600 }, env.jwtSecret))).rejects.toThrow();
  // SQL-only callers cannot read server configuration or secret files.
  await expect(runtime.query("SELECT pg_read_file('postgresql.conf')")).rejects.toMatchObject({ code: "42501" });
  await expect(runtime.query("SELECT * FROM pg_authid")).rejects.toMatchObject({ code: "42501" });
  // Actual logout revokes the refresh identity, but not its already-issued bearer.
  const refresh = await auth.refreshAccessToken((await auth.login(admin.email,
    input.password)).refreshToken!);
  await auth.revokeRefreshToken(refresh.refreshToken);
  await expect(auth.refreshAccessToken(refresh.refreshToken)).rejects.toThrow();
  const afterLogout = await execute(refresh.token);
  expect(afterLogout.actor_id).toBe(admin.id);
  // Same access token can authorize distinct new events; idempotency is not token replay prevention.
  const replay1 = await execute(token), replay2 = await execute(token);
  expect(replay1.id).not.toBe(replay2.id);
  // Signed tokens meant for another audience / restricted scope are accepted.
  // Signing here is a trusted issuer fixture; the SQL attacker does NOT possess the key.
  const otherScope = jwt.sign({ ...claims, aud: "unrelated-service", scope: "read:profile",
    account_id: randomUUID(), operation: "read" }, env.jwtSecret);
  const scopeEvent = await execute(otherScope);
  expect(scopeEvent.actor_id).toBe(admin.id);
  evidence.independent_d1u = { verdict: "BLOCKED", actual_logins: identities,
    signature_modification: "DENIED", future_token: "DENIED", explicit_reset_purpose: "DENIED",
    signing_authority_files: "DENIED", logout_refresh: "DENIED",
    logout_access_new_write: "FINDING: ACCEPTED", bearer_replay_new_keys: "FINDING: ACCEPTED",
    wrong_audience_scope_account_operation: "FINDING: ACCEPTED",
    event_ids: [afterLogout.id, replay1.id, replay2.id, scopeEvent.id] };
}
