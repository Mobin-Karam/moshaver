import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("validates required fields", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ok: false, error: { message: "unauthorized" } }),
          { status: 401 },
        ),
    ) as typeof fetch;
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "ورود" }));
    expect(await screen.findByText("نام کاربری لازم است")).toBeInTheDocument();
    expect(screen.getByText("رمز عبور لازم است")).toBeInTheDocument();
  });
});
