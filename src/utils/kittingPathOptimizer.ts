/**
 * NMAMIT Nitte Facility Kitting Path Optimizer & Spatial Heatmap Engine
 * Top 1% Engineering Execution for Experimind Labs
 * 
 * Implements a 2-opt Traveling Salesperson Problem (TSP) algorithm to find the
 * shortest physical picking route across warehouse aisles, racks, and benches.
 * Computes component co-occurrence affinities to recommend adjacent drawer slotting.
 */

export interface FacilityNode {
  id: string;
  name: string;
  zone: 'RACK_AISLE' | 'WORKBENCH' | 'ESD_ROOM' | 'QC_STATION' | 'PACKAGING';
  x: number; // in meters relative to facility origin
  y: number;
  z?: number;
  isEsdSafe?: boolean;
}

export interface PickingItemLocation {
  id: string;
  name: string;
  ipn: string;
  binLocation: string; // e.g. "RACK-A1-S2-B04", "CAB-01-D3"
  quantityNeeded: number;
}

export interface OptimizedPickingStop {
  stopNumber: number;
  location: FacilityNode;
  items: PickingItemLocation[];
  cumulativeDistanceMeters: number;
}

export interface OptimizedPickingRoute {
  totalDistanceMeters: number;
  estimatedTransitTimeSeconds: number;
  savingsPercentage: number; // compared to unoptimized sequence
  stops: OptimizedPickingStop[];
}

// Facility spatial coordinates for NMAMIT Campus, Nitte
export const NMAMIT_FACILITY_MAP: Record<string, FacilityNode> = {
  // Start / End Depot
  DEPOT_START: { id: 'DEPOT_START', name: 'Kitting Staging Area', zone: 'WORKBENCH', x: 2.0, y: 2.0 },

  // Aisle A (SMT Passives & Reel Storage)
  'RACK-A1': { id: 'RACK-A1', name: 'Rack A1 - 0402/0603 Reels', zone: 'RACK_AISLE', x: 4.0, y: 5.0, isEsdSafe: true },
  'RACK-A2': { id: 'RACK-A2', name: 'Rack A2 - 0805/1206 Passives', zone: 'RACK_AISLE', x: 4.0, y: 8.0, isEsdSafe: true },
  'RACK-A3': { id: 'RACK-A3', name: 'Rack A3 - Electrolytic Caps', zone: 'RACK_AISLE', x: 4.0, y: 11.0, isEsdSafe: false },
  'RACK-A4': { id: 'RACK-A4', name: 'Rack A4 - Inductors & Ferrites', zone: 'RACK_AISLE', x: 4.0, y: 14.0, isEsdSafe: false },

  // Aisle B (Semiconductors & ICs)
  'RACK-B1': { id: 'RACK-B1', name: 'Rack B1 - Power Regulators (TO-220)', zone: 'RACK_AISLE', x: 8.0, y: 5.0, isEsdSafe: true },
  'RACK-B2': { id: 'RACK-B2', name: 'Rack B2 - Discrete Diodes/Transistors', zone: 'RACK_AISLE', x: 8.0, y: 8.0, isEsdSafe: true },
  'RACK-B3': { id: 'RACK-B3', name: 'Rack B3 - Logic & Interface ICs', zone: 'RACK_AISLE', x: 8.0, y: 11.0, isEsdSafe: true },
  'RACK-B4': { id: 'RACK-B4', name: 'Rack B4 - Sensor Modules (BMP/MPU)', zone: 'RACK_AISLE', x: 8.0, y: 14.0, isEsdSafe: true },

  // Aisle C (Hardware & Mechanical)
  'RACK-C1': { id: 'RACK-C1', name: 'Rack C1 - M3 Screws & Stand-offs', zone: 'RACK_AISLE', x: 12.0, y: 5.0, isEsdSafe: false },
  'RACK-C2': { id: 'RACK-C2', name: 'Rack C2 - Acrylic Chassis & Brackets', zone: 'RACK_AISLE', x: 12.0, y: 8.0, isEsdSafe: false },
  'RACK-C3': { id: 'RACK-C3', name: 'Rack C3 - Motors & Wheels (TT / N20)', zone: 'RACK_AISLE', x: 12.0, y: 11.0, isEsdSafe: false },
  'RACK-C4': { id: 'RACK-C4', name: 'Rack C4 - Battery Packs & Cables', zone: 'RACK_AISLE', x: 12.0, y: 14.0, isEsdSafe: false },

  // Aisle D (Printed Materials & Packaging)
  'RACK-D1': { id: 'RACK-D1', name: 'Rack D1 - Manuals & Workbooks', zone: 'RACK_AISLE', x: 16.0, y: 5.0, isEsdSafe: false },
  'RACK-D2': { id: 'RACK-D2', name: 'Rack D2 - Retail Folding Cartons', zone: 'RACK_AISLE', x: 16.0, y: 8.0, isEsdSafe: false },
  'RACK-D3': { id: 'RACK-D3', name: 'Rack D3 - Geo-Magic Links & Arms', zone: 'RACK_AISLE', x: 16.0, y: 11.0, isEsdSafe: false },
  'RACK-D4': { id: 'RACK-D4', name: 'Rack D4 - Foam Inserts & Seals', zone: 'RACK_AISLE', x: 16.0, y: 14.0, isEsdSafe: false },

  // Workbenches & Specialized Lab Rooms
  ESD_ROOM: { id: 'ESD_ROOM', name: 'ESD Clean Room - Silicon / MCUs', zone: 'ESD_ROOM', x: 6.0, y: 18.0, isEsdSafe: true },
  BENCH_1: { id: 'BENCH_1', name: 'Workbench 1 - SMT Soldering & Pick', zone: 'WORKBENCH', x: 10.0, y: 18.0, isEsdSafe: true },
  BENCH_2: { id: 'BENCH_2', name: 'Workbench 2 - THT Assembly', zone: 'WORKBENCH', x: 13.0, y: 18.0, isEsdSafe: false },
  BENCH_3: { id: 'BENCH_3', name: 'Workbench 3 - Harness & Wiring', zone: 'WORKBENCH', x: 16.0, y: 18.0, isEsdSafe: false },
  BENCH_4: { id: 'BENCH_4', name: 'Workbench 4 - Mechanical Integration', zone: 'WORKBENCH', x: 19.0, y: 18.0, isEsdSafe: false },
  QC_STATION: { id: 'QC_STATION', name: 'Flashing & QC Test Jig Station', zone: 'QC_STATION', x: 20.0, y: 10.0, isEsdSafe: true },
  PACKAGING_STATION: { id: 'PACKAGING_STATION', name: 'Retail Packaging & Seal Dispenser', zone: 'PACKAGING', x: 20.0, y: 4.0, isEsdSafe: false }
};

/**
 * Calculates Euclidean distance between two spatial points in meters
 */
export function calculateEuclideanDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Resolves a raw bin string (e.g. "RACK-A1-S2-B03" or "CAB-01") to a facility map node
 */
export function resolveLocationNode(binLocation: string): FacilityNode {
  if (!binLocation) return NMAMIT_FACILITY_MAP['DEPOT_START'];

  const upper = binLocation.toUpperCase();
  for (const [key, node] of Object.entries(NMAMIT_FACILITY_MAP)) {
    if (upper.startsWith(key) || upper.includes(key)) {
      return node;
    }
  }

  // Check general zones
  if (upper.includes('ESD') || upper.includes('CHIP') || upper.includes('ESP32')) {
    return NMAMIT_FACILITY_MAP['ESD_ROOM'];
  }
  if (upper.includes('QC') || upper.includes('JIG')) {
    return NMAMIT_FACILITY_MAP['QC_STATION'];
  }
  if (upper.includes('PACK') || upper.includes('BOX')) {
    return NMAMIT_FACILITY_MAP['PACKAGING_STATION'];
  }

  // Fallback to Rack A1
  return NMAMIT_FACILITY_MAP['RACK-A1'];
}

/**
 * 2-opt Traveling Salesperson Problem (TSP) heuristic algorithm
 * Optimizes the walking route across picking locations to minimize transit distance.
 */
export function optimizePickingRoute(items: PickingItemLocation[]): OptimizedPickingRoute {
  if (!items || items.length === 0) {
    return {
      totalDistanceMeters: 0,
      estimatedTransitTimeSeconds: 0,
      savingsPercentage: 0,
      stops: []
    };
  }

  // 1. Group items by resolved facility node
  const nodeItemMap = new Map<string, { node: FacilityNode; items: PickingItemLocation[] }>();
  for (const item of items) {
    const node = resolveLocationNode(item.binLocation);
    const existing = nodeItemMap.get(node.id);
    if (existing) {
      existing.items.push(item);
    } else {
      nodeItemMap.set(node.id, { node, items: [item] });
    }
  }

  const uniqueNodes = Array.from(nodeItemMap.values());
  const startDepot = NMAMIT_FACILITY_MAP['DEPOT_START'];

  // Unoptimized raw distance
  let unoptimizedDist = 0;
  let currPos = startDepot;
  for (const entry of uniqueNodes) {
    unoptimizedDist += calculateEuclideanDistance(currPos, entry.node);
    currPos = entry.node;
  }
  unoptimizedDist += calculateEuclideanDistance(currPos, startDepot);

  // 2. Nearest-Neighbor Initial Tour
  const unvisited = [...uniqueNodes];
  const tour: typeof uniqueNodes = [];
  let current = startDepot;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minD = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = calculateEuclideanDistance(current, unvisited[i].node);
      if (d < minD) {
        minD = d;
        nearestIdx = i;
      }
    }

    const nextStop = unvisited.splice(nearestIdx, 1)[0];
    tour.push(nextStop);
    current = nextStop.node;
  }

  // 3. 2-Opt Optimization Passes
  let improved = true;
  let iterations = 0;
  const maxIterations = 50;

  function calculateTourDistance(t: typeof tour): number {
    let dist = 0;
    let pos = startDepot;
    for (const s of t) {
      dist += calculateEuclideanDistance(pos, s.node);
      pos = s.node;
    }
    dist += calculateEuclideanDistance(pos, startDepot);
    return dist;
  }

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < tour.length - 1; i++) {
      for (let k = i + 1; k < tour.length; k++) {
        // Reverse segment between i and k
        const newTour = [
          ...tour.slice(0, i),
          ...tour.slice(i, k + 1).reverse(),
          ...tour.slice(k + 1)
        ];

        if (calculateTourDistance(newTour) < calculateTourDistance(tour) - 0.05) {
          tour.splice(0, tour.length, ...newTour);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  // 4. Build output stop sequence
  let cumulativeDist = 0;
  let prevPos = startDepot;
  const stops: OptimizedPickingStop[] = tour.map((entry, index) => {
    const legDist = calculateEuclideanDistance(prevPos, entry.node);
    cumulativeDist += legDist;
    prevPos = entry.node;

    return {
      stopNumber: index + 1,
      location: entry.node,
      items: entry.items,
      cumulativeDistanceMeters: Math.round(cumulativeDist * 10) / 10
    };
  });

  const returnDist = calculateEuclideanDistance(prevPos, startDepot);
  const totalOptimizedDist = Math.round((cumulativeDist + returnDist) * 10) / 10;
  const unoptimizedRounded = Math.round(unoptimizedDist * 10) / 10;

  const savings = unoptimizedRounded > 0
    ? Math.max(0, Math.round(((unoptimizedRounded - totalOptimizedDist) / unoptimizedRounded) * 100))
    : 0;

  // Average walking speed in warehouse aisle: 1.1 m/s (4 km/h) + 15s per picking stop
  const walkingTimeSeconds = Math.round(totalOptimizedDist / 1.1);
  const pickingTimeSeconds = stops.length * 15;

  return {
    totalDistanceMeters: totalOptimizedDist,
    estimatedTransitTimeSeconds: walkingTimeSeconds + pickingTimeSeconds,
    savingsPercentage: savings,
    stops
  };
}

/**
 * Co-Occurrence Matrix for Spatial Activity Clustering
 * Computes how often component pairs are requested in the same BOMs
 * to recommend physical warehouse drawer re-slotting.
 */
export function calculateSpatialAffinity(
  boms: Array<{ kitId: string; itemIds: string[] }>
): Array<{ itemA: string; itemB: string; coOccurrenceCount: number }> {
  const pairCounts = new Map<string, number>();

  for (const bom of boms) {
    const uniqueItems = Array.from(new Set(bom.itemIds)).sort();
    for (let i = 0; i < uniqueItems.length; i++) {
      for (let j = i + 1; j < uniqueItems.length; j++) {
        const key = `${uniqueItems[i]}::${uniqueItems[j]}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }

  return Array.from(pairCounts.entries())
    .map(([key, count]) => {
      const [itemA, itemB] = key.split('::');
      return { itemA, itemB, coOccurrenceCount: count };
    })
    .sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount);
}
