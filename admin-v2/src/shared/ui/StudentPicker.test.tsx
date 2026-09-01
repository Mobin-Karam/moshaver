import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Student } from "../types/domain";
import { StudentPicker } from "./StudentPicker";

const students: Student[] = Array.from({ length: 100 }, (_, index) => ({
  id: `student-${index + 1}`,
  name: index === 74 ? "دانش‌آموز هدف" : `دانش‌آموز ${index + 1}`,
  grade: index % 2 ? "دوازدهم" : "یازدهم",
  major: index % 3 ? "تجربی" : "ریاضی",
  due_learning_count: index === 74 ? 4 : 0,
}));

describe("StudentPicker at cohort scale", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("searches 100 students without rendering the entire roster initially", async () => {
    const user = userEvent.setup(), onChange = vi.fn();
    render(<StudentPicker students={students} value="student-1" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /دانش‌آموز انتخاب‌شده/ }));
    expect(screen.getByText("۱۰۰ حساب در دسترس")).toBeInTheDocument();
    const list = screen.getByRole("listbox");
    expect(within(list).getAllByRole("option")).toHaveLength(40);
    await user.type(screen.getByPlaceholderText(/نام، نام کاربری/), "دانش‌آموز هدف");
    await user.click(within(list).getByRole("option", { name: /دانش‌آموز هدف/ }));
    expect(onChange).toHaveBeenCalledWith("student-75");
    expect(localStorage.getItem("admin-recent-student-ids")).toContain("student-75");
  });

  it("filters students requiring attention", async () => {
    const user = userEvent.setup();
    render(<StudentPicker students={students} value="student-1" onChange={() => undefined} />);
    await user.click(screen.getByRole("button", { name: /دانش‌آموز انتخاب‌شده/ }));
    await user.click(screen.getByRole("button", { name: "نیازمند توجه" }));
    expect(screen.getByRole("option", { name: /دانش‌آموز هدف/ })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });
});
