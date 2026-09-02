import {
  AlertTriangle,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { fa } from "../../../shared/lib/utils";
import {
  Badge,
  Card,
} from "../../../shared/ui/ui";
import {
  elapsed,
  needsAttention,
  stateLabel,
  stateTone,
} from "../lib/live-helpers";
import type { LiveStudent } from "../model/live.types";
import { MiniMetric } from "./MiniMetric";

export function StudentCard({
  student,
  now,
  formatDateTime,
}: {
  student: LiveStudent;
  now: number;
  formatDateTime: (
    value?: string | Date,
  ) => string;
}) {
  const attention =
    needsAttention(student);

  return (
    <Card
      className={[
        "relative overflow-hidden p-0",
        attention
          ? "border-amber-200"
          : "",
      ].join(" ")}
    >
      <div
        className={[
          "h-1",
          student.freshness ===
          "live"
            ? "bg-emerald-500"
            : student.freshness ===
                "recent"
              ? "bg-sky-400"
              : student.freshness ===
                  "stale"
                ? "bg-amber-400"
                : "bg-slate-300",
        ].join(" ")}
      />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-slate-100 font-black text-brand">
            {student.name.slice(
              0,
              1,
            )}

            <span
              className={[
                "absolute bottom-0 left-0 size-3 rounded-full border-2 border-white",
                student.presence?.online
                  ? "bg-emerald-500"
                  : "bg-slate-400",
              ].join(" ")}
            />
          </span>

          <div className="min-w-0 flex-1">
            <strong className="block truncate">
              {student.name}
            </strong>

            <small className="text-slate-500">
              {[
                student.grade,
                student.major,
              ]
                .filter(Boolean)
                .join(" • ") ||
                "بدون مشخصات تحصیلی"}
            </small>
          </div>

          <Badge
            tone={stateTone(
              student.state,
            )}
          >
            {stateLabel(
              student.state,
            )}
          </Badge>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <small className="text-slate-500">
            فعالیت فعلی
          </small>

          <strong className="mt-1 block truncate text-sm">
            {student.activeSession
              ?.title ||
              student.currentView ||
              (student.presence
                ?.online
                ? "داخل برنامه"
                : "بدون فعالیت جاری")}
          </strong>

          <span className="mt-1 block text-xs text-slate-500">
            {student.activeSession
              ?.subject ||
              student.presence
                ?.deviceLabel ||
              (student.lastActivityAt
                ? `آخرین حضور ${formatDateTime(
                    student.lastActivityAt,
                  )}`
                : "بدون سابقه حضور")}
          </span>

          {student.activeSession
            ?.startedAt ? (
            <strong
              className="mt-2 block font-mono text-lg tabular-nums text-brand"
              dir="ltr"
            >
              {elapsed(
                now,
                student
                  .activeSession
                  .startedAt,
              )}
            </strong>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <MiniMetric
            label="کار باقی‌مانده"
            value={fa(
              student.remainingTasks,
            )}
          />

          <MiniMetric
            label="مرور سررسید"
            value={fa(
              student.dueReviews,
            )}
            warn={
              student.dueReviews >=
              3
            }
          />

          <MiniMetric
            label="آخرین آزمون"
            value={
              student.lastExamPercent ==
              null
                ? "—"
                : `${fa(
                    student.lastExamPercent,
                  )}٪`
            }
            warn={
              student.lastExamPercent !=
                null &&
              student.lastExamPercent <
                50
            }
          />
        </div>

        {attention ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            <AlertTriangle
              size={15}
            />
            این دانش‌آموز نیازمند
            پیگیری است.
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold ring-1 ring-slate-200 hover:bg-slate-50"
            to={`/admin/students?studentId=${encodeURIComponent(
              student.id,
            )}`}
          >
            <ExternalLink
              size={15}
            />
            پرونده
          </Link>

          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold text-white hover:bg-indigo-800"
            to={`/admin/chat?studentId=${encodeURIComponent(
              student.id,
            )}`}
          >
            <MessageCircle
              size={15}
            />
            پیام
          </Link>
        </div>
      </div>
    </Card>
  );
}
