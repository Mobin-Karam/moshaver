import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModalProvider, useModal } from "./modal";

function Harness({ resolved }: { resolved: (value: boolean) => void }) {
  const modal = useModal();
  return (
    <>
      <button
        onClick={() =>
          modal.open({
            title: "ویرایش دانش‌آموز",
            content: <input aria-label="نام" />,
            size: "lg",
          })
        }
      >
        open
      </button>
      <button
        onClick={() =>
          void modal
            .confirm({
              title: "حذف شود؟",
              description: "این عملیات قابل بازگشت نیست.",
              tone: "danger",
              confirmLabel: "حذف",
            })
            .then(resolved)
        }
      >
        confirm
      </button>
    </>
  );
}

afterEach(cleanup);

describe("global modal", () => {
  it("renders through the provider and closes with Escape", async () => {
    render(
      <ModalProvider>
        <Harness resolved={() => undefined} />
      </ModalProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "open" }));
    expect(
      screen.getByRole("dialog", { name: "ویرایش دانش‌آموز" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("presentation").className).toContain(
      "bg-slate-950/55",
    );
    expect(screen.getByRole("presentation").className).not.toContain(
      "backdrop-blur",
    );
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("resolves reusable confirmations", async () => {
    const resolved = vi.fn();
    render(
      <ModalProvider>
        <Harness resolved={resolved} />
      </ModalProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "confirm" }));
    await userEvent.click(screen.getByRole("button", { name: "حذف" }));
    expect(resolved).toHaveBeenCalledWith(true);
  });
});
