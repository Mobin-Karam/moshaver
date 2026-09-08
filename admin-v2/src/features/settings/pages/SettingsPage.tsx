import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useLocale } from "../../../shared/ui/locale";
import { useModal } from "../../../shared/ui/modal";
import { notify } from "../../../shared/ui/notifications";
import { changePassword, getSessions, revokeSession } from "../api/settings.api";
import { LocationSettings } from "../components/LocationSettings";
import { SessionsSettings } from "../components/SessionsSettings";
import { ApiConnectionCard } from "../components/ApiConnectionCard";
import { AccountSecurityPanel } from "../../system/components/AccountSecurityPanel";
export function SettingsPage() {
  const qc = useQueryClient(),
    modal = useModal(),
    locale = useLocale();
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: getSessions });
  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
    meta: { successMessage: "نشست با موفقیت بسته شد." },
  });
  const password = useMutation({
    mutationFn: () => changePassword(passwords),
    onSuccess: () => {
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      notify("رمز تغییر کرد و نشست‌های دیگر بسته شدند.");
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) =>
      notify(error instanceof Error ? error.message : "تغییر رمز انجام نشد.", "error"),
  });
  return (
    <div className="grid gap-5">
      <section className="grid gap-4 lg:grid-cols-2">
        <LocationSettings
          locale={locale}
          onChange={() => notify("موقعیت و تقویم این مرورگر به‌روز شد.")}
        />
        <ApiConnectionCard />
      </section>
      <section aria-labelledby="account-security-title">
        <h2 id="account-security-title" className="mb-3 flex items-center gap-2 text-sm font-black">
          <ShieldCheck size={17} />
          امنیت حساب
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <AccountSecurityPanel
            passwords={passwords}
            setPasswords={setPasswords}
            busy={password.isPending}
            onSubmit={() =>
              void modal
                .confirm({
                  title: "تغییر رمز عبور؟",
                  description: "پس از تغییر، تمام نشست‌های دیگر این حساب بسته می‌شوند.",
                  confirmLabel: "تغییر رمز",
                })
                .then((confirmed) => confirmed && password.mutate())
            }
          />
          <SessionsSettings
            sessions={sessions}
            revoke={revoke}
            formatDateTime={locale.formatDateTime}
            confirm={(id) =>
              void modal
                .confirm({
                  title: "بستن نشست این دستگاه؟",
                  description:
                    "دسترسی دستگاه انتخاب‌شده فوراً لغو می‌شود و برای ورود دوباره به رمز نیاز دارد.",
                  tone: "danger",
                  confirmLabel: "بستن دسترسی",
                })
                .then((confirmed) => confirmed && revoke.mutate(id))
            }
          />
        </div>
      </section>
    </div>
  );
}
