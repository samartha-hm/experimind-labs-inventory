export type ProjectCategory = 'STEM_CURRICULUM' | 'IOT_HARDWARE' | 'CUSTOM_INSTITUTIONAL' | 'R_AND_D_PROTOTYPE';
export type ProjectStatus = 'PLANNING' | 'PROCURING' | 'IN_PREP' | 'ASSEMBLY_QC' | 'COMPLETED' | 'ARCHIVED';

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
  leadUserId: string;
  leadUserName: string;
  assignedUserIds: string[];
  assignedUserNames: string[];
  status: ProjectStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  startDate: string;
  targetDeliveryDate: string;
  budgetINR: number;
  invoicedRevenueINR: number;
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

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "PRJ-001",
    code: "PRJ-KARWAR-001",
    name: "Karwar STEM 10-School Deployment Batch",
    description: "Complete manufacturing, chemical prep, laser cutting, and packing for 10 secondary government schools in Karwar region.",
    category: "STEM_CURRICULUM",
    clientName: "Karnataka State STEM Mission - Karwar District",
    leadUserId: "usr-admin-01",
    leadUserName: "Dr. Samartha HM",
    assignedUserIds: ["usr-admin-01", "usr-op-02", "usr-op-03"],
    assignedUserNames: ["Dr. Samartha HM", "Ravi Kumar (Lead Tech)", "Priya Sharma (Chemical QA)"],
    status: "IN_PREP",
    priority: "HIGH",
    startDate: "2026-09-01",
    targetDeliveryDate: "2026-09-30",
    budgetINR: 150000,
    invoicedRevenueINR: 220000,
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
    assignedUserIds: ["usr-admin-01", "usr-op-02"],
    assignedUserNames: ["Dr. Samartha HM", "Ravi Kumar (Lead Tech)"],
    status: "PROCURING",
    priority: "HIGH",
    startDate: "2026-09-05",
    targetDeliveryDate: "2026-10-10",
    budgetINR: 95000,
    invoicedRevenueINR: 140000,
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
    id: "PRJ-003",
    code: "PRJ-AIRQUAL-003",
    name: "IoT Air Quality Monitor (ESP32) Production Run",
    description: "Batch of 50 IoT ambient air monitoring nodes with laser cut acrylic enclosures, PMS5003 particulate sensors, and DHT22 sensors.",
    category: "IOT_HARDWARE",
    clientName: "Mysore Clean Air Initiative & ATL Hubs",
    leadUserId: "usr-op-02",
    leadUserName: "Ravi Kumar (Lead Tech)",
    assignedUserIds: ["usr-op-02", "usr-admin-01"],
    assignedUserNames: ["Ravi Kumar (Lead Tech)", "Dr. Samartha HM"],
    status: "IN_PREP",
    priority: "MEDIUM",
    startDate: "2026-08-20",
    targetDeliveryDate: "2026-09-25",
    budgetINR: 180000,
    invoicedRevenueINR: 275000,
    batchConfigurations: [
      { gradeOrKitId: "IOT-AIR-50", kitName: "IoT Smart Air Quality Monitor Kit", targetQuantity: 50 }
    ],
    expenses: [
      {
        id: "EXP-005",
        date: "2026-08-25",
        category: "MATERIAL",
        description: "ESP32 Dev Boards (50 pcs) + PMS5003 Laser Dust Sensors",
        amountINR: 62000,
        loggedByUserId: "usr-op-02",
        loggedByUserName: "Ravi Kumar (Lead Tech)",
        receiptOrPoRef: "PO-2026-077"
      },
      {
        id: "EXP-006",
        date: "2026-09-02",
        category: "LASER_MACHINE",
        description: "Laser cut black & clear 3mm acrylic housings (50 units)",
        amountINR: 9500,
        loggedByUserId: "usr-op-02",
        loggedByUserName: "Ravi Kumar (Lead Tech)",
        receiptOrPoRef: "FAB-LOG-41"
      }
    ],
    auditLogs: [
      {
        id: "AUD-004",
        timestamp: "2026-08-20T10:00:00Z",
        userId: "usr-op-02",
        userName: "Ravi Kumar (Lead Tech)",
        userRole: "engineer",
        action: "PROJECT_CREATED",
        details: "Initiated 50x IoT Air Quality monitor hardware production run.",
        signatureDigest: "sha256-339fa81c009b177"
      }
    ],
    qaSignOff: null,
    createdAt: "2026-08-20T10:00:00Z",
    updatedAt: "2026-09-18T06:00:00Z"
  },
  {
    id: "PRJ-004",
    code: "PRJ-WATERQ-004",
    name: "Water Quality Sensor Kit Fabrication",
    description: "Batch of 25 portable water test kits with analog pH probes, turbidity sensors, and calibration standard buffers.",
    category: "IOT_HARDWARE",
    clientName: "Karnataka Rural Water Testing Labs",
    leadUserId: "usr-admin-01",
    leadUserName: "Dr. Samartha HM",
    assignedUserIds: ["usr-admin-01", "usr-op-03"],
    assignedUserNames: ["Dr. Samartha HM", "Priya Sharma (Chemical QA)"],
    status: "PLANNING",
    priority: "LOW",
    startDate: "2026-09-15",
    targetDeliveryDate: "2026-10-30",
    budgetINR: 110000,
    invoicedRevenueINR: 165000,
    batchConfigurations: [
      { gradeOrKitId: "IOT-WATER-25", kitName: "Water Quality Sensor & Buffer Kit", targetQuantity: 25 }
    ],
    expenses: [],
    auditLogs: [
      {
        id: "AUD-005",
        timestamp: "2026-09-15T09:30:00Z",
        userId: "usr-admin-01",
        userName: "Dr. Samartha HM",
        userRole: "admin",
        action: "PROJECT_CREATED",
        details: "Water Quality Sensor Kit Fabrication planned.",
        signatureDigest: "sha256-778bc09a112df54"
      }
    ],
    qaSignOff: null,
    createdAt: "2026-09-15T09:30:00Z",
    updatedAt: "2026-09-15T09:30:00Z"
  },
  {
    id: "PRJ-005",
    code: "PRJ-MATHS-005",
    name: "National Visual Mathematics & 3D Geometry Labs",
    description: "Batch of 20 Geomagic 3D kits, Magnetic Algebra Tiles (90-pcs sets), Galton Probability Boards, and Thales theorem frames.",
    category: "CUSTOM_INSTITUTIONAL",
    clientName: "Delhi Public Schools STEM Cluster",
    leadUserId: "usr-op-02",
    leadUserName: "Ravi Kumar (Lead Tech)",
    assignedUserIds: ["usr-op-02", "usr-admin-01"],
    assignedUserNames: ["Ravi Kumar (Lead Tech)", "Dr. Samartha HM"],
    status: "ASSEMBLY_QC",
    priority: "CRITICAL",
    startDate: "2026-08-15",
    targetDeliveryDate: "2026-09-22",
    budgetINR: 130000,
    invoicedRevenueINR: 195000,
    batchConfigurations: [
      { gradeOrKitId: "Maths Kits", kitName: "Geomagic 3D Geometry & Visual Math Set", targetQuantity: 20 }
    ],
    expenses: [
      {
        id: "EXP-007",
        date: "2026-08-18",
        category: "MATERIAL",
        description: "1,800 Magnetic Algebra Tiles (Red/Blue) + 1,500 Steel Marbles",
        amountINR: 34000,
        loggedByUserId: "usr-op-02",
        loggedByUserName: "Ravi Kumar (Lead Tech)",
        receiptOrPoRef: "PO-2026-068"
      },
      {
        id: "EXP-008",
        date: "2026-08-28",
        category: "LASER_MACHINE",
        description: "Galton board clear acrylic faceplates + Thales frames (20 sets)",
        amountINR: 11200,
        loggedByUserId: "usr-op-02",
        loggedByUserName: "Ravi Kumar (Lead Tech)",
        receiptOrPoRef: "FAB-LOG-39"
      }
    ],
    auditLogs: [
      {
        id: "AUD-006",
        timestamp: "2026-08-15T08:00:00Z",
        userId: "usr-admin-01",
        userName: "Dr. Samartha HM",
        userRole: "admin",
        action: "PROJECT_CREATED",
        details: "Delhi Public Schools Visual Math lab batch authorized.",
        signatureDigest: "sha256-554dd091b447812"
      }
    ],
    qaSignOff: null,
    createdAt: "2026-08-15T08:00:00Z",
    updatedAt: "2026-09-18T09:00:00Z"
  }
];
