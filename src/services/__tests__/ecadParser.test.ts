import { describe, it, expect } from "vitest";
import { EcadParserService } from "../EcadParserService.ts";

describe("EcadParserService", () => {
  describe("Reference Designator Expansion Grammar", () => {
    it("expands single designators and comma-separated lists", () => {
      expect(EcadParserService.expandDesignators("R1, R2, R3")).toEqual(["R1", "R2", "R3"]);
      expect(EcadParserService.expandDesignators("C10; C11; C12")).toEqual(["C10", "C11", "C12"]);
      expect(EcadParserService.expandDesignators("U1 U2 U3")).toEqual(["U1", "U2", "U3"]);
    });

    it("expands hyphenated and en-dash numerical ranges", () => {
      expect(EcadParserService.expandDesignators("R1-R5")).toEqual(["R1", "R2", "R3", "R4", "R5"]);
      expect(EcadParserService.expandDesignators("C10-C14")).toEqual(["C10", "C11", "C12", "C13", "C14"]);
      expect(EcadParserService.expandDesignators("D1-D3, D8, D10-D12")).toEqual([
        "D1", "D2", "D3", "D8", "D10", "D11", "D12"
      ]);
    });

    it("handles complex multi-prefix EDA designator strings", () => {
      const input = "R1-R3, C1-C2, U1, TP1-TP3, SW1";
      const result = EcadParserService.expandDesignators(input);
      expect(result).toEqual(["R1", "R2", "R3", "C1", "C2", "U1", "TP1", "TP2", "TP3", "SW1"]);
    });

    it("handles ranges with leading zeros properly", () => {
      expect(EcadParserService.expandDesignators("R01-R04")).toEqual(["R01", "R02", "R03", "R04"]);
    });

    it("deduplicates and cleans designator arrays", () => {
      expect(EcadParserService.expandDesignators("R1, R2, R1, R2, R3")).toEqual(["R1", "R2", "R3"]);
      expect(EcadParserService.expandDesignators("")).toEqual([]);
      expect(EcadParserService.expandDesignators("   ")).toEqual([]);
    });

    it("guards against range inversion and excessive range size", () => {
      expect(EcadParserService.expandDesignators("R5-R1")).toEqual(["R5", "R1"]);
      expect(EcadParserService.expandDesignators("R1-R2000000").length).toBeLessThanOrEqual(5000);
    });
  });

  describe("Footprint Normalization", () => {
    it("normalizes standard KiCad footprint strings to standard SMD/THT codes", () => {
      expect(EcadParserService.normalizeFootprint("Resistor_SMD:R_0603_1608Metric")).toBe("0603");
      expect(EcadParserService.normalizeFootprint("Capacitor_SMD:C_0805_2012Metric")).toBe("0805");
      expect(EcadParserService.normalizeFootprint("Package_SO:SOIC-8_3.9x4.9mm_P1.27mm")).toBe("SOIC-8");
      expect(EcadParserService.normalizeFootprint("Package_DFN_QFN:QFN-32-1EP_5x5mm_P0.5mm_EP3.45x3.45mm")).toBe("QFN-32");
    });
  });

  describe("CAD BOM CSV Parsing", () => {
    it("parses KiCad BOM CSV format with reference expansion", () => {
      const kicadCsv = `
"Id","Designator","Package","Quantity","Designation","Supplier and ref"
"1","R1-R4","Resistor_SMD:R_0603_1608Metric","4","10k 1%","RC0603FR-0710KL"
"2","C1, C2","Capacitor_SMD:C_0805_2012Metric","2","100nF 50V","CL21B104KBCNNNC"
"3","U1","Package_SO:SOIC-8_3.9x4.9mm_P1.27mm","1","AT24C256C-SSHL-T","AT24C256C"
`.trim();

      const parsed = EcadParserService.parseCsvContent(kicadCsv);
      expect(parsed.format).toBe("KICAD");
      expect(parsed.rows.length).toBe(3);

      expect(parsed.rows[0].designators).toEqual(["R1", "R2", "R3", "R4"]);
      expect(parsed.rows[0].quantity).toBe(4);
      expect(parsed.rows[0].mpn).toBe("RC0603FR-0710KL");
      expect(parsed.rows[0].footprint).toBe("0603");

      expect(parsed.rows[1].designators).toEqual(["C1", "C2"]);
      expect(parsed.rows[1].quantity).toBe(2);

      expect(parsed.rows[2].designators).toEqual(["U1"]);
      expect(parsed.rows[2].quantity).toBe(1);
    });

    it("parses Altium Designer BOM CSV format", () => {
      const altiumCsv = `
Designator,Comment,Description,Footprint,Manufacturer Part Number,Quantity
"R1-R3, R5","10k","RES SMD 10K OHM 1% 1/10W 0603","0603","RC0603FR-0710KL",4
"C1-C4","10uF","CAP CER 10UF 25V X5R 0805","0805","CL21A106KAYNNNE",4
"U1","ESP32-WROOM-32E","RF TXRX MOD BLUETOOTH/WIFI SMD","MODULE","ESP32-WROOM-32E-N4",1
`.trim();

      const parsed = EcadParserService.parseCsvContent(altiumCsv);
      expect(parsed.format).toBe("ALTIUM");
      expect(parsed.rows.length).toBe(3);
      expect(parsed.rows[0].designators).toEqual(["R1", "R2", "R3", "R5"]);
      expect(parsed.rows[0].quantity).toBe(4);
      expect(parsed.rows[2].mpn).toBe("ESP32-WROOM-32E-N4");
    });

    it("parses EasyEDA / JLCPCB BOM CSV format", () => {
      const easyEdaCsv = `
Comment,Designator,Footprint,JLCPCB Part #,Manufacturer Part
"10k","R1, R2, R3","0603","C25804","0603WAF1002T5E"
"100nF","C1, C2, C3, C4","0402","C1525","CC0402KRX7R9BB104"
"CH340C","U2","SOIC-8","C84683","CH340C"
`.trim();

      const parsed = EcadParserService.parseCsvContent(easyEdaCsv);
      expect(parsed.format).toBe("EASYEDA");
      expect(parsed.rows.length).toBe(3);
      expect(parsed.rows[0].designators).toEqual(["R1", "R2", "R3"]);
      expect(parsed.rows[1].quantity).toBe(4);
      expect(parsed.rows[2].mpn).toBe("CH340C");
    });
  });
});
