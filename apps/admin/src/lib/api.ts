import axios from 'axios';

/**
 * Resolves the API base so requests hit .../api/* (Express mounts routes under /api).
 * Precedence: runtime `window.__ENV__.API_URL` (written into /env.js by the Docker image from the
 * API_URL env var) → build-time VITE_API_URL → same origin when served from a real host →
 * http://localhost:8000 in dev. Accepts e.g. https://api.example.com or https://api.example.com/api.
 */
export function getApiBaseUrl(): string {
  const runtime = typeof window !== 'undefined' ? (window as any).__ENV__?.API_URL : undefined;
  const build = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const onRealHost = typeof window !== 'undefined' && !/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(window.location.hostname);
  const base = ((typeof runtime === 'string' && runtime.trim()) || build || (onRealHost ? window.location.origin : 'http://localhost:8000')).replace(/\/+$/, '');
  if (base.endsWith('/api')) return base;
  return `${base}/api`;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = String(error.config?.url ?? '');
      const isLoginAttempt = url.includes('/auth/login');
      // Failed login must not clear session UI or hard-redirect — form shows the error.
      if (!isLoginAttempt) {
        let redirectTo = '/login';
        try {
          const saved = localStorage.getItem('user');
          if (saved) {
            const u = JSON.parse(saved) as { role?: string };
            if (u?.role === 'SHAREHOLDER') redirectTo = '/shareholder-login';
          }
        } catch {
          /* ignore */
        }
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/shareholder')) {
          redirectTo = '/shareholder-login';
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = redirectTo;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
