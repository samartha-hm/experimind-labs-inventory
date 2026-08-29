import { describe, it, expect } from "vitest";
import { AuditService } from "../AuditService.ts";
import crypto from "crypto";

describe("FDA 21 CFR Part 11 SHA-256 Cryptographic Audit Chain Suite", () => {
  it("computes deterministic SHA-256 event hashes", () => {
    const timestamp = 1756450000000;
    const prevHash = "0000000000000000000000000000000000000000000000000000000000000000";

    const hash1 = AuditService.computeEventHash({
      previousHash: prevHash,
      organizationId: "org-123",
      actorId: "user-456",
      action: "STOCK_ADJUSTMENT",
      entityType: "InventoryItem",
      entityId: "item-789",
      beforeState: { qty: 10 },
      afterState: { qty: 25 },
      createdAtTimestamp: timestamp,
    });

    const hash2 = AuditService.computeEventHash({
      previousHash: prevHash,
      organizationId: "org-123",
      actorId: "user-456",
      action: "STOCK_ADJUSTMENT",
      entityType: "InventoryItem",
      entityId: "item-789",
      beforeState: { qty: 10 },
      afterState: { qty: 25 },
      createdAtTimestamp: timestamp,
    });

    expect(hash1).toHaveLength(64);
    expect(hash1).toEqual(hash2);
  });

  it("detects data modification when payload delta is tampered", () => {
    const timestamp = 1756450000000;
    const prevHash = "0000000000000000000000000000000000000000000000000000000000000000";

    const genuineHash = AuditService.computeEventHash({
      previousHash: prevHash,
      organizationId: "org-123",
      actorId: "user-456",
      action: "STOCK_ADJUSTMENT",
      entityType: "InventoryItem",
      entityId: "item-789",
      beforeState: { qty: 10 },
      afterState: { qty: 25 },
      createdAtTimestamp: timestamp,
    });

    // Malicious actor tampers afterState from 25 to 500
    const tamperedHash = AuditService.computeEventHash({
      previousHash: prevHash,
      organizationId: "org-123",
      actorId: "user-456",
      action: "STOCK_ADJUSTMENT",
      entityType: "InventoryItem",
      entityId: "item-789",
      beforeState: { qty: 10 },
      afterState: { qty: 500 }, // Tampered
      createdAtTimestamp: timestamp,
    });

    expect(genuineHash).not.toEqual(tamperedHash);
  });

  it("chains sequence of events cryptographically", () => {
    const genesisHash = "0000000000000000000000000000000000000000000000000000000000000000";

    const event1Hash = AuditService.computeEventHash({
      previousHash: genesisHash,
      organizationId: "org-01",
      actorId: "user-01",
      action: "PO_RECEIVED",
      entityType: "PurchaseOrder",
      entityId: "po-100",
      createdAtTimestamp: 1000,
    });

    const event2Hash = AuditService.computeEventHash({
      previousHash: event1Hash,
      organizationId: "org-01",
      actorId: "user-02",
      action: "QC_INSPECTION_PASSED",
      entityType: "QualityInspection",
      entityId: "qc-200",
      createdAtTimestamp: 2000,
    });

    const event3Hash = AuditService.computeEventHash({
      previousHash: event2Hash,
      organizationId: "org-01",
      actorId: "user-03",
      action: "SO_FULFILLED",
      entityType: "SalesOrder",
      entityId: "so-300",
      createdAtTimestamp: 3000,
    });

    expect(event1Hash).toHaveLength(64);
    expect(event2Hash).toHaveLength(64);
    expect(event3Hash).toHaveLength(64);

    expect(event1Hash).not.toEqual(event2Hash);
    expect(event2Hash).not.toEqual(event3Hash);
  });
});
