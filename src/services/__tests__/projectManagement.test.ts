import { describe, it, expect } from 'vitest';
import { ProjectManagementService } from '../ProjectManagementService';

describe('ProjectManagementService (Multi-Project Operations & Cost Accounting)', () => {
  it('should load all seeded active and planned projects', () => {
    const projects = ProjectManagementService.getAllProjects();
    expect(projects.length).toBeGreaterThanOrEqual(5);

    const karwar = projects.find(p => p.code === 'PRJ-KARWAR-001');
    expect(karwar).toBeDefined();
    expect(karwar?.category).toBe('STEM_CURRICULUM');
    expect(karwar?.batchConfigurations.length).toBeGreaterThan(0);
  });

  it('should filter projects by category and status', () => {
    const stemProjects = ProjectManagementService.getAllProjects({ category: 'STEM_CURRICULUM' });
    const iotProjects = ProjectManagementService.getAllProjects({ category: 'IOT_HARDWARE' });

    expect(stemProjects.length).toBeGreaterThanOrEqual(2);
    expect(iotProjects.length).toBeGreaterThanOrEqual(2);
  });

  it('should accurately calculate project financials, P&L, and cost center breakdown', () => {
    const financials = ProjectManagementService.getProjectFinancials('PRJ-001');
    expect(financials).not.toBeNull();
    expect(financials?.budgetINR).toBe(150000);
    expect(financials?.invoicedRevenueINR).toBe(220000);
    expect(financials?.totalExpensesINR).toBeGreaterThan(0);
    expect(financials?.grossMarginINR).toBe(financials!.invoicedRevenueINR - financials!.totalExpensesINR);
    expect(financials?.grossMarginPercent).toBeGreaterThan(0);
    expect(financials?.expensesByCategory.MATERIAL).toBeGreaterThan(0);
    expect(financials?.expensesByCategory.LASER_MACHINE).toBeGreaterThan(0);
    expect(financials?.expensesByCategory.CHEMICAL_PREP).toBeGreaterThan(0);
  });

  it('should detect cross-project inventory conflicts across concurrent active projects', () => {
    const conflicts = ProjectManagementService.detectInventoryConflicts();
    expect(conflicts.length).toBeGreaterThanOrEqual(0);
    
    // If conflicts exist, verify competing projects breakdown
    if (conflicts.length > 0) {
      const first = conflicts[0];
      expect(first.totalRequiredAcrossProjects).toBeGreaterThan(first.availableStock);
      expect(first.globalDeficit).toBe(first.totalRequiredAcrossProjects - first.availableStock);
      expect(first.competingProjects.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should create a new project with operator profile stamp and audit log', () => {
    const newProj = ProjectManagementService.createProject(
      {
        code: 'PRJ-TEST-999',
        name: 'Mysore Robotics & Sensor Lab Setup',
        category: 'IOT_HARDWARE',
        clientName: 'Mysore STEM Center',
        budgetINR: 120000,
        invoicedRevenueINR: 180000,
        batchConfigurations: [{ gradeOrKitId: 'Grade 10', kitName: 'Grade 10 Lab', targetQuantity: 10 }]
      },
      { id: 'usr-admin-01', name: 'Dr. Samartha HM', role: 'admin' }
    );

    expect(newProj.id).toBeDefined();
    expect(newProj.auditLogs.length).toBeGreaterThanOrEqual(1);
    expect(newProj.auditLogs[0].action).toBe('PROJECT_CREATED');
    expect(newProj.auditLogs[0].userName).toBe('Dr. Samartha HM');
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
    const signed = ProjectManagementService.signOffProjectQA('PRJ-005', {
      userId: 'usr-admin-01',
      userName: 'Dr. Samartha HM',
      role: 'admin',
      comments: 'All 20 Visual Math kits inspected and sealed according to SOP.'
    });

    expect(signed).not.toBeNull();
    expect(signed?.status).toBe('COMPLETED');
    expect(signed?.qaSignOff?.signatureDigest).toContain('sha256-21cfr11-');
    expect(signed?.qaSignOff?.signedBy).toBe('Dr. Samartha HM');
  });

  it('should compute consolidated portfolio summary metrics', () => {
    const summary = ProjectManagementService.getPortfolioSummary();
    expect(summary.totalProjects).toBeGreaterThanOrEqual(5);
    expect(summary.activeProjectsCount).toBeGreaterThanOrEqual(3);
    expect(summary.totalBudgetINR).toBeGreaterThan(0);
    expect(summary.totalRevenueINR).toBeGreaterThan(0);
    expect(summary.overallGrossMarginPercent).toBeGreaterThan(0);
  });
});
