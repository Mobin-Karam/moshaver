import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, ThemeSwitcher } from "./theme";

describe("admin theme switcher", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("offers light, dark and system modes and persists the selection", () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(3);
    act(() => fireEvent.click(screen.getByRole("button", { name: "حالت تیره" })));

    expect(document.documentElement).toHaveClass("dark");
    expect(window.localStorage.getItem("admin-theme-preference")).toBe("dark");
    expect(screen.getByRole("button", { name: "حالت تیره" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
