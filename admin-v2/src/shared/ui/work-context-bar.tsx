import { Building2, Layers3 } from "lucide-react";

export function WorkContextBar({
  role,
  organization,
  multipleRoles = false,
}: {
  role: string;
  organization?: string;
  multipleRoles?: boolean;
}) {
  return (
    <aside
      className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300"
      aria-label="زمینه کاری فعال"
    >
      <span className="flex items-center gap-1.5 font-bold text-ink">
        <Layers3 size={14} className="text-brand" />
        {role}
      </span>
      {organization ? (
        <span className="flex items-center gap-1.5">
          <Building2 size={14} />
          {organization}
        </span>
      ) : (
        <span className="text-slate-400">سطح پلتفرم</span>
      )}
      {multipleRoles ? (
        <span className="mr-auto text-[11px] text-slate-500">
          برای تغییر نقش از منوی حساب استفاده کنید.
        </span>
      ) : null}
    </aside>
  );
}
