import { describe, expect, it } from 'vitest';
import { getProjectInventoryShortages, getProjectReadinessSummary } from '../projectReadiness';
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

  it('turns in-stock project requirements into replenishment shortages', () => {
    const shortageSummary = getProjectInventoryShortages(
      {
        ...project,
        classes: [{
          ...project.classes[0],
          items: [{
            ...project.classes[0].items[0],
            status: 'PENDING',
            totalQuantity: 8,
          }],
        }],
      },
      [{
        id: 'inventory-1',
        name: 'Slides',
        category: 'Lab',
        stockQty: 3,
        unit: 'pcs',
        threshold: 1,
      }],
    );

    expect(shortageSummary).toEqual([{
      workItemId: '1',
      inventoryItemId: 'inventory-1',
      name: 'Slides',
      unit: 'pcs',
      required: 8,
      available: 3,
      shortage: 5,
    }]);
  });

  it('does not report completed or common-stock requirements as shortages', () => {
    const summary = getProjectInventoryShortages(
      {
        ...project,
        classes: [{
          ...project.classes[0],
          items: [
            { ...project.classes[0].items[0], status: 'READY', totalQuantity: 20 },
            { ...project.classes[0].items[0], id: 'common', status: 'PENDING', name: 'Common screws', totalQuantity: 20 },
          ],
        }],
      },
      [
        { id: 'inventory-1', name: 'Slides', category: 'Lab', stockQty: 0, unit: 'pcs', threshold: 1 },
        { id: 'inventory-2', name: 'Common screws', category: 'Hardware', stockQty: 0, unit: 'pcs', threshold: 1, isCommon: true },
      ],
    );

    expect(summary).toEqual([]);
  });
});
