import { describe, it, expect } from 'vitest';
import { ProjectManagementService } from '../ProjectManagementService';

describe('ProjectManagementService (Multi-Project Operations & Class-Wise Deliverables)', () => {
  it('should load initial projects with structured class-wise deliverables', () => {
    const projects = ProjectManagementService.getAllProjects();
    expect(projects.length).toBeGreaterThanOrEqual(2);

    const karwar = projects.find(p => p.code === 'PRJ-KARWAR-001');
    expect(karwar).toBeDefined();
    expect(karwar?.category).toBe('STEM_CURRICULUM');
    expect(karwar?.classes.length).toBeGreaterThanOrEqual(4);

    const class8 = karwar?.classes.find(c => c.name === 'Class 8');
    expect(class8).toBeDefined();
    expect(class8?.items.length).toBeGreaterThan(0);
    expect(class8?.batchMultiplier).toBe(10);

    // Verify item scaling
    const firstItem = class8?.items[0];
    expect(firstItem?.totalQuantity).toBe(firstItem!.quantityPerBatchUnit * class8!.batchMultiplier);
  });

  it('should filter projects by category, status, and search query', () => {
    const stemProjects = ProjectManagementService.getAllProjects({ category: 'STEM_CURRICULUM' });
    expect(stemProjects.length).toBeGreaterThanOrEqual(2);

    const searchResult = ProjectManagementService.getAllProjects({ search: 'Karwar' });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].name).toContain('Karwar');
  });

  it('should create a new project from Curriculum Template with optional budget/revenue', () => {
    const newProj = ProjectManagementService.createProject(
      {
        code: 'PRJ-TEST-CURR-01',
        name: 'Belgaum STEM 5-School Lab Setup',
        category: 'STEM_CURRICULUM',
        clientName: 'Belgaum District STEM Hub',
        leadUserName: 'Dr. Samartha HM',
        assignedBy: 'Directorate of Public Instruction',
        defaultBatchMultiplier: 5,
        priority: 'HIGH'
      },
      { id: 'usr-admin-01', name: 'Dr. Samartha HM', role: 'admin' },
      'CURRICULUM'
    );

    expect(newProj.id).toBeDefined();
    expect(newProj.classes.length).toBe(4); // Class 8, 9, 10, Common Crate
    expect(newProj.defaultBatchMultiplier).toBe(5);
    expect(newProj.budgetINR).toBeUndefined(); // Optional
    expect(newProj.invoicedRevenueINR).toBeUndefined(); // Optional
    expect(newProj.auditLogs[0].action).toBe('PROJECT_CREATED');
  });

  it('should create a blank project and allow adding custom classes and work items', () => {
    const blankProj = ProjectManagementService.createProject(
      {
        code: 'PRJ-BLANK-99',
        name: 'Custom Optics & Mechanics Project',
        clientName: 'Hubli Science Society',
        leadUserName: 'Ravi Kumar (Lead Tech)',
        defaultBatchMultiplier: 2
      },
      { id: 'usr-admin-01', name: 'Administrator', role: 'admin' },
      'BLANK'
    );

    expect(blankProj.classes.length).toBe(1);

    // 1. Add new Class
    const addedClass = ProjectManagementService.addClassToProject(blankProj.id, {
      name: 'Class 7 Mechanics',
      batchMultiplier: 3,
      description: 'Gears, pulleys and levers'
    });
    expect(addedClass).not.toBeNull();
    expect(addedClass?.name).toBe('Class 7 Mechanics');

    // 2. Add custom work item under this class
    const addedItem = ProjectManagementService.addWorkItem(blankProj.id, addedClass!.id, {
      name: 'Compound Gear Train Demo Rig',
      category: 'WORKING_MODEL',
      sourcingChannel: 'MODEL_ASSEMBLY',
      specification: '3-stage 1:12 reduction gear set on MDF base',
      quantityPerBatchUnit: 1,
      unit: 'sets',
      unitCost: 180,
      leadAssignee: 'Ravi Kumar (Lead Tech)'
    });
    expect(addedItem).not.toBeNull();
    expect(addedItem?.totalQuantity).toBe(3); // 1 * 3 batch multiplier
    expect(addedItem?.status).toBe('PENDING');

    // 3. Cycle status of work item
    const cycled1 = ProjectManagementService.cycleWorkItemStatus(blankProj.id, addedClass!.id, addedItem!.id);
    expect(cycled1?.status).toBe('IN_PREP');

    const cycled2 = ProjectManagementService.cycleWorkItemStatus(blankProj.id, addedClass!.id, addedItem!.id);
    expect(cycled2?.status).toBe('READY');

    // 4. Update class batch multiplier and verify item dynamic scaling
    const updatedClass = ProjectManagementService.updateClass(blankProj.id, addedClass!.id, {
      batchMultiplier: 10
    });
    expect(updatedClass?.batchMultiplier).toBe(10);
    expect(updatedClass?.items[0].totalQuantity).toBe(10); // 1 * 10

    // 5. Delete work item
    const deleted = ProjectManagementService.deleteWorkItem(blankProj.id, addedClass!.id, addedItem!.id);
    expect(deleted).toBe(true);
    expect(updatedClass?.items.length).toBe(0);
  });

  it('should accurately calculate project financials with optional fields and cost center breakdown', () => {
    const financials = ProjectManagementService.getProjectFinancials('PRJ-001');
    expect(financials).not.toBeNull();
    expect(financials?.totalExpensesINR).toBeGreaterThan(0);
    expect(financials?.grossMarginINR).toBeDefined();
    expect(financials?.estimatedBOMCostINR).toBeGreaterThan(0);
    expect(financials?.expensesByCategory.MATERIAL).toBeGreaterThan(0);
    expect(financials?.expensesByCategory.LASER_MACHINE).toBeGreaterThan(0);
    expect(financials?.expensesByCategory.CHEMICAL_PREP).toBeGreaterThan(0);
  });

  it('should detect cross-project inventory conflicts across concurrent active projects', () => {
    const conflicts = ProjectManagementService.detectInventoryConflicts();
    expect(conflicts).toBeInstanceOf(Array);
  });

  it('should log project expenses and update audit trail', () => {
    const expense = ProjectManagementService.logProjectExpense(
      'PRJ-001',
      {
        date: '2026-09-18',
        category: 'SHIPPING',
        description: 'Secure courier dispatch to Karwar District Center',
        amountINR: 3500,
        loggedByUserId: 'usr-op-02',
        loggedByUserName: 'Ravi Kumar (Lead Tech)',
        receiptOrPoRef: 'AWB-DEL-9912'
      },
      { id: 'usr-op-02', name: 'Ravi Kumar (Lead Tech)', role: 'technician' }
    );

    expect(expense).not.toBeNull();
    expect(expense?.amountINR).toBe(3500);

    const project = ProjectManagementService.getProjectById('PRJ-001');
    expect(project?.expenses.some(e => e.id === expense?.id)).toBe(true);
    expect(project?.auditLogs[0].action).toBe('EXPENSE_LOGGED');
  });

  it('should execute 21 CFR Part 11 electronic signature sign-off', () => {
    const signed = ProjectManagementService.signOffProjectQA('PRJ-002', {
      userId: 'usr-admin-01',
      userName: 'Dr. Samartha HM',
      role: 'admin',
      comments: 'Optics and demo rigs inspected and approved.'
    });

    expect(signed).not.toBeNull();
    expect(signed?.status).toBe('COMPLETED');
    expect(signed?.qaSignOff?.signatureDigest).toContain('sha256-21cfr11-');
    expect(signed?.qaSignOff?.signedBy).toBe('Dr. Samartha HM');
  });

  it('should compute consolidated portfolio summary metrics', () => {
    const summary = ProjectManagementService.getPortfolioSummary();
    expect(summary.totalProjects).toBeGreaterThanOrEqual(2);
    expect(summary.totalExpensesINR).toBeGreaterThan(0);
  });

  it('should update project defaultBatchMultiplier and cascade to all classes and items when requested', () => {
    const proj = ProjectManagementService.getProjectById('PRJ-001');
    expect(proj).not.toBeNull();

    // Set multiplier to 25 with cascade
    const updated = ProjectManagementService.setProjectDefaultBatchMultiplier('PRJ-001', 25, true);
    expect(updated).not.toBeNull();
    expect(updated?.defaultBatchMultiplier).toBe(25);

    // Verify all classes and items have been scaled to 25
    for (const cls of updated!.classes) {
      expect(cls.batchMultiplier).toBe(25);
      for (const item of cls.items) {
        expect(item.totalQuantity).toBe(item.quantityPerBatchUnit * 25);
      }
    }

    // Reset back to 10
    const restored = ProjectManagementService.setProjectDefaultBatchMultiplier('PRJ-001', 10, true);
    expect(restored?.defaultBatchMultiplier).toBe(10);
    expect(restored?.classes[0].batchMultiplier).toBe(10);
  });
});

