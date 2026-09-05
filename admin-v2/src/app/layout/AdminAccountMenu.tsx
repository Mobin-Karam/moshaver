import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../features/auth";
import { ThemeSwitcher } from "../../shared/theme/theme";
import { useModal } from "../../shared/ui/modal";
import { ViewportPopover } from "../../shared/ui/popover";
import { Button } from "../../shared/ui/ui";
import { DevBackendSwitcher } from "../dev/DevBackendSwitcher";

export function AdminAccountMenu() {
  const auth = useAuth();
  const modal = useModal();
  const [open, setOpen] = useState(false);
  const displayName = auth.user?.displayName || auth.user?.display_name || auth.user?.username || "مدیر";
  const initial = displayName.trim()[0] || "م";
  const roleLabels: Record<string, string> = { GUARDIAN: "سرپرست", ADVISOR: "مشاور", TEACHER: "دبیر", MENTOR: "منتور", CONTENT_MANAGER: "مدیر محتوا", ORGANIZATION_ADMIN: "مدیر سازمان", PLATFORM_ADMIN: "مدیر پلتفرم" };

  async function logout() {
    const confirmed = await modal.confirm({
      title: "خروج از پنل؟",
      description: "نشست این دستگاه بسته می‌شود.",
      confirmLabel: "خروج",
      tone: "danger",
    });
    if (!confirmed) return;
    setOpen(false);
    await auth.logout();
  }

  return (
    <ViewportPopover
      open={open}
      onOpenChange={setOpen}
      width={320}
      className="overflow-hidden"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          className="flex h-10 min-w-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-1.5 text-right outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand sm:px-2"
          aria-label="منوی حساب مدیر"
          title={displayName}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-black text-white" aria-hidden="true">
            {initial}
          </span>
          <span className="hidden max-w-28 min-w-0 2xl:block">
            <strong className="block truncate text-xs">{displayName}</strong>
            <small className="block truncate text-[9px] text-slate-400">مدیر سامانه</small>
          </span>
        </button>
      )}
    >
      <div className="border-b border-slate-200 p-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-brand">
            <UserRound size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-sm">{displayName}</strong>
            <p className="flex items-center gap-1 text-[11px] text-slate-500">
              <ShieldCheck size={13} /> {roleLabels[auth.activeRole || ""] || "پرتال خانواده و کارکنان"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 p-3">
        {(auth.context?.roles.length ?? 0) > 1 ? (
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            زمینه کاری
            <select className="h-10 rounded-lg border border-slate-200 bg-white px-2" value={auth.activeRole ?? ""} onChange={(event) => auth.setActiveRole(event.target.value as NonNullable<typeof auth.activeRole>)}>
              {auth.context?.roles.filter((role) => role !== "STUDENT").map((role) => <option key={role} value={role}>{roleLabels[role] || role}</option>)}
            </select>
          </label>
        ) : null}
        {(auth.context?.availableOrganizations.length ?? 0) > 1 ? (
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            سازمان فعال
            <select className="h-10 rounded-lg border border-slate-200 bg-white px-2" value={auth.context?.activeOrganization?.id ?? ""} onChange={(event) => auth.setActiveOrganization(auth.context?.availableOrganizations.find((item) => item.id === event.target.value) ?? null)}>
              <option value="">انتخاب سازمان</option>
              {auth.context?.availableOrganizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
            </select>
          </label>
        ) : null}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-2 xl:hidden">
          <span className="text-xs font-semibold text-slate-600">نمایش</span>
          <ThemeSwitcher />
        </div>
        <DevBackendSwitcher />
        <Button
          className="w-full justify-start text-rose-700 hover:bg-rose-50"
          variant="ghost"
          loading={auth.status === "logging-out"}
          loadingLabel="در حال خروج…"
          onClick={() => void logout()}
        >
          <LogOut size={16} />
          خروج از پنل
        </Button>
      </div>
    </ViewportPopover>
  );
}
