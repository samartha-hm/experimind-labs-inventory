import { describe, it, expect } from "vitest";
import { Gs1BarcodeService } from "../Gs1BarcodeService.ts";
import { ZplPrintService } from "../ZplPrintService.ts";

describe("GS1-128 & Industrial Zebra ZPL-II Printing Suite", () => {
  it("encodes GS1-128 composite string with Application Identifiers", () => {
    const encoded = Gs1BarcodeService.encodeGs1({
      gtin: "850012345678",
      lotNumber: "LOT-2026-AUG",
      expiryDate: "261231",
      serialNumber: "SN-998811",
    });

    expect(encoded).toContain("(01)00850012345678");
    expect(encoded).toContain("(17)261231");
    expect(encoded).toContain("(10)LOT-2026-AUG");
    expect(encoded).toContain("(21)SN-998811");
  });

  it("parses scanned GS1-128 barcode into structured components", () => {
    const rawScanned = "(01)00850012345678(17)261231(10)LOT99A(21)SN001";
    const parsed = Gs1BarcodeService.parseGs1(rawScanned);

    expect(parsed.gtin).toBe("00850012345678");
    expect(parsed.expiryDate).toBe("2026-12-31");
    expect(parsed.lotNumber).toBe("LOT99A");
    expect(parsed.serialNumber).toBe("SN001");
  });

  it("generates valid Zebra ZPL-II label code", () => {
    const zpl = ZplPrintService.generateItemLabelZpl({
      itemName: "Microcontroller ATmega328P",
      sku: "MCU-ATM-328",
      binLocation: "RACK-04-BAY-02",
      lotNumber: "LOT-2026-A",
      expiryDate: "2028-12-31",
      barcodeValue: "(01)00000MCU-ATM-328(10)LOT-2026-A",
    });

    expect(zpl).toContain("^XA"); // Start of label
    expect(zpl).toContain("^XZ"); // End of label
    expect(zpl).toContain("Microcontroller ATmega328P");
    expect(zpl).toContain("SKU: MCU-ATM-328");
    expect(zpl).toContain("BIN: RACK-04-BAY-02");
    expect(zpl).toContain("^BCN,100,Y,N,N"); // Code 128 barcode instruction
  });

  it("generates valid Bin location ZPL label code", () => {
    const binZpl = ZplPrintService.generateBinLabelZpl("BIN-A01-R02", "Zone A Cold Storage", "WH-MAIN-01");
    expect(binZpl).toContain("^XA");
    expect(binZpl).toContain("WH-MAIN-01 | Zone A Cold Storage");
    expect(binZpl).toContain("BIN-A01-R02");
    expect(binZpl).toContain("^XZ");
  });
});
