type ApiEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error?: { message?: string; code?: string; details?: unknown };
    };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(
    status: number,
    message: string,
    code = "HTTP_ERROR",
    details: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const CSRF_KEY = "moshaver_admin_csrf";
const DEV_BACKEND_KEY = "moshaver_admin_backend";
const defaultBase = "/api/v1";

export const backendTargets = {
  local: "http://localhost:4000",
  remote: "https://api.mahakaram.ir",
} as const;

export type BackendTarget = keyof typeof backendTargets;

function isBackendTarget(value: string | null): value is BackendTarget {
  return value === "local" || value === "remote";
}

export function getSelectedBackend(): BackendTarget | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(DEV_BACKEND_KEY);
  return isBackendTarget(saved) ? saved : null;
}

export function setSelectedBackend(target: BackendTarget | null) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  if (target) window.localStorage.setItem(DEV_BACKEND_KEY, target);
  else window.localStorage.removeItem(DEV_BACKEND_KEY);
  document.cookie = `${DEV_BACKEND_KEY}=${target ?? ""}; Path=/; SameSite=Lax; Max-Age=${target ? 31536000 : 0}`;
}

export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_URL as string | undefined) || defaultBase;
}

export function getBackendTargetUrl() {
  const selected = getSelectedBackend();
  if (selected) return `${backendTargets[selected]}${defaultBase}`;
  return getApiBaseUrl();
}

export const apiBaseUrl = getApiBaseUrl();

function csrf() {
  return sessionStorage.getItem(CSRF_KEY) || "";
}

export function setCsrf(token?: string) {
  if (token) sessionStorage.setItem(CSRF_KEY, token);
  else sessionStorage.removeItem(CSRF_KEY);
}

function isMutating(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

async function refreshCsrf() {
  const me = await request<{ csrfToken?: string }>(
    "GET",
    "/auth/me",
    undefined,
    { noCsrfRetry: true, suppressAuthFailure: true },
  );
  if (me.csrfToken) setCsrf(me.csrfToken);
  return me;
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: {
    timeoutMs?: number;
    noCsrfRetry?: boolean;
    suppressAuthFailure?: boolean;
  } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 20_000,
  );
  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const token = csrf();
  if (isMutating(method) && token) headers.set("X-CSRF-Token", token);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (await response
      .json()
      .catch(() => null)) as ApiEnvelope<T> | null;
    if (response.ok && payload?.ok) {
      const data = payload.data as T & { csrfToken?: string };
      if (data?.csrfToken) setCsrf(data.csrfToken);
      return payload.data;
    }
    const err = payload && "error" in payload ? payload.error : undefined;
    const apiError = new ApiError(
      response.status,
      err?.message || "خطای سرور",
      err?.code || "HTTP_ERROR",
      err?.details ?? null,
    );
    if (
      response.status === 403 &&
      apiError.code === "CSRF" &&
      isMutating(method) &&
      !options.noCsrfRetry
    ) {
      await refreshCsrf();
      return request<T>(method, path, body, { ...options, noCsrfRetry: true });
    }
    if (response.status === 401) setCsrf();
    throw apiError;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, "اینترنت یا سرور در دسترس نیست.", "NETWORK", error);
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  setCsrf,
  openEvents(
    onEvent: (type: string, data: Record<string, unknown>) => void,
    onState?: (state: "open" | "reconnecting") => void,
  ) {
    const source = new EventSource(`${getApiBaseUrl()}/events`, {
      withCredentials: true,
    });
    const names = [
      "chat.message",
      "chat.message.created",
      "chat.messages.read",
      "presence.changed",
      "study.started",
      "study.finished",
      "quiz.completed",
      "report.submitted",
      "recovery.requested",
      "issue.created",
      "plan.published",
      "plan.updated",
      "advisor.comment.created",
      "notification.created",
      "review.created",
      "exam.retry_requested",
      "exam.retry_reviewed",
      "exam.updated",
    ];
    names.forEach((name) =>
      source.addEventListener(name, (event) =>
        onEvent(
          name,
          JSON.parse((event as MessageEvent).data || "{}") as Record<
            string,
            unknown
          >,
        ),
      ),
    );
    source.onopen = () => onState?.("open");
    source.onerror = () => onState?.("reconnecting");
    return source;
  },
};
