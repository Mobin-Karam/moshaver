import { useQuery } from "@tanstack/react-query";
import { StudentPicker } from "../../components/StudentPicker";
import { DatePicker } from "../../components/date-picker";
import { useLocale } from "../../components/locale";
import { Badge, Card, EmptyState } from "../../components/ui";
import { useStudents } from "../../hooks/useStudents";
import { api } from "../../services/api";
import { addDays, fa, todayIso } from "../../lib/utils";
import { useState } from "react";

export function ReportsPage() {
  const students = useStudents();
  const locale = useLocale();
  const [from, setFrom] = useState(addDays(todayIso(), -7));
  const [to, setTo] = useState(todayIso());
  const reports = useQuery({
    queryKey: ["reports", students.studentId, from, to],
    enabled: !!students.studentId,
    queryFn: () =>
      api.get<Record<string, unknown>[]>(
        `/admin/reports?studentId=${students.studentId}&from=${from}&to=${to}`,
      ),
  });
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black">گزارش‌ها</h2>
          <p className="text-slate-500">
            مطالعه، تست، تمرکز، خستگی، انگیزه و یادداشت روزانه
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <StudentPicker
            students={students.students}
            value={students.studentId}
            onChange={students.setStudentId}
          />
          <DatePicker value={from} max={to} onChange={setFrom} />
          <DatePicker value={to} min={from} onChange={setTo} />
        </div>
      </div>
      <Card>
        {reports.data?.length ? (
          <div className="grid gap-3">
            {reports.data.map((r, i) => (
              <ReportCard
                key={String(r.id ?? i)}
                report={r}
                formatDate={locale.formatDate}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={`برای بازه انتخابی گزارشی نیست. ${locale.formatDate(from)} تا ${locale.formatDate(to)}`}
          />
        )}
      </Card>
    </div>
  );
}

function ReportCard({
  report: r,
  formatDate,
}: {
  report: Record<string, unknown>;
  formatDate: (value?: string | Date) => string;
}) {
  return (
    <article className="rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>
          {r.plan_date || r.planDate
            ? formatDate(String(r.plan_date ?? r.planDate))
            : "گزارش"}
        </strong>
        <div className="flex gap-2">
          <Badge tone="blue">تمرکز {fa(r.focus ?? 0)}/۱۰</Badge>
          <Badge tone="amber">خستگی {fa(r.fatigue ?? 0)}/۱۰</Badge>
          <Badge tone="green">انگیزه {fa(r.motivation ?? 0)}/۱۰</Badge>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
        <span>
          مطالعه: <strong>{fa(r.study_hours ?? 0)} ساعت</strong>
        </span>
        <span>
          تست: <strong>{fa(r.tests ?? 0)}</strong>
        </span>
        <span>
          صحیح: <strong>{fa(r.correct ?? 0)}</strong>
        </span>
        <span>
          غلط: <strong>{fa(r.wrong ?? 0)}</strong>
        </span>
      </div>
      {r.problem ? (
        <p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800">
          مسئله: {String(r.problem)}
        </p>
      ) : null}
      {r.tomorrow ? (
        <p className="mt-2 rounded-md bg-teal-50 p-3 text-sm text-teal-800">
          فردا: {String(r.tomorrow)}
        </p>
      ) : null}
    </article>
  );
}
