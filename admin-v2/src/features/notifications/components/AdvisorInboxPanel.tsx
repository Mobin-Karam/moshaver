import type {
  ComponentProps,
} from "react";
import { StudentPicker } from "../../../shared/ui/StudentPicker";
import {
  Badge,
  Button,
  Card,
  EmptyState,
} from "../../../shared/ui/ui";
import { summarizeAdvisorInboxValue } from "../lib/notification-utils";
import type { AdvisorInboxRow } from "../model/notification.types";
import { NotificationSkeletons } from "./NotificationSkeletons";

type StudentPickerProps =
  ComponentProps<
    typeof StudentPicker
  >;

export function AdvisorInboxPanel({
  mobilePanel,
  rows,
  students,
  studentId,
  loading,
  error,
  onStudentChange,
  onRetry,
}: {
  mobilePanel:
    | "notifications"
    | "inbox";
  rows: AdvisorInboxRow[];
  students:
    StudentPickerProps["students"];
  studentId: string;
  loading: boolean;
  error: boolean;
  onStudentChange: (
    id: string,
  ) => void;
  onRetry: () => void;
}) {
  return (
    <Card
      className={[
        mobilePanel ===
        "notifications"
          ? "hidden lg:flex"
          : "flex",
        "min-h-0 flex-col overflow-hidden p-3",
      ].join(" ")}
    >
      <header className="mb-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold">
            صندوق پیگیری
          </h3>

          <Badge
            tone={
              rows.length
                ? "red"
                : "green"
            }
          >
            {rows.length.toLocaleString(
              "fa-IR",
            )}
          </Badge>
        </div>

        <div className="mt-3">
          <StudentPicker
            students={students}
            value={studentId}
            onChange={
              onStudentChange
            }
          />
        </div>
      </header>

      {loading ? (
        <NotificationSkeletons />
      ) : error ? (
        <EmptyState
          title="صندوق پیگیری دریافت نشد."
          action={
            <Button
              variant="soft"
              onClick={onRetry}
            >
              تلاش دوباره
            </Button>
          }
        />
      ) : rows.length ? (
        <div className="grid gap-2 overflow-y-auto">
          {rows.map(
            (row, index) => (
              <div
                key={index}
                className="rounded-lg border p-3"
              >
                <span className="flex items-center justify-between gap-2">
                  <strong className="text-sm">
                    {row.type}
                  </strong>

                  <Badge
                    tone={row.tone}
                  >
                    {(index +
                      1).toLocaleString(
                      "fa-IR",
                    )}
                  </Badge>
                </span>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {summarizeAdvisorInboxValue(
                    row.value,
                  )}
                </p>
              </div>
            ),
          )}
        </div>
      ) : (
        <EmptyState title="مورد فعالی وجود ندارد." />
      )}
    </Card>
  );
}
