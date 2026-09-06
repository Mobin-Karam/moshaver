import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const can = vi.fn<(capability:string)=>boolean>();
vi.mock("../features/auth", () => ({ LoginPage: () => null, useAuth: () => ({ can }) }));

import { CapabilityRoute } from "./router";

describe("protected portal routes", () => {
  beforeEach(() => can.mockReset());
  it("blocks a manipulated direct URL", () => {
    can.mockReturnValue(false);
    render(<CapabilityRoute capability="system.manage"><span>secret system page</span></CapabilityRoute>);
    expect(screen.getByRole("alert")).toHaveTextContent("دسترسی مجاز نیست");
    expect(screen.queryByText("secret system page")).not.toBeInTheDocument();
  });
  it("renders an authorized route", () => {
    can.mockImplementation((capability) => capability === "students.read");
    render(<CapabilityRoute capability="students.read"><span>student directory</span></CapabilityRoute>);
    expect(screen.getByText("student directory")).toBeInTheDocument();
  });
});
