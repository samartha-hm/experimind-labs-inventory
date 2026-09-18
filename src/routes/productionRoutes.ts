import { Router, Request, Response } from 'express';
import { ProductionWorkflowService } from '../services/ProductionWorkflowService';
import { SourcingType, ItemStatus, BranchOrigin, CrateLevel } from '../data/productionDataset';

export const productionRouter = Router();

// 1. Get all production items with filtering
productionRouter.get('/items', (req: Request, res: Response) => {
  try {
    const { grade, sourcingType, status, branch, crateLevel, search } = req.query;

    const items = ProductionWorkflowService.getItems({
      grade: grade as string,
      sourcingType: sourcingType as SourcingType | 'ALL',
      status: status as ItemStatus | 'ALL',
      branch: branch as BranchOrigin | 'ALL',
      crateLevel: crateLevel as CrateLevel | 'ALL',
      search: search as string
    });

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Calculate batch requirements & shortage matrix
productionRouter.get('/batch-calculate', (req: Request, res: Response) => {
  try {
    const multiplier = req.query.batchMultiplier ? parseInt(req.query.batchMultiplier as string, 10) : 1;
    const grade = req.query.grade as string;

    const result = ProductionWorkflowService.calculateBatchRequirements(multiplier, grade);

    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Update individual item status
productionRouter.patch('/items/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, preppedCount, packedCount, qaNotes, currentStock } = req.body;

    const updated = ProductionWorkflowService.updateItemStatus(id, status, {
      preppedCount,
      packedCount,
      qaNotes,
      currentStock
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, item: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Batch update status
productionRouter.post('/batch-update', (req: Request, res: Response) => {
  try {
    const { itemIds, status } = req.body;
    if (!Array.isArray(itemIds) || !status) {
      return res.status(400).json({ success: false, error: 'Invalid payload: itemIds array and status required' });
    }

    const updatedCount = ProductionWorkflowService.batchUpdateStatus(itemIds, status);
    res.json({ success: true, updatedCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Add custom item
productionRouter.post('/custom-item', (req: Request, res: Response) => {
  try {
    const newItem = ProductionWorkflowService.addCustomItem(req.body);
    res.status(201).json({ success: true, item: newItem });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get QA Doubts & Blockers
productionRouter.get('/doubts', (_req: Request, res: Response) => {
  try {
    const doubts = ProductionWorkflowService.getDoubts();
    res.json({ success: true, doubts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Add QA Doubt / Blocker
productionRouter.post('/doubts', (req: Request, res: Response) => {
  try {
    const { grade, material, issue, priority, status, raisedBy, resolutionNotes } = req.body;
    const newDoubt = ProductionWorkflowService.addDoubt({
      date: new Date().toISOString().split('T')[0],
      grade: grade || 'General',
      material: material || 'General Component',
      issue: issue || 'Unspecified issue',
      priority: priority || 'Medium',
      status: status || 'Open',
      raisedBy: raisedBy || 'Operator',
      resolutionNotes: resolutionNotes || ''
    });
    res.status(201).json({ success: true, doubt: newDoubt });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Update QA Doubt / Blocker
productionRouter.patch('/doubts/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = ProductionWorkflowService.updateDoubt(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Doubt record not found' });
    }
    res.json({ success: true, doubt: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
