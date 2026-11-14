export interface PendingDeliveryRequest { path: string; key: string; input: Record<string, unknown> }

/** Saved requests are untrusted input; replay only the exact delivery write surface. */
export function parseDeliveryRequest(saved: string): PendingDeliveryRequest {
  const value: unknown = JSON.parse(saved);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid saved delivery request');
  const request = value as Record<string, unknown>;
  if (Object.keys(request).sort().join(',') !== 'input,key,path' ||
      typeof request.path !== 'string' ||
      !/^\/operator\/delivery\/(dispatches|acknowledgments|installations|installation-actions|closure)$/.test(request.path) ||
      typeof request.key !== 'string' || !request.key.trim() || request.key.length > 200 ||
      !request.input || typeof request.input !== 'object' || Array.isArray(request.input)) {
    throw new Error('Invalid saved delivery request');
  }
  return request as unknown as PendingDeliveryRequest;
}
