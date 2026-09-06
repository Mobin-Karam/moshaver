import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  api,
  ApiError,
  getApiBaseUrl,
  getBackendTargetUrl,
  getSelectedApiVersion,
  setSelectedBackend,
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
    await expect(api.get("/bad")).rejects.toMatchObject(
      new ApiError(400, "bad", "VALIDATION"),
    );
  });

  it("uses the selected dev backend when one is set", () => {
    setSelectedBackend("remote");
    expect(getBackendTargetUrl()).toBe("https://api.mahakaram.ir/api/v2");

    setSelectedBackend("local");
    expect(getBackendTargetUrl()).toBe("http://localhost:4000/api/v2");
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

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/v2/auth/me",
      expect.any(Object),
    );
  });
});
