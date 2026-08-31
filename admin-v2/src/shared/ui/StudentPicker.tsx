import { Select } from "./ui";
import type { Student } from "../types/domain";

export function StudentPicker({
  students,
  value,
  onChange,
}: {
  students: Student[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      {students.map((student) => (
        <option key={student.id} value={student.id}>
          {student.name}
        </option>
      ))}
    </Select>
  );
}
