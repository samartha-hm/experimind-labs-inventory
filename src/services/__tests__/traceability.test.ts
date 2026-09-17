import { describe, it, expect } from 'vitest';
import { TraceabilityService } from '../TraceabilityService.ts';

describe('Bidirectional Component Traceability & Instant Recall Tree', () => {
  it('performs forward trace given a supplier component lot or MPN', () => {
    // Trace ESP32 lot
    const result = TraceabilityService.forwardTrace('LOT-LCSC-2026-ESP32');
    expect(result.queryLotNumber).toBe('LOT-LCSC-2026-ESP32');
    expect(result.totalKitsAffected).toBeGreaterThan(0);
    expect(result.affectedKits[0].serialNumber).toBe('EXP-ANB-26-0001');
    expect(result.affectedKits[0].dispatchStatus).toBe('DISPATCHED_TO_SCHOOL');
    expect(result.affectedOrders.length).toBe(1);
    expect(result.affectedOrders[0].institutionName).toContain('Dr. NSAM English Medium High School');
  });

  it('performs backward trace given a customer kit serial number', () => {
    const result = TraceabilityService.backwardTrace('EXP-ANB-26-0001');
    expect(result.serialNumber).toBe('EXP-ANB-26-0001');
    expect(result.hardwarePedigree.mcuChipUid).toBe('ESP32-0x38472948274A');
    expect(result.hardwarePedigree.macAddress).toBe('24:6F:28:AB:12:34');
    expect(result.hardwarePedigree.qcTechnicianId).toBe('TECH-NITTE-01');
    expect(result.hardwarePedigree.loopbackVerification).toBe('PASSED');

    expect(result.componentPedigree.length).toBe(3);
    expect(result.componentPedigree.some(c => c.supplierName === 'LCSC Electronics')).toBe(true);
    expect(result.componentPedigree.some(c => c.supplierName === 'Robu.in')).toBe(true);
    expect(result.componentPedigree.some(c => c.supplierName === 'Mouser India')).toBe(true);

    expect(result.distributionPedigree?.salesOrderId).toBe('SO-ATL-2026-042');
  });

  it('returns graceful fallback for unregistered serials', () => {
    const result = TraceabilityService.backwardTrace('EXP-ANB-26-9999');
    expect(result.serialNumber).toBe('EXP-ANB-26-9999');
    expect(result.hardwarePedigree.loopbackVerification).toBe('PASSED');
    expect(result.componentPedigree).toEqual([]);
  });
});
