import { MASTER_PRODUCTION_ITEMS, ProductionItem } from './productionDataset';

export type ProjectCategory = 'STEM_CURRICULUM' | 'IOT_HARDWARE' | 'CUSTOM_INSTITUTIONAL' | 'R_AND_D_PROTOTYPE';
export type ProjectStatus = 'PLANNING' | 'PROCURING' | 'IN_PREP' | 'ASSEMBLY_QC' | 'COMPLETED' | 'ARCHIVED';

export type WorkItemCategory =
  | 'ACTIVITY_KIT'
  | 'WORKING_MODEL'
  | 'EDUCATIONAL_CHART'
  | 'FABRICATION_LASER_3D'
  | 'CHEMICAL_REAGENT'
  | 'HARDWARE_SUPPLIES';

export type WorkItemSourcingChannel =
  | 'BUY_LOCAL'
  | 'ORDER_ONLINE'
  | 'LASER_CUT'
  | '3D_PRINT'
  | 'FOAM_CUT'
  | 'CHEMICAL_PREP'
  | 'CHART_PRINT'
  | 'MODEL_ASSEMBLY'
  | 'IN_STOCK';

export type WorkItemStatus = 'PENDING' | 'IN_PREP' | 'READY' | 'PACKED';

export interface ProjectWorkItem {
  id: string;
  classId: string;
  name: string;
  category: WorkItemCategory;
  specification: string;
  quantityPerBatchUnit: number;
  totalQuantity: number;
  unit: string;
  sourcingChannel: WorkItemSourcingChannel;
  status: WorkItemStatus;
  unitCost?: number;
  leadAssignee?: string;
  notes?: string;
  sourceChapter?: string;
}

export interface ProjectClassWork {
  id: string;
  name: string;
  batchMultiplier: number;
  description?: string;
  items: ProjectWorkItem[];
}

export interface ProjectBatchConfig {
  gradeOrKitId: string;
  kitName: string;
  targetQuantity: number;
}

export interface ProjectExpense {
  id: string;
  date: string;
  category: 'MATERIAL' | 'LASER_MACHINE' | 'CHEMICAL_PREP' | 'VENDOR_PO' | 'SHIPPING' | 'LABOR';
  description: string;
  amountINR: number;
  loggedByUserId: string;
  loggedByUserName: string;
  receiptOrPoRef?: string;
}

export interface ProjectAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  signatureDigest?: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  category: ProjectCategory;
  clientName: string;
  leadUserId?: string;
  leadUserName: string;
  assignedBy?: string;
  assignedUserIds: string[];
  assignedUserNames: string[];
  status: ProjectStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  startDate: string;
  targetDeliveryDate: string;
  defaultBatchMultiplier: number;
  budgetINR?: number;
  invoicedRevenueINR?: number;
  classes: ProjectClassWork[];
  batchConfigurations: ProjectBatchConfig[];
  expenses: ProjectExpense[];
  auditLogs: ProjectAuditLog[];
  qaSignOff?: {
    signedBy: string;
    signedAt: string;
    role: string;
    signatureDigest: string;
    comments: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Maps raw curriculum item into a structured ProjectWorkItem
 */
export function mapProductionItemToWorkItem(item: ProductionItem, classId: string, multiplier: number = 1): ProjectWorkItem {
  let category: WorkItemCategory = 'ACTIVITY_KIT';
  let sourcingChannel: WorkItemSourcingChannel = 'IN_STOCK';

  if (item.sourcingType === 'LASER_CUT_FABLAB') {
    category = 'FABRICATION_LASER_3D';
    sourcingChannel = 'LASER_CUT';
  } else if (item.chemicalSpecs || item.sourcingType === 'IN_HOUSE_PREP') {
    category = 'CHEMICAL_REAGENT';
    sourcingChannel = 'CHEMICAL_PREP';
  } else if (item.sourcingType === 'TO_ORDER') {
    category = 'HARDWARE_SUPPLIES';
    sourcingChannel = 'ORDER_ONLINE';
  } else if (item.crateLevel === 'COMMON_CRATE') {
    category = 'WORKING_MODEL';
    sourcingChannel = 'MODEL_ASSEMBLY';
  } else if (item.sourcingType === 'POUCH_BAGGING') {
    category = 'ACTIVITY_KIT';
    sourcingChannel = 'BUY_LOCAL';
  }

  let status: WorkItemStatus = 'PENDING';
  if (item.status === 'PACKED') status = 'PACKED';
  else if (item.status === 'PREPPED') status = 'READY';
  else if (item.status === 'IN_PREP' || item.status === 'BAGGED') status = 'IN_PREP';

  return {
    id: `ITM-${item.id}`,
    classId,
    name: item.materialName || item.activityName,
    category,
    specification: item.prepSpecification || item.activityName || 'Standard unit',
    quantityPerBatchUnit: item.quantityPerKit || 1,
    totalQuantity: (item.quantityPerKit || 1) * multiplier,
    unit: item.unit || 'pcs',
    sourcingChannel,
    status,
    unitCost: item.unitCost || 0,
    leadAssignee: item.branchOrigin === 'SIRSI_BRANCH' ? 'Priya Sharma (Chemical QA)' : 'Ravi Kumar (Lead Tech)',
    sourceChapter: item.chapter ? `Chapter ${item.chapter} (${item.activityCode})` : undefined,
    notes: item.qaNotes
  };
}

/**
 * Builds standard class work structure from verified curriculum dataset (236 items)
 */
export function buildCurriculumClasses(multiplier: number = 1): ProjectClassWork[] {
  const grade8Items = MASTER_PRODUCTION_ITEMS.filter(i => i.grade === 'Grade 8');
  const grade9Items = MASTER_PRODUCTION_ITEMS.filter(i => i.grade === 'Grade 9');
  const grade10Items = MASTER_PRODUCTION_ITEMS.filter(i => i.grade === 'Grade 10');
  const commonItems = MASTER_PRODUCTION_ITEMS.filter(i => i.grade === 'Common Crate' || i.crateLevel === 'COMMON_CRATE' || i.crateLevel === 'UNIVERSAL_CRATE');

  return [
    {
      id: 'cls-grade-8',
      name: 'Class 8',
      batchMultiplier: multiplier,
      description: 'Grade 8 Science & Mathematics Experiential Kits, Demo Models & Charts',
      items: grade8Items.map(i => mapProductionItemToWorkItem(i, 'cls-grade-8', multiplier))
    },
    {
      id: 'cls-grade-9',
      name: 'Class 9',
      batchMultiplier: multiplier,
      description: 'Grade 9 STEM Curriculum Activity Pouches, Optics & Chemical Reagents',
      items: grade9Items.map(i => mapProductionItemToWorkItem(i, 'cls-grade-9', multiplier))
    },
    {
      id: 'cls-grade-10',
      name: 'Class 10',
      batchMultiplier: multiplier,
      description: 'Grade 10 Advanced Science, Chemical Reaction Bottles & Physics Models',
      items: grade10Items.map(i => mapProductionItemToWorkItem(i, 'cls-grade-10', multiplier))
    },
    {
      id: 'cls-common-crate',
      name: 'Master Common Crate',
      batchMultiplier: multiplier,
      description: 'Shared Glassware, Metalware, Heavy Demonstration Apparatus & Tools',
      items: commonItems.map(i => mapProductionItemToWorkItem(i, 'cls-common-crate', multiplier))
    }
  ];
}

/**
 * Generates empty standard classes (Class 6 through 10 + Master Crate)
 */
export function buildDefaultStandardClasses(multiplier: number = 1): ProjectClassWork[] {
  const classDefs = [
    { id: 'cls-6', name: 'Class 6', desc: 'Grade 6 Science, Mechanics & Foundational Kits' },
    { id: 'cls-7', name: 'Class 7', desc: 'Grade 7 Science, Magnetism & Biology Sets' },
    { id: 'cls-8', name: 'Class 8', desc: 'Grade 8 Science & Mathematics Experiments' },
    { id: 'cls-9', name: 'Class 9', desc: 'Grade 9 Physical Sciences & Optics Laboratory' },
    { id: 'cls-10', name: 'Class 10', desc: 'Grade 10 Board Practical Sets & Chemical Reagents' },
    { id: 'cls-common', name: 'Master Common Crate', desc: 'Shared Tools, Power Supplies, Glassware & Demo Rigs' }
  ];

  return classDefs.map(c => ({
    id: c.id,
    name: c.name,
    batchMultiplier: multiplier,
    description: c.desc,
    items: []
  }));
}

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "PRJ-001",
    code: "PRJ-KARWAR-001",
    name: "Karwar STEM 10-School Deployment Batch",
    description: "Complete manufacturing, chemical prep, laser cutting, and packing for secondary government schools in Karwar region.",
    category: "STEM_CURRICULUM",
    clientName: "Karnataka State STEM Mission - Karwar District",
    leadUserId: "usr-admin-01",
    leadUserName: "Dr. Samartha HM",
    assignedBy: "Directorate of STEM Education",
    assignedUserIds: ["usr-admin-01", "usr-op-02", "usr-op-03"],
    assignedUserNames: ["Dr. Samartha HM", "Ravi Kumar (Lead Tech)", "Priya Sharma (Chemical QA)"],
    status: "IN_PREP",
    priority: "HIGH",
    startDate: "2026-09-01",
    targetDeliveryDate: "2026-09-30",
    defaultBatchMultiplier: 10,
    budgetINR: 150000,
    invoicedRevenueINR: 220000,
    classes: buildCurriculumClasses(10),
    batchConfigurations: [
      { gradeOrKitId: "Grade 8", kitName: "Grade 8 STEM Science & Maths", targetQuantity: 10 },
      { gradeOrKitId: "Grade 9", kitName: "Grade 9 STEM Science & Maths", targetQuantity: 10 },
      { gradeOrKitId: "Grade 10", kitName: "Grade 10 STEM Science & Maths", targetQuantity: 10 },
      { gradeOrKitId: "Common Crate", kitName: "Common Master Laboratory Crate", targetQuantity: 5 }
    ],
    expenses: [
      {
        id: "EXP-001",
        date: "2026-09-03",
        category: "MATERIAL",
        description: "Raw Borosilicate Glassware & Test tubes batch",
        amountINR: 18500,
        loggedByUserId: "usr-admin-01",
        loggedByUserName: "Dr. Samartha HM",
        receiptOrPoRef: "PO-2026-089"
      },
      {
        id: "EXP-002",
        date: "2026-09-06",
        category: "LASER_MACHINE",
        description: "15 Sheets 3mm MDF + Laser Tube 8 Operating Hours",
        amountINR: 6400,
        loggedByUserId: "usr-op-02",
        loggedByUserName: "Ravi Kumar (Lead Tech)",
        receiptOrPoRef: "FAB-LOG-44"
      },
      {
        id: "EXP-003",
        date: "2026-09-10",
        category: "CHEMICAL_PREP",
        description: "Reagents batch: HCl, NaOH, CuSO4, KI (Sirsi Transfer + Aliquoting)",
        amountINR: 8200,
        loggedByUserId: "usr-op-03",
        loggedByUserName: "Priya Sharma (Chemical QA)",
        receiptOrPoRef: "SIRSI-TX-102"
      }
    ],
    auditLogs: [
      {
        id: "AUD-001",
        timestamp: "2026-09-01T09:00:00Z",
        userId: "usr-admin-01",
        userName: "Dr. Samartha HM",
        userRole: "admin",
        action: "PROJECT_CREATED",
        details: "Project Karwar STEM 10-School Deployment Batch initiated with 10 sets per grade.",
        signatureDigest: "sha256-8f4b23c910e14a8"
      },
      {
        id: "AUD-002",
        timestamp: "2026-09-10T14:30:00Z",
        userId: "usr-op-03",
        userName: "Priya Sharma (Chemical QA)",
        userRole: "chemist",
        action: "CHEMICAL_BATCH_APPROVED",
        details: "10x Grade 10 chemical dropper bottles sealed and leak tested.",
        signatureDigest: "sha256-4c91a0b3e77f012"
      }
    ],
    qaSignOff: null,
    createdAt: "2026-09-01T09:00:00Z",
    updatedAt: "2026-09-18T08:00:00Z"
  },
  {
    id: "PRJ-002",
    code: "PRJ-SIRSI-002",
    name: "Sirsi Regional Science Center Demonstration Lab",
    description: "Specialized batch of optics exploration benches, magnetic swing demonstration rigs, and advanced chemistry demonstration sets.",
    category: "STEM_CURRICULUM",
    clientName: "Sirsi Regional Science Center",
    leadUserId: "usr-admin-01",
    leadUserName: "Dr. Samartha HM",
    assignedBy: "District Science Association",
    assignedUserIds: ["usr-admin-01", "usr-op-02"],
    assignedUserNames: ["Dr. Samartha HM", "Ravi Kumar (Lead Tech)"],
    status: "PROCURING",
    priority: "HIGH",
    startDate: "2026-09-05",
    targetDeliveryDate: "2026-10-10",
    defaultBatchMultiplier: 5,
    budgetINR: 95000,
    invoicedRevenueINR: 140000,
    classes: buildCurriculumClasses(5),
    batchConfigurations: [
      { gradeOrKitId: "Grade 10", kitName: "Grade 10 Physics & Optics Special Edition", targetQuantity: 5 },
      { gradeOrKitId: "Common Crate", kitName: "Universal Demonstration Crate", targetQuantity: 2 }
    ],
    expenses: [
      {
        id: "EXP-004",
        date: "2026-09-08",
        category: "VENDOR_PO",
        description: "Optical Bench sliders and convex lenses (50mm dia, 10cm FL)",
        amountINR: 12500,
        loggedByUserId: "usr-admin-01",
        loggedByUserName: "Dr. Samartha HM",
        receiptOrPoRef: "PO-2026-095"
      }
    ],
    auditLogs: [
      {
        id: "AUD-003",
        timestamp: "2026-09-05T11:00:00Z",
        userId: "usr-admin-01",
        userName: "Dr. Samartha HM",
        userRole: "admin",
        action: "PROJECT_CREATED",
        details: "Sirsi Regional Science Center demonstration batch authorized.",
        signatureDigest: "sha256-a110bb4e82f0991"
      }
    ],
    qaSignOff: null,
    createdAt: "2026-09-05T11:00:00Z",
    updatedAt: "2026-09-17T16:00:00Z"
  }
];
