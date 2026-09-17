import { describe, it, expect } from "vitest";
import { CartReservationService } from "../CartReservationService.ts";

describe("CartReservationService — Soft-Lock & Concurrency Engine", () => {
  it("computes active reserved quantity across carts", () => {
    // Manually register soft locks for testing
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    (CartReservationService as any).softLocks.set("cart-1:item-100", {
      id: "cart-1:item-100",
      organizationId: "org-1",
      cartId: "cart-1",
      itemId: "item-100",
      quantity: 5,
      reservedAt: now,
      expiresAt,
    });

    (CartReservationService as any).softLocks.set("cart-2:item-100", {
      id: "cart-2:item-100",
      organizationId: "org-1",
      cartId: "cart-2",
      itemId: "item-100",
      quantity: 10,
      reservedAt: now,
      expiresAt,
    });

    const totalReserved = CartReservationService.getActiveReservedQuantity("item-100");
    expect(totalReserved).toBe(15);

    // Excluding cart-1 should yield 10
    const excludeCart1 = CartReservationService.getActiveReservedQuantity("item-100", "cart-1");
    expect(excludeCart1).toBe(10);
  });

  it("releases soft lock when requested", () => {
    CartReservationService.releaseReservation("cart-1");
    const totalReserved = CartReservationService.getActiveReservedQuantity("item-100");
    expect(totalReserved).toBe(10);
  });

  it("cleans up expired soft-lock reservations", () => {
    const past = new Date(Date.now() - 60 * 1000);
    (CartReservationService as any).softLocks.set("cart-expired:item-100", {
      id: "cart-expired:item-100",
      organizationId: "org-1",
      cartId: "cart-expired",
      itemId: "item-100",
      quantity: 20,
      reservedAt: past,
      expiresAt: past,
    });

    const cleaned = CartReservationService.cleanupExpiredReservations();
    expect(cleaned).toBeGreaterThanOrEqual(1);

    // Ensure expired reservation does not count
    const total = CartReservationService.getActiveReservedQuantity("item-100");
    expect(total).toBe(10);
  });
});
