import { MASTER_PRODUCTION_ITEMS, ProductionItem } from './productionDataset';

export type StickerTier = 'BOX_CRATE' | 'ACTIVITY_POUCH' | 'COMPONENT_ITEM';
export type StickerStatus = 'QUEUED_TO_PRINT' | 'PRINTED' | 'AFFIXED_AND_VERIFIED';

export interface ChapterBoxMapping {
  boxId: string;
  boxNumber: number;
  boxName: string;
  grade: string;
  chapters: string[];
  description: string;
  colorCode: string;
}

export interface StickerRecord {
  id: string;
  projectId: string;
  projectCode: string;
  tier: StickerTier;
  status: StickerStatus;
  
  // Hierarchy References
  boxId?: string;
  boxNumber?: number;
  grade: string;
  chapter?: string;
  activityCode?: string;
  activityName?: string;
  itemId?: string;
  itemName?: string;
  
  // Label Content
  labelTitle: string;
  subtitle: string;
  qrPayload: string;
  details: {
    key: string;
    value: string;
  }[];
  hazardBadges?: string[];
  dimensionsMm: {
    width: number;
    height: number;
  };
  
  // Lifecycle Tracking
  batchNumber: number;
  copyIndex: number;
  totalCopies: number;
  printedAt?: string;
  printedByUserId?: string;
  printedByUserName?: string;
  affixedAt?: string;
  affixedByUserId?: string;
  affixedByUserName?: string;
  verificationNotes?: string;
}

export const DEFAULT_CHAPTER_BOX_MAPPINGS: ChapterBoxMapping[] = [
  {
    boxId: "BOX-G8-01",
    boxNumber: 1,
    boxName: "Grade 8 Box 1: Biology & Materials Lab",
    grade: "Grade 8",
    chapters: ["1.0", "2.0", "3.0", "4.0"],
    description: "Crop Production, Microorganisms, Synthetic Fibres & Materials",
    colorCode: "#3B82F6" // Blue
  },
  {
    boxId: "BOX-G8-02",
    boxNumber: 2,
    boxName: "Grade 8 Box 2: Chemistry, Energy & Cells Lab",
    grade: "Grade 8",
    chapters: ["5.0", "6.0", "7.0", "8.0"],
    description: "Coal & Petroleum, Combustion & Flame, Conservation, Cell Structure",
    colorCode: "#10B981" // Green
  },
  {
    boxId: "BOX-G8-03",
    boxNumber: 3,
    boxName: "Grade 8 Box 3: Physics, Mechanics & Optics Lab",
    grade: "Grade 8",
    chapters: ["9.0", "10.0", "11.0", "12.0", "13.0", "14.0", "15.0", "16.0"],
    description: "Reproduction, Adolescence, Force, Friction, Sound, Chemical Current, Light",
    colorCode: "#F59E0B" // Amber
  },
  {
    boxId: "BOX-G9-01",
    boxNumber: 1,
    boxName: "Grade 9 Box 1: Matter, Atoms & Cells Lab",
    grade: "Grade 9",
    chapters: ["1.0", "2.0", "3.0", "4.0", "5.0", "6.0"],
    description: "Matter in Surroundings, Pure Substances, Atoms, Molecules, Cell & Tissues",
    colorCode: "#8B5CF6" // Purple
  },
  {
    boxId: "BOX-G9-02",
    boxNumber: 2,
    boxName: "Grade 9 Box 2: Mechanics, Energy & Waves Lab",
    grade: "Grade 9",
    chapters: ["7.0", "8.0", "9.0", "10.0", "11.0", "12.0"],
    description: "Diversity, Motion, Force & Laws, Gravitation, Work & Energy, Sound",
    colorCode: "#EC4899" // Pink
  },
  {
    boxId: "BOX-G10-01",
    boxNumber: 1,
    boxName: "Grade 10 Box 1: Chemical Reactions, Acids & Metals Lab",
    grade: "Grade 10",
    chapters: ["1.0", "2.0", "3.0", "4.0", "5.0"],
    description: "Reactions & Equations, Acids & Bases, Metals & Non-Metals, Carbon Compounds",
    colorCode: "#EF4444" // Red
  },
  {
    boxId: "BOX-G10-02",
    boxNumber: 2,
    boxName: "Grade 10 Box 2: Life Processes, Control & Reproduction Lab",
    grade: "Grade 10",
    chapters: ["6.0", "7.0", "8.0", "9.0"],
    description: "Life Processes, Control & Coordination, Reproduction, Heredity",
    colorCode: "#06B6D4" // Cyan
  },
  {
    boxId: "BOX-G10-03",
    boxNumber: 3,
    boxName: "Grade 10 Box 3: Optics, Electricity & Magnetism Lab",
    grade: "Grade 10",
    chapters: ["10.0", "11.0", "12.0", "13.0", "14.0", "15.0", "16.0"],
    description: "Light Reflection & Refraction, Human Eye, Electricity, Magnetic Effects",
    colorCode: "#6366F1" // Indigo
  },
  {
    boxId: "BOX-CRATE-MASTER",
    boxNumber: 99,
    boxName: "Universal Master Crate: Shared Laboratory Apparatus",
    grade: "Common & Universal",
    chapters: ["CRATE_COMMON", "CRATE_UNIVERSAL"],
    description: "Shared Glassware, Stands, Burners, Digital Sensors & Multi-Grade Tooling",
    colorCode: "#64748B" // Slate
  }
];
