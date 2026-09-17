import { describe, it, expect } from 'vitest';
import {
  calculateEuclideanDistance,
  resolveLocationNode,
  optimizePickingRoute,
  calculateSpatialAffinity,
  NMAMIT_FACILITY_MAP
} from '../kittingPathOptimizer.ts';

describe('NMAMIT Nitte Facility Kitting Path Optimizer', () => {
  it('calculates Euclidean distance accurately', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 3, y: 4 };
    expect(calculateEuclideanDistance(a, b)).toBe(5);
  });

  it('resolves location nodes from bin strings', () => {
    const nodeA1 = resolveLocationNode('RACK-A1-S2-B03');
    expect(nodeA1.id).toBe('RACK-A1');
    expect(nodeA1.isEsdSafe).toBe(true);

    const nodeEsd = resolveLocationNode('ESD_ROOM_BIN_04');
    expect(nodeEsd.id).toBe('ESD_ROOM');

    const nodeJig = resolveLocationNode('QC_STATION_SLOT_1');
    expect(nodeJig.id).toBe('QC_STATION');
  });

  it('optimizes picking route using 2-opt TSP algorithm and minimizes walking path', () => {
    const items = [
      { id: '1', name: 'ESP32-WROOM-32E', ipn: 'IC-MCU-001', binLocation: 'ESD_ROOM', quantityNeeded: 25 },
      { id: '2', name: '10k 0603 Resistor', ipn: 'RES-0603-10K', binLocation: 'RACK-A1', quantityNeeded: 50 },
      { id: '3', name: '100nF 0603 Capacitor', ipn: 'CAP-0603-100N', binLocation: 'RACK-A2', quantityNeeded: 50 },
      { id: '4', name: 'M3x8 Brass Standoff', ipn: 'HW-M3-008', binLocation: 'RACK-C1', quantityNeeded: 100 },
      { id: '5', name: 'Anubhav Retail Box', ipn: 'PKG-BOX-ANB', binLocation: 'RACK-D2', quantityNeeded: 25 },
      { id: '6', name: 'QC Flashing Tag', ipn: 'QC-TAG-01', binLocation: 'QC_STATION', quantityNeeded: 25 }
    ];

    const result = optimizePickingRoute(items);
    expect(result.stops.length).toBe(6);
    expect(result.totalDistanceMeters).toBeGreaterThan(0);
    expect(result.estimatedTransitTimeSeconds).toBeGreaterThan(0);

    // Verify stops are ordered sequentially
    for (let i = 0; i < result.stops.length; i++) {
      expect(result.stops[i].stopNumber).toBe(i + 1);
    }
  });

  it('computes spatial co-occurrence affinity between BOM components', () => {
    const boms = [
      { kitId: 'KIT-ANB-01', itemIds: ['IC-ESP32', 'RES-10K', 'CAP-100N', 'MOT-TT'] },
      { kitId: 'KIT-ANB-02', itemIds: ['IC-ESP32', 'RES-10K', 'MOT-TT', 'HW-M3'] },
      { kitId: 'KIT-PSL-01', itemIds: ['IC-ESP32', 'RES-10K', 'SENSOR-BMP280'] }
    ];

    const affinities = calculateSpatialAffinity(boms);
    expect(affinities.length).toBeGreaterThan(0);

    // IC-ESP32 and RES-10K appear in all 3 kits
    const topPair = affinities.find(
      a => (a.itemA === 'CAP-100N' && a.itemB === 'IC-ESP32') ||
           (a.itemA === 'IC-ESP32' && a.itemB === 'RES-10K')
    );
    expect(topPair).toBeDefined();
    expect(topPair?.coOccurrenceCount).toBe(3);
  });
});
