import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RetryRequestsPanel } from "./exams/components/RetryRequestsPanel";
import { LearningHeader } from "./learning/components/LearningHeader";
import { QuestionsSelector } from "./questions/components/QuestionsSelector";

afterEach(cleanup);

describe("read-only role controls", () => {
  it("does not expose learning creation without a create capability", () => {
    render(<LearningHeader students={[]} studentId="" onStudentChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /مرور جدید/ })).not.toBeInTheDocument();
  });

  it("shows retry state without moderation actions", () => {
    render(
      <RetryRequestsPanel
        requests={[{ id: "retry-1", examTitle: "آزمون آزمایشی", status: "pending" }]}
      />,
    );

    expect(screen.getByText("در انتظار بررسی مشاور")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "تأیید" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "رد" })).not.toBeInTheDocument();
  });

  it("does not expose the optional student directory to a questions-only role", () => {
    render(
      <QuestionsSelector
        students={[]}
        showStudentPicker={false}
        showExamsLink={false}
        studentId=""
        setStudentId={vi.fn()}
        examId=""
        setExamId={vi.fn()}
        exams={[]}
        loading={false}
        error={false}
        questionCount={0}
      />,
    );

    expect(screen.queryByText("دانش‌آموز (اختیاری)")).not.toBeInTheDocument();
    expect(screen.getByText("آزمون")).toBeInTheDocument();
  });
});
