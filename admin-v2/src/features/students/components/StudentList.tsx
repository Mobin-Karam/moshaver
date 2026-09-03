import { ArrowDown, ArrowUp, CheckCircle2, ChevronLeft, ChevronRight, Search, UserRound, UsersRound, X } from "lucide-react";
import type { Student } from "../../../shared/types/domain";
import { Button, Card, EmptyState, Input, LoadingState } from "../../../shared/ui/ui";
import { formatStudentLastSeen, getStudentProfileCompleteness, getStudentStatus, getStudentUsername, studentStatusCopy, type StudentProfileFilter, type StudentSort, type StudentSortDirection, type StudentStatusFilter } from "./student-ui";

export { getStudentStatus } from "./student-ui";
export type { StudentProfileFilter, StudentSort, StudentSortDirection, StudentStatusFilter } from "./student-ui";

function StudentStatus({ student }: { student: Student }) {
  const status = studentStatusCopy[getStudentStatus(student)];
  return <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold ${status.className}`}>{status.label}</span>;
}

function Completeness({ student, compact = false }: { student: Student; compact?: boolean }) {
  const value = getStudentProfileCompleteness(student);
  return <div className={compact ? "min-w-0" : "min-w-28"}>
    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
      <span>{compact ? "تکمیل پرونده" : "پرونده"}</span>
      <strong className="text-slate-700 dark:text-slate-200">٪{value.toLocaleString("fa-IR")}</strong>
    </div>
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-label="تکمیل پرونده" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <span className="block h-full rounded-full bg-brand transition-[width] motion-reduce:transition-none" style={{ width: `${value}%` }} />
    </div>
  </div>;
}

function SortButton({ label, value, sort, direction, onSort }: { label: string; value: StudentSort; sort: StudentSort; direction: StudentSortDirection; onSort: (value: StudentSort) => void }) {
  const active = sort === value;
  return <button type="button" className="inline-flex items-center gap-1 rounded-md px-1 py-1 font-semibold hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" onClick={() => onSort(value)} aria-label={`مرتب‌سازی بر اساس ${label}`}>
    <span>{label}</span>
    {active ? direction === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null}
  </button>;
}

export function StudentList({
  students,
  total,
  filteredTotal,
  page,
  pageCount,
  pageSize,
  setPage,
  setPageSize,
  selectedId,
  search,
  setSearch,
  status,
  profileFilter,
  sort,
  sortDirection,
  onSort,
  onClearFilters,
  onSelect,
  loading = false,
  error = false,
  onRetry,
  creating = false,
}: {
  students: Student[];
  total: number;
  filteredTotal: number;
  page: number;
  pageCount: number;
  pageSize: number;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  selectedId: string;
  search: string;
  setSearch: (value: string) => void;
  status: StudentStatusFilter;
  profileFilter: StudentProfileFilter;
  sort: StudentSort;
  sortDirection: StudentSortDirection;
  onSort: (value: StudentSort) => void;
  onClearFilters: () => void;
  onSelect: (student: Student) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  creating?: boolean;
}) {
  const hasFilters = !!search.trim() || status !== "all" || profileFilter !== "all";
  const startItem = filteredTotal ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, filteredTotal);
  const statusLabel = status === "active" ? "فعال" : status === "inactive" ? "غیرفعال" : status === "archived" ? "بایگانی" : "";

  return <Card className="min-w-0 overflow-hidden p-0">
    <div className="grid gap-3 border-b border-slate-200 p-3 sm:p-4 dark:border-slate-800">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <Input className="pl-9 pr-9" aria-label="جستجوی دانش‌آموز" placeholder="نام، شناسه، نام کاربری، پایه، رشته یا هدف..." value={search} onChange={(event) => setSearch(event.target.value)} />
        {search ? <button type="button" onClick={() => setSearch("")} aria-label="پاک کردن جستجو" className="absolute left-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-slate-800"><X size={14} /></button> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><UsersRound size={14} />{filteredTotal.toLocaleString("fa-IR")} نتیجه</span>
        {status !== "all" ? <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">وضعیت: {statusLabel}</span> : null}
        {profileFilter === "incomplete" ? <span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">پرونده ناقص</span> : null}
        {hasFilters ? <button type="button" onClick={onClearFilters} className="mr-auto inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-slate-500 hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-slate-400 dark:hover:bg-slate-800"><X size={13} />حذف فیلترها</button> : null}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:hidden">
        <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>مرتب‌سازی</span>
          <select className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" value={sort} onChange={(event) => onSort(event.target.value as StudentSort)}>
            <option value="name">نام</option>
            <option value="username">نام کاربری</option>
            <option value="grade">پایه</option>
            <option value="lastSeen">آخرین فعالیت</option>
            <option value="completeness">تکمیل پرونده</option>
          </select>
        </label>
        <Button variant="soft" className="h-9 px-3" onClick={() => onSort(sort)} aria-label={sortDirection === "asc" ? "مرتب‌سازی نزولی" : "مرتب‌سازی صعودی"}>{sortDirection === "asc" ? <ArrowUp size={15} /> : <ArrowDown size={15} />}</Button>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[11px] text-slate-500 sm:px-4 dark:text-slate-400">
      <span>نمایش {startItem.toLocaleString("fa-IR")} تا {endItem.toLocaleString("fa-IR")} از {filteredTotal.toLocaleString("fa-IR")}{filteredTotal !== total ? ` · کل ${total.toLocaleString("fa-IR")}` : ""}</span>
      {creating ? <span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">در حال ساخت حساب جدید</span> : selectedId ? <span className="inline-flex items-center gap-1 text-brand"><CheckCircle2 size={13} />دانش‌آموز انتخاب شده</span> : null}
    </div>

    {loading ? <div className="p-4"><LoadingState label="در حال دریافت فهرست دانش‌آموزان..." /></div> : error ? <div className="p-4"><EmptyState title="دریافت فهرست دانش‌آموزان ناموفق بود." action={onRetry ? <Button variant="soft" onClick={onRetry}>تلاش دوباره</Button> : undefined} /></div> : students.length ? <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-y border-slate-200 bg-slate-50/70 text-right text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <th className="px-3 py-2 font-semibold"><SortButton label="دانش‌آموز" value="name" sort={sort} direction={sortDirection} onSort={onSort} /></th>
              <th className="px-3 font-semibold"><SortButton label="پایه / رشته" value="grade" sort={sort} direction={sortDirection} onSort={onSort} /></th>
              <th className="px-3 font-semibold">هدف</th>
              <th className="px-3 font-semibold"><SortButton label="آخرین فعالیت" value="lastSeen" sort={sort} direction={sortDirection} onSort={onSort} /></th>
              <th className="px-3 font-semibold"><SortButton label="پرونده" value="completeness" sort={sort} direction={sortDirection} onSort={onSort} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {students.map((student) => {
              const selected = selectedId === student.id && !creating;
              const education = [student.grade, student.major].filter(Boolean).join(" / ") || "ثبت نشده";
              const target = [student.targetField || student.target_major, student.targetUniversity || student.target_city].filter(Boolean).join(" · ") || "ثبت نشده";
              return <tr key={student.id} className={`cursor-pointer transition-colors ${selected ? "bg-brand/5 dark:bg-brand/10" : "hover:bg-slate-50 dark:hover:bg-slate-900/70"}`} onClick={() => onSelect(student)}>
                <td className="px-3 py-3.5">
                  <button type="button" aria-pressed={selected} className="flex max-w-[260px] items-center gap-3 rounded-lg text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" onClick={(event) => { event.stopPropagation(); onSelect(student); }}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${selected ? "bg-brand text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}><UserRound size={18} /></span>
                    <span className="min-w-0"><span className="flex min-w-0 flex-wrap items-center gap-2"><strong className="truncate text-sm text-ink">{student.name}</strong><StudentStatus student={student} /></span><span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400" dir="ltr">{getStudentUsername(student) || "بدون نام کاربری"}</span></span>
                  </button>
                </td>
                <td className="max-w-[190px] px-3"><p className="truncate font-semibold text-slate-700 dark:text-slate-200">{education}</p></td>
                <td className="max-w-[220px] px-3"><p className="truncate text-xs text-slate-500 dark:text-slate-400">{target}</p></td>
                <td className="px-3 text-xs text-slate-500 dark:text-slate-400">{formatStudentLastSeen(student.last_seen_at)}</td>
                <td className="px-3"><Completeness student={student} /></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 p-3 md:hidden">
        {students.map((student) => {
          const selected = selectedId === student.id && !creating;
          const education = [student.grade, student.major].filter(Boolean).join(" / ") || "پایه و رشته ثبت نشده";
          return <button key={student.id} type="button" aria-pressed={selected} onClick={() => onSelect(student)} className={`grid gap-3 rounded-xl border p-3 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${selected ? "border-brand bg-brand/5" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"}`}>
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
              <span className={`grid size-10 place-items-center rounded-full ${selected ? "bg-brand text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}><UserRound size={18} /></span>
              <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm text-ink">{student.name}</strong><StudentStatus student={student} /></span><span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{education}</span></span>
              <ChevronLeft className="mt-2 text-slate-400" size={16} />
            </div>
            <Completeness student={student} compact />
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400"><span>{formatStudentLastSeen(student.last_seen_at)}</span><span className="font-bold text-brand">باز کردن پرونده</span></div>
          </button>;
        })}
      </div>

      {filteredTotal > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-3 sm:p-4 dark:border-slate-800">
        <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><span>تعداد در صفحه</span><select className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={25}>۲۵</option><option value={50}>۵۰</option><option value={100}>۱۰۰</option></select></label>
        <div className="flex items-center gap-2"><Button variant="soft" className="h-9 px-2.5" disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))}><ChevronRight size={15} />قبلی</Button><span className="min-w-20 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">{page.toLocaleString("fa-IR")} / {Math.max(1, pageCount).toLocaleString("fa-IR")}</span><Button variant="soft" className="h-9 px-2.5" disabled={page >= pageCount} onClick={() => setPage(Math.min(pageCount, page + 1))}>بعدی<ChevronLeft size={15} /></Button></div>
      </div> : null}
    </> : <div className="p-4"><EmptyState title={hasFilters ? "دانش‌آموزی با این فیلترها پیدا نشد." : "هنوز دانش‌آموزی ثبت نشده است."} action={hasFilters ? <Button variant="soft" onClick={onClearFilters}>نمایش همه دانش‌آموزان</Button> : undefined} /></div>}
  </Card>;
}
