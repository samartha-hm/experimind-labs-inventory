import { describe, it, expect, beforeEach } from "vitest";
import { CartReservationService } from "../../services/CartReservationService.ts";
import { reapOrphanReservations } from "../reservationReaper.ts";

describe("Automated Reservation Reaper Worker", () => {
  beforeEach(() => {
    (CartReservationService as any).softLocks.clear();
  });

  it("identifies and reaps expired soft-lock reservations while keeping valid ones", async () => {
    const now = Date.now();
    const expiredTime = new Date(now - 30 * 1000); // 30s ago
    const futureTime = new Date(now + 15 * 60 * 1000); // 15 mins future

    // 1. Expired reservation for cart-orphan-1
    (CartReservationService as any).softLocks.set("cart-orphan-1:item-esp32", {
      id: "cart-orphan-1:item-esp32",
      organizationId: "org-1",
      cartId: "cart-orphan-1",
      itemId: "item-esp32",
      itemSku: "EXP-ESP32-01",
      quantity: 5,
      reservedAt: new Date(now - 16 * 60 * 1000),
      expiresAt: expiredTime,
    });

    // 2. Expired reservation for cart-orphan-2
    (CartReservationService as any).softLocks.set("cart-orphan-2:item-stm32", {
      id: "cart-orphan-2:item-stm32",
      organizationId: "org-1",
      cartId: "cart-orphan-2",
      itemId: "item-stm32",
      itemSku: "EXP-STM32-02",
      quantity: 8,
      reservedAt: new Date(now - 20 * 60 * 1000),
      expiresAt: expiredTime,
    });

    // 3. Active valid reservation for cart-active-1
    (CartReservationService as any).softLocks.set("cart-active-1:item-esp32", {
      id: "cart-active-1:item-esp32",
      organizationId: "org-1",
      cartId: "cart-active-1",
      itemId: "item-esp32",
      itemSku: "EXP-ESP32-01",
      quantity: 3,
      reservedAt: new Date(now),
      expiresAt: futureTime,
    });

    // Run reaper pass
    const result = await reapOrphanReservations();

    expect(result.expiredReservationsCount).toBe(2);
    expect(result.totalQuantityReleased).toBe(13); // 5 + 8
    expect(result.reapedItemSkus).toContain("EXP-ESP32-01");
    expect(result.reapedItemSkus).toContain("EXP-STM32-02");

    // Check that active reservation is still in softLocks
    const activeRemaining = CartReservationService.getActiveReservedQuantity("item-esp32");
    expect(activeRemaining).toBe(3);

    // Expired STM32 should now have 0 reserved quantity
    const stm32Remaining = CartReservationService.getActiveReservedQuantity("item-stm32");
    expect(stm32Remaining).toBe(0);
  });

  it("returns zero expired reservations when all locks are fresh", async () => {
    const futureTime = new Date(Date.now() + 10 * 60 * 1000);

    (CartReservationService as any).softLocks.set("cart-valid:item-cap", {
      id: "cart-valid:item-cap",
      organizationId: "org-1",
      cartId: "cart-valid",
      itemId: "item-cap",
      itemSku: "EXP-CAP-100N",
      quantity: 50,
      reservedAt: new Date(),
      expiresAt: futureTime,
    });

    const result = await reapOrphanReservations();
    expect(result.expiredReservationsCount).toBe(0);
    expect(result.totalQuantityReleased).toBe(0);
  });
});
