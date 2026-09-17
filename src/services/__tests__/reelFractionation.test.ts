import { describe, it, expect } from "vitest";
import { BomService } from "../BomService.ts";

describe("Reel & MSL Lifecycle Engine", () => {
  describe("MSL Floor Life Calculations (J-STD-033D)", () => {
    it("returns standard floor life seconds for various MSL ratings", () => {
      expect(BomService.getDefaultMslFloorLifeSeconds("MSL 1")).toBe(Infinity); // Unlimited at <= 30C / 85% RH
      expect(BomService.getDefaultMslFloorLifeSeconds("MSL 2")).toBe(365 * 24 * 3600); // 1 year
      expect(BomService.getDefaultMslFloorLifeSeconds("MSL 2a")).toBe(4 * 7 * 24 * 3600); // 4 weeks
      expect(BomService.getDefaultMslFloorLifeSeconds("MSL 3")).toBe(168 * 3600); // 168 hours (7 days)
      expect(BomService.getDefaultMslFloorLifeSeconds("MSL 4")).toBe(72 * 3600); // 72 hours (3 days)
      expect(BomService.getDefaultMslFloorLifeSeconds("MSL 5")).toBe(48 * 3600); // 48 hours (2 days)
      expect(BomService.getDefaultMslFloorLifeSeconds("MSL 5a")).toBe(24 * 3600); // 24 hours (1 day)
      expect(BomService.getDefaultMslFloorLifeSeconds("MSL 6")).toBe(6 * 3600); // 6 hours (Bake before use)
    });

    it("calculates remaining floor life after exposure duration", () => {
      const initialFloorLife = 168 * 3600; // MSL 3 (168h)
      const openTimestamp = new Date(Date.now() - 24 * 3600 * 1000); // Opened 24 hours ago
      
      const remaining = BomService.computeRemainingFloorLife(initialFloorLife, openTimestamp);
      expect(remaining).toBeCloseTo(144 * 3600, -2);
    });

    it("evaluates bake cycle efficacy according to J-STD-033D", () => {
      // High temp bake: >= 125C for >= 24 hours resets floor life
      const validHighTempBake = BomService.isValidBakeCycle(125, 24);
      expect(validHighTempBake).toBe(true);

      // Insufficient time: 125C for only 4 hours does not fully reset
      const invalidShortBake = BomService.isValidBakeCycle(125, 4);
      expect(invalidShortBake).toBe(false);

      // Low temp bake: 40C for 192 hours (8 days) in dry cabinet
      const validLowTempBake = BomService.isValidBakeCycle(40, 192);
      expect(validLowTempBake).toBe(true);
    });
  });

  describe("Reel Split Numbering & Logic", () => {
    it("generates deterministic child lot numbers from master reel lot number", () => {
      const parentLot = "LOT-REEL-2026-001";
      const childLot = BomService.generateChildLotNumber(parentLot, 1);
      expect(childLot).toBe("LOT-REEL-2026-001-C1");
    });
  });
});
