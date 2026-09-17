import { describe, it, expect } from "vitest";
import { computeLandedCost } from "../landedCost.ts";

describe("Customs Landed Cost Engine Tests", () => {
  it("accurately computes landed cost with standard BCD (7.5%), SWS (10%), and IGST (18%)", () => {
    // 1000 units of an IC at $1.00 USD each, exchange rate 86.0 INR/USD
    const result = computeLandedCost({
      fobPriceForeign: 1.0,
      exchangeRate: 86.0,
      quantity: 1000,
      freightInr: 2000, // 2000 INR shipping
      insuranceInr: 500, // 500 INR insurance
      bcdRatePct: 7.5,
      swsRatePct: 10,
      igstRatePct: 18,
      clearingChargesInr: 1500,
    });

    expect(result.fobTotalInr).toBe(86000);
    expect(result.assessableValueInr).toBe(88500); // 86000 + 2000 + 500
    expect(result.bcdAmountInr).toBe(6637.5); // 7.5% of 88500
    expect(result.swsAmountInr).toBe(663.75); // 10% of 6637.5
    // IGST Base = 88500 + 6637.5 + 663.75 = 95801.25
    // IGST = 95801.25 * 0.18 = 17244.23
    expect(result.igstAmountInr).toBe(17244.23);
    // Total Duty & Taxes = 6637.5 + 663.75 + 17244.23 = 24545.48
    expect(result.totalDutyAndTaxesInr).toBe(24545.48);
    // Total Landed Cost = 88500 + 24545.48 + 1500 = 114545.48
    expect(result.totalLandedCostInr).toBe(114545.48);
    // Unit Landed Cost = 114545.48 / 1000 = 114.55 INR
    expect(result.unitLandedCostInr).toBe(114.55);
  });

  it("applies default statutory 1.125% insurance if not provided", () => {
    const result = computeLandedCost({
      fobPriceForeign: 10.0,
      exchangeRate: 85.0,
      quantity: 100,
      freightInr: 1000,
    });

    // FOB Total = 85000
    // Default Insurance = 85000 * 0.01125 = 956.25
    expect(result.fobTotalInr).toBe(85000);
    expect(result.insuranceInr).toBe(956.25);
    expect(result.assessableValueInr).toBe(86956.25);
  });
});
