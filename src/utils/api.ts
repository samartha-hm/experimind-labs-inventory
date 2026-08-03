// Type-safe REST API Client wrapper with JWT auth persistence

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('nexa_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(endpoint, {
    ...options,
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

  // Handle empty or 204 responses
  if (response.status === 204) return null;
  
  return response.json();
}
