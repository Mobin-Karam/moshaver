import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { toast } from "sonner";
import { AppToaster, notify, notifications } from "./notifications";

describe("Sonner notification adapter", () => {
  afterEach(() => toast.dismiss());

  it("renders typed RTL notifications", async () => {
    render(<AppToaster />);
    act(() => { notify("ذخیره شد", "success"); });
    expect(await screen.findByText("ذخیره شد")).toBeInTheDocument();
    expect(document.querySelector("[data-sonner-toaster]")).toHaveAttribute("dir", "rtl");
  });

  it("updates and dismisses a notification by id", async () => {
    render(<AppToaster />);
    let id: string | number = "";
    act(() => { id = notifications.loading("در حال ذخیره"); });
    expect(await screen.findByText("در حال ذخیره")).toBeInTheDocument();
    act(() => { notifications.update(id, "ذخیره شد"); });
    expect(await screen.findByText("ذخیره شد")).toBeInTheDocument();
    act(() => { notifications.dismiss(id); });
  });
});
