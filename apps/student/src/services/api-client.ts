import { enqueueMutation, type NetworkProvider, type NetworkRequestOptions, type SyncProvider } from '@moshaver/student-core';

const CSRF_STORAGE_KEY = 'moshaver_v2_csrf';

export class ApiClient implements NetworkProvider {
  private syncProvider: SyncProvider | null = null;

  constructor(private readonly baseUrl = import.meta.env.VITE_API_URL || '/api/v2') {}

  configureSync(syncProvider: SyncProvider | null) {
    this.syncProvider = syncProvider;
  }

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
    options?: NetworkRequestOptions,
  ): Promise<TResponse> {
    const headers: HeadersInit = body == null ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' };
    const csrfToken = this.getCsrfToken();
    if (csrfToken && method !== 'GET') {
      headers['X-CSRF-Token'] = csrfToken;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        credentials: 'include',
        headers,
        body: body == null ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      if (method !== 'GET' && !options?.skipSyncQueue && this.shouldQueue(path, 0)) {
        await this.queueMutation(method, path, body);
      }
      throw error;
    }
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; data?: TResponse; error?: { message?: string; code?: string } } | null;
    if (!response.ok || !payload?.ok) {
      const error = new Error(payload?.error?.message ?? 'API request failed');
      error.name = payload?.error?.code ?? `HTTP_${response.status}`;
      if (method !== 'GET' && !options?.skipSyncQueue && this.shouldQueue(path, response.status)) {
        await this.queueMutation(method, path, body);
      }
      throw error;
    }
    return payload.data as TResponse;
  }

  private async queueMutation<TBody>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: TBody | null) {
    if (!this.syncProvider) return;
    await enqueueMutation(this.syncProvider, { method, path, body: body ?? null });
  }

  private shouldQueue(path: string, status: number) {
    return !path.startsWith('/auth/') && !path.includes('/exams/') && (status === 0 || status >= 500);
  }

  openEvents(onEvent: (type: string, data: Record<string, unknown>) => void) {
    const source = new EventSource(`${this.baseUrl}/events`, { withCredentials: true });
    source.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; data?: Record<string, unknown> };
        if (payload.type) onEvent(payload.type, payload.data ?? {});
      } catch {
        // Ignore malformed realtime frames and keep the chat usable with polling.
      }
    });
    return source;
  }
}

export const apiClient = new ApiClient();
