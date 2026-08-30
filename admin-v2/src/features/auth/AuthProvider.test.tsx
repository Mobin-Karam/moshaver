import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../services/api";
import { AuthProvider, useAuth } from "./AuthProvider";

const originalFetch = globalThis.fetch;
function Probe() { const auth = useAuth(); return <div><span>{auth.status}</span><span>{auth.message}</span><button onClick={() => void api.get("/protected").catch(() => undefined)}>protected</button></div>; }

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe("AuthProvider", () => {
  it("does not erase a possible session when the server is temporarily unreachable", async () => {
    globalThis.fetch = vi.fn(async () => { throw new TypeError("offline"); }) as typeof fetch;
    const view = render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText("ارتباط با سرور موقتاً برقرار نیست؛ نشست حذف نشده و دوباره تلاش می‌کنیم…")).toBeInTheDocument();
    expect(screen.getByText("checking")).toBeInTheDocument();
    view.unmount();
  });

  it("ends the local session when a later protected request returns 401", async () => {
    globalThis.fetch = vi.fn(async (input) => String(input).endsWith("/auth/me")
      ? new Response(JSON.stringify({ ok: true, data: { id: "admin-1", role: "admin" } }), { status: 200 })
      : new Response(JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED", message: "نشست پایان یافته است" } }), { status: 401 })) as typeof fetch;
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText("authenticated")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "protected" }));
    await waitFor(() => expect(screen.getByText("anonymous")).toBeInTheDocument());
    expect(screen.getByText("نشست پایان یافته است")).toBeInTheDocument();
  });
});
