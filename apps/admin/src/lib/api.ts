import axios from 'axios';

/**
 * Normalizes VITE_API_URL so requests hit .../api/* (Express mounts routes under /api).
 * Accepts e.g. http://host:8000 or http://host:8000/api
 */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const fallback = 'http://localhost:8000';
  const base = (raw || fallback).replace(/\/+$/, '');
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
