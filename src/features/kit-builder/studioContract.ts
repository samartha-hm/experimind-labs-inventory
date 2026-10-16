import type { KitSubject } from '../../entity/ProductTemplateVersion';

export interface StudioSnapshot {
  id: string; template_id: string; version_number: number; revision: number;
  name: string; description: string; status: string; subjects?: KitSubject[];
  updated_at: string;
}
export interface StudioRevision {
  id: string; version_id: string; revision: number; name: string; status: string;
  subjects?: KitSubject[]; created_at: string; updated_by: string;
}
export interface StudioBundle {
  draft: StudioSnapshot; history: StudioRevision[]; approved: StudioSnapshot[];
}
export function studioEnabled(orgId: string, environment: Record<string, string | undefined>): boolean {
  return ['development', 'test'].includes(environment.NODE_ENV ?? '')
    && environment.KIT_STUDIO_READ_ONLY === 'true'
    && (environment.KIT_STUDIO_ORGANIZATIONS ?? '').split(',').map(value => value.trim()).includes(orgId);
}
export function materialQuantity(material: { quantity?: number; complete?: boolean; inventory_item_id?: string; unit?: string }): string {
  if (material.complete === false || !material.inventory_item_id || !material.unit || material.quantity == null || !Number.isFinite(material.quantity)) return 'Unavailable — incomplete material';
  return `${material.quantity} ${material.unit}`;
}
