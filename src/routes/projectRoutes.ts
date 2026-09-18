import { Router, Request, Response } from 'express';
import { ProjectManagementService } from '../services/ProjectManagementService';
import { ProjectCategory, ProjectStatus } from '../data/projectsDataset';

export const projectRouter = Router();

// 1. Get all projects with filters
projectRouter.get('/', (req: Request, res: Response) => {
  try {
    const { category, status, search } = req.query;
    const projects = ProjectManagementService.getAllProjects({
      category: category as ProjectCategory | 'ALL',
      status: status as ProjectStatus | 'ALL',
      search: search as string
    });
    res.json({ success: true, count: projects.length, projects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get portfolio summary KPIs
projectRouter.get('/portfolio/summary', (_req: Request, res: Response) => {
  try {
    const summary = ProjectManagementService.getPortfolioSummary();
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Detect cross-project inventory conflicts
projectRouter.get('/portfolio/conflicts', (_req: Request, res: Response) => {
  try {
    const conflicts = ProjectManagementService.detectInventoryConflicts();
    res.json({ success: true, count: conflicts.length, conflicts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Get single project by ID or code
projectRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const project = ProjectManagementService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Get project financials & P&L
projectRouter.get('/:id/financials', (req: Request, res: Response) => {
  try {
    const financials = ProjectManagementService.getProjectFinancials(req.params.id);
    if (!financials) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, financials });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Create new project
projectRouter.post('/', (req: Request, res: Response) => {
  try {
    const creatorUser = (req as any).user || { id: 'usr-admin-01', name: 'Dr. Samartha HM', role: 'admin' };
    const templateType = req.body.templateType || 'CURRICULUM';
    const newProject = ProjectManagementService.createProject(req.body, creatorUser, templateType);
    res.status(201).json({ success: true, project: newProject });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Update project metadata
projectRouter.patch('/:id', (req: Request, res: Response) => {
  try {
    const updaterUser = (req as any).user || { id: 'usr-admin-01', name: 'Dr. Samartha HM', role: 'admin' };
    const updated = ProjectManagementService.updateProject(req.params.id, req.body, updaterUser);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, project: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Delete project
projectRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const success = ProjectManagementService.deleteProject(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Add a new class to project
projectRouter.post('/:id/classes', (req: Request, res: Response) => {
  try {
    const newClass = ProjectManagementService.addClassToProject(req.params.id, req.body);
    if (!newClass) return res.status(404).json({ success: false, error: 'Project not found' });
    res.status(201).json({ success: true, class: newClass });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Update class (multiplier, name, desc)
projectRouter.patch('/:id/classes/:classId', (req: Request, res: Response) => {
  try {
    const updatedClass = ProjectManagementService.updateClass(req.params.id, req.params.classId, req.body);
    if (!updatedClass) return res.status(404).json({ success: false, error: 'Class or Project not found' });
    res.json({ success: true, class: updatedClass });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Delete class from project
projectRouter.delete('/:id/classes/:classId', (req: Request, res: Response) => {
  try {
    const success = ProjectManagementService.removeClassFromProject(req.params.id, req.params.classId);
    if (!success) return res.status(404).json({ success: false, error: 'Class or Project not found' });
    res.json({ success: true, message: 'Class removed successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. Add work item to class
projectRouter.post('/:id/classes/:classId/items', (req: Request, res: Response) => {
  try {
    const newItem = ProjectManagementService.addWorkItem(req.params.id, req.params.classId, req.body);
    if (!newItem) return res.status(404).json({ success: false, error: 'Class or Project not found' });
    res.status(201).json({ success: true, item: newItem });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Update work item
projectRouter.patch('/:id/classes/:classId/items/:itemId', (req: Request, res: Response) => {
  try {
    const updatedItem = ProjectManagementService.updateWorkItem(req.params.id, req.params.classId, req.params.itemId, req.body);
    if (!updatedItem) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true, item: updatedItem });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. Delete work item
projectRouter.delete('/:id/classes/:classId/items/:itemId', (req: Request, res: Response) => {
  try {
    const success = ProjectManagementService.deleteWorkItem(req.params.id, req.params.classId, req.params.itemId);
    if (!success) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. Toggle item status
projectRouter.post('/:id/classes/:classId/items/:itemId/toggle-status', (req: Request, res: Response) => {
  try {
    const updatedItem = ProjectManagementService.cycleWorkItemStatus(req.params.id, req.params.classId, req.params.itemId);
    if (!updatedItem) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true, item: updatedItem });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Log project expense
projectRouter.post('/:id/log-expense', (req: Request, res: Response) => {
  try {
    const operator = (req as any).user || {
      id: req.body.loggedByUserId || 'usr-admin-01',
      name: req.body.loggedByUserName || 'Dr. Samartha HM',
      role: 'admin'
    };
    const expense = ProjectManagementService.logProjectExpense(req.params.id, req.body, operator);
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.status(201).json({ success: true, expense });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. QA 21 CFR Part 11 Electronic Signature Sign-off
projectRouter.post('/:id/sign-off', (req: Request, res: Response) => {
  try {
    const { comments, userId, userName, role } = req.body;
    const operator = {
      userId: userId || 'usr-admin-01',
      userName: userName || 'Dr. Samartha HM',
      role: role || 'admin',
      comments: comments || 'Final QA inspection verified and signed.'
    };
    const signedProject = ProjectManagementService.signOffProjectQA(req.params.id, operator);
    if (!signedProject) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, project: signedProject });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
