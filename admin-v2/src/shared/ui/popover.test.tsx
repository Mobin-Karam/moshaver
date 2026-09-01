import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ViewportPopover } from "./popover";

describe("viewport popover", () => {
  it("opens through a trigger, renders in a portal, and closes with Escape", () => {
    render(<ViewportPopover width={300} trigger={(props) => <button {...props}>بازکردن</button>}><p>محتوای شناور</p></ViewportPopover>);
    fireEvent.click(screen.getByRole("button", { name: "بازکردن" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("محتوای شناور");
    expect(screen.getByRole("dialog").parentElement).toBe(document.body);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
