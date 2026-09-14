import { History, MoreHorizontal, Plus } from "lucide-react";
import { StudentPicker } from "../../../shared/ui/StudentPicker";
import { Button } from "../../../shared/ui/ui";

export function ExamsHeader({
  students,
  studentId,
  onStudentChange,
  onCreate,
  onHistory,
  onMore,
}: {
  students: Parameters<typeof StudentPicker>[0]["students"];
  studentId: string;
  onStudentChange: (id: string) => void;
  onCreate?: () => void;
  onHistory: () => void;
  onMore?: () => void;
}) {
  return (
    <header className="flex justify-end">
      <div className="grid w-full grid-cols-2 gap-2 sm:flex md:w-auto">
        <div className="col-span-2 min-w-0 flex-1 sm:min-w-60">
          <StudentPicker students={students} value={studentId} onChange={onStudentChange} />
          <p className="mt-1 text-[11px] text-slate-500">
            اختیاری؛ فقط برای تخصیص هنگام ساخت و مشاهده سابقه
          </p>
        </div>

        {onCreate ? (
          <Button onClick={onCreate}>
            <Plus size={16} />
            آزمون
          </Button>
        ) : null}

        {studentId ? (
          <Button variant="soft" disabled={!studentId} onClick={onHistory}>
            <History size={16} />
            سابقه
          </Button>
        ) : null}

        {onMore ? (
          <Button variant="soft" onClick={onMore}>
            <MoreHorizontal size={16} />
            بیشتر
          </Button>
        ) : null}
      </div>
    </header>
  );
}
