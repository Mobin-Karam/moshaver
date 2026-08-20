import type { NetworkProvider } from '@moshaver/student-core';

const CSRF_STORAGE_KEY = 'moshaver_v2_csrf';

export class ApiClient implements NetworkProvider {
  constructor(private readonly baseUrl = import.meta.env.VITE_API_URL || '/api/v2') {}

  setCsrfToken(token: string | null | undefined) {
    if (token) {
      localStorage.setItem(CSRF_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(CSRF_STORAGE_KEY);
    }
  }

  getCsrfToken() {
    return localStorage.getItem(CSRF_STORAGE_KEY);
  }

  async request<TResponse, TBody = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: TBody | null,
  ): Promise<TResponse> {
    const headers: HeadersInit = body == null ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' };
    const csrfToken = this.getCsrfToken();
    if (csrfToken && method !== 'GET') {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body == null ? undefined : JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; data?: TResponse; error?: { message?: string; code?: string } } | null;
    if (!response.ok || !payload?.ok) {
      const error = new Error(payload?.error?.message ?? 'API request failed');
      error.name = payload?.error?.code ?? `HTTP_${response.status}`;
      throw error;
    }
    return payload.data as TResponse;
  }
}

export const apiClient = new ApiClient();
