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
  imageUrl?: string;
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
  },
  {
    id: "PRJ-PRASTUTI-G8",
    code: "PRJ-PRASTUTI-8TH",
    name: "8th Grade Prastuti Experiential Science Kit",
    description: "Curriculum-aligned 8th Grade hands-on science kit covering Sound, Force & Pressure, Microscopic Observations, and Chemical Effects of Current.",
    category: "STEM_CURRICULUM",
    clientName: "Experimind Labs STEM Education Standards",
    leadUserId: "usr-admin-01",
    leadUserName: "Dr. Samartha HM",
    assignedBy: "Experimind Curriculum Directorate",
    assignedUserIds: ["usr-admin-01", "usr-op-02", "usr-op-03"],
    assignedUserNames: ["Dr. Samartha HM", "Ravi Kumar (Lead Tech)", "Priya Sharma (Chemical QA)"],
    status: "IN_PREP",
    priority: "HIGH",
    startDate: "2026-09-15",
    targetDeliveryDate: "2026-10-15",
    defaultBatchMultiplier: 5,
    budgetINR: 65000,
    invoicedRevenueINR: 95000,
    classes: [
      {
        id: "cls-g8",
        name: "8th Grade Science Activities",
        batchMultiplier: 5,
        description: "18 experiential activities mapped to standard materials and fulfillment channels",
        items: [
          {
            id: "ITM-g8-01",
            classId: "cls-g8",
            name: "Tuning Fork (512 Hz)",
            category: "WORKING_MODEL",
            specification: "Standard acoustic resonance 512Hz chrome plated steel",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "pcs",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 200,
            sourceChapter: "Vibrating Objects Produce Sound"
          },
          {
            id: "ITM-g8-02",
            classId: "cls-g8",
            name: "Rubber Striking Pad",
            category: "ACTIVITY_KIT",
            specification: "High-density natural rubber vibration activator",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "pcs",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 45,
            sourceChapter: "Vibrating Objects Produce Sound"
          },
          {
            id: "ITM-g8-03",
            classId: "cls-g8",
            name: "Acoustic Sound Bell Chamber Acrylic Box",
            category: "FABRICATION_LASER_3D",
            specification: "Laser cut 4mm clear acrylic housing with silicone gasket",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "units",
            sourcingChannel: "LASER_CUT",
            status: "IN_PREP",
            unitCost: 350,
            sourceChapter: "Propagation of Sound Through Medium"
          },
          {
            id: "ITM-g8-04",
            classId: "cls-g8",
            name: "U-Tube Manometer Glass Tube",
            category: "HARDWARE_SUPPLIES",
            specification: "Borosilicate glass 150mm U-tube on acrylic scale plate",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "pcs",
            sourcingChannel: "ORDER_ONLINE",
            status: "PENDING",
            unitCost: 180,
            sourceChapter: "Force & Pressure - Fluid Column Pressure"
          },
          {
            id: "ITM-g8-05",
            classId: "cls-g8",
            name: "Safranin Biological Stain (0.5% Soln)",
            category: "CHEMICAL_REAGENT",
            specification: "Standard histochemical aqueous dye for plant cell nuclei",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "bottles (100ml)",
            sourcingChannel: "CHEMICAL_PREP",
            status: "IN_PREP",
            unitCost: 65,
            sourceChapter: "Observing Plant Cells & Onion Peel"
          },
          {
            id: "ITM-g8-06",
            classId: "cls-g8",
            name: "Glycerine Reagent Grade",
            category: "CHEMICAL_REAGENT",
            specification: "99.5% pure cell mountant",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "bottles (250ml)",
            sourcingChannel: "CHEMICAL_PREP",
            status: "IN_PREP",
            unitCost: 90,
            sourceChapter: "Observing Plant Cells & Onion Peel"
          },
          {
            id: "ITM-g8-07",
            classId: "cls-g8",
            name: "Microscope Glass Slides (75x25mm)",
            category: "HARDWARE_SUPPLIES",
            specification: "Ground edge soda-lime glass slides",
            quantityPerBatchUnit: 50,
            totalQuantity: 250,
            unit: "pcs",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 4,
            sourceChapter: "Observing Plant Cells & Onion Peel"
          },
          {
            id: "ITM-g8-08",
            classId: "cls-g8",
            name: "Square Glass Cover Slips (18x18mm)",
            category: "HARDWARE_SUPPLIES",
            specification: "No. 1 thickness (0.13-0.16mm)",
            quantityPerBatchUnit: 50,
            totalQuantity: 250,
            unit: "pcs",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 1.5,
            sourceChapter: "Observing Plant Cells & Onion Peel"
          },
          {
            id: "ITM-g8-09",
            classId: "cls-g8",
            name: "Carbon Rod Electrodes with Terminal Clips",
            category: "HARDWARE_SUPPLIES",
            specification: "High purity graphite rod 8mm x 100mm",
            quantityPerBatchUnit: 4,
            totalQuantity: 20,
            unit: "pcs",
            sourcingChannel: "ORDER_ONLINE",
            status: "PENDING",
            unitCost: 55,
            sourceChapter: "Chemical Effects of Electric Current"
          },
          {
            id: "ITM-g8-10",
            classId: "cls-g8",
            name: "Copper Electroplating Strips (0.5mm)",
            category: "FABRICATION_LASER_3D",
            specification: "Laser cut electrolytic copper foil 25x80mm",
            quantityPerBatchUnit: 6,
            totalQuantity: 30,
            unit: "pcs",
            sourcingChannel: "LASER_CUT",
            status: "IN_PREP",
            unitCost: 42,
            sourceChapter: "Chemical Effects of Electric Current"
          },
          {
            id: "ITM-g8-11",
            classId: "cls-g8",
            name: "Copper Sulfate Solution (0.5M CuSO4)",
            category: "CHEMICAL_REAGENT",
            specification: "Formulated analytical copper electrolyte",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "bottles (250ml)",
            sourcingChannel: "CHEMICAL_PREP",
            status: "IN_PREP",
            unitCost: 85,
            sourceChapter: "Chemical Effects of Electric Current"
          },
          {
            id: "ITM-g8-12",
            classId: "cls-g8",
            name: "Precision Strip Plane Mirrors (150x30mm)",
            category: "HARDWARE_SUPPLIES",
            specification: "First surface silvered flat glass strips with bevelled edge",
            quantityPerBatchUnit: 12,
            totalQuantity: 60,
            unit: "pcs",
            sourcingChannel: "ORDER_ONLINE",
            status: "PENDING",
            unitCost: 35,
            sourceChapter: "Multiple Reflections - Kaleidoscope & Periscope"
          },
          {
            id: "ITM-g8-13",
            classId: "cls-g8",
            name: "Kaleidoscope Triangular Housing Shell",
            category: "FABRICATION_LASER_3D",
            specification: "Laser cut 3mm matte black MDF interlocking chassis",
            quantityPerBatchUnit: 4,
            totalQuantity: 20,
            unit: "units",
            sourcingChannel: "LASER_CUT",
            status: "IN_PREP",
            unitCost: 65,
            sourceChapter: "Multiple Reflections - Kaleidoscope & Periscope"
          }
        ]
      }
    ],
    batchConfigurations: [
      { gradeOrKitId: "Grade 8", kitName: "8th Grade Prastuti Science Kit", targetQuantity: 5 }
    ],
    expenses: [],
    auditLogs: [],
    qaSignOff: null,
    createdAt: "2026-09-15T09:00:00Z",
    updatedAt: "2026-09-18T12:00:00Z"
  },
  {
    id: "PRJ-PRASTUTI-G9",
    code: "PRJ-PRASTUTI-9TH",
    name: "9th Grade Prastuti Experiential Science Kit",
    description: "Curriculum-aligned 9th Grade hands-on science kit covering Matter Colloids, Paper Chromatography, Laws of Motion, Sublimation, and Archimedes Principle.",
    category: "STEM_CURRICULUM",
    clientName: "Experimind Labs STEM Education Standards",
    leadUserId: "usr-admin-01",
    leadUserName: "Dr. Samartha HM",
    assignedBy: "Experimind Curriculum Directorate",
    assignedUserIds: ["usr-admin-01", "usr-op-02"],
    assignedUserNames: ["Dr. Samartha HM", "Ravi Kumar (Lead Tech)"],
    status: "IN_PREP",
    priority: "HIGH",
    startDate: "2026-09-15",
    targetDeliveryDate: "2026-10-15",
    defaultBatchMultiplier: 5,
    budgetINR: 78000,
    invoicedRevenueINR: 110000,
    classes: [
      {
        id: "cls-g9",
        name: "9th Grade Science Activities",
        batchMultiplier: 5,
        description: "22 experiential activities mapped to standard materials and fulfillment channels",
        items: [
          {
            id: "ITM-g9-01",
            classId: "cls-g9",
            name: "Colloidal Starch Solution (1% Soln)",
            category: "CHEMICAL_REAGENT",
            specification: "Freshly dissolved soluble potato starch colloid",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "bottle (250ml)",
            sourcingChannel: "CHEMICAL_PREP",
            status: "IN_PREP",
            unitCost: 40,
            sourceChapter: "Distinguishing True Solution, Suspension & Colloid (Tyndall Effect)"
          },
          {
            id: "ITM-g9-02",
            classId: "cls-g9",
            name: "Laser Optical Scattering Cell Mount",
            category: "FABRICATION_LASER_3D",
            specification: "Laser cut 5mm frosted acrylic cuvette stand with 650nm beam guide",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "units",
            sourcingChannel: "LASER_CUT",
            status: "IN_PREP",
            unitCost: 120,
            sourceChapter: "Distinguishing True Solution, Suspension & Colloid (Tyndall Effect)"
          },
          {
            id: "ITM-g9-03",
            classId: "cls-g9",
            name: "Red Laser Diode Module (650nm 5mW)",
            category: "WORKING_MODEL",
            specification: "Precision collimated beam laser with battery cradle",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "pcs",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 75,
            sourceChapter: "Distinguishing True Solution, Suspension & Colloid (Tyndall Effect)"
          },
          {
            id: "ITM-g9-04",
            classId: "cls-g9",
            name: "Whatman No. 1 Chromatography Paper Strips",
            category: "HARDWARE_SUPPLIES",
            specification: "20mm x 150mm chromatography paper strips",
            quantityPerBatchUnit: 40,
            totalQuantity: 200,
            unit: "strips",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 6,
            sourceChapter: "Separation of Dyes using Paper Chromatography"
          },
          {
            id: "ITM-g9-05",
            classId: "cls-g9",
            name: "Ammonium Chloride Powder (NH4Cl AR)",
            category: "CHEMICAL_REAGENT",
            specification: "High purity sublimate crystalline powder 100g jar",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "jar (100g)",
            sourcingChannel: "ORDER_ONLINE",
            status: "PENDING",
            unitCost: 110,
            sourceChapter: "Sublimation of Ammonium Chloride & Camphor"
          },
          {
            id: "ITM-g9-06",
            classId: "cls-g9",
            name: "China Dish (Porcelain 75mm)",
            category: "HARDWARE_SUPPLIES",
            specification: "Thermal shock resistant glazed porcelain dish",
            quantityPerBatchUnit: 4,
            totalQuantity: 20,
            unit: "pcs",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 55,
            sourceChapter: "Sublimation of Ammonium Chloride & Camphor"
          },
          {
            id: "ITM-g9-07",
            classId: "cls-g9",
            name: "Glass Funnel (Stem 75mm)",
            category: "HARDWARE_SUPPLIES",
            specification: "Borosilicate 3.3 laboratory glass funnel",
            quantityPerBatchUnit: 4,
            totalQuantity: 20,
            unit: "pcs",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 48,
            sourceChapter: "Sublimation of Ammonium Chloride & Camphor"
          },
          {
            id: "ITM-g9-08",
            classId: "cls-g9",
            name: "Low Friction Dynamics Cart with Laser Axles",
            category: "FABRICATION_LASER_3D",
            specification: "Laser cut 6mm Baltic birch low-friction chassis with ball bearings",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "units",
            sourcingChannel: "LASER_CUT",
            status: "IN_PREP",
            unitCost: 280,
            sourceChapter: "Newton Laws of Motion - Inertia & Momentum Cart"
          },
          {
            id: "ITM-g9-09",
            classId: "cls-g9",
            name: "Precision Slotted Mass Set (10g - 100g Brass)",
            category: "HARDWARE_SUPPLIES",
            specification: "Polished brass slotted weights with hanger",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "sets",
            sourcingChannel: "ORDER_ONLINE",
            status: "PENDING",
            unitCost: 450,
            sourceChapter: "Newton Laws of Motion - Inertia & Momentum Cart"
          },
          {
            id: "ITM-g9-10",
            classId: "cls-g9",
            name: "Eureka Overflow Can (250ml Copper/Poly)",
            category: "HARDWARE_SUPPLIES",
            specification: "Direct spout overflow displacement beaker",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "pcs",
            sourcingChannel: "ORDER_ONLINE",
            status: "PENDING",
            unitCost: 195,
            sourceChapter: "Archimedes Principle & Buoyancy Balance"
          }
        ]
      }
    ],
    batchConfigurations: [
      { gradeOrKitId: "Grade 9", kitName: "9th Grade Prastuti Science Kit", targetQuantity: 5 }
    ],
    expenses: [],
    auditLogs: [],
    qaSignOff: null,
    createdAt: "2026-09-15T09:00:00Z",
    updatedAt: "2026-09-18T12:00:00Z"
  },
  {
    id: "PRJ-PRASTUTI-G10",
    code: "PRJ-PRASTUTI-10TH",
    name: "10th Grade Prastuti Experiential Science Kit",
    description: "Official Grade 10 Prastuti Science Kit derived from prastuti info workbook. Full coverage of Chemical Reactions, Indicators, Metal Displacement, Precipitation, Acids & Bases pH, and Carbonate Gas Evolution.",
    category: "STEM_CURRICULUM",
    clientName: "Experimind Labs STEM Education Standards",
    leadUserId: "usr-admin-01",
    leadUserName: "Dr. Samartha HM",
    assignedBy: "Experimind Curriculum Directorate",
    assignedUserIds: ["usr-admin-01", "usr-op-02", "usr-op-03"],
    assignedUserNames: ["Dr. Samartha HM", "Ravi Kumar (Lead Tech)", "Priya Sharma (Chemical QA)"],
    status: "IN_PREP",
    priority: "CRITICAL",
    startDate: "2026-09-15",
    targetDeliveryDate: "2026-10-15",
    defaultBatchMultiplier: 5,
    budgetINR: 92000,
    invoicedRevenueINR: 135000,
    classes: [
      {
        id: "cls-g10",
        name: "10th Grade Science Activities",
        batchMultiplier: 5,
        description: "26 chemical reactions and physics activities from prastuti info workbook",
        items: [
          {
            id: "ITM-g10-01",
            classId: "cls-g10",
            name: "Zinc Granules (Zn Metal AR)",
            category: "CHEMICAL_REAGENT",
            specification: "Pure analytical zinc granules for acid reaction & gas evolution",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "bottle (100g)",
            sourcingChannel: "ORDER_ONLINE",
            status: "PENDING",
            unitCost: 160,
            sourceChapter: "Observing Indicators of a Chemical Reaction"
          },
          {
            id: "ITM-g10-02",
            classId: "cls-g10",
            name: "Quick Lime (CaO Calcium Oxide)",
            category: "CHEMICAL_REAGENT",
            specification: "Lump chemical grade quick lime for exothermic slaking reaction",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "jar (100g)",
            sourcingChannel: "ORDER_ONLINE",
            status: "PENDING",
            unitCost: 95,
            sourceChapter: "Observing Indicators of a Chemical Reaction"
          },
          {
            id: "ITM-g10-03",
            classId: "cls-g10",
            name: "Sodium Hydroxide (NaOH) Solution (0.1M)",
            category: "CHEMICAL_REAGENT",
            specification: "Accurately standardized caustic alkaline solution",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "bottles (250ml)",
            sourcingChannel: "CHEMICAL_PREP",
            status: "IN_PREP",
            unitCost: 45,
            sourceChapter: "Observing Indicators of a Chemical Reaction"
          },
          {
            id: "ITM-g10-04",
            classId: "cls-g10",
            name: "Phenolphthalein Indicator Solution",
            category: "CHEMICAL_REAGENT",
            specification: "1% ethanolic pH indicator solution (Colorless to Pink)",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "dropper bottle (100ml)",
            sourcingChannel: "CHEMICAL_PREP",
            status: "READY",
            unitCost: 75,
            sourceChapter: "Observing Indicators of a Chemical Reaction"
          },
          {
            id: "ITM-g10-05",
            classId: "cls-g10",
            name: "Common Salt (NaCl Refined)",
            category: "HARDWARE_SUPPLIES",
            specification: "Standard lab grade pure sodium chloride",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "jar (200g)",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 20,
            sourceChapter: "Observing Indicators of a Chemical Reaction"
          },
          {
            id: "ITM-g10-06",
            classId: "cls-g10",
            name: "Magnesium Ribbon (High Purity Ribbon Roll)",
            category: "CHEMICAL_REAGENT",
            specification: "Flexible ribbon roll for dazzling white light synthesis reaction",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "rolls (25g)",
            sourcingChannel: "ORDER_ONLINE",
            status: "PENDING",
            unitCost: 220,
            sourceChapter: "Combustion Reaction - Burning Magnesium Ribbon"
          },
          {
            id: "ITM-g10-07",
            classId: "cls-g10",
            name: "Silicon Carbide Sandpaper (P120)",
            category: "HARDWARE_SUPPLIES",
            specification: "Abrasive sheet for removing magnesium oxide coating",
            quantityPerBatchUnit: 5,
            totalQuantity: 25,
            unit: "sheets",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 12,
            sourceChapter: "Combustion Reaction - Burning Magnesium Ribbon"
          },
          {
            id: "ITM-g10-08",
            classId: "cls-g10",
            name: "Copper Sulfate Solution (0.5M CuSO4)",
            category: "CHEMICAL_REAGENT",
            specification: "Deep blue hydrated copper sulfate solution",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "bottles (250ml)",
            sourcingChannel: "CHEMICAL_PREP",
            status: "IN_PREP",
            unitCost: 65,
            sourceChapter: "Displacement Reaction - Copper Sulfate and Iron Nail"
          },
          {
            id: "ITM-g10-09",
            classId: "cls-g10",
            name: "Polished Iron Nails (1.5 inch Steel)",
            category: "HARDWARE_SUPPLIES",
            specification: "Degreased ungalvanized steel nails for iron-copper displacement",
            quantityPerBatchUnit: 30,
            totalQuantity: 150,
            unit: "pcs",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 2,
            sourceChapter: "Displacement Reaction - Copper Sulfate and Iron Nail"
          },
          {
            id: "ITM-g10-10",
            classId: "cls-g10",
            name: "Lead Nitrate Solution (0.1M Pb(NO3)2)",
            category: "CHEMICAL_REAGENT",
            specification: "Clear analytical solution for yellow precipitate formation",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "bottle (100ml)",
            sourcingChannel: "CHEMICAL_PREP",
            status: "IN_PREP",
            unitCost: 110,
            sourceChapter: "Precipitation Reaction - Mixing Solutions"
          },
          {
            id: "ITM-g10-11",
            classId: "cls-g10",
            name: "Potassium Iodide Solution (0.1M KI)",
            category: "CHEMICAL_REAGENT",
            specification: "Analytical solution reacting to form bright yellow PbI2",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "bottle (100ml)",
            sourcingChannel: "CHEMICAL_PREP",
            status: "IN_PREP",
            unitCost: 130,
            sourceChapter: "Precipitation Reaction - Mixing Solutions"
          },
          {
            id: "ITM-g10-12",
            classId: "cls-g10",
            name: "Baking Soda (NaHCO3 Sodium Bicarbonate)",
            category: "CHEMICAL_REAGENT",
            specification: "Pure food grade sodium bicarbonate powder",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "jar (250g)",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 35,
            sourceChapter: "Acid-Base Reaction & Carbonates Gas Tests"
          },
          {
            id: "ITM-g10-13",
            classId: "cls-g10",
            name: "Laboratory Vinegar (5% Acetic Acid Soln)",
            category: "CHEMICAL_REAGENT",
            specification: "Standard acetic acid solution for neutralization assays",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "bottles (250ml)",
            sourcingChannel: "CHEMICAL_PREP",
            status: "IN_PREP",
            unitCost: 30,
            sourceChapter: "pH Testing & Neutralization Reaction"
          },
          {
            id: "ITM-g10-14",
            classId: "cls-g10",
            name: "Glass Petri Dishes (75mm Borosilicate)",
            category: "HARDWARE_SUPPLIES",
            specification: "Pair of round culture/reaction dishes with lid",
            quantityPerBatchUnit: 6,
            totalQuantity: 30,
            unit: "pairs",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 45,
            sourceChapter: "pH Testing with Household Acids and Bases"
          },
          {
            id: "ITM-g10-15",
            classId: "cls-g10",
            name: "Bleaching Powder (CaOCl2 Calcium Hypochlorite)",
            category: "CHEMICAL_REAGENT",
            specification: "Fresh reactive chloride-rich bleaching powder jar",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "jar (100g)",
            sourcingChannel: "ORDER_ONLINE",
            status: "PENDING",
            unitCost: 55,
            sourceChapter: "Identifying Carbonates with Gas Tests"
          },
          {
            id: "ITM-g10-16",
            classId: "cls-g10",
            name: "Washing Soda (Na2CO3.10H2O)",
            category: "CHEMICAL_REAGENT",
            specification: "High purity decahydrate sodium carbonate crystals",
            quantityPerBatchUnit: 1,
            totalQuantity: 5,
            unit: "jar (200g)",
            sourcingChannel: "IN_STOCK",
            status: "READY",
            unitCost: 40,
            sourceChapter: "Identifying Carbonates with Gas Tests"
          },
          {
            id: "ITM-g10-17",
            classId: "cls-g10",
            name: "Laser Cut Precision Acrylic 6-Well Test Tube Stand",
            category: "FABRICATION_LASER_3D",
            specification: "Laser cut 4mm fluorescent amber acrylic snap-lock test tube stand",
            quantityPerBatchUnit: 4,
            totalQuantity: 20,
            unit: "units",
            sourcingChannel: "LASER_CUT",
            status: "IN_PREP",
            unitCost: 110,
            sourceChapter: "Reaction Vessel Modular Multi-Test Tube Rack"
          },
          {
            id: "ITM-g10-18",
            classId: "cls-g10",
            name: "Laser Cut Delivery Tube Clamp & Stopper Bracket",
            category: "FABRICATION_LASER_3D",
            specification: "Laser cut 3mm black Delrin bracket with knurled thumb screw",
            quantityPerBatchUnit: 2,
            totalQuantity: 10,
            unit: "units",
            sourcingChannel: "LASER_CUT",
            status: "IN_PREP",
            unitCost: 95,
            sourceChapter: "Gas Delivery & Carbonate Testing Apparatus"
          }
        ]
      }
    ],
    batchConfigurations: [
      { gradeOrKitId: "Grade 10", kitName: "10th Grade Prastuti Science Kit", targetQuantity: 5 }
    ],
    expenses: [],
    auditLogs: [],
    qaSignOff: null,
    createdAt: "2026-09-15T09:00:00Z",
    updatedAt: "2026-09-18T12:00:00Z"
  }
];
