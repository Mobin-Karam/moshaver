import type { ComponentProps } from "react";
import { Inbox, RefreshCw } from "lucide-react";
import { StudentPicker } from "../../../shared/ui/StudentPicker";
import { Badge, Button, Card, EmptyState } from "../../../shared/ui/ui";
import type {
  AdvisorInboxRow,
  RecoveryActionInput,
  TaskIssueActionInput,
} from "../model/notification.types";
import { NotificationSkeletons } from "./NotificationSkeletons";
import { AdvisorInboxItem } from "./AdvisorInboxItem";

type StudentPickerProps = ComponentProps<typeof StudentPicker>;

export function AdvisorInboxPanel({
  mobilePanel,
  rows,
  students,
  studentId,
  loading,
  error,
  recoveryPendingId,
  issuePendingId,
  onStudentChange,
  onRetry,
  onRecovery,
  onIssue,
}: {
  mobilePanel: "notifications" | "inbox";
  rows: AdvisorInboxRow[];
  students: StudentPickerProps["students"];
  studentId: string;
  loading: boolean;
  error: boolean;
  recoveryPendingId: string;
  issuePendingId: string;
  onStudentChange: (id: string) => void;
  onRetry: () => void;
  onRecovery: (input: RecoveryActionInput) => Promise<boolean>;
  onIssue: (input: TaskIssueActionInput) => Promise<boolean>;
}) {
  const actionableCount = rows.filter((row) => row.actionable).length;

  return (
    <Card
      className={[
        mobilePanel === "notifications" ? "hidden lg:flex" : "flex",
        "min-h-0 flex-col overflow-hidden p-0 dark:border-slate-800 dark:bg-slate-900",
      ].join(" ")}
    >
      <header className="shrink-0 border-b border-slate-100 p-3 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Inbox size={17} className="text-brand" />
              <h3 className="font-bold text-slate-900 dark:text-white">صندوق پیگیری</h3>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              مشکلات و ریکاوری‌ها از همین صفحه قابل پاسخ و بستن هستند.
            </p>
          </div>
          <div className="flex gap-1.5">
            {actionableCount ? <Badge tone="red">{actionableCount.toLocaleString("fa-IR")} عملیاتی</Badge> : null}
            <Badge tone={rows.length ? "amber" : "green"}>{rows.length.toLocaleString("fa-IR")}</Badge>
          </div>
        </div>

        <div className="mt-3">
          <StudentPicker students={students} value={studentId} onChange={onStudentChange} />
        </div>
      </header>

      {loading ? (
        <div className="p-3"><NotificationSkeletons /></div>
      ) : error ? (
        <div className="p-3">
          <EmptyState
            title="صندوق پیگیری دریافت نشد."
            action={<Button variant="soft" onClick={onRetry}><RefreshCw size={15} /> تلاش دوباره</Button>}
          />
        </div>
      ) : rows.length ? (
        <div className="grid min-h-0 gap-2 overflow-y-auto overscroll-contain p-3">
          {rows.map((row) => (
            <AdvisorInboxItem
              key={row.key}
              row={row}
              recoveryPendingId={recoveryPendingId}
              issuePendingId={issuePendingId}
              onRecovery={onRecovery}
              onIssue={onIssue}
            />
          ))}
        </div>
      ) : (
        <div className="p-3"><EmptyState title="مورد فعالی برای این دانش‌آموز وجود ندارد." /></div>
      )}
    </Card>
  );
}
