import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Student } from "../../../shared/types/domain";
import { notify } from "../../../shared/ui/notifications";
import { Button, EmptyState, Input, LoadingState } from "../../../shared/ui/ui";
import { assignExam, getExamAssignments, unassignExam } from "../api/exams.api";

export function ExamAssignmentManager({
  examId,
  students,
}: {
  examId: string;
  students: Student[];
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const assignments = useQuery({
    queryKey: ["exam-assignments", examId],
    queryFn: () => getExamAssignments(examId),
  });
  const assignedIds = useMemo(
    () => new Set(assignments.data?.map((item) => item.student.id) || []),
    [assignments.data],
  );
  const candidates = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("fa");
    return students.filter(
      (student) =>
        !assignedIds.has(student.id) &&
        (!needle ||
          `${student.name} ${student.grade || ""} ${student.major || ""}`
            .toLocaleLowerCase("fa")
            .includes(needle)),
    );
  }, [students, assignedIds, search]);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["exam-assignments", examId] });
    void queryClient.invalidateQueries({ queryKey: ["exams"] });
  };
  const add = useMutation({
    mutationFn: () => assignExam(examId, selected),
    onSuccess: () => {
      notify("تخصیص آزمون ثبت شد.");
      setSelected([]);
      refresh();
    },
    onError: (error) =>
      notify(error instanceof Error ? error.message : "ثبت تخصیص ناموفق بود.", "error"),
  });
  const remove = useMutation({
    mutationFn: (studentId: string) => unassignExam(examId, studentId),
    onSuccess: () => {
      notify("تخصیص حذف شد.");
      refresh();
    },
    onError: (error) =>
      notify(error instanceof Error ? error.message : "حذف تخصیص ناموفق بود.", "error"),
  });

  if (assignments.isLoading) return <LoadingState label="در حال دریافت تخصیص ها…" />;
  if (assignments.isError)
    return (
      <EmptyState
        title="دریافت تخصیص ها ناموفق بود."
        action={
          <Button variant="soft" onClick={() => void assignments.refetch()}>
            تلاش دوباره
          </Button>
        }
      />
    );

  return (
    <div className="grid gap-5">
      <section>
        <h3 className="font-black">
          دانش آموزان تخصیص یافته ({(assignments.data || []).length.toLocaleString("fa-IR")})
        </h3>
        <div className="mt-3 grid gap-2">
          {(assignments.data || []).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <span>
                <strong>{item.student.name}</strong>
                <small className="mr-2 text-slate-500">
                  {[item.student.grade, item.student.major].filter(Boolean).join(" • ")}
                </small>
              </span>
              <Button
                variant="danger"
                className="h-8 px-2 text-xs"
                loading={remove.isPending && remove.variables === item.student.id}
                onClick={() => remove.mutate(item.student.id)}
              >
                حذف
              </Button>
            </div>
          ))}
          {!assignments.data?.length ? (
            <EmptyState title="هنوز دانش آموزی تخصیص نیافته است." />
          ) : null}
        </div>
      </section>
      <section className="border-t pt-4">
        <h3 className="font-black">افزودن گروهی</h3>
        <Input
          className="mt-3"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جستجوی نام، پایه یا رشته"
        />
        <div className="mt-3 max-h-64 space-y-2 overflow-auto">
          {candidates.map((student) => (
            <label
              key={student.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(student.id)}
                onChange={(event) =>
                  setSelected((items) =>
                    event.target.checked
                      ? [...items, student.id]
                      : items.filter((id) => id !== student.id),
                  )
                }
              />
              <span>{student.name}</span>
            </label>
          ))}
        </div>
        <Button
          className="mt-3"
          disabled={!selected.length}
          loading={add.isPending}
          onClick={() => add.mutate()}
        >
          تخصیص {selected.length.toLocaleString("fa-IR")} دانش آموز
        </Button>
      </section>
    </div>
  );
}
