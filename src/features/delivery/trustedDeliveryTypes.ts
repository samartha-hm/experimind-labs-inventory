import type { PackingSnapshot } from '../packing/packingPlan';
export interface DeliveryReceipt {id:string;roots:string[];recipient:string;acknowledged_at:string;acknowledgement:string;source:string}
export interface TrustedDispatch {id:string;plan_id:string;project_id:string;site_id:string;approval_id:string;demand_revision:number;roots:string[];snapshot:PackingSnapshot;transport:{carrier:string;vehicle:string;planned_date:string;notes:string};receipts:DeliveryReceipt[]}
export interface TrustedDeliveryView {enabled:boolean;dispatches:TrustedDispatch[]}
