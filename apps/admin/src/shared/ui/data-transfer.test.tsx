import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DataTransferWorkspace } from "./data-transfer";
import { LocaleProvider } from "./locale";
import { ModalProvider } from "./modal";

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ModalProvider>
          <DataTransferWorkspace
            studentId="student-1"
            scope="all"
            title="انتقال کامل اطلاعات"
            description="ورود و خروج برنامه‌ها و آزمون‌ها"
            exportFrom="2026-08-01"
            exportTo="2026-08-31"
            showPlanReplacement
            showExamReplacement
            onImported={() => undefined}
          />
        </ModalProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(cleanup);

describe("data transfer workspace", () => {
  it("guides import and exposes manual JSON only on request", async () => {
    renderWorkspace();
    expect(screen.getByText("فایل را انتخاب کنید")).toBeInTheDocument();
    expect(screen.getByText("بررسی و رفع مشکل")).toBeInTheDocument();
    expect(screen.queryByLabelText("متن JSON")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("ورود دستی JSON"));
    expect(screen.getByLabelText("متن JSON")).toBeInTheDocument();
  });

  it("keeps export in the same workspace with a readable date summary", async () => {
    renderWorkspace();
    await userEvent.click(screen.getByRole("button", { name: /خروجی گرفتن/ }));
    expect(screen.getByText("خروجی قابل بازیابی")).toBeInTheDocument();
    expect(screen.getByText("دانلود خروجی JSON")).toBeInTheDocument();
  });
});
