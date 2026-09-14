import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../shared/api/api";
import { AuthProvider, useAuth } from "./AuthProvider";

const originalFetch = globalThis.fetch;

function Probe() {
  const auth = useAuth();

  return (
    <div>
      <span>{auth.status}</span>
      <span>{auth.message}</span>
      <button onClick={() => void api.get("/protected").catch(() => undefined)}>protected</button>
      <button onClick={auth.stopRestore}>stop restore</button>
    </div>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("AuthProvider", () => {
  it("rejects a Student-only account even when its session is valid", async () => {
    globalThis.fetch = vi.fn(async (input) => {
      if (String(input).endsWith("/auth/me")) {
        return new Response(
          JSON.stringify({
            ok: true,
            data: { id: "student-1", role: "STUDENT", csrfToken: "csrf" },
          }),
          { status: 200 },
        );
      }
      if (String(input).endsWith("/me/context")) {
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              user: { id: "student-1", role: "STUDENT" },
              roles: ["STUDENT"],
              capabilities: ["student.profile.read"],
              memberships: [],
              activeOrganization: null,
              availableOrganizations: [],
            },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ ok: true, data: { loggedOut: true } }), { status: 200 });
    }) as typeof fetch;

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByText("این حساب مدیر نیست.")).toBeInTheDocument();
    expect(screen.getByText("anonymous")).toBeInTheDocument();
    expect(sessionStorage.getItem("moshaver_admin_csrf")).toBeNull();
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/logout$/),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not erase a possible session when the server is temporarily unreachable", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("offline");
    }) as typeof fetch;

    const view = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(
      await screen.findByText(
        "ارتباط با سرور برقرار نشد؛ تلاش 1 از 3 انجام شد و دوباره تلاش می‌کنیم…",
      ),
    ).toBeInTheDocument();

    expect(screen.getByText("checking")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "stop restore" }));

    expect(screen.getByText("anonymous")).toBeInTheDocument();
    expect(
      screen.getByText("بازیابی نشست متوقف شد. برای ادامه وارد حساب شوید."),
    ).toBeInTheDocument();

    view.unmount();
  });

  it("ends the local session when a later protected request returns 401", async () => {
    globalThis.fetch = vi.fn(async (input) => {
      if (String(input).endsWith("/auth/me")) {
        return new Response(
          JSON.stringify({
            ok: true,
            data: { id: "admin-1", role: "PLATFORM_ADMIN" },
          }),
          { status: 200 },
        );
      }
      if (String(input).endsWith("/me/context")) {
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              user: { id: "admin-1", role: "PLATFORM_ADMIN" },
              roles: ["PLATFORM_ADMIN"],
              capabilities: ["system.manage"],
              memberships: [],
              activeOrganization: null,
              availableOrganizations: [],
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "نشست پایان یافته است",
          },
        }),
        { status: 401 },
      );
    }) as typeof fetch;

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByText("authenticated")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "protected" }));

    await waitFor(() => expect(screen.getByText("anonymous")).toBeInTheDocument());

    expect(screen.getByText("نشست پایان یافته است")).toBeInTheDocument();
  });
});
