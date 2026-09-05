import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Exam } from "../../../shared/types/domain";
import { notify } from "../../../shared/ui/notifications";
import {
  addExamSyllabus,
  createExam,
  deleteExam,
  deleteExamSyllabus,
  reviewRetryRequest,
  setExamPublished,
  updateExam,
} from "../api/exams.api";
import type { ExamDraft } from "../model/exam-model";
import type { RetryRequest, SyllabusDraft } from "../model/exam.types";

export function useExamMutations(studentId: string) {
  const queryClient = useQueryClient();

  const refreshExams = () =>
    queryClient.invalidateQueries({
      queryKey: ["exams"],
    });

  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: ExamDraft }) =>
      id ? updateExam(id, body) : createExam(studentId, body),

    onSuccess: (_, variables) => {
      notify(variables.id ? "آزمون ویرایش شد." : "آزمون ساخته شد.");

      void refreshExams();
    },

    onError: (error) =>
      notify(
        error instanceof Error ? error.message : "ذخیره آزمون ناموفق بود.",
        "error",
      ),
  });

  const remove = useMutation({
    mutationFn: deleteExam,

    onSuccess: () => {
      notify("آزمون حذف شد.");
      void refreshExams();
    },

    onError: (error) =>
      notify(
        error instanceof Error ? error.message : "حذف آزمون ناموفق بود.",
        "error",
      ),
  });

  const review = useMutation({
    mutationFn: ({
      id,
      status,
      advisorNote,
    }: {
      id: string;
      status: "approved" | "rejected";
      advisorNote: string;
    }) => reviewRetryRequest(id, status, advisorNote),

    onSuccess: (_, variables) => {
      notify(
        variables.status === "approved"
          ? "تلاش مجدد فعال شد."
          : "درخواست رد شد.",
      );

      void queryClient.invalidateQueries({
        queryKey: ["exam-retry"],
      });
    },

    onError: (error) =>
      notify(
        error instanceof Error ? error.message : "ثبت تصمیم ناموفق بود.",
        "error",
      ),
  });

  const addSyllabus = useMutation({
    mutationFn: ({ examId, data }: { examId: string; data: SyllabusDraft }) =>
      addExamSyllabus(examId, data),

    onSuccess: () => {
      notify("بودجه‌بندی افزوده شد.");

      void refreshExams();
    },

    onError: (error) =>
      notify(
        error instanceof Error ? error.message : "افزودن بودجه ناموفق بود.",
        "error",
      ),
  });

  const deleteSyllabus = useMutation({
    mutationFn: deleteExamSyllabus,

    onSuccess: () => {
      notify("بودجه‌بندی حذف شد.");

      void refreshExams();
    },

    onError: (error) =>
      notify(
        error instanceof Error ? error.message : "حذف بودجه ناموفق بود.",
        "error",
      ),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      setExamPublished(id, published),

    onMutate: async ({ id, published }) => {
      await queryClient.cancelQueries({
        queryKey: ["exams", studentId],
      });

      const previous = queryClient.getQueryData<Exam[]>(["exams", studentId]);

      queryClient.setQueryData<Exam[]>(["exams", studentId], (items) =>
        items?.map((item) =>
          item.id === id
            ? {
                ...item,
                published,
              }
            : item,
        ),
      );

      return {
        previous,
      };
    },

    onError: (error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["exams", studentId], context.previous);
      }

      notify(
        error instanceof Error ? error.message : "تغییر انتشار ناموفق بود.",
        "error",
      );
    },

    onSuccess: (_, variables) =>
      notify(
        variables.published ? "آزمون منتشر شد." : "آزمون به پیش‌نویس برگشت.",
      ),

    onSettled: () => {
      void refreshExams();
    },
  });

  return {
    save,
    remove,
    review,
    addSyllabus,
    deleteSyllabus,
    togglePublish,
    refreshExams,
  };
}
