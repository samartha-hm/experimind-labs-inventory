import { clearApiAuth, getApiAuthToken } from '../../utils/api';

export class StudioReadError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
// Deliberately GET-only: the live viewer never refreshes, previews, approves or saves by POST.
export async function studioRead<T>(path: string, signal: AbortSignal): Promise<T> {
  const token = getApiAuthToken();
  if (!token) throw new StudioReadError(401, 'Sign in required');
  const response = await fetch(`/api/v1/product-templates${path}`, {
    method: 'GET', cache: 'no-store', signal,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (response.status === 401) clearApiAuth();
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'Invalid kit identity. Return to Product Library.',
      401: 'Your session expired. Sign in again.',
      403: 'Your current account does not have permission to view this kit.',
      404: 'Kit Studio or this kit is unavailable. Return to Product Library.',
      409: 'Revision conflict: this kit changed while loading. Refresh to reload.',
    };
    throw new StudioReadError(response.status, messages[response.status] ?? 'Live data could not be loaded. Retry when the server is available.');
  }
  return response.json() as Promise<T>;
}
