import jwt, { type JwtPayload } from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import { CommitmentLedgerService, type LedgerAccountInput, type LedgerOperation, type LedgerEvent } from "../services/CommitmentLedgerService";
import { canonicalRequirementJSON } from "../services/RequirementApprovalService";
import { assertDatabaseBoundary } from "./databaseBoundary";

export type LedgerRequest =
  | { action: "createAccount"; key: string; input: LedgerAccountInput }
  | { action: "entitlement"; key: string; account: string; approval: string; revision: number; cap: string; provenance: unknown }
  | { action: "execute"; key: string; account: string; entitlement: string; reason: string; operation: LedgerOperation };
const issuer = "experimind-ledger";
const audience = "experimind-ledger-execution";
const fingerprint = (request: LedgerRequest) => createHash("sha256").update(canonicalRequirementJSON(request)).digest("hex");

/** Private server issuer and executor. Neither pool nor signing key is available to runtime SQL.
 * No production route or operational adapter is enabled by this foundation.
 */
export class TrustedLedgerAuthority {
  #db: DataSource;
  #key: string;
  private constructor(db: DataSource, key: string) { this.#db = db; this.#key = key; }
  static async create(db: DataSource, key: string, schema: string): Promise<TrustedLedgerAuthority> {
    if (key.length < 32) throw new Error("Strong server signing key required");
    await assertDatabaseBoundary(db, "ledger", schema);
    return new TrustedLedgerAuthority(db, key);
  }
  private claims(token: string, capability: boolean): JwtPayload {
    const p = jwt.verify(token, this.#key, { algorithms: ["HS256"],
      issuer: capability ? issuer : "experimind-auth",
      audience: capability ? audience : "experimind-api" });
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof p === "string" || !uuid.test(p.sub ?? "") || typeof p.orgId !== "string" || !uuid.test(p.orgId) ||
      p.iss !== (capability ? issuer : "experimind-auth") || p.aud !== (capability ? audience : "experimind-api") ||
      !Number.isInteger(p.exp) || !Number.isInteger(p.iat) || p.exp! <= p.iat! || p.iat! > Math.floor(Date.now()/1000) ||
      typeof p.sid !== "string" || !/^[a-f0-9]{64}$/.test(p.sid) ||
      !["admin", "super_admin"].includes(p.role) || p.type || p.purpose ||
      p.orgId === "00000000-0000-0000-0000-000000000000" ||
      (capability && (!uuid.test(p.jti ?? "") || p.exp! - p.iat! > 60 || p.scope !== "ledger:mutate")))
      throw new Error("Authenticated administrator session required");
    return p;
  }
  private async current(m: EntityManager, p: JwtPayload): Promise<void> {
    // All session revocation paths acquire this same user row FOR UPDATE first.
    if (!(await m.query(`SELECT id FROM users WHERE id=$1 AND organization_id=$2 AND is_active
      AND role IN ('admin','super_admin') FOR SHARE`, [p.sub, p.orgId])).length)
      throw new Error("Active tenant administrator required");
    if (!(await m.query(`SELECT id FROM refresh_tokens WHERE user_id=$1 AND token_hash=$2
      AND NOT is_revoked AND expires_at>clock_timestamp()`, [p.sub, p.sid])).length)
      throw new Error("Session revoked or expired");
    if ((await m.query(`SELECT id FROM sessions WHERE user_id=$1 AND refresh_token_hash=$2
      AND (is_revoked OR expires_at<=clock_timestamp())`, [p.sub, p.sid])).length)
      throw new Error("Session revoked or expired");
    if ((await m.query("SELECT extract(epoch FROM clock_timestamp()) >= $1 expired", [p.exp]))[0].expired)
      throw new Error("Authorization expired");
  }
  /** Only authenticated server code can call the issuer; no SQL minting function exists. */
  async issue(accessToken: string, request: LedgerRequest): Promise<string> {
    // Snapshot input before any asynchronous work; bind the exact JSON accepted by execution.
    const normalized = JSON.parse(JSON.stringify(request)) as LedgerRequest;
    if (!normalized.key.trim() || normalized.key.length > 100) throw new Error("Operation key required");
    const p = this.claims(accessToken, false);
    return this.#db.transaction(async m => {
      await this.current(m, p);
      return jwt.sign({ sub: p.sub, orgId: p.orgId, role: p.role, sid: p.sid,
        scope: "ledger:mutate", action: normalized.action, operationKey: normalized.key,
        fingerprint: fingerprint(normalized) }, this.#key, { algorithm: "HS256", issuer, audience,
        jwtid: randomUUID(), expiresIn: Math.min(60, p.exp! - Math.floor(Date.now()/1000)) });
    });
  }
  async perform(token: string, request: LedgerRequest): Promise<string | LedgerEvent> {
    const normalized = JSON.parse(JSON.stringify(request)) as LedgerRequest;
    const p = this.claims(token, true), digest = fingerprint(normalized);
    if (p.action !== normalized.action || p.operationKey !== normalized.key || p.fingerprint !== digest)
      throw new Error("Capability execution scope mismatch");
    return this.#db.transaction(async m => {
      await this.current(m, p);
      await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [`capability:${p.orgId}:${p.sub}:${normalized.key}`]);
      const [receipt] = await m.query(`SELECT * FROM commitment_authorizations
        WHERE id=$1 OR (organization_id=$2 AND actor_id=$3 AND operation_key=$4)`,
        [p.jti, p.orgId, p.sub, normalized.key]);
      if (receipt) {
        if (receipt.id !== p.jti || receipt.fingerprint !== digest || receipt.organization_id !== p.orgId ||
          receipt.actor_id !== p.sub || receipt.operation_key !== normalized.key)
          throw new Error("Authorization replay conflict");
        await this.current(m, p);
        return receipt.result;
      }
      const service = new CommitmentLedgerService(m), context = { actor: p.sub!, organization: p.orgId as string };
      let result: string | LedgerEvent;
      switch (normalized.action) {
        case "createAccount": result = await service.createAccount(context, normalized.input); break;
        case "entitlement": result = await service.entitlement(context, normalized.account, normalized.approval,
          normalized.revision, normalized.cap, normalized.provenance); break;
        case "execute": result = await service.executeInTransaction(m, context, normalized.account,
          normalized.entitlement, normalized.key, normalized.reason, normalized.operation); break;
        default: throw new Error("Unknown ledger action");
      }
      await m.query(`INSERT INTO commitment_authorizations(id,organization_id,actor_id,operation_key,fingerprint,result)
        VALUES($1,$2,$3,$4,$5,$6::jsonb)`, [p.jti,p.orgId,p.sub,normalized.key,digest,JSON.stringify(result)]);
      await this.current(m, p);
      return JSON.parse(JSON.stringify(result)) as string | LedgerEvent;
    });
  }
  createAccount(token: string, input: LedgerAccountInput, key: string) {
    return this.perform(token, { action: "createAccount", key, input }) as Promise<string>;
  }
  entitlement(token: string, account: string, approval: string, revision: number, cap: string, provenance: unknown, key: string) {
    return this.perform(token, { action: "entitlement", key, account, approval, revision, cap, provenance }) as Promise<string>;
  }
  execute(token: string, account: string, entitlement: string, key: string, reason: string, operation: LedgerOperation) {
    return this.perform(token, { action: "execute", key, account, entitlement, reason, operation }) as Promise<LedgerEvent>;
  }
}
