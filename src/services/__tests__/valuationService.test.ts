import { describe, it, expect } from "vitest";
import { ValuationService, CostLayer } from "../ValuationService.ts";

describe("ValuationService (FIFO & Weighted Moving Average)", () => {
  it("computes Weighted Moving Average Cost accurately across multiple lots", () => {
    // 100 units @ $10 = $1,000
    // 200 units @ $15 = $3,000
    // Total = 300 units, $4,000 -> MAC = 4000 / 300 = $13.3333
    const layers = [
      { quantity: 100, unitCost: 10.0 },
      { quantity: 200, unitCost: 15.0 },
    ];

    const mac = ValuationService.computeMovingAverage(layers);
    expect(mac).toBe(13.3333);
  });

  it("handles zero quantity layers gracefully in moving average", () => {
    const mac = ValuationService.computeMovingAverage([]);
    expect(mac).toBe(0);

    const macZero = ValuationService.computeMovingAverage([{ quantity: 0, unitCost: 25.0 }]);
    expect(macZero).toBe(0);
  });

  it("computes FIFO COGS by exhausting oldest layers first", () => {
    const layers: CostLayer[] = [
      {
        lotNumber: "LOT-001",
        receivedDate: "2026-01-01",
        quantity: 50,
        unitCost: 10.0,
        totalLayerValue: 500.0,
      },
      {
        lotNumber: "LOT-002",
        receivedDate: "2026-01-15",
        quantity: 100,
        unitCost: 12.0,
        totalLayerValue: 1200.0,
      },
      {
        lotNumber: "LOT-003",
        receivedDate: "2026-02-01",
        quantity: 80,
        unitCost: 15.0,
        totalLayerValue: 1200.0,
      },
    ];

    // Consume 70 units:
    // Should take all 50 units from LOT-001 @ $10 ($500)
    // and 20 units from LOT-002 @ $12 ($240)
    // Total COGS = $740, effective unit cost = 740 / 70 = $10.5714
    const result = ValuationService.computeFifoCogs(layers, 70);

    expect(result.totalCogs).toBe(740);
    expect(result.effectiveUnitCost).toBe(10.5714);
    expect(result.layersConsumed).toHaveLength(2);

    expect(result.layersConsumed[0]).toEqual({
      lotNumber: "LOT-001",
      quantity: 50,
      unitCost: 10.0,
      subtotal: 500.0,
    });

    expect(result.layersConsumed[1]).toEqual({
      lotNumber: "LOT-002",
      quantity: 20,
      unitCost: 12.0,
      subtotal: 240.0,
    });

    // Remaining layers: LOT-002 has 80 units left, LOT-003 has 80 units left
    expect(result.remainingLayers).toHaveLength(2);
    expect(result.remainingLayers[0].lotNumber).toBe("LOT-002");
    expect(result.remainingLayers[0].quantity).toBe(80);
    expect(result.remainingLayers[1].lotNumber).toBe("LOT-003");
    expect(result.remainingLayers[1].quantity).toBe(80);
  });

  it("handles requesting more quantity than total inventory in FIFO", () => {
    const layers: CostLayer[] = [
      {
        lotNumber: "LOT-ONLY",
        receivedDate: "2026-01-01",
        quantity: 25,
        unitCost: 20.0,
        totalLayerValue: 500.0,
      },
    ];

    // Request 50 units when only 25 are available
    const result = ValuationService.computeFifoCogs(layers, 50);

    expect(result.totalCogs).toBe(500.0);
    expect(result.effectiveUnitCost).toBe(20.0);
    expect(result.layersConsumed).toHaveLength(1);
    expect(result.remainingLayers).toHaveLength(0);
  });

  it("handles zero consumption quantity", () => {
    const layers: CostLayer[] = [
      {
        lotNumber: "LOT-01",
        receivedDate: "2026-01-01",
        quantity: 100,
        unitCost: 5.0,
        totalLayerValue: 500.0,
      },
    ];

    const result = ValuationService.computeFifoCogs(layers, 0);
    expect(result.totalCogs).toBe(0);
    expect(result.effectiveUnitCost).toBe(0);
    expect(result.layersConsumed).toHaveLength(0);
    expect(result.remainingLayers[0].quantity).toBe(100);
  });
});
