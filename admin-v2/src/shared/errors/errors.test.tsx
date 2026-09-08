import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/api";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { ErrorFallback } from "./ErrorFallback";
import { classifyAppError } from "./error-utils";

afterEach(cleanup);

function BrokenComponent(): never {
  throw new Error("private implementation detail");
}

describe("application error handling", () => {
  it("replaces a render crash with a safe Persian fallback", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <AppErrorBoundary>
        <BrokenComponent />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("مشکلی در بارگذاری صفحه رخ داد");
    expect(screen.queryByText("private implementation detail")).not.toBeInTheDocument();
    vi.mocked(console.error).mockRestore();
  });

  it("classifies route authorization failures without exposing server details", () => {
    const details = classifyAppError({
      status: 403,
      statusText: "Forbidden",
      data: "secret",
      internal: false,
    });

    expect(details.kind).toBe("forbidden");
    expect(details.title).toBe("دسترسی به این صفحه مجاز نیست");
    expect(details.description).not.toContain("secret");
  });

  it("offers login recovery for an expired session", () => {
    render(
      <ErrorFallback details={classifyAppError(new ApiError(401, "expired"))} onRetry={vi.fn()} />,
    );

    expect(screen.getByRole("link", { name: /ورود دوباره/ })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: /تلاش دوباره/ })).not.toBeInTheDocument();
  });

  it("runs the supplied retry behavior for recoverable errors", () => {
    const retry = vi.fn();
    render(
      <ErrorFallback
        details={classifyAppError(new TypeError("Failed to fetch"))}
        onRetry={retry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /تلاش دوباره/ }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("recognizes lazy chunk loading failures", () => {
    expect(classifyAppError(new Error("Failed to fetch dynamically imported module")).kind).toBe(
      "chunk",
    );
  });
});
