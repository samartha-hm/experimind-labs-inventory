import {
  INITIAL_PROJECTS,
  Project,
  ProjectCategory,
  ProjectStatus,
  ProjectExpense,
  ProjectAuditLog,
  ProjectClassWork,
  ProjectWorkItem,
  WorkItemCategory,
  WorkItemSourcingChannel,
  WorkItemStatus,
  buildCurriculumClasses,
  buildDefaultStandardClasses
} from '../data/projectsDataset';
import { ProductionWorkflowService } from './ProductionWorkflowService';

export interface ProjectFinancials {
  projectId: string;
  projectCode: string;
  projectName: string;
  budgetINR?: number;
  invoicedRevenueINR?: number;
  totalExpensesINR: number;
  expensesByCategory: Record<string, number>;
  estimatedBOMCostINR: number;
  grossMarginINR: number;
  grossMarginPercent: number;
  budgetVarianceINR?: number;
  isOverBudget: boolean;
}

export interface InventoryConflictItem {
  materialName: string;
  activityCode: string;
  totalRequiredAcrossProjects: number;
  availableStock: number;
  globalDeficit: number;
  estimatedCostINR: number;
  competingProjects: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    qtyRequired: number;
  }>;
}

export interface PortfolioSummary {
  totalProjects: number;
  activeProjectsCount: number;
  totalBudgetINR: number;
  totalExpensesINR: number;
  totalRevenueINR: number;
  overallGrossMarginINR: number;
  overallGrossMarginPercent: number;
  totalConflictsCount: number;
}

export class ProjectManagementService {
  private static projects: Project[] = [...INITIAL_PROJECTS];

  public static getAllProjects(filters?: {
    category?: ProjectCategory | 'ALL';
    status?: ProjectStatus | 'ALL';
    search?: string;
  }): Project[] {
    let result = [...this.projects];

    if (filters) {
      if (filters.category && filters.category !== 'ALL') {
        result = result.filter(p => p.category === filters.category);
      }
      if (filters.status && filters.status !== 'ALL') {
        result = result.filter(p => p.status === filters.status);
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        result = result.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.leadUserName.toLowerCase().includes(q) ||
          (p.assignedBy && p.assignedBy.toLowerCase().includes(q))
        );
      }
    }

    return result;
  }

  public static getProjectById(id: string): Project | null {
    return this.projects.find(p => p.id === id || p.code.toLowerCase() === id.toLowerCase()) || null;
  }

  public static createProject(
    data: Partial<Project>,
    creatorUser?: { id: string; name: string; role: string },
    templateType: 'CURRICULUM' | 'STANDARD_LAB' | 'BLANK' = 'CURRICULUM'
  ): Project {
    const idNum = this.projects.length + 1;
    const newId = `PRJ-${idNum.toString().padStart(3, '0')}`;
    const newCode = data.code || `PRJ-EXP-${idNum.toString().padStart(3, '0')}`;
    const defaultBatch = Number(data.defaultBatchMultiplier) || 1;

    let classes: ProjectClassWork[] = [];
    if (data.classes && data.classes.length > 0) {
      classes = data.classes;
    } else if (templateType === 'CURRICULUM') {
      classes = buildCurriculumClasses(defaultBatch);
    } else if (templateType === 'STANDARD_LAB') {
      classes = buildDefaultStandardClasses(defaultBatch);
    } else {
      // Blank template with clean default classes
      classes = [
        { id: 'cls-1', name: 'General Activities', batchMultiplier: defaultBatch, description: 'Primary Project Activities', items: [] }
      ];
    }

    const newProject: Project = {
      id: newId,
      code: newCode,
      name: data.name || 'New Educational Initiative',
      description: data.description || '',
      category: data.category || 'STEM_CURRICULUM',
      clientName: data.clientName || 'General Institutional Client',
      leadUserId: data.leadUserId || creatorUser?.id || 'usr-admin-01',
      leadUserName: data.leadUserName || creatorUser?.name || 'Dr. Samartha HM',
      assignedBy: data.assignedBy || 'Operations Lead',
      assignedUserIds: data.assignedUserIds || [creatorUser?.id || 'usr-admin-01'],
      assignedUserNames: data.assignedUserNames || [creatorUser?.name || 'Dr. Samartha HM'],
      status: data.status || 'PLANNING',
      priority: data.priority || 'MEDIUM',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      targetDeliveryDate: data.targetDeliveryDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      defaultBatchMultiplier: defaultBatch,
      budgetINR: data.budgetINR !== undefined ? data.budgetINR : undefined,
      invoicedRevenueINR: data.invoicedRevenueINR !== undefined ? data.invoicedRevenueINR : undefined,
      classes,
      batchConfigurations: data.batchConfigurations || classes.map(c => ({
        gradeOrKitId: c.name,
        kitName: `${c.name} Set`,
        targetQuantity: c.batchMultiplier
      })),
      expenses: data.expenses || [],
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: creatorUser?.id || 'usr-admin-01',
          userName: creatorUser?.name || 'Administrator',
          userRole: creatorUser?.role || 'admin',
          action: 'PROJECT_CREATED',
          details: `Project "${data.name || newCode}" initialized with ${classes.length} classes. Lead: ${data.leadUserName || 'Dr. Samartha HM'} (Assigned by: ${data.assignedBy || 'Operations'})`,
          signatureDigest: `sha256-${Math.random().toString(36).substring(2, 12)}`
        }
      ],
      qaSignOff: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.projects.unshift(newProject);
    return newProject;
  }

  public static updateProject(id: string, updates: Partial<Project>, updaterUser?: { id: string; name: string; role: string }): Project | null {
    const project = this.getProjectById(id);
    if (!project) return null;

    Object.assign(project, updates);
    project.updatedAt = new Date().toISOString();

    if (updaterUser) {
      project.auditLogs.unshift({
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: updaterUser.id,
        userName: updaterUser.name,
        userRole: updaterUser.role,
        action: 'PROJECT_UPDATED',
        details: `Updated project fields: ${Object.keys(updates).join(', ')}`,
        signatureDigest: `sha256-${Math.random().toString(36).substring(2, 12)}`
      });
    }

    return project;
  }

  public static deleteProject(id: string): boolean {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.projects.splice(idx, 1);
    return true;
  }

  // ==========================================
  // Class-Wise Management Methods
  // ==========================================

  public static addClassToProject(projectId: string, classData: Partial<ProjectClassWork>): ProjectClassWork | null {
    const project = this.getProjectById(projectId);
    if (!project) return null;

    const classId = classData.id || `cls-${Date.now()}`;
    const newClass: ProjectClassWork = {
      id: classId,
      name: classData.name || `Class ${project.classes.length + 6}`,
      batchMultiplier: Number(classData.batchMultiplier) || project.defaultBatchMultiplier || 1,
      description: classData.description || '',
      items: classData.items || []
    };

    project.classes.push(newClass);
    project.updatedAt = new Date().toISOString();
    return newClass;
  }

  public static updateClass(projectId: string, classId: string, updates: Partial<ProjectClassWork>): ProjectClassWork | null {
    const project = this.getProjectById(projectId);
    if (!project) return null;

    const targetClass = project.classes.find(c => c.id === classId);
    if (!targetClass) return null;

    if (updates.name !== undefined) targetClass.name = updates.name;
    if (updates.description !== undefined) targetClass.description = updates.description;
    if (updates.batchMultiplier !== undefined) {
      const newMult = Math.max(1, Number(updates.batchMultiplier));
      targetClass.batchMultiplier = newMult;
      // Rescale all items in this class
      targetClass.items.forEach(item => {
        item.totalQuantity = item.quantityPerBatchUnit * newMult;
      });
    }

    project.updatedAt = new Date().toISOString();
    return targetClass;
  }

  public static removeClassFromProject(projectId: string, classId: string): boolean {
    const project = this.getProjectById(projectId);
    if (!project) return false;

    const idx = project.classes.findIndex(c => c.id === classId);
    if (idx === -1) return false;

    project.classes.splice(idx, 1);
    project.updatedAt = new Date().toISOString();
    return true;
  }

  // ==========================================
  // Class Item CRUD Methods
  // ==========================================

  public static addWorkItem(
    projectId: string,
    classId: string,
    itemData: {
      name: string;
      category?: WorkItemCategory;
      specification?: string;
      quantityPerBatchUnit?: number;
      unit?: string;
      sourcingChannel?: WorkItemSourcingChannel;
      status?: WorkItemStatus;
      unitCost?: number;
      imageUrl?: string;
      leadAssignee?: string;
      sourceChapter?: string;
      notes?: string;
    }
  ): ProjectWorkItem | null {
    const project = this.getProjectById(projectId);
    if (!project) return null;

    const targetClass = project.classes.find(c => c.id === classId);
    if (!targetClass) return null;

    const baseQty = Number(itemData.quantityPerBatchUnit) || 1;
    const newItem: ProjectWorkItem = {
      id: `ITM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      classId,
      name: itemData.name || 'Untitled Deliverable Item',
      category: itemData.category || 'ACTIVITY_KIT',
      specification: itemData.specification || '',
      quantityPerBatchUnit: baseQty,
      totalQuantity: baseQty * targetClass.batchMultiplier,
      unit: itemData.unit || 'pcs',
      sourcingChannel: itemData.sourcingChannel || 'IN_STOCK',
      status: itemData.status || 'PENDING',
      unitCost: Number(itemData.unitCost) || 0,
      imageUrl: itemData.imageUrl,
      leadAssignee: itemData.leadAssignee || project.leadUserName,
      sourceChapter: itemData.sourceChapter,
      notes: itemData.notes
    };

    targetClass.items.push(newItem);
    project.updatedAt = new Date().toISOString();
    return newItem;
  }

  public static updateWorkItem(
    projectId: string,
    classId: string,
    itemId: string,
    updates: Partial<ProjectWorkItem>
  ): ProjectWorkItem | null {
    const project = this.getProjectById(projectId);
    if (!project) return null;

    const targetClass = project.classes.find(c => c.id === classId);
    if (!targetClass) return null;

    const item = targetClass.items.find(i => i.id === itemId);
    if (!item) return null;

    Object.assign(item, updates);

    if (updates.quantityPerBatchUnit !== undefined) {
      item.quantityPerBatchUnit = Number(updates.quantityPerBatchUnit) || 1;
      item.totalQuantity = item.quantityPerBatchUnit * targetClass.batchMultiplier;
    }

    project.updatedAt = new Date().toISOString();
    return item;
  }

  public static deleteWorkItem(projectId: string, classId: string, itemId: string): boolean {
    const project = this.getProjectById(projectId);
    if (!project) return false;

    const targetClass = project.classes.find(c => c.id === classId);
    if (!targetClass) return false;

    const idx = targetClass.items.findIndex(i => i.id === itemId);
    if (idx === -1) return false;

    targetClass.items.splice(idx, 1);
    project.updatedAt = new Date().toISOString();
    return true;
  }

  public static cycleWorkItemStatus(projectId: string, classId: string, itemId: string): ProjectWorkItem | null {
    const project = this.getProjectById(projectId);
    if (!project) return null;

    const targetClass = project.classes.find(c => c.id === classId);
    if (!targetClass) return null;

    const item = targetClass.items.find(i => i.id === itemId);
    if (!item) return null;

    const statusFlow: Record<WorkItemStatus, WorkItemStatus> = {
      'PENDING': 'IN_PREP',
      'IN_PREP': 'READY',
      'READY': 'PACKED',
      'PACKED': 'PENDING'
    };

    item.status = statusFlow[item.status] || 'PENDING';
    project.updatedAt = new Date().toISOString();
    return item;
  }

  public static setProjectDefaultBatchMultiplier(projectId: string, multiplier: number): Project | null {
    const project = this.getProjectById(projectId);
    if (!project) return null;

    const mult = Math.max(1, Number(multiplier) || 1);
    project.defaultBatchMultiplier = mult;

    // Update all classes and recalculate totals
    project.classes.forEach(c => {
      c.batchMultiplier = mult;
      c.items.forEach(i => {
        i.totalQuantity = i.quantityPerBatchUnit * mult;
      });
    });

    project.updatedAt = new Date().toISOString();
    return project;
  }

  // ==========================================
  // Financials & Portfolio Analytics
  // ==========================================

  public static getProjectFinancials(id: string): ProjectFinancials | null {
    const project = this.getProjectById(id);
    if (!project) return null;

    let totalExpenses = 0;
    const catMap: Record<string, number> = {
      MATERIAL: 0,
      LASER_MACHINE: 0,
      CHEMICAL_PREP: 0,
      VENDOR_PO: 0,
      SHIPPING: 0,
      LABOR: 0
    };

    for (const exp of project.expenses) {
      totalExpenses += exp.amountINR;
      catMap[exp.category] = (catMap[exp.category] || 0) + exp.amountINR;
    }

    // Dynamic BOM estimate based on class work items
    let estimatedBOM = 0;
    if (project.classes && project.classes.length > 0) {
      for (const cls of project.classes) {
        for (const item of cls.items) {
          estimatedBOM += (item.unitCost || 0) * (item.totalQuantity || item.quantityPerBatchUnit);
        }
      }
    } else {
      for (const b of project.batchConfigurations) {
        const calc = ProductionWorkflowService.calculateBatchRequirements(b.targetQuantity, b.gradeOrKitId);
        estimatedBOM += calc.totalEstimatedCost;
      }
    }

    const revenue = project.invoicedRevenueINR ?? 0;
    const budget = project.budgetINR ?? 0;
    const grossMargin = revenue - totalExpenses;
    const grossMarginPercent = revenue > 0
      ? Number(((grossMargin / revenue) * 100).toFixed(1))
      : 0;
    const variance = budget > 0 ? budget - totalExpenses : undefined;

    return {
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      budgetINR: project.budgetINR,
      invoicedRevenueINR: project.invoicedRevenueINR,
      totalExpensesINR: totalExpenses,
      expensesByCategory: catMap,
      estimatedBOMCostINR: Math.round(estimatedBOM),
      grossMarginINR: grossMargin,
      grossMarginPercent: grossMarginPercent,
      budgetVarianceINR: variance,
      isOverBudget: budget > 0 ? totalExpenses > budget : false
    };
  }

  public static getPortfolioSummary(): PortfolioSummary {
    let totalBudget = 0;
    let totalExpenses = 0;
    let totalRevenue = 0;
    let activeCount = 0;

    for (const p of this.projects) {
      if (p.budgetINR) totalBudget += p.budgetINR;
      if (p.invoicedRevenueINR) totalRevenue += p.invoicedRevenueINR;
      if (p.status !== 'COMPLETED' && p.status !== 'ARCHIVED') {
        activeCount++;
      }
      for (const e of p.expenses) {
        totalExpenses += e.amountINR;
      }
    }

    const conflicts = this.detectInventoryConflicts();
    const margin = totalRevenue - totalExpenses;
    const marginPercent = totalRevenue > 0 ? Number(((margin / totalRevenue) * 100).toFixed(1)) : 0;

    return {
      totalProjects: this.projects.length,
      activeProjectsCount: activeCount,
      totalBudgetINR: totalBudget,
      totalExpensesINR: totalExpenses,
      totalRevenueINR: totalRevenue,
      overallGrossMarginINR: margin,
      overallGrossMarginPercent: marginPercent,
      totalConflictsCount: conflicts.length
    };
  }

  public static detectInventoryConflicts(): InventoryConflictItem[] {
    const demandMap = new Map<string, {
      materialName: string;
      activityCode: string;
      unitCost: number;
      availableStock: number;
      competing: Array<{ projectId: string; projectCode: string; projectName: string; qtyRequired: number }>;
    }>();

    const activeProjects = this.projects.filter(p => p.status !== 'COMPLETED' && p.status !== 'ARCHIVED');

    for (const proj of activeProjects) {
      if (proj.classes && proj.classes.length > 0) {
        for (const cls of proj.classes) {
          for (const item of cls.items) {
            const qtyNeeded = item.totalQuantity;
            const key = item.name.toLowerCase().trim();

            const existing = demandMap.get(key) || {
              materialName: item.name,
              activityCode: item.sourceChapter || cls.name,
              unitCost: item.unitCost || 0,
              availableStock: 50, // Default baseline or mapped stock
              competing: []
            };

            existing.competing.push({
              projectId: proj.id,
              projectCode: proj.code,
              projectName: proj.name,
              qtyRequired: qtyNeeded
            });

            demandMap.set(key, existing);
          }
        }
      } else {
        for (const batch of proj.batchConfigurations) {
          const batchItems = ProductionWorkflowService.getItems(
            batch.gradeOrKitId !== 'ALL' ? { grade: batch.gradeOrKitId } : undefined
          );

          for (const item of batchItems) {
            const qtyNeeded = item.quantityPerKit * batch.targetQuantity;
            const key = item.materialName.toLowerCase().trim();

            const existing = demandMap.get(key) || {
              materialName: item.materialName,
              activityCode: item.activityCode,
              unitCost: item.unitCost,
              availableStock: item.currentStock,
              competing: []
            };

            existing.competing.push({
              projectId: proj.id,
              projectCode: proj.code,
              projectName: proj.name,
              qtyRequired: qtyNeeded
            });

            demandMap.set(key, existing);
          }
        }
      }
    }

    const conflicts: InventoryConflictItem[] = [];

    for (const [, data] of demandMap.entries()) {
      const totalDemand = data.competing.reduce((sum, c) => sum + c.qtyRequired, 0);
      if (totalDemand > data.availableStock) {
        const deficit = totalDemand - data.availableStock;
        conflicts.push({
          materialName: data.materialName,
          activityCode: data.activityCode,
          totalRequiredAcrossProjects: totalDemand,
          availableStock: data.availableStock,
          globalDeficit: deficit,
          estimatedCostINR: Math.round(deficit * data.unitCost),
          competingProjects: data.competing
        });
      }
    }

    return conflicts;
  }

  public static logProjectExpense(
    projectId: string,
    expense: Omit<ProjectExpense, 'id'>,
    operator: { id: string; name: string; role: string }
  ): ProjectExpense | null {
    const project = this.getProjectById(projectId);
    if (!project) return null;

    const newExpense: ProjectExpense = {
      id: `EXP-${Date.now()}`,
      ...expense,
      loggedByUserId: operator.id,
      loggedByUserName: operator.name
    };

    project.expenses.unshift(newExpense);
    project.auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: operator.id,
      userName: operator.name,
      userRole: operator.role,
      action: 'EXPENSE_LOGGED',
      details: `Logged expense ₹${expense.amountINR.toLocaleString('en-IN')} for ${expense.description} (${expense.category})`,
      signatureDigest: `sha256-${Math.random().toString(36).substring(2, 12)}`
    });

    project.updatedAt = new Date().toISOString();
    return newExpense;
  }

  public static signOffProjectQA(
    projectId: string,
    signOffData: { userId: string; userName: string; role: string; comments: string }
  ): Project | null {
    const project = this.getProjectById(projectId);
    if (!project) return null;

    const digest = `sha256-21cfr11-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;

    project.qaSignOff = {
      signedBy: signOffData.userName,
      signedAt: new Date().toISOString(),
      role: signOffData.role,
      signatureDigest: digest,
      comments: signOffData.comments
    };

    project.status = 'COMPLETED';
    project.auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: signOffData.userId,
      userName: signOffData.userName,
      userRole: signOffData.role,
      action: '21CFR11_QA_SIGN_OFF',
      details: `Project signed off and completed with cryptographic digest ${digest}. Comments: ${signOffData.comments}`,
      signatureDigest: digest
    });

    project.updatedAt = new Date().toISOString();
    return project;
  }
}
