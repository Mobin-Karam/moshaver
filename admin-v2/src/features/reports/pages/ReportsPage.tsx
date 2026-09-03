import { useQuery } from "@tanstack/react-query";
import {
  CalendarRange,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { StudentPicker } from "../../../shared/ui/StudentPicker";
import { DatePicker } from "../../../shared/ui/date-picker";
import { useLocale } from "../../../shared/ui/locale";
import { Button, Card, EmptyState, Input } from "../../../shared/ui/ui";
import { useStudentSelection } from "../../../shared/hooks/useStudentSelection";
import {
  addDays,
  todayIso,
  normalizePersianText,
} from "../../../shared/lib/utils";
import { getReports } from "../api/reports.api";
import { ReportCard } from "../components/ReportCard";
import { ReportCompactList } from "../components/ReportCompactList";
import { ReportSummary } from "../components/ReportSummary";
import { reportDate, reportText, summarizeReports } from "../report-utils";

type ViewMode = "cards" | "compact";
type SortMode = "newest" | "oldest";

const presets = [
  { days: 7, label: "۷ روز" },
  { days: 14, label: "۱۴ روز" },
  { days: 30, label: "۳۰ روز" },
] as const;

export function ReportsPage() {
  const students = useStudentSelection();
  const locale = useLocale();
  const [from, setFrom] = useState(addDays(todayIso(), -6));
  const [to, setTo] = useState(todayIso());
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [view, setView] = useState<ViewMode>("cards");

  const reports = useQuery({
    queryKey: ["reports", students.studentId, from, to],
    enabled: !!students.studentId,
    queryFn: () => getReports(students.studentId, from, to),
  });
  const visibleReports = useMemo(() => {
    const needle = normalizePersianText(search);
    return (reports.data ?? [])
      .filter(
        (report) =>
          !needle || normalizePersianText(reportText(report)).includes(needle),
      )
      .slice()
      .sort((a, b) => {
        const left = reportDate(a);
        const right = reportDate(b);
        return sort === "newest"
          ? right.localeCompare(left)
          : left.localeCompare(right);
      });
  }, [reports.data, search, sort]);
  const summary = useMemo(
    () => summarizeReports(reports.data ?? []),
    [reports.data],
  );

  function applyPreset(days: number) {
    const end = todayIso();
    setTo(end);
    setFrom(addDays(end, -(days - 1)));
  }

  return (
    <div className="grid gap-4 sm:gap-5">
      <Card>
        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(160px,0.7fr)_minmax(160px,0.7fr)]">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              <span>دانش‌آموز</span>
              <StudentPicker
                students={students.students}
                value={students.studentId}
                onChange={students.selectStudent}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              <span>از تاریخ</span>
              <DatePicker value={from} max={to} onChange={setFrom} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              <span>تا تاریخ</span>
              <DatePicker value={to} min={from} onChange={setTo} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <CalendarRange size={15} />
              بازه سریع:
            </span>
            {presets.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => applyPreset(preset.days)}
                className="min-h-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {preset.label}
              </button>
            ))}
            <span className="mr-auto text-xs text-slate-400">
              {locale.formatDate(from)} تا {locale.formatDate(to)}
            </span>
          </div>
        </div>
      </Card>

      {!students.studentId ? (
        <Card>
          <EmptyState title="برای دیدن گزارش‌ها ابتدا یک دانش‌آموز را انتخاب کنید." />
        </Card>
      ) : reports.isLoading ? (
        <Card>
          <div className="grid gap-3" aria-label="در حال دریافت گزارش‌ها">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        </Card>
      ) : reports.isError ? (
        <Card>
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center">
            <div>
              <strong className="text-sm text-slate-800">
                دریافت گزارش‌ها انجام نشد.
              </strong>
              <p className="mt-1 text-xs text-slate-500">
                اتصال یا پاسخ سرور را بررسی کنید و دوباره تلاش کنید.
              </p>
            </div>
            <Button variant="soft" onClick={() => void reports.refetch()}>
              <RefreshCw size={16} />
              تلاش دوباره
            </Button>
          </div>
        </Card>
      ) : reports.data?.length ? (
        <>
          <ReportSummary summary={summary} />

          <Card>
            <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto] lg:items-center">
              <div className="relative min-w-0">
                <Search
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <Input
                  className="pr-9"
                  placeholder="جستجو در مسئله یا برنامه فردا"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <label className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 px-2 text-xs font-semibold text-slate-600">
                <span>ترتیب</span>
                <select
                  className="h-9 bg-transparent outline-none"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                >
                  <option value="newest">جدیدترین</option>
                  <option value="oldest">قدیمی‌ترین</option>
                </select>
              </label>
              <div
                className="grid grid-cols-2 rounded-lg bg-slate-100 p-1"
                aria-label="نوع نمایش"
              >
                <button
                  type="button"
                  aria-pressed={view === "cards"}
                  title="نمای کارت"
                  onClick={() => setView("cards")}
                  className={`grid size-9 place-items-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${view === "cards" ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-ink"}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  aria-pressed={view === "compact"}
                  title="نمای فشرده"
                  onClick={() => setView("compact")}
                  className={`grid size-9 place-items-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${view === "compact" ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-ink"}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
            <div className="mb-3 text-xs text-slate-500">
              {visibleReports.length.toLocaleString("fa-IR")} گزارش از{" "}
              {reports.data.length.toLocaleString("fa-IR")} مورد نمایش داده
              می‌شود.
            </div>
            {visibleReports.length ? (
              view === "cards" ? (
                <div className="grid gap-3">
                  {visibleReports.map((report, index) => (
                    <ReportCard
                      key={String(
                        report.id ?? `${reportDate(report)}-${index}`,
                      )}
                      report={report}
                      formatDate={locale.formatDate}
                    />
                  ))}
                </div>
              ) : (
                <ReportCompactList
                  reports={visibleReports}
                  formatDate={locale.formatDate}
                />
              )
            ) : (
              <EmptyState title="گزارشی مطابق جستجوی شما پیدا نشد." />
            )}
          </Card>
        </>
      ) : (
        <Card>
          <EmptyState
            title={`برای بازه انتخابی گزارشی نیست. ${locale.formatDate(from)} تا ${locale.formatDate(to)}`}
          />
        </Card>
      )}
    </div>
  );
}
