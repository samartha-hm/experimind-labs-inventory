let currentAuthToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setApiAuthToken(token: string | null) {
  currentAuthToken = token;
}

export function getApiAuthToken(): string | null {
  return currentAuthToken;
}

async function refreshAuthToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/v1/auth/refresh-token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.token) {
          setApiAuthToken(data.token);
          return data.token as string;
        }
      }
    } catch (_) {
    } finally {
      refreshPromise = null;
    }
    setApiAuthToken(null);
    return null;
  })();

  return refreshPromise;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const isAuthEndpoint = endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/register') ||
    endpoint.includes('/auth/refresh-token');

  let headers = {
    'Content-Type': 'application/json',
    ...(currentAuthToken ? { 'Authorization': `Bearer ${currentAuthToken}` } : {}),
    ...(options.headers || {})
  };

  let response = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers
  });

  // If 401 Unauthorized and not an auth endpoint, attempt silent token refresh once
  if (response.status === 401 && !isAuthEndpoint) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`,
        ...(options.headers || {})
      };
      response = await fetch(endpoint, {
        ...options,
        credentials: 'include',
        headers
      });
    }
  }

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errJson = await response.json();
      errorMsg = errJson.error || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  if (response.status === 204) return null;
  return response.json();
}
