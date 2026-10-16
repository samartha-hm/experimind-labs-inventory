import { clearApiAuth, getApiAuthToken } from '../../utils/api';
import { StudioReadError } from './studioRead';
import type { StudioSnapshot } from './studioContract';

// Never replay an approval after an uncertain response; refresh to inspect the persisted outcome.
export async function studioApprove(templateId: string, revision: number): Promise<StudioSnapshot> {
  const token = getApiAuthToken();
  if (!token) throw new StudioReadError(401, 'Sign in again before approval.');
  const response = await fetch(`/api/v1/product-templates/${encodeURIComponent(templateId)}/studio/approve`, {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision }),
  });
  if (response.status === 401) clearApiAuth();
  if (!response.ok) {
    const body: { error?: string } = await response.json().catch(() => ({}));
    throw new StudioReadError(response.status, body.error || 'Approval failed. Refresh to check the saved revision.');
  }
  return response.json() as Promise<StudioSnapshot>;
}
