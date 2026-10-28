import { describe, it, expect } from "vitest";
import { operationalGates, staffAcceptance } from "../operationalReadiness";
import { printableCountSheet } from "../countSheetPrint";
describe("Operational preparation boundaries", () => {
  it("never converts stored or posted synthetic counts into operational approval", () => {
    for (const count of [0, 1, 1000]) {
      const gates = operationalGates(count);
      expect(gates).toHaveLength(12);
      expect(gates.filter(gate => gate.id !== "d5").some(gate => gate.status === "VERIFIED")).toBe(false);
      expect(gates.find(gate => gate.id === "stocktake")?.status).toBe(count ? "IN PROGRESS" : "NOT STARTED");
    }
    expect(new Set(staffAcceptance.map(([workflow]) => workflow)).size).toBe(9);
  });
  it("prints inert standalone identity fields and omits arbitrary quantity properties", () => {
    const sheet = {session_name:'<img src=x onerror=alert(1)>', session_id:'a', revision:2, instructions:'Unknown is not zero',
      rows:[{sku:'<script>alert(1)</script>',item_id:'item',name:'A&B',canonical_unit:'m',location:'Shelf "A"',quantity:'SECRET_EXPECTED_BALANCE'}]};
    const html=printableCountSheet(sheet);
    expect(html).not.toContain('<script>'); expect(html).not.toContain('<img');
    expect(html).not.toContain('SECRET_EXPECTED_BALANCE');
    expect(html).toContain('A&amp;B'); expect(html).toContain('Content-Security-Policy');
    expect(html).toContain('UNKNOWN / MISSING / DISPUTED / VERIFIED');
  });
});
