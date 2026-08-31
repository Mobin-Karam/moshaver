import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { notify, ToastProvider } from "./toast";

afterEach(cleanup);

describe("typed toast system", () => {
  it("announces success, warning, and error states accessibly", () => {
    render(
      <ToastProvider>
        <span>app</span>
      </ToastProvider>,
    );
    act(() => {
      notify("ذخیره شد", "success");
      notify("ارتباط ضعیف است", "warning");
      notify("ثبت ناموفق بود", "error");
    });
    expect(screen.getByText("ذخیره شد")).toBeInTheDocument();
    expect(screen.getByText("ارتباط ضعیف است")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("ثبت ناموفق بود");
  });
});
