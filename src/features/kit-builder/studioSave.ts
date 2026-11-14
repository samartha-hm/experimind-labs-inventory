import { getApiAuthToken, clearApiAuth } from '../../utils/api';
import type { StudioSnapshot } from './studioContract';
import { StudioReadError } from './studioRead';
import type { KitSubject } from '../../entity/ProductTemplateVersion';

// One explicit save, never replayed automatically after an uncertain response.
export async function studioSave(templateId: string, content: { name: string; description: string; category: string; subjects: KitSubject[]; revision?: number }): Promise<StudioSnapshot> {
  const token = getApiAuthToken();
  if (!token) throw new StudioReadError(401, 'Sign in again before saving.');
  const response = await fetch(`/api/v1/product-templates/${encodeURIComponent(templateId)}/studio`, {
    method: 'PUT', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });
  if (response.status === 401) clearApiAuth();
  if (!response.ok) {
    const body: { error?: string } = await response.json().catch(() => ({}));
    throw new StudioReadError(response.status, body.error || 'Save failed. Your local changes remain open.');
  }
  return response.json() as Promise<StudioSnapshot>;
}
