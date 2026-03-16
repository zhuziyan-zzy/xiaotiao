import { clearAuth, getAuthToken } from '../auth.js';

export async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearAuth();
    if (window.location.hash !== '#/') {
      window.location.hash = '#/';
    }
  }
  return response;
}
