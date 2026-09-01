import type { ComponentProps } from "react";
import { StudentPicker } from "../../../shared/ui/StudentPicker";

type StudentPickerProps =
  ComponentProps<typeof StudentPicker>;

export function DashboardStudentPicker({
  students,
  value,
  onChange,
}: Pick<
  StudentPickerProps,
  "students" | "value" | "onChange"
>) {
  return (
    <div className="flex justify-end">
      <div className="w-full md:w-72">
        <StudentPicker
          students={students}
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
