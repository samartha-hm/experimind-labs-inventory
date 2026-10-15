import type {
  KitMaterial,
  KitSubject,
} from "../../entity/ProductTemplateVersion";
import { previewQuantities } from "../../features/kit-builder/quantityRules";

// Deliberately synthetic. No operational identifiers, APIs or persistence.
const material = (id: string, name: string, quantity = 1): KitMaterial => ({
  id,
  inventory_item_id: `demo-${id}`,
  item_name: name,
  quantity,
  unit: "each",
  reusable: true,
});
export const subjects: KitSubject[] = [
  {
    id: "science",
    name: "Science",
    grades: [8, 9, 10].map((grade) => ({
      id: `s${grade}`,
      name: `Grade ${grade}`,
      activities: [
        {
          id: `cells-${grade}`,
          code: `SCI-${grade}-01`,
          name: "Observing plant cells",
          materials: [material(`slides-${grade}`, "Prepared slide", 2)],
        },
        {
          id: `light-${grade}`,
          code: `SCI-${grade}-02`,
          name: "Exploring light",
          materials: [material(`prism-${grade}`, "Glass prism")],
        },
      ],
    })),
    crates: [8, 9, 10].map((grade) => ({
      id: `common-${grade}`,
      name: `Science ${grade} common crate`,
      kind: "common" as const,
      materials: [material(`scope-${grade}`, "Student microscope")],
      rule: {
        kind: "selected_sets" as const,
        components: [
          { subject_id: "science", grade_id: `s${grade}`, quantity: 1 },
        ],
      },
    })),
  },
  {
    id: "maths",
    name: "Mathematics",
    grades: [
      {
        id: "m8",
        name: "Grade 8",
        activities: [
          {
            id: "geometry",
            code: "MAT-8-01",
            name: "Building geometric solids",
            materials: [material("solids", "Geometric solids set")],
          },
        ],
      },
    ],
    crates: [],
  },
];
subjects[0].crates!.push({
  id: "universal",
  name: "Science 8–10 universal crate",
  kind: "universal",
  materials: [material("balance", "Electronic balance")],
  rule: {
    kind: "complete_sets",
    components: [8, 9, 10].map((grade) => ({
      subject_id: "science",
      grade_id: `s${grade}`,
      quantity: 1,
    })),
  },
});
export const initialCounts = { s8: 2, s9: 2, s10: 2, m8: 1 };
export type Counts = typeof initialCounts;
export type Location = "Pouch A" | "Pouch B" | "";
export const approvedMapping = {
  cells: "Pouch A" as Location,
  light: "Pouch B" as Location,
};
export function quantityPreview(
  counts: Counts,
  completeSets: number,
  commonRate: number,
) {
  // Reuse the authoritative pure calculator. Only synthetic inputs change.
  const draft = structuredClone(subjects);
  draft[0].crates![0].rule = {
    kind: "selected_sets",
    components: [
      { subject_id: "science", grade_id: "s8", quantity: commonRate },
    ],
  };
  return previewQuantities(draft, {
    grade_quantities: counts,
    complete_sets: { universal: completeSets },
  });
}
export const tasks = [
  {
    id: "DEMO-KIT-042",
    title: "Science 8–10 · classroom collection",
    detail: "Review activity-to-package mapping",
    owner: "Kit Studio",
    status: "Needs attention",
    view: "kit",
  },
  {
    id: "DEMO-PKG-018",
    title: "Science 8 · Box 01",
    detail: "Three checks before QC review",
    owner: "Packing & QC",
    status: "Ready to check",
    view: "packing",
  },
  {
    id: "DEMO-REV-006",
    title: "Mathematics 8 · revision review",
    detail: "Approved baseline available for comparison",
    owner: "Kit Studio",
    status: "In review",
    view: "kit",
  },
] as const;
