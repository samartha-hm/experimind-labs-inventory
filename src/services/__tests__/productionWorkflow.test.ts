import { describe, it, expect, beforeEach } from 'vitest';
import { ProductionWorkflowService } from '../ProductionWorkflowService';

describe('ProductionWorkflowService (Top 1% STEM Production & Sourcing Engine)', () => {
  it('should load all 236+ master curriculum items across Grades 8, 9, 10', () => {
    const items = ProductionWorkflowService.getItems();
    expect(items.length).toBeGreaterThanOrEqual(230);
  });

  it('should filter items by grade level accurately', () => {
    const gr8 = ProductionWorkflowService.getItems({ grade: 'Grade 8' });
    const gr9 = ProductionWorkflowService.getItems({ grade: 'Grade 9' });
    const gr10 = ProductionWorkflowService.getItems({ grade: 'Grade 10' });

    expect(gr8.length).toBeGreaterThanOrEqual(70);
    expect(gr9.length).toBeGreaterThanOrEqual(65);
    expect(gr10.length).toBeGreaterThanOrEqual(90);
  });

  it('should filter items by sourcing type (In-Stock, Laser Cut, Chemical Prep, To Order)', () => {
    const laserItems = ProductionWorkflowService.getItems({ sourcingType: 'LASER_CUT_FABLAB' });
    const inHousePrep = ProductionWorkflowService.getItems({ sourcingType: 'IN_HOUSE_PREP' });

    expect(laserItems.length).toBeGreaterThan(0);
    expect(inHousePrep.length).toBeGreaterThan(0);
    expect(laserItems.some(i => i.laserSpecs !== null)).toBe(true);
  });

  it('should dynamically scale batch requirements when multiplier changes (x1 vs x5 vs x10)', () => {
    const singleBatch = ProductionWorkflowService.calculateBatchRequirements(1, 'Grade 10');
    const fiveBatch = ProductionWorkflowService.calculateBatchRequirements(5, 'Grade 10');

    expect(fiveBatch.totalUnitsRequired).toBe(singleBatch.totalUnitsRequired * 5);
    expect(fiveBatch.totalEstimatedCost).toBeCloseTo(singleBatch.totalEstimatedCost * 5, -1);
    expect(fiveBatch.batchMultiplier).toBe(5);
  });

  it('should accurately calculate chemical volumes and bottle fill counts in chemicalPrepQueue', () => {
    const batch = ProductionWorkflowService.calculateBatchRequirements(10, 'Grade 10');
    expect(batch.chemicalPrepQueue.length).toBeGreaterThan(0);

    const chem = batch.chemicalPrepQueue[0];
    expect(chem.totalVolumeMl).toBeGreaterThan(0);
    expect(chem.bottlesToFill).toBe(10);
  });

  it('should budget laser cutting sheets and machine run time in laserCuttingQueue', () => {
    const batch = ProductionWorkflowService.calculateBatchRequirements(5);
    expect(batch.laserCuttingQueue.length).toBeGreaterThan(0);

    const laserJob = batch.laserCuttingQueue[0];
    expect(laserJob.unitsToCut).toBe(5);
    expect(laserJob.totalCutMinutes).toBeGreaterThan(0);
    expect(laserJob.estimatedSheetsNeeded).toBeGreaterThanOrEqual(1);
  });

  it('should update item status, prepped counts, and QA notes', () => {
    const items = ProductionWorkflowService.getItems();
    const target = items[0];

    const updated = ProductionWorkflowService.updateItemStatus(target.id, 'PREPPED', {
      preppedCount: 5,
      qaNotes: 'Inspected under microscope; zero cracks'
    });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('PREPPED');
    expect(updated?.preppedCount).toBe(5);
    expect(updated?.qaNotes).toContain('zero cracks');
  });

  it('should batch update status across multiple items simultaneously', () => {
    const items = ProductionWorkflowService.getItems();
    const ids = items.slice(0, 5).map(i => i.id);

    const updatedCount = ProductionWorkflowService.batchUpdateStatus(ids, 'PACKED');
    expect(updatedCount).toBe(5);

    const check = ProductionWorkflowService.getItems().filter(i => ids.includes(i.id));
    expect(check.every(i => i.status === 'PACKED')).toBe(true);
  });

  it('should allow adding custom school experiment components on the fly', () => {
    const custom = ProductionWorkflowService.addCustomItem({
      grade: 'Grade 9',
      activityCode: 'EXP.9.99',
      activityName: 'Custom Hydroponics Chamber',
      materialName: 'Perlite Growing Medium (250g)',
      sourcingType: 'IN_HOUSE_PREP',
      quantityPerKit: 2,
      unitCost: 45
    });

    expect(custom.id).toContain('PRD-');
    expect(custom.materialName).toBe('Perlite Growing Medium (250g)');

    const found = ProductionWorkflowService.getItems({ search: 'Hydroponics' });
    expect(found.length).toBeGreaterThanOrEqual(1);
  });

  it('should manage QA doubts and branch blockers (Sirsi pending, laser fits, etc.)', () => {
    const doubts = ProductionWorkflowService.getDoubts();
    expect(doubts.length).toBeGreaterThanOrEqual(5);

    const newDoubt = ProductionWorkflowService.addDoubt({
      date: '2026-09-18',
      grade: 'Grade 10',
      material: 'Laser Cut Optics Slider',
      issue: 'Slight friction on rail; sand 0.5mm',
      priority: 'High',
      status: 'Open',
      raisedBy: 'Operator Ravi',
      resolutionNotes: 'Sanding disc 220 grit assigned'
    });

    expect(newDoubt.id).toContain('DBT-');
    expect(ProductionWorkflowService.getDoubts().some(d => d.id === newDoubt.id)).toBe(true);
  });
});
