import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkContextBar } from "./work-context-bar";

describe("WorkContextBar", () => {
  it("exposes the active role and organization from the Admin header", () => {
    render(<WorkContextBar role="مشاور" organization="آکادمی راه روشن" multipleRoles />);

    const context = screen.getByLabelText("زمینه کاری فعال");
    expect(context).toHaveTextContent("مشاور");
    expect(context).toHaveTextContent("آکادمی راه روشن");
    expect(context).toHaveTextContent("برای تغییر نقش از منوی حساب استفاده کنید.");
  });
});
