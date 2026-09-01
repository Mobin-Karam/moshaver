import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookPlus, Save } from "lucide-react";
import { useState } from "react";
import { StudentPicker } from "../../shared/ui/StudentPicker";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "../../shared/ui/ui";
import { useStudents } from "../../shared/hooks/useStudents";
import { fa } from "../../shared/lib/utils";
import { api } from "../../shared/api/api";

type Subject = {
  id: string;
  name: string;
  subject_key?: string;
  display_order?: number;
  status?: string;
  progress?: number;
  mastery?: string;
  note?: string;
};

export function SubjectsPage() {
  const students = useStudents();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ name: "", subjectKey: "" });
  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api.get<Subject[]>("/admin/subjects"),
  });
  const assigned = useQuery({
    queryKey: ["student-subjects", students.studentId],
    enabled: !!students.studentId,
    queryFn: () =>
      api.get<Subject[]>(`/admin/student-subjects/${students.studentId}`),
  });
  const create = useMutation({
    mutationFn: () => api.post("/admin/subjects", draft),
    onSuccess: () => {
      setDraft({ name: "", subjectKey: "" });
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["student-subjects"] });
    },
  });
  const update = useMutation({
    mutationFn: (subject: Subject) =>
      api.patch(`/admin/student-subjects/${students.studentId}/${subject.id}`, {
        status: subject.status || "yellow",
        progress: Number(subject.progress || 0),
        mastery: subject.mastery || "",
        note: subject.note || "",
      }),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["student-subjects", students.studentId],
      }),
  });
  const rows = assigned.data ?? subjects.data ?? [];
  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <div className="w-full md:w-72">
          <StudentPicker
            students={students.students}
            value={students.studentId}
            onChange={students.setStudentId}
          />
        </div>
      </div>
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Field label="نام درس">
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field label="کلید یکتا">
            <Input
              dir="ltr"
              value={draft.subjectKey}
              onChange={(e) =>
                setDraft({ ...draft, subjectKey: e.target.value })
              }
              placeholder="mathematics"
            />
          </Field>
          <Button
            loading={create.isPending}
            className="md:mt-6"
            disabled={!draft.name || !draft.subjectKey || create.isPending}
            onClick={() => create.mutate()}
          >
            <BookPlus size={16} />
            درس جدید
          </Button>
        </div>
      </Card>
      <Card>
        {rows.length ? (
          <div className="grid gap-3">
            {rows.map((row) => (
              <SubjectEditor
                key={row.id}
                initial={row}
                onSave={(value) => update.mutate(value)}
                saving={update.isPending}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="درسی ثبت نشده است." />
        )}
      </Card>
    </div>
  );
}

function SubjectEditor({
  initial,
  onSave,
  saving,
}: {
  initial: Subject;
  onSave: (subject: Subject) => void;
  saving: boolean;
}) {
  const [subject, setSubject] = useState(initial);
  return (
    <article className="grid gap-3 rounded-md border p-3 lg:grid-cols-[1.1fr_140px_120px_1fr_1.4fr_auto] lg:items-end">
      <div>
        <strong>{subject.name}</strong>
        <p className="text-xs text-slate-500" dir="ltr">
          {subject.subject_key}
        </p>
      </div>
      <Field label="وضعیت">
        <Select
          value={subject.status || "yellow"}
          onChange={(e) => setSubject({ ...subject, status: e.target.value })}
        >
          <option value="green">سبز</option>
          <option value="yellow">زرد</option>
          <option value="red">قرمز</option>
        </Select>
      </Field>
      <Field label={`پیشرفت ${fa(subject.progress || 0)}٪`}>
        <Input
          type="number"
          min={0}
          max={100}
          value={subject.progress || 0}
          onChange={(e) =>
            setSubject({ ...subject, progress: Number(e.target.value) })
          }
        />
      </Field>
      <Field label="تسلط">
        <Input
          value={subject.mastery || ""}
          onChange={(e) => setSubject({ ...subject, mastery: e.target.value })}
        />
      </Field>
      <Field label="یادداشت">
        <Textarea
          rows={1}
          value={subject.note || ""}
          onChange={(e) => setSubject({ ...subject, note: e.target.value })}
        />
      </Field>
      <Button loading={saving} variant="soft" onClick={() => onSave(subject)}>
        <Save size={15} />
        ذخیره
      </Button>
      <Badge
        tone={
          subject.status === "green"
            ? "green"
            : subject.status === "red"
              ? "red"
              : "amber"
        }
      >
        {subject.status || "yellow"}
      </Badge>
    </article>
  );
}
