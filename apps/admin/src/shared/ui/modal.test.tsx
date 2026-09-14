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

function NestedConfirmation() {
  const modal = useModal();
  return (
    <button onClick={() => void modal.confirm({ title: "تأیید داخلی", showCancel: true })}>
      nested confirm
    </button>
  );
}

function NestedHarness() {
  const modal = useModal();
  return (
    <button onClick={() => modal.open({ title: "مدیریت گروه", content: <NestedConfirmation /> })}>
      open manager
    </button>
  );
}

function FailingHarness() {
  const modal = useModal();
  return (
    <button
      onClick={() =>
        modal.open({
          title: "ذخیره تغییرات",
          confirmLabel: "ذخیره",
          onConfirm: async () => {
            throw new Error("ارتباط با سرور برقرار نشد.");
          },
        })
      }
    >
      open failing
    </button>
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
    expect(screen.getByRole("dialog", { name: "ویرایش دانش‌آموز" })).toBeInTheDocument();
    expect(screen.getByRole("presentation").className).toContain("bg-slate-950/55");
    expect(screen.getByRole("presentation").className).not.toContain("backdrop-blur");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "open" })).toHaveFocus();
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

  it("restores a parent modal after a nested confirmation is cancelled", async () => {
    render(
      <ModalProvider>
        <NestedHarness />
      </ModalProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "open manager" }));
    await userEvent.click(screen.getByRole("button", { name: "nested confirm" }));
    expect(screen.getByRole("dialog", { name: "تأیید داخلی" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "انصراف" }));
    expect(screen.getByRole("dialog", { name: "مدیریت گروه" })).toBeInTheDocument();
  });

  it("keeps a failed confirmation open and exposes an inline error", async () => {
    render(
      <ModalProvider>
        <FailingHarness />
      </ModalProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "open failing" }));
    await userEvent.click(screen.getByRole("button", { name: "ذخیره" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ارتباط با سرور برقرار نشد.");
    expect(screen.getByRole("dialog", { name: "ذخیره تغییرات" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ذخیره" })).not.toBeDisabled();
  });
});
