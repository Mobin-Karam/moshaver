import {
  Badge,
  Card,
  EmptyState,
} from "../../../shared/ui/ui";
import { fa } from "../../../shared/lib/utils";
import {
  needsAttention,
} from "../lib/live-helpers";
import type {
  LivePanel,
  LiveStudent,
} from "../model/live.types";
import { CompactSkeleton } from "./CompactSkeleton";
import { StudentRow } from "./StudentRow";

export function StudentQueue({
  panel,
  loading,
  students,
  selectedId,
  now,
  onSelect,
}: {
  panel: LivePanel;
  loading: boolean;
  students: LiveStudent[];
  selectedId?: string;
  now: number;
  onSelect: (
    id: string,
  ) => void;
}) {
  return (
    <Card
      className={[
        panel === "timeline"
          ? "hidden lg:flex"
          : "flex",
        "min-h-0 flex-col overflow-hidden p-0",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <strong>
          صف عملیات دانش‌آموزان
        </strong>

        <Badge
          tone={
            students.some(
              needsAttention,
            )
              ? "red"
              : "green"
          }
        >
          {fa(
            students.filter(
              needsAttention,
            ).length,
          )}{" "}
          نیازمند توجه
        </Badge>
      </div>

      {loading ? (
        <CompactSkeleton />
      ) : students.length ? (
        <div className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
          {students.map(
            (student) => (
              <StudentRow
                key={student.id}
                student={student}
                active={
                  selectedId ===
                  student.id
                }
                now={now}
                onClick={() =>
                  onSelect(
                    student.id,
                  )
                }
              />
            ),
          )}
        </div>
      ) : (
        <EmptyState title="دانش‌آموزی با این جستجو یا فیلتر پیدا نشد." />
      )}
    </Card>
  );
}
