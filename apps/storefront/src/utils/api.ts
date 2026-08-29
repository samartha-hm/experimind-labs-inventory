export const getApiBaseUrl = () => {
  // In a browser context, we can just use relative URLs, but for SSR we need the full URL
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return process.env.API_URL || 'http://127.0.0.1:3000/api';
};
