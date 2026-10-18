import jwt from "jsonwebtoken";
import type { DataSource } from "typeorm";
import { CommitmentLedgerService } from "../services/CommitmentLedgerService";
import type { LedgerAccountInput, LedgerOperation } from "../services/CommitmentLedgerService";
import { assertDatabaseBoundary } from "./databaseBoundary";

/** Server-only boundary. The pool/key must never be exposed to SQL clients or request callbacks.
 * No production route or operational adapter is enabled by this foundation.
 */
export class TrustedLedgerAuthority {
  #service: CommitmentLedgerService;
  #key: string;
  private constructor(db: DataSource, key: string) {
    this.#service = new CommitmentLedgerService(db);
    this.#key = key;
  }
  static async create(db: DataSource, key: string, schema: string): Promise<TrustedLedgerAuthority> {
    if (key.length < 32) throw new Error("Strong server signing key required");
    await assertDatabaseBoundary(db, "ledger", schema);
    return new TrustedLedgerAuthority(db, key);
  }
  private actor(token: string) {
    const p = jwt.verify(token, this.#key, { algorithms: ["HS256"] });
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof p === "string" || typeof p.sub !== "string" || !uuid.test(p.sub) ||
      typeof p.orgId !== "string" || !uuid.test(p.orgId) || !Number.isInteger(p.exp) ||
      !["admin", "super_admin"].includes(p.role) || p.type || p.purpose ||
      p.orgId === "00000000-0000-0000-0000-000000000000") throw new Error("Authenticated administrator token required");
    return { actor: p.sub, organization: p.orgId };
  }
  createAccount(token: string, input: LedgerAccountInput) {
    return this.#service.createAccount(this.actor(token), input);
  }
  entitlement(token: string, account: string, approval: string, revision: number, cap: string, provenance: unknown) {
    return this.#service.entitlement(this.actor(token), account, approval, revision, cap, provenance);
  }
  execute(token: string, account: string, entitlement: string, key: string, reason: string, operation: LedgerOperation) {
    return this.#service.execute(this.actor(token), account, entitlement, key, reason, operation);
  }
}
