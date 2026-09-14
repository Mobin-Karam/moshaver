import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { gooeyToast } from "goey-toast";
import { AppToaster, notify, notifications } from "./notifications";

describe("Gooey notification adapter", () => {
  afterEach(() => {
    gooeyToast.dismiss();
    cleanup();
  });

  it("renders typed RTL notifications", async () => {
    render(<AppToaster />);
    act(() => {
      notify("ذخیره شد", "success");
    });
    expect(await screen.findByText("ذخیره شد")).toBeInTheDocument();
    expect(document.querySelector("[data-sonner-toaster]")).toHaveAttribute("dir", "rtl");
  });

  it("updates and dismisses a notification by id", async () => {
    render(<AppToaster />);
    let id: string | number = "";
    act(() => {
      id = notifications.loading("در حال ذخیره");
    });
    expect((await screen.findAllByText("در حال ذخیره")).length).toBeGreaterThan(0);
    act(() => {
      notifications.update(id, "ذخیره شد");
    });
    expect(await screen.findByText("ذخیره شد")).toBeInTheDocument();
    act(() => {
      notifications.dismiss(id);
    });
  });

  it("deduplicates repeated typed feedback by stable id", () => {
    let first: string | number = "";
    let second: string | number = "";
    act(() => {
      first = notifications.error("ذخیره ناموفق بود");
      second = notifications.error("ذخیره ناموفق بود");
    });
    expect(first).toBe(second);
  });
});
