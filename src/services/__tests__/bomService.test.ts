import { describe, it, expect } from "vitest";
import { BomService } from "../BomService.ts";

describe("BomService Recursive Tree Calculations", () => {
  describe("Scrap Percentage & Multi-Level Demand Calculation", () => {
    it("calculates effective component demand with scrap multipliers", () => {
      // 100 base pcs with 2% scrap = 102 pcs required
      const singleLevelDemand = BomService.calculateEffectiveQuantity(100, 2);
      expect(singleLevelDemand).toBe(102);

      // Multi-level scrap compounding:
      // Parent assembly has 5% scrap, child component requires 10 pcs with 3% feeder scrap
      // For 100 parent units: Parent requires 105 sub-assemblies.
      // 105 * (10 * 1.03) = 105 * 10.3 = 1081.5 pcs
      const multiLevelDemand = BomService.calculateCompoundedDemand([
        { quantity: 100, scrapPercentage: 5 },
        { quantity: 10, scrapPercentage: 3 },
      ]);
      expect(multiLevelDemand).toBeCloseTo(1081.5, 2);
    });
  });

  describe("BOM Cycle Detection Algorithm", () => {
    it("detects direct circular dependency A -> B -> A", () => {
      const graph = new Map<string, string[]>([
        ["ITEM-A", ["ITEM-B"]],
        ["ITEM-B", ["ITEM-A"]],
      ]);

      expect(() => BomService.detectCycleInGraph("ITEM-A", graph)).toThrowError(
        /Circular dependency detected/
      );
    });

    it("detects deep circular dependency A -> B -> C -> D -> B", () => {
      const graph = new Map<string, string[]>([
        ["ITEM-A", ["ITEM-B"]],
        ["ITEM-B", ["ITEM-C"]],
        ["ITEM-C", ["ITEM-D"]],
        ["ITEM-D", ["ITEM-B"]],
      ]);

      expect(() => BomService.detectCycleInGraph("ITEM-A", graph)).toThrowError(
        /Circular dependency detected/
      );
    });

    it("passes cleanly on valid directed acyclic graph (DAG)", () => {
      const graph = new Map<string, string[]>([
        ["PCBA-IOT", ["MOD-ESP32", "PWR-REG", "PASSIVES-KIT"]],
        ["MOD-ESP32", ["IC-ESP32-D0WD", "XTAL-40M", "FLASH-4M"]],
        ["PWR-REG", ["IC-AMS1117", "CAP-10UF"]],
        ["PASSIVES-KIT", ["RES-10K", "CAP-100NF"]],
      ]);

      expect(() => BomService.detectCycleInGraph("PCBA-IOT", graph)).not.toThrow();
    });
  });

  describe("Shortage Analysis & Alternate Allocation", () => {
    it("computes shortage when primary component stock is insufficient", () => {
      const components = [
        {
          id: "RES-10K",
          name: "10k 0603 Resistor",
          requiredQuantity: 500,
          currentStock: 300,
          alternates: [],
        },
      ];

      const analysis = BomService.computeShortages(components);
      expect(analysis.hasShortage).toBe(true);
      expect(analysis.shortages[0].missingQuantity).toBe(200);
      expect(analysis.shortages[0].canFulfillWithAlternates).toBe(false);
    });

    it("flags shortage as resolvable when approved alternate stock is available", () => {
      const components = [
        {
          id: "IC-CH340C",
          name: "CH340C USB-UART SOIC-8",
          requiredQuantity: 100,
          currentStock: 20,
          alternates: [
            {
              id: "IC-CP2102",
              name: "CP2102 USB-UART QFN-28",
              currentStock: 150,
              approvalStatus: "APPROVED",
            },
          ],
        },
      ];

      const analysis = BomService.computeShortages(components);
      expect(analysis.hasShortage).toBe(true);
      expect(analysis.shortages[0].missingQuantity).toBe(80);
      expect(analysis.shortages[0].canFulfillWithAlternates).toBe(true);
      expect(analysis.shortages[0].suggestedAlternate?.id).toBe("IC-CP2102");
    });
  });
});
