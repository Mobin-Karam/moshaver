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
const API_VERSION_KEY = "moshaver_admin_api_version";
export type ApiVersion = "v1" | "v2";
type AuthFailureListener = (error: ApiError) => void;
const authFailureListeners = new Set<AuthFailureListener>();

export const backendTargets = {
  local: "http://localhost:4000",
  remote: "https://api.mahakaram.ir",
} as const;

export type BackendTarget = keyof typeof backendTargets;

function configuredApiVersion(): ApiVersion {
  return import.meta.env.VITE_API_VERSION === "v2" ? "v2" : "v1";
}

export function getSelectedApiVersion(): ApiVersion {
  if (typeof window === "undefined") return configuredApiVersion();
  const saved = window.localStorage.getItem(API_VERSION_KEY);
  return saved === "v1" || saved === "v2" ? saved : configuredApiVersion();
}

export function setSelectedApiVersion(version: ApiVersion) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(API_VERSION_KEY, version);
  document.cookie = `${API_VERSION_KEY}=${version}; Path=/; SameSite=Lax; Max-Age=31536000`;
}

function versionedPath() {
  return `/api/${getSelectedApiVersion()}`;
}

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
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
  if (!configured) return versionedPath();
  // The configured URL selects the host/proxy, while the runtime switcher owns
  // the API version. Keeping the configured suffix here used to pin every
  // request to v1 even after the user selected v2.
  if (/\/api\/v[12]$/.test(configured)) {
    return configured.replace(/\/api\/v[12]$/, versionedPath());
  }
  return `${configured}${versionedPath()}`;
}

export function getBackendTargetUrl() {
  const selected = getSelectedBackend();
  if (selected) return `${backendTargets[selected]}${versionedPath()}`;
  return getApiBaseUrl();
}

function csrf() {
  return sessionStorage.getItem(CSRF_KEY) || "";
}

export function setCsrf(token?: string) {
  if (token) sessionStorage.setItem(CSRF_KEY, token);
  else sessionStorage.removeItem(CSRF_KEY);
}

export function onAuthFailure(listener: AuthFailureListener) {
  authFailureListeners.add(listener);
  return () => authFailureListeners.delete(listener);
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
    if (response.status === 401) {
      setCsrf();
      if (!options.suppressAuthFailure)
        authFailureListeners.forEach((listener) => listener(apiError));
    }
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
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  async download(path: string) {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: "POST",
      credentials: "include",
      headers: csrf() ? { "X-CSRF-Token": csrf() } : undefined,
    });
    if (!response.ok)
      throw new ApiError(response.status, "دریافت فایل پشتیبان انجام نشد.");
    return {
      blob: await response.blob(),
      filename:
        response.headers
          .get("content-disposition")
          ?.match(/filename="?([^";]+)"?/)?.[1] || "moshaver-backup.sqlite",
    };
  },
  async uploadBinary<T>(path: string, body: Blob) {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        ...(csrf() ? { "X-CSRF-Token": csrf() } : {}),
      },
      body,
    });
    const payload = (await response
      .json()
      .catch(() => null)) as ApiEnvelope<T> | null;
    if (response.ok && payload?.ok) return payload.data;
    const error = payload && "error" in payload ? payload.error : undefined;
    throw new ApiError(
      response.status,
      error?.message || "بارگذاری فایل انجام نشد.",
      error?.code,
      error?.details,
    );
  },
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
      "chat.message.edited",
      "chat.message.deleted",
      "chat.reaction.updated",
      "chat.conversation.created",
      "chat.conversation.updated",
      "chat.member.added",
      "chat.member.removed",
      "chat.member.role_changed",
      "chat.owner.transferred",
      "chat.mention.created",
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
