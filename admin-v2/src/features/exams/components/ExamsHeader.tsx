import {
  History,
  MoreHorizontal,
  Plus,
} from "lucide-react";
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
  students: Parameters<
    typeof StudentPicker
  >[0]["students"];
  studentId: string;
  onStudentChange: (
    id: string,
  ) => void;
  onCreate: () => void;
  onHistory: () => void;
  onMore: () => void;
}) {
  return (
    <header className="flex justify-end">
      <div className="grid w-full grid-cols-2 gap-2 sm:flex md:w-auto">
        <div className="col-span-2 min-w-0 flex-1 sm:min-w-60">
          <StudentPicker
            students={students}
            value={studentId}
            onChange={
              onStudentChange
            }
          />
        </div>

        <Button
          disabled={!studentId}
          onClick={onCreate}
        >
          <Plus size={16} />
          آزمون
        </Button>

        <Button
          variant="soft"
          disabled={!studentId}
          onClick={onHistory}
        >
          <History size={16} />
          سابقه
        </Button>

        <Button
          variant="soft"
          disabled={!studentId}
          onClick={onMore}
        >
          <MoreHorizontal
            size={16}
          />
          بیشتر
        </Button>
      </div>
    </header>
  );
}
