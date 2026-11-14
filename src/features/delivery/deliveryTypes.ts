import type { PhysicalPackage } from "../packing/packingPlan";
export type DeliveryState = "planned" | "dispatched" | "in_transit" | "partially_delivered" | "delivered" | "failed" | "returned" | "cancelled";
export interface DeliveryProof { id: string; package_ids: string[]; recipient: string; acknowledged_at: string; acknowledgement: string; recorded_by: string; recorded_at: string }
export interface DeliveryIssue { id: string; package_id: string; kind: "shortage" | "damaged" | "missing" | "return"; notes: string; reported_by: string; reported_at: string; corrected_by?: string; corrected_at?: string; correction?: string }
export interface DeliveryOrder {
  id: string; organization_id: string; project_id: string; site_id: string; packing_order_id: string; number: string;
  revision: number; status: DeliveryState; manifest: PhysicalPackage[];
  transport: { carrier: string; vehicle: string; planned_date: string; employee_id?: string; notes: string };
  destination: { project_name: string; school_name: string; address: string };
  execution: { proofs: DeliveryProof[]; issues: DeliveryIssue[] };
  created_by: string; updated_by: string; created_at: string; updated_at: string;
}
export interface CustodyEvent { id: string; order_id: string; package_id: string; revision: number; actor_id: string; state: string; location: string; notes: string; pick_ledger_ids: string[]; created_at: string }
