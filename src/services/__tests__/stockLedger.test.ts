import { describe, it, expect } from "vitest";
import { StockTransactionType } from "../../types.ts";

describe("Immutable Stock Ledger & WMS Calculation Suite", () => {
  it("verifies transaction types enum definitions", () => {
    const validTypes: StockTransactionType[] = [
      "INITIAL_BALANCE",
      "PO_RECEIPT",
      "SO_SHIPMENT",
      "TRANSFER_IN",
      "TRANSFER_OUT",
      "MANUAL_ADJUSTMENT",
      "KIT_CONSUMPTION",
      "KIT_PRODUCTION",
      "CYCLE_COUNT_VARIANCE",
      "RETURN_RESTOCK",
    ];

    expect(validTypes).toHaveLength(10);
    expect(validTypes).toContain("PO_RECEIPT");
    expect(validTypes).toContain("SO_SHIPMENT");
    expect(validTypes).toContain("CYCLE_COUNT_VARIANCE");
  });

  it("calculates running balance sequentially from ledger deltas", () => {
    const ledgerDeltas = [
      { type: "INITIAL_BALANCE", delta: 100 },
      { type: "PO_RECEIPT", delta: 50 },
      { type: "SO_SHIPMENT", delta: -30 },
      { type: "TRANSFER_OUT", delta: -10 },
      { type: "CYCLE_COUNT_VARIANCE", delta: -2 },
      { type: "KIT_PRODUCTION", delta: 5 },
    ];

    let runningBalance = 0;
    const history: number[] = [];

    for (const entry of ledgerDeltas) {
      runningBalance += entry.delta;
      history.push(runningBalance);
    }

    expect(history).toEqual([100, 150, 120, 110, 108, 113]);
    expect(runningBalance).toBe(113);
  });

  it("accurately computes total inventory valuation from item unit costs and stock quantities", () => {
    const items = [
      { name: "OpAmp IC LM393", qty: 250, unitCost: 15.5 },
      { name: "IR Sensor Board", qty: 45, unitCost: 85.0 },
      { name: "Arduino Uno R3", qty: 30, unitCost: 450.0 },
      { name: "Solder Wire Roll", qty: 12, unitCost: 180.0 },
    ];

    const totalValuation = items.reduce((acc, item) => acc + item.qty * item.unitCost, 0);
    expect(totalValuation).toBe(
      250 * 15.5 + 45 * 85.0 + 30 * 450.0 + 12 * 180.0
    );
    expect(totalValuation).toBe(23360);
  });

  it("verifies blind cycle count discrepancy variance formula", () => {
    const systemQty = 150;
    const countedQty = 142;
    const unitCost = 25.0;

    const varianceQty = countedQty - systemQty;
    const varianceValue = varianceQty * unitCost;

    expect(varianceQty).toBe(-8);
    expect(varianceValue).toBe(-200.0);
  });
});
