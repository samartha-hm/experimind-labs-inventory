import { AppDataSource } from "../db.ts";
import { AuditEvent } from "../entity/AuditEvent.ts";
import crypto from "crypto";

export interface LogAuditEventParams {
  organizationId?: string;
  actorId: string;
  actorName?: string;
  actorRole?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: any;
  afterState?: any;
  delta?: any;
  reasonCode?: string;
}

export interface ChainVerificationResult {
  isValid: boolean;
  totalEventsChecked: number;
  tamperedEventIndex?: number;
  tamperedEventId?: string;
  reason?: string;
  verifiedAt: string;
}

export class AuditService {
  private static GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

  public static computeEventHash(params: {
    previousHash: string;
    organizationId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeState?: any;
    afterState?: any;
    createdAtTimestamp: number | string;
  }): string {
    const payload = JSON.stringify({
      previousHash: params.previousHash,
      orgId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: String(params.entityId),
      before: params.beforeState || null,
      after: params.afterState || null,
      timestamp: params.createdAtTimestamp,
    });

    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Append an immutable, cryptographic hash-chained audit event.
   * Can be executed inside an existing transaction EntityManager or standalone.
   */
  public static async logEvent(
    params: LogAuditEventParams,
    transactionalManager?: any
  ): Promise<AuditEvent> {
    const manager = transactionalManager || AppDataSource.manager;
    const orgId = params.organizationId || "00000000-0000-0000-0000-000000000000";

    // 1. Fetch latest event in organization to obtain previous hash
    const latestEvent = await manager.findOne(AuditEvent, {
      where: { organization_id: orgId },
      order: { sequence_number: "DESC" },
    });

    const previousHash = latestEvent ? latestEvent.event_hash : this.GENESIS_HASH;
    const timestamp = new Date();

    // 2. Compute SHA-256 bound hash
    const eventHash = this.computeEventHash({
      previousHash,
      organizationId: orgId,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeState: params.beforeState,
      afterState: params.afterState,
      createdAtTimestamp: timestamp.getTime(),
    });

    const event = manager.create(AuditEvent, {
      organization_id: orgId,
      actor_id: params.actorId,
      actor_name: params.actorName || "System Operator",
      actor_role: params.actorRole || "viewer",
      session_id: params.sessionId || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: String(params.entityId),
      before_state: params.beforeState || null,
      after_state: params.afterState || null,
      delta: params.delta || null,
      reason_code: params.reasonCode || null,
      previous_hash: previousHash,
      event_hash: eventHash,
      created_at: timestamp,
    });

    return await manager.save(AuditEvent, event);
  }

  /**
   * Mathematically verifies the cryptographic integrity of the entire audit chain.
   * Detects any altered records, deletions, insertions, or hash mismatches.
   */
  public static async verifyChainIntegrity(
    orgId: string = "00000000-0000-0000-0000-000000000000"
  ): Promise<ChainVerificationResult> {
    const eventRepo = AppDataSource.getRepository(AuditEvent);
    const events = await eventRepo.find({
      where: { organization_id: orgId },
      order: { sequence_number: "ASC" },
    });

    if (events.length === 0) {
      return {
        isValid: true,
        totalEventsChecked: 0,
        verifiedAt: new Date().toISOString(),
      };
    }

    let expectedPrevHash = this.GENESIS_HASH;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];

      // 1. Verify previous hash pointer
      if (ev.previous_hash !== expectedPrevHash) {
        return {
          isValid: false,
          totalEventsChecked: i + 1,
          tamperedEventIndex: i,
          tamperedEventId: ev.id,
          reason: `Broken chain link at sequence ${ev.sequence_number}: expected prevHash '${expectedPrevHash}', but found '${ev.previous_hash}'`,
          verifiedAt: new Date().toISOString(),
        };
      }

      // 2. Recompute event hash and verify
      const recomputedHash = this.computeEventHash({
        previousHash: ev.previous_hash,
        organizationId: ev.organization_id,
        actorId: ev.actor_id,
        action: ev.action,
        entityType: ev.entity_type,
        entityId: ev.entity_id,
        beforeState: ev.before_state,
        afterState: ev.after_state,
        createdAtTimestamp: new Date(ev.created_at).getTime(),
      });

      if (recomputedHash !== ev.event_hash) {
        return {
          isValid: false,
          totalEventsChecked: i + 1,
          tamperedEventIndex: i,
          tamperedEventId: ev.id,
          reason: `Data payload tampering detected at sequence ${ev.sequence_number}: computed hash '${recomputedHash}' does not match stored '${ev.event_hash}'`,
          verifiedAt: new Date().toISOString(),
        };
      }

      expectedPrevHash = ev.event_hash;
    }

    return {
      isValid: true,
      totalEventsChecked: events.length,
      verifiedAt: new Date().toISOString(),
    };
  }

  public static async queryAuditTrail(filters: {
    organizationId?: string;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    const orgId = filters.organizationId || "00000000-0000-0000-0000-000000000000";
    const repo = AppDataSource.getRepository(AuditEvent);

    const qb = repo.createQueryBuilder("e")
      .where("e.organization_id = :orgId", { orgId })
      .orderBy("e.sequence_number", "DESC");

    if (filters.entityType) {
      qb.andWhere("e.entity_type = :entityType", { entityType: filters.entityType });
    }
    if (filters.entityId) {
      qb.andWhere("e.entity_id = :entityId", { entityId: filters.entityId });
    }
    if (filters.actorId) {
      qb.andWhere("e.actor_id = :actorId", { actorId: filters.actorId });
    }
    if (filters.action) {
      qb.andWhere("e.action = :action", { action: filters.action });
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const [events, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return { events, total };
  }
}
