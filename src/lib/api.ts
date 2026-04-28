import axios, { AxiosInstance, AxiosError } from 'axios';
import chalk from 'chalk';
import { loadCredentials, updateTokens, clearCredentials } from './credentials';

const DEFAULT_BACKEND = 'https://profile-classification-api.vercel.app';

export function getBackendUrl(): string {
  const creds = loadCredentials();
  return creds?.backend_url || process.env.INSIGHTA_API_URL || DEFAULT_BACKEND;
}

let _client: AxiosInstance | null = null;

export function createApiClient(): AxiosInstance {
  if (_client) return _client;

  const client = axios.create({
    baseURL: getBackendUrl(),
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': '1',
    },
  });

  // ── Request interceptor: attach Bearer token ──────────────────────────────
  client.interceptors.request.use((config) => {
    const creds = loadCredentials();
    if (creds?.access_token) {
      config.headers['Authorization'] = `Bearer ${creds.access_token}`;
    }
    return config;
  });

  // ── Response interceptor: auto-refresh on 401 ────────────────────────────
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as typeof error.config & { _retry?: boolean };
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const creds = loadCredentials();
        if (!creds?.refresh_token) {
          console.error(chalk.red('\nSession expired. Please run: insighta login'));
          clearCredentials();
          process.exit(1);
        }
        try {
          const base = creds.backend_url || DEFAULT_BACKEND;
          const resp = await axios.post(`${base}/auth/refresh`, {
            refresh_token: creds.refresh_token,
          });
          const { access_token, refresh_token } = resp.data;
          updateTokens(access_token, refresh_token);
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          }
          return client(originalRequest);
        } catch {
          console.error(chalk.red('\nSession expired. Please run: insighta login'));
          clearCredentials();
          process.exit(1);
        }
      }
      return Promise.reject(error);
    }
  );

  _client = client;
  return client;
}

export function resetApiClient(): void {
  _client = null;
}
