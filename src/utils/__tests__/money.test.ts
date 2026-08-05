import { describe, it, expect } from "vitest";
import { toCents, fromCents, multiplyMoney, calculateTaxSplit } from "../money.ts";

describe("Monetary Calculation Utility Tests", () => {
  it("converts rupees to cents accurately", () => {
    expect(toCents(100.5)).toBe(10050);
    expect(toCents(0)).toBe(0);
    expect(toCents(12.34)).toBe(1234);
  });

  it("converts cents to rupees accurately", () => {
    expect(fromCents(10050)).toBe(100.5);
    expect(fromCents(0)).toBe(0);
  });

  it("multiplies money without floating point inaccuracy", () => {
    expect(multiplyMoney(10.5, 3)).toBe(31.5);
    expect(multiplyMoney(19.99, 5)).toBe(99.95);
  });

  it("calculates intra-state CGST and SGST 50/50 tax split", () => {
    const result = calculateTaxSplit(1000, 18, true);
    expect(result.cgst).toBe(90);
    expect(result.sgst).toBe(90);
    expect(result.igst).toBe(0);
    expect(result.totalTax).toBe(180);
  });

  it("calculates inter-state IGST tax split", () => {
    const result = calculateTaxSplit(1000, 18, false);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(180);
    expect(result.totalTax).toBe(180);
  });
});
