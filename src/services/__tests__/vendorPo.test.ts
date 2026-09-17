import { describe, it, expect } from "vitest";
import { BomService } from "../BomService.ts";

describe("Vendor Sourcing PO CSV Generator Tests", () => {
  const sampleShortages: any[] = [
    {
      itemId: "item-1",
      sku: "RES-10K-0603",
      mpn: "RC0603FR-0710KL",
      name: "Resistor 10k 1% 0603",
      packageFootprint: "0603",
      shortageQuantity: 500,
    },
    {
      itemId: "item-2",
      sku: "IC-ESP32-WROOM",
      mpn: "ESP32-WROOM-32E",
      name: "ESP32 Wi-Fi & BLE MCU Module",
      packageFootprint: "MODULE",
      shortageQuantity: 50,
    },
  ];

  it("formats CSV correctly for LCSC component sourcing", () => {
    const csv = BomService.generateVendorPoCsv(sampleShortages, "LCSC");
    expect(csv).toContain("LCSC Part Number,Manufacturer Part Number,Package,Quantity");
    expect(csv).toContain('"RC0603FR-0710KL","RC0603FR-0710KL","0603",500');
    expect(csv).toContain('"ESP32-WROOM-32E","ESP32-WROOM-32E","MODULE",50');
  });

  it("formats CSV correctly for Robu.in domestic sourcing", () => {
    const csv = BomService.generateVendorPoCsv(sampleShortages, "ROBU");
    expect(csv).toContain("SKU,Product Name,Quantity");
    expect(csv).toContain('"RES-10K-0603","Resistor 10k 1% 0603",500');
    expect(csv).toContain('"IC-ESP32-WROOM","ESP32 Wi-Fi & BLE MCU Module",50');
  });

  it("formats CSV correctly for Mouser India sourcing", () => {
    const csv = BomService.generateVendorPoCsv(sampleShortages, "MOUSER");
    expect(csv).toContain("Mouser Part Number,Manufacturer Part Number,Quantity");
    expect(csv).toContain(',"RC0603FR-0710KL",500');
    expect(csv).toContain(',"ESP32-WROOM-32E",50');
  });

  it("returns empty string if shortages array is empty", () => {
    const csv = BomService.generateVendorPoCsv([], "LCSC");
    expect(csv).toBe("");
  });
});
