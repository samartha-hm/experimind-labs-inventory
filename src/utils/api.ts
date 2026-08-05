let currentAuthToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  currentAuthToken = token;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(currentAuthToken ? { 'Authorization': `Bearer ${currentAuthToken}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers
  });

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
