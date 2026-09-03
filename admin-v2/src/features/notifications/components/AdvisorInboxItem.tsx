import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MessageSquareReply,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge, Button, Textarea } from "../../../shared/ui/ui";
import { useLocale } from "../../../shared/ui/locale";
import { fa } from "../../../shared/lib/utils";
import { inboxCreatedAt, issueTypeLabel } from "../lib/notification-utils";
import type {
  AdvisorInboxRow,
  RecoveryActionInput,
  TaskIssueActionInput,
} from "../model/notification.types";

export function AdvisorInboxItem({
  row,
  recoveryPendingId,
  issuePendingId,
  onRecovery,
  onIssue,
}: {
  row: AdvisorInboxRow;
  recoveryPendingId: string;
  issuePendingId: string;
  onRecovery: (input: RecoveryActionInput) => Promise<boolean>;
  onIssue: (input: TaskIssueActionInput) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [response, setResponse] = useState("");
  const { formatDateTime, formatDate } = useLocale();

  if (row.kind === "issue") {
    const issue = row.value;
    const createdAt = inboxCreatedAt(issue as unknown as Record<string, unknown>);
    const pending = issuePendingId === issue.id;
    return (
      <article className="rounded-xl border border-rose-100 bg-rose-50/30 p-3 dark:border-rose-950 dark:bg-rose-950/10">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="red"><AlertTriangle size={12} className="ml-1" /> مشکل فعالیت</Badge>
              <span className="text-[10px] font-semibold text-slate-400">{issueTypeLabel(issue)}</span>
            </div>
            <strong className="mt-2 block truncate text-sm text-slate-900 dark:text-white">
              {issue.title || issue.subject || "فعالیت بدون عنوان"}
            </strong>
            {issue.subject && issue.title ? <span className="mt-0.5 block text-[10px] text-slate-500">{issue.subject}</span> : null}
          </div>
          {createdAt ? <time className="shrink-0 text-[9px] text-slate-400">{formatDateTime(createdAt)}</time> : null}
        </header>

        {issue.note ? <p className="mt-2 rounded-lg bg-white/80 p-2 text-xs leading-5 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">{issue.note}</p> : null}
        {issue.advisorNote || issue.advisor_note ? (
          <p className="mt-2 rounded-lg border border-brand/10 bg-brand/5 p-2 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
            <b className="ml-1 text-brand">آخرین پاسخ مشاور:</b>
            {issue.advisorNote || issue.advisor_note}
          </p>
        ) : null}

        <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand">
          <MessageSquareReply size={13} />
          {expanded ? "بستن پاسخ" : "رسیدگی و پاسخ"}
        </button>

        {expanded ? (
          <div className="mt-3 grid gap-2 border-t border-rose-100 pt-3 dark:border-rose-950">
            <Textarea
              rows={3}
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              placeholder="یادداشت یا پاسخ مشاور… در صورت ثبت، برای دانش‌آموز هم اعلان می‌شود."
              className="min-h-20 resize-y dark:border-slate-700 dark:bg-slate-900"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-9 px-3 text-xs"
                loading={pending}
                disabled={!response.trim()}
                variant="soft"
                onClick={() => void onIssue({ id: issue.id, status: "open", advisorNote: response.trim() }).then((ok) => { if (ok) setResponse(""); })}
              >
                پاسخ و باز نگه‌داشتن
              </Button>
              <Button
                className="h-9 px-3 text-xs"
                loading={pending}
                onClick={() => void onIssue({ id: issue.id, status: "resolved", advisorNote: response.trim() || undefined })}
              >
                <CheckCircle2 size={14} /> حل شد
              </Button>
              <Button
                className="h-9 px-3 text-xs"
                loading={pending}
                variant="ghost"
                onClick={() => void onIssue({ id: issue.id, status: "dismissed", advisorNote: response.trim() || undefined })}
              >
                <XCircle size={14} /> رد گزارش
              </Button>
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  if (row.kind === "recovery") {
    const recovery = row.value;
    const createdAt = inboxCreatedAt(recovery as unknown as Record<string, unknown>);
    const planDate = recovery.planDate || recovery.plan_date;
    const pending = recoveryPendingId === recovery.id;
    return (
      <article className="rounded-xl border border-sky-100 bg-sky-50/30 p-3 dark:border-sky-950 dark:bg-sky-950/10">
        <header className="flex items-start justify-between gap-2">
          <div>
            <Badge tone="blue"><RotateCcw size={12} className="ml-1" /> درخواست ریکاوری</Badge>
            {planDate ? <strong className="mt-2 block text-sm text-slate-900 dark:text-white">برنامه {formatDate(planDate)}</strong> : null}
          </div>
          {createdAt ? <time className="shrink-0 text-[9px] text-slate-400">{formatDateTime(createdAt)}</time> : null}
        </header>

        {recovery.reason ? <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{recovery.reason}</p> : null}
        {recovery.note ? <p className="mt-1 rounded-lg bg-white/80 p-2 text-xs leading-5 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">{recovery.note}</p> : null}

        <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand">
          <MessageSquareReply size={13} />
          {expanded ? "بستن رسیدگی" : "رسیدگی"}
        </button>

        {expanded ? (
          <div className="mt-3 grid gap-2 border-t border-sky-100 pt-3 dark:border-sky-950">
            <Textarea
              rows={3}
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              placeholder="پیام برای دانش‌آموز بعد از تأیید ریکاوری…"
              className="min-h-20 resize-y dark:border-slate-700 dark:bg-slate-900"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-9 px-3 text-xs"
                loading={pending}
                onClick={() => void onRecovery({ id: recovery.id, status: "resolved", message: response.trim() || undefined })}
              >
                <CheckCircle2 size={14} /> حل و اطلاع‌رسانی
              </Button>
              <Button
                className="h-9 px-3 text-xs"
                loading={pending}
                variant="ghost"
                onClick={() => void onRecovery({ id: recovery.id, status: "dismissed" })}
              >
                <XCircle size={14} /> رد درخواست
              </Button>
            </div>
            <p className="text-[9px] leading-4 text-slate-400">رد درخواست در API v1 اعلان جداگانه‌ای برای دانش‌آموز ارسال نمی‌کند؛ حل کردن همراه پیام، اطلاع‌رسانی می‌شود.</p>
          </div>
        ) : null}
      </article>
    );
  }

  const value = row.value as Record<string, unknown>;
  const createdAt = inboxCreatedAt(value);
  const title = String(value.title || value.subject || value.examTitle || value.reason || "مورد پیگیری");
  const subtitle = String(value.planDate || value.dueDate || value.due_date || value.start || "");
  const Icon = row.kind === "missed" ? Clock3 : row.kind === "review" ? BookOpenCheck : GraduationCap;

  return (
    <article className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Badge tone={row.tone}><Icon size={12} className="ml-1" /> {row.type}</Badge>
          <strong className="mt-2 block truncate text-sm text-slate-800 dark:text-slate-100">{title}</strong>
          {subtitle ? <span className="mt-1 block text-[10px] text-slate-500">{subtitle}</span> : null}
        </div>
        {createdAt ? <time className="shrink-0 text-[9px] text-slate-400">{formatDateTime(createdAt)}</time> : null}
      </header>
      {row.kind === "missed" && "start" in value && value.start ? (
        <p className="mt-2 text-[10px] text-slate-500">زمان {String(value.start)}{value.end ? ` تا ${String(value.end)}` : ""}</p>
      ) : null}
      {row.kind === "review" && value.intervalDays ? (
        <p className="mt-2 text-[10px] text-slate-500">فاصله مرور {fa(value.intervalDays)} روز</p>
      ) : null}
    </article>
  );
}
