import type { QuantityContext, QuantityOverride, QuantityLine } from "../kit-builder/quantityRules";

export interface PlanningSelection { id: string; version_id: string; context: QuantityContext }
export interface PlanningSite {
  id: string; name: string; address: string; location: string; contact: string; notes: string;
  schedule: string; fulfillment: string; selections: PlanningSelection[];
}
export interface PlanningContent {
  name: string; client: string; notes: string;
  commercial_links: { kind: "quotation" | "sales_order"; reference: string }[];
  // Version-scoped defaults; a reasoned site override takes precedence.
  overrides: Record<string, Record<string, QuantityOverride>>;
  sites: PlanningSite[];
}
export interface PlanningView extends PlanningContent { id: string; revision: number; updated_at: string }
export interface DemandLine extends QuantityLine {
  project_id: string; site_id: string; site_name: string; selection_id: string;
  version_id: string; version_number: number; template_name: string;
  subject_id: string; subject_name: string; grade_id?: string; grade_name?: string;
  source: "activity" | "crate"; override?: QuantityOverride; override_scope?: "project" | "site";
  source_unit: string; source_quantity: number; conversion_id?: string; conversion_factor?: string;
}
export interface PackingAssignment {
  site_id: string; selection_id: string; version_id: string; subject_id: string; grade_id: string;
  packing_id: string; name: string; kind: string; activity_ids: string[]; inventory_item_ids: string[];
  demand: false;
}
export interface MaterialSummary {
  inventory_item_id: string; name: string; unit: string; gross_demand: number;
  stock_status: "unverified"; verified_on_hand: null; active_reservations: null;
  available_to_promise: null; incoming: null; immediate_shortage: null; projected_shortage: null;
}
export interface PlanningPreview {
  project_id: string; revision: number; operational_release: false;
  lines: DemandLine[]; packing_assignments: PackingAssignment[];
  materials: MaterialSummary[]; warnings: string[];
}
