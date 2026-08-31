import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DatePicker } from "./date-picker";
import { LocaleProvider } from "./locale";
import { Button } from "./ui";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("localized calendar and loading controls", () => {
  it("renders ISO values as a Persian calendar for Iran", async () => {
    localStorage.setItem("moshaver-admin-location", "iran");
    render(
      <LocaleProvider>
        <DatePicker value="2026-08-31" onChange={() => undefined} />
      </LocaleProvider>,
    );
    expect(screen.getByRole("button", { name: /شهریور/ })).toHaveTextContent(
      "۱۴۰۵",
    );
    await userEvent.click(screen.getByRole("button", { name: /شهریور/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows an accessible circular loader and disables a pending button", () => {
    render(<Button loading>ذخیره</Button>);
    const button = screen.getByRole("button", { name: "ذخیره" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("svg")).toHaveClass("animate-spin");
  });
});
