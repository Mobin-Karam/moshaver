import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AccountSecurityPanel } from "./components/AccountSecurityPanel";
import { DatabaseBackupPanel } from "./components/DatabaseBackupPanel";
import type { PasswordDraft } from "./model/system.types";

function PasswordHarness({ onSubmit }: { onSubmit: () => void }) {
  const [passwords, setPasswords] = useState<PasswordDraft>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  return <AccountSecurityPanel passwords={passwords} setPasswords={setPasswords} busy={false} onSubmit={onSubmit} />;
}

describe("system and security controls", () => {
  it("requires the current password, 12 characters, and matching confirmation", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<PasswordHarness onSubmit={submit} />);
    const button = screen.getByRole("button", { name: /تغییر امن رمز/ });
    expect(button).toBeDisabled();
    const inputs = screen.getAllByLabelText(/رمز/);
    await user.type(inputs[0], "current-password");
    await user.type(inputs[1], "long-password-123");
    await user.type(inputs[2], "different-password");
    expect(button).toBeDisabled();
    await user.clear(inputs[2]);
    await user.type(inputs[2], "long-password-123");
    expect(button).toBeEnabled();
  });

  it("rejects non-SQLite restore files before enabling a destructive action", () => {
    const setFile = vi.fn();
    render(<DatabaseBackupPanel file={null} busy={false} downloading={false} setFile={setFile} onDownload={vi.fn()} onRestore={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("فایل بازیابی SQLite"), {
      target: { files: [new File(["not sqlite"], "backup.txt", { type: "text/plain" })] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("فقط فایل SQLite");
    expect(screen.getByRole("button", { name: /اعتبارسنجی و بازیابی/ })).toBeDisabled();
  });
});
