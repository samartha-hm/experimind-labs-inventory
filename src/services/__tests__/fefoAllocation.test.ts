import { describe, it, expect } from "vitest";
import { WmsOperationService } from "../WmsOperationService.ts";

describe("WmsOperationService (FEFO & FIFO Lot Allocation)", () => {
  const mockNow = new Date("2026-06-01T00:00:00Z");

  it("allocates stock based on FEFO, picking nearest expiry first", () => {
    const lots = [
      {
        id: "lot-aug",
        lot_number: "LOT-EXP-AUG",
        current_quantity: 100,
        unit_cost: 15,
        expiry_date: "2026-08-01T00:00:00Z", // expires later
        received_date: "2026-01-01",
        status: "RELEASED",
      },
      {
        id: "lot-jul",
        lot_number: "LOT-EXP-JUL",
        current_quantity: 40,
        unit_cost: 14,
        expiry_date: "2026-07-01T00:00:00Z", // expires sooner!
        received_date: "2026-02-01",
        status: "RELEASED",
      },
      {
        id: "lot-sep",
        lot_number: "LOT-EXP-SEP",
        current_quantity: 60,
        unit_cost: 16,
        expiry_date: "2026-09-01T00:00:00Z",
        received_date: "2026-03-01",
        status: "RELEASED",
      },
    ];

    // Pick 50 units
    // Should take all 40 units from LOT-EXP-JUL (earliest expiry)
    // and remaining 10 units from LOT-EXP-AUG
    const result = WmsOperationService.computeLotAllocations(lots, 50, "FEFO", mockNow);

    expect(result.isFullyAllocated).toBe(true);
    expect(result.totalAllocated).toBe(50);
    expect(result.shortage).toBe(0);
    expect(result.allocations).toHaveLength(2);

    expect(result.allocations[0].lotNumber).toBe("LOT-EXP-JUL");
    expect(result.allocations[0].allocatedQty).toBe(40);
    expect(result.allocations[0].remainingInLot).toBe(0);

    expect(result.allocations[1].lotNumber).toBe("LOT-EXP-AUG");
    expect(result.allocations[1].allocatedQty).toBe(10);
    expect(result.allocations[1].remainingInLot).toBe(90);
  });

  it("excludes expired lots and quarantined lots completely", () => {
    const lots = [
      {
        id: "lot-expired",
        lot_number: "LOT-EXPIRED",
        current_quantity: 50,
        unit_cost: 10,
        expiry_date: "2026-05-15T00:00:00Z", // expired before mockNow (2026-06-01)
        received_date: "2026-01-01",
        status: "RELEASED",
      },
      {
        id: "lot-quarantine",
        lot_number: "LOT-QUARANTINE",
        current_quantity: 100,
        unit_cost: 10,
        expiry_date: "2026-12-01T00:00:00Z",
        received_date: "2026-01-01",
        status: "QUARANTINE", // Should not be picked!
      },
      {
        id: "lot-valid",
        lot_number: "LOT-VALID",
        current_quantity: 30,
        unit_cost: 12,
        expiry_date: "2026-10-01T00:00:00Z",
        received_date: "2026-02-01",
        status: "RELEASED",
      },
    ];

    const result = WmsOperationService.computeLotAllocations(lots, 50, "FEFO", mockNow);

    // Only lot-valid is eligible (30 units available), so shortage is 20
    expect(result.isFullyAllocated).toBe(false);
    expect(result.totalAllocated).toBe(30);
    expect(result.shortage).toBe(20);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].lotNumber).toBe("LOT-VALID");
  });

  it("supports FIFO strategy when selected", () => {
    const lots = [
      {
        id: "lot-newer",
        lot_number: "LOT-NEWER",
        current_quantity: 100,
        unit_cost: 10,
        received_date: "2026-04-01",
        status: "RELEASED",
      },
      {
        id: "lot-older",
        lot_number: "LOT-OLDER",
        current_quantity: 50,
        unit_cost: 10,
        received_date: "2026-01-01",
        status: "RELEASED",
      },
    ];

    const result = WmsOperationService.computeLotAllocations(lots, 60, "FIFO", mockNow);

    expect(result.isFullyAllocated).toBe(true);
    expect(result.allocations).toHaveLength(2);
    // Under FIFO, LOT-OLDER received in Jan must be picked first!
    expect(result.allocations[0].lotNumber).toBe("LOT-OLDER");
    expect(result.allocations[0].allocatedQty).toBe(50);
    expect(result.allocations[1].lotNumber).toBe("LOT-NEWER");
    expect(result.allocations[1].allocatedQty).toBe(10);
  });
});
