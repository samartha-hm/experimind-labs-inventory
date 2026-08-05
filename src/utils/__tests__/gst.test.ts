import { describe, it, expect } from "vitest";
import { isValidGstin, computeGstInvoice } from "../gst.ts";

describe("GST Validation & Calculation Tests", () => {
  it("validates correct GSTIN format", () => {
    expect(isValidGstin("29ABCDE1234F1Z5")).toBe(true);
    expect(isValidGstin("27AAAAA0000A1Z5")).toBe(true);
  });

  it("rejects invalid GSTIN strings", () => {
    expect(isValidGstin("INVALID_GSTIN")).toBe(false);
    expect(isValidGstin("12345")).toBe(false);
    expect(isValidGstin("")).toBe(false);
  });

  it("computes complete GST invoice with intra-state taxes", () => {
    const lines = [
      { hsnCode: "8471", qty: 2, unitPrice: 500, gstRatePct: 18 },
    ];
    const result = computeGstInvoice(lines, "29", "29"); // Karnataka to Karnataka

    expect(result.totalTaxable).toBe(1000);
    expect(result.totalCgst).toBe(90);
    expect(result.totalSgst).toBe(90);
    expect(result.totalIgst).toBe(0);
    expect(result.grandTotal).toBe(1180);
  });

  it("computes complete GST invoice with inter-state taxes", () => {
    const lines = [
      { hsnCode: "8471", qty: 2, unitPrice: 500, gstRatePct: 18 },
    ];
    const result = computeGstInvoice(lines, "29", "27"); // Karnataka to Maharashtra

    expect(result.totalTaxable).toBe(1000);
    expect(result.totalCgst).toBe(0);
    expect(result.totalSgst).toBe(0);
    expect(result.totalIgst).toBe(180);
    expect(result.grandTotal).toBe(1180);
  });
});
