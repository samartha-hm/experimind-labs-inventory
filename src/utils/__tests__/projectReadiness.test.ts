import { describe, expect, it } from 'vitest';
import { getProjectReadinessSummary } from '../projectReadiness';
import { Project } from '../../data/projectsDataset';

const project = {
  classes: [
    {
      id: 'class-1',
      name: 'Class 8',
      batchMultiplier: 2,
      items: [
        { id: '1', classId: 'class-1', name: 'Slides', category: 'ACTIVITY_KIT', specification: '', quantityPerBatchUnit: 1, totalQuantity: 2, unit: 'pcs', sourcingChannel: 'IN_STOCK', status: 'READY' },
        { id: '2', classId: 'class-1', name: 'Acid', category: 'CHEMICAL_REAGENT', specification: '', quantityPerBatchUnit: 1, totalQuantity: 2, unit: 'bottles', sourcingChannel: 'CHEMICAL_PREP', status: 'PENDING' },
        { id: '3', classId: 'class-1', name: 'Acrylic', category: 'FABRICATION_LASER_3D', specification: '', quantityPerBatchUnit: 1, totalQuantity: 2, unit: 'pcs', sourcingChannel: 'LASER_CUT', status: 'PACKED' }
      ]
    }
  ]
} as Project;

describe('project readiness summary', () => {
  it('turns project work into actionable preparation queues', () => {
    const summary = getProjectReadinessSummary(project);

    expect(summary.totalItems).toBe(3);
    expect(summary.readyItems).toBe(1);
    expect(summary.packedItems).toBe(1);
    expect(summary.pendingItems).toBe(1);
    expect(summary.readinessPercent).toBe(67);
    expect(summary.nextActions[0]).toMatchObject({
      channel: 'CHEMICAL_PREP',
      label: 'Prepare chemicals',
      count: 1
    });
    expect(summary.nextActions).toHaveLength(1);
  });

  it('returns a safe empty state for projects without deliverables', () => {
    const summary = getProjectReadinessSummary({ classes: [] } as Project);

    expect(summary.totalItems).toBe(0);
    expect(summary.readinessPercent).toBe(0);
    expect(summary.nextActions).toEqual([]);
  });
});
