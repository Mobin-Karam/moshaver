import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, Field, Input } from "./ui";

describe("Field", () => {
  it("associates label, help and error with a generated control id", () => {
    render(
      <Field label="عنوان" description="عنوان نمایشی" error="عنوان لازم است" required>
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: /عنوان/ });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby")?.split(" ") || [];
    expect(describedBy).toHaveLength(2);
    expect(describedBy.every((id) => document.getElementById(id))).toBe(true);
  });

  it("targets a control-provided id instead of the generated id", () => {
    render(
      <Field label="نام کاربری">
        <Input id="account-name" />
      </Field>,
    );
    expect(screen.getByLabelText("نام کاربری")).toHaveAttribute("id", "account-name");
  });

  it("does not claim label association for an arbitrary composite child", () => {
    function Composite() {
      return <button type="button">انتخاب</button>;
    }
    const { container } = render(
      <Field label="دانش آموز">
        <Composite />
      </Field>,
    );
    expect(container.querySelector("label")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "انتخاب" })).not.toHaveAttribute("id");
  });
});

describe("Button", () => {
  it("normalizes small and icon sizing without losing accessible names", () => {
    render(
      <>
        <Button size="sm">ذخیره</Button>
        <Button size="icon" aria-label="حذف">
          ×
        </Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "ذخیره" })).toHaveClass("h-9");
    expect(screen.getByRole("button", { name: "حذف" })).toHaveClass("size-10");
  });
});
