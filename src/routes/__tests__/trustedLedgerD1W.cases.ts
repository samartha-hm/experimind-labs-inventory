import { createHash, randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { expect } from "vitest";
import type { User } from "../../entity/User";
import type { AuthService } from "../../services/AuthService";
import { TrustedLedgerAuthority, type LedgerRequest } from "../../security/TrustedLedgerAuthority";
import { ledgerTables } from "../../security/databaseBoundary";
import { env } from "../../config/env";
import type { LedgerOperation } from "../../services/CommitmentLedgerService";

/** Independent D1W additions: real connections, exact payload and reverse race ordering. */
export async function verifyD1W(input: {
  writer: DataSource; identity: DataSource; auth: AuthService; authority: TrustedLedgerAuthority;
  admin: User; password: string; account: string; entitlement: string;
  schema: string; evidence: Record<string, unknown>;
}) {
  const { writer, identity, auth, authority, admin } = input;
  const snapshot = () => writer.query(ledgerTables.map(t =>
    `SELECT '${t}' object,count(*)::int n,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${t} t`).join(" UNION ALL "));
  const reject = async (attempt: () => Promise<unknown>) => {
    const before = await snapshot();
    await expect(attempt()).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  };
  const request = (): Extract<LedgerRequest, { action: "execute" }> & {
    operation: Extract<LedgerOperation, { kind: "open" }>
  } => ({
    action: "execute", key: randomUUID(), account: input.account, entitlement: input.entitlement,
    reason: "D1W isolated verification", operation: { kind: "open", payload: {
      claim: randomUUID(), quantity: "0.001", source: { kind: "synthetic:test", id: randomUUID(), slice: "whole" },
    } },
  });
  const login = await auth.login(admin.email, input.password);
  const r = request(), cap = await authority.issue(login.token!, r);
  const peer = new DataSource({ ...writer.options, logging: false });
  await peer.initialize();
  try {
    const peerAuthority = await TrustedLedgerAuthority.create(peer, env.jwtSecret, input.schema);
    const runner = writer.createQueryRunner(); await runner.connect();
    try {
      const a = (await runner.query("SELECT pg_backend_pid() pid"))[0].pid;
      const b = (await peer.query("SELECT pg_backend_pid() pid"))[0].pid;
      expect(a).not.toBe(b);
    } finally { await runner.release(); }
    const attacks: LedgerOperation[] = [
      { ...r.operation, payload: { ...r.operation.payload, quantity: "0.002" } },
      { ...r.operation, payload: { ...r.operation.payload, source: { kind: "synthetic:test", id: randomUUID(), slice: "whole" } } },
      { kind: "authorize", payload: {} },
    ];
    for (const operation of attacks) await reject(() => peerAuthority.perform(cap, { ...r, operation }));
    await reject(() => peerAuthority.entitlement(cap, r.account, randomUUID(), 1, "1", [], r.key));
    // Object property order is canonical; a semantically identical retry succeeds.
    const reordered: LedgerRequest = { operation: r.operation, reason: r.reason,
      entitlement: r.entitlement, account: r.account, key: r.key, action: r.action };
    const result = await authority.perform(cap, r), committed = await snapshot();
    expect(await peerAuthority.perform(cap, reordered)).toEqual(result);
    expect(await snapshot()).toEqual(committed);
    await reject(() => peerAuthority.perform(cap, { ...r, key: randomUUID() }));
    await auth.revokeRefreshToken(login.refreshToken!);
    await reject(() => peerAuthority.perform(cap, r));
    expect(await snapshot()).toEqual(committed);

    // Hold the same UPDATE lock logout uses, start execution, then commit revocation.
    // The waiter must observe the revoked row after acquiring its SHARE lock.
    const raceLogin = await auth.login(admin.email, input.password), race = request();
    const raceCap = await authority.issue(raceLogin.token!, race);
    const blocker = identity.createQueryRunner(); await blocker.connect(); await blocker.startTransaction();
    let pending: Promise<boolean> | undefined;
    const before = await snapshot();
    try {
      await blocker.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [admin.id]);
      await blocker.query("UPDATE refresh_tokens SET is_revoked=true WHERE token_hash=$1",
        [createHash("sha256").update(raceLogin.refreshToken!).digest("hex")]);
      const [{ pid }] = await blocker.query("SELECT pg_backend_pid() pid");
      pending = peerAuthority.perform(raceCap, race).then(() => false, () => true);
      let waiting = false;
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        waiting = (await writer.query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))) waiting", [pid]))[0].waiting;
        if (waiting) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      await blocker.commitTransaction();
      expect(await pending).toBe(true);
      expect(await snapshot()).toEqual(before);
      await reject(() => peerAuthority.perform(raceCap, race));
    } finally {
      if (blocker.isTransactionActive) await blocker.rollbackTransaction();
      await blocker.release();
      if (pending) await pending;
    }
    input.evidence.independent_d1w = { verdict: "PASS", distinct_backend_connections: true,
      quantity_source_kind_and_alternate_entry: "DENIED; eight ledger hashes unchanged",
      canonical_property_order_retry: "same committed result; no writes",
      cross_connection_logout_retry: "DENIED; immutable history preserved",
      logout_wins_barrier: "waiting execution denied after revocation commit; no writes" };
  } finally { await peer.destroy(); }
}
