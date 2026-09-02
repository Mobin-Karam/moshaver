import { Plus } from "lucide-react";
import type { ComponentProps } from "react";
import { StudentPicker } from "../../../shared/ui/StudentPicker";
import {
  Button,
  Card,
} from "../../../shared/ui/ui";

type StudentPickerProps =
  ComponentProps<
    typeof StudentPicker
  >;

export function LearningHeader({
  students,
  studentId,
  onStudentChange,
  onCreate,
}: {
  students:
    StudentPickerProps["students"];
  studentId: string;
  onStudentChange: (
    id: string,
  ) => void;
  onCreate: () => void;
}) {
  return (
    <Card className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-56 flex-1 md:max-w-sm">
        <StudentPicker
          students={students}
          value={studentId}
          onChange={
            onStudentChange
          }
        />
      </div>

      <Button
        onClick={onCreate}
        disabled={!studentId}
      >
        <Plus size={17} />
        مرور جدید
      </Button>
    </Card>
  );
}
