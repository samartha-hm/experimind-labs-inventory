let currentAuthToken: string | null = null;
let currentRefreshToken: string | null = null;
let refreshPromise: Promise<{ token: string; refreshToken?: string; user?: any } | null> | null = null;

export function setApiAuthToken(token: string | null, refreshToken?: string | null) {
  currentAuthToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      try {
        localStorage.setItem('experimind_auth_token', token);
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem('experimind_auth_token');
      } catch (_) {}
    }

    if (refreshToken !== undefined) {
      currentRefreshToken = refreshToken;
      if (refreshToken) {
        try {
          localStorage.setItem('experimind_refresh_token', refreshToken);
        } catch (_) {}
      } else {
        try {
          localStorage.removeItem('experimind_refresh_token');
        } catch (_) {}
      }
    }
  }
}

export function clearApiAuth() {
  currentAuthToken = null;
  currentRefreshToken = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('experimind_auth_token');
      localStorage.removeItem('experimind_refresh_token');
      localStorage.removeItem('experimind_user_profile');
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('experimind_auth_expired'));
  }
}

export function getApiAuthToken(): string | null {
  if (!currentAuthToken && typeof window !== 'undefined') {
    try {
      currentAuthToken = localStorage.getItem('experimind_auth_token');
    } catch (_) {}
  }
  return currentAuthToken;
}

export function getApiRefreshToken(): string | null {
  if (!currentRefreshToken && typeof window !== 'undefined') {
    try {
      currentRefreshToken = localStorage.getItem('experimind_refresh_token');
    } catch (_) {}
  }
  return currentRefreshToken;
}

export async function refreshAuthToken(): Promise<{ token: string; refreshToken?: string; user?: any } | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const storedRefreshToken = getApiRefreshToken();
      if (!storedRefreshToken) {
        return null;
      }

      const res = await fetch('/api/v1/auth/refresh-token', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-refresh-token': storedRefreshToken
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.token) {
          setApiAuthToken(data.token, data.refreshToken || storedRefreshToken);
          if (data.user && typeof window !== 'undefined') {
            try {
              localStorage.setItem('experimind_user_profile', JSON.stringify(data.user));
            } catch (_) {}
          }
          return {
            token: data.token,
            refreshToken: data.refreshToken || storedRefreshToken,
            user: data.user
          };
        }
      }
    } catch (_) {
    } finally {
      refreshPromise = null;
    }
    return null;
  })();

  return refreshPromise;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const isAuthEndpoint = endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/register') ||
    endpoint.includes('/auth/refresh-token');

  const token = getApiAuthToken();

  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {})
  };

  let response = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers
  });

  // If 401 Unauthorized and not an auth endpoint, attempt silent token refresh once
  if (response.status === 401 && !isAuthEndpoint) {
    const refreshResult = await refreshAuthToken();
    if (refreshResult && refreshResult.token) {
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshResult.token}`,
        ...((options.headers as Record<string, string>) || {})
      };
      response = await fetch(endpoint, {
        ...options,
        credentials: 'include',
        headers
      });
    } else {
      // Refresh failed -> clear auth and notify listeners
      clearApiAuth();
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
