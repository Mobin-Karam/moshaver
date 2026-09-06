import { ChevronDown, UserRoundCheck } from "lucide-react";

export const demoAccounts = [
  { role: "سرپرست", username: "e2e.guardian.a", description: "مشاهده فرزند، برنامه و گزارش" },
  { role: "مشاور", username: "e2e.advisor.a", description: "برنامه‌ریزی و پیگیری دانش‌آموز" },
  { role: "دبیر", username: "e2e.teacher.a", description: "آزمون، سؤال و عملکرد آموزشی" },
  { role: "منتور", username: "e2e.mentor.a", description: "روند پیشرفت و گفت‌وگو" },
  { role: "مدیر محتوا", username: "e2e.content.a", description: "درس، سؤال و آزمونک" },
  { role: "مدیر سازمان", username: "e2e.orgadmin.a", description: "اعضا، کاربران و سازمان" },
  { role: "مدیر پلتفرم", username: "e2e.platform", description: "سامانه، امنیت و همه سازمان‌ها" },
  { role: "چندنقشی", username: "e2e.multi", description: "تعویض زمینه مشاور و دبیر" },
] as const;
export const demoPassword = "Moshaver-e2e-2026!";

export function DemoAccountPicker({
  onSelect,
}: {
  onSelect: (username: string, password: string) => void;
}) {
  return (
    <details className="group rounded-xl border border-dashed border-brand/30 bg-brand/5 p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20">
        <span className="flex items-center gap-2">
          <UserRoundCheck size={17} className="text-brand" />
          ورود سریع نقش‌های آزمایشی
        </span>
        <ChevronDown size={16} className="transition group-open:rotate-180" />
      </summary>
      <p className="mt-2 text-xs text-slate-500">
        ابتدا در Backend v2 دستور <code dir="ltr">npm run seed:demo</code> را روی پایگاه توسعه اجرا
        کنید.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {demoAccounts.map((account) => (
          <button
            key={account.username}
            type="button"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-right transition hover:border-brand/40 hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 dark:border-slate-800 dark:bg-slate-950"
            onClick={() => onSelect(account.username, demoPassword)}
          >
            <strong className="block text-sm">{account.role}</strong>
            <span className="mt-0.5 block text-[11px] text-slate-500">{account.description}</span>
            <code dir="ltr" className="mt-1 block text-[10px] text-brand">
              {account.username}
            </code>
          </button>
        ))}
      </div>
    </details>
  );
}
