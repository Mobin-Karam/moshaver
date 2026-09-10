import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  api,
  ApiError,
  getApiBaseUrl,
  getBackendTargetUrl,
  getSelectedApiVersion,
  setSelectedBackend,
  setCsrf,
} from "./api";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("api client", () => {
  it("returns typed data from the backend envelope", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true, data: { id: "1" } }), {
          status: 200,
        }),
    ) as typeof fetch;
    await expect(api.get<{ id: string }>("/health")).resolves.toEqual({
      id: "1",
    });
  });

  it("throws unified ApiError on backend errors", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: false,
            error: { message: "bad", code: "VALIDATION" },
          }),
          { status: 400 },
        ),
    ) as typeof fetch;
    await expect(api.get("/bad")).rejects.toMatchObject(new ApiError(400, "bad", "VALIDATION"));
  });

  it("keeps selected development backends behind the same-origin proxy", () => {
    setSelectedBackend("remote");
    expect(getBackendTargetUrl()).toBe("/api/v2");

    setSelectedBackend("local");
    expect(getBackendTargetUrl()).toBe("/api/v2");
  });

  it("pins the admin application to API v2", () => {
    expect(getSelectedApiVersion()).toBe("v2");
    expect(getApiBaseUrl()).toMatch(/\/api\/v2$/);
  });

  it("dispatches requests through the selected v2 backend", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 }),
    ) as typeof fetch;
    setSelectedBackend("local");

    await api.get("/auth/me");

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/v2/auth/me", expect.any(Object));
  });

  it("refreshes an expired access session and retries the request once", async () => {
    setCsrf("old-csrf");
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED" } }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { csrfToken: "new-csrf" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { id: "1" } }), { status: 200 })) as typeof fetch;

    await expect(api.get<{ id: string }>("/auth/me")).resolves.toEqual({ id: "1" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(2, expect.stringMatching(/\/api\/v2\/auth\/refresh$/), expect.objectContaining({
      method: "POST",
      credentials: "include",
    }));
    expect(sessionStorage.getItem("moshaver_admin_csrf")).toBe("new-csrf");
  });
});
