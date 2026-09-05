import { useModal } from "../../../shared/ui/modal";
import { notifications, notify } from "../../../shared/ui/notifications";
import { DataTransferWorkspace } from "../../../shared/ui/data-transfer";
import type { Exam } from "../../../shared/types/domain";
import { ExamAttempts } from "../components/ExamAttempts";
import { ExamFilters } from "../components/ExamFilters";
import { ExamForm } from "../components/ExamForm";
import { ExamList } from "../components/ExamList";
import { ExamsHeader } from "../components/ExamsHeader";
import { RetryRequestsPanel } from "../components/RetryRequestsPanel";
import { RetryReviewForm } from "../components/RetryReviewForm";
import { SyllabusForm } from "../components/SyllabusForm";
import { runExamBulkAction } from "../hooks/useExamBulkActions";
import { useExamFilters } from "../hooks/useExamFilters";
import { useExamMutations } from "../hooks/useExamMutations";
import { useExamsData } from "../hooks/useExamsData";
import { makeExamDraft } from "../model/exam-model";
import type { BulkExamAction, RetryRequest } from "../model/exam.types";

export function ExamsPage() {
  const modal = useModal();

  const filters = useExamFilters();

  const data = useExamsData({
    studentId: filters.students.studentId,
    search: filters.deferredSearch,
    status: filters.status,
    visibility: filters.visibility,
  });

  const mutations = useExamMutations(filters.students.studentId);

  function openEditor(exam?: Exam) {
    modal.open({
      title: exam ? "ویرایش آزمون" : "آزمون جدید",
      size: "lg",
      content: (
        <ExamForm
          initial={makeExamDraft(exam)}
          onCancel={modal.close}
          onSubmit={async (body) => {
            await mutations.save.mutateAsync({
              id: exam?.id,
              body,
            });

            modal.close();
          }}
        />
      ),
    });
  }

  function openRetryReview(
    request: RetryRequest,
    status: "approved" | "rejected",
  ) {
    modal.open({
      title: status === "approved" ? "تأیید تلاش مجدد" : "رد درخواست تلاش مجدد",
      description: request.examTitle || "آزمون",
      content: (
        <RetryReviewForm
          status={status}
          initialNote={request.advisor_note || ""}
          onCancel={modal.close}
          onSubmit={async (advisorNote) => {
            await mutations.review.mutateAsync({
              id: request.id,
              status,
              advisorNote,
            });

            modal.close();
          }}
        />
      ),
    });
  }

  function confirmRemove(exam: Exam) {
    void modal
      .confirm({
        title: "حذف آزمون؟",

        description: `«${exam.title}» بعد از پایان زمان بازگشت حذف خواهد شد.`,

        tone: "danger",

        confirmLabel: "شروع حذف",

        softConfirm: true,

        softConfirmDuration: 2000,

        softConfirmProgressColor: "#fecaca",

        softConfirmBackgroundColor: "rgba(255,255,255,0.25)",
      })
      .then((ok) => {
        if (!ok) return;

        let cancelled = false;

        const deleteDelay = 10;

        const toastId = notifications.undoCountdown(
          `آزمون «${exam.title}» آماده حذف است`,

          deleteDelay,

          () => {
            cancelled = true;

            notify("حذف آزمون لغو شد.", "info");
          },

          {
            description: "در صورت عدم لغو، آزمون به صورت خودکار حذف می‌شود.",
          },
        );

        window.setTimeout(() => {
          if (cancelled) return;

          const loadingId = notifications.loading("در حال حذف آزمون...");

          mutations.remove.mutate(
            exam.id,

            {
              onSuccess() {
                notifications.dismiss(loadingId);

                notifications.success("آزمون حذف شد.", {
                  description: `آزمون «${exam.title}» حذف شد.`,
                });

                void data.refreshExams();
              },

              onError(error) {
                notifications.dismiss(loadingId);

                notifications.error("حذف آزمون انجام نشد.", {
                  description:
                    error instanceof Error
                      ? error.message
                      : "خطای ناشناخته رخ داد.",
                });
              },
            },
          );
        }, deleteDelay * 1000);
      });
  }

  function runBulk(action: BulkExamAction) {
    void runExamBulkAction({
      action,
      selected: filters.selected,
      exams: data.exams.data ?? [],
      modal,
      setSelected: filters.setSelected,
      refresh: () => {
        void data.refreshExams();
      },
    });
  }

  function handleToggle(exam: Exam) {
    if (!exam.published && !exam.delivery?.questionCount) {
      notify(
        "برای انتشار، ابتدا حداقل یک سؤال به آزمون اضافه کنید.",
        "warning",
      );

      return;
    }

    mutations.togglePublish.mutate({
      id: exam.id,
      published: !exam.published,
    });
  }

  function openSyllabus(exam: Exam) {
    modal.open({
      title: "افزودن بودجه‌بندی",
      description: exam.title,
      content: (
        <SyllabusForm
          onCancel={modal.close}
          onSubmit={async (syllabus) => {
            await mutations.addSyllabus.mutateAsync({
              examId: exam.id,
              data: syllabus,
            });

            modal.close();
          }}
        />
      ),
    });
  }

  function deleteSyllabus(id: string) {
    void modal
      .confirm({
        title: "حذف بودجه‌بندی؟",
        tone: "danger",
      })
      .then((ok) => ok && mutations.deleteSyllabus.mutate(id));
  }

  function checkExam(examId: string, checked: boolean) {
    filters.setSelected((items) =>
      checked
        ? [...new Set([...items, examId])]
        : items.filter((id) => id !== examId),
    );
  }

  return (
    <div className="grid gap-5">
      <ExamsHeader
        students={filters.students.students}
        studentId={filters.students.studentId}
        onStudentChange={filters.students.selectStudent}
        onCreate={() => openEditor()}
        onHistory={() =>
          modal.open({
            title: "سابقه و پاسخ‌های آزمون",
            size: "xl",
            content: <ExamAttempts studentId={filters.students.studentId} />,
          })
        }
        onMore={() =>
          modal.open({
            title: "ورود و خروج داده آزمون‌ها",
            size: "xl",
            content: (
              <DataTransferWorkspace
                studentId={filters.students.studentId}
                scope="exams"
                title="انتقال کامل آزمون‌ها"
                description="آزمون‌ها را همراه سؤال، پاسخ، توضیح، بودجه‌بندی، زمان‌بندی و محدودیت تلاش بررسی و منتقل کنید."
                showExamReplacement
                onImported={() => void data.refreshExams()}
              />
            ),
          })
        }
      />

      <RetryRequestsPanel
        requests={data.pendingRetries}
        onReview={openRetryReview}
      />

      <ExamFilters
        exams={data.exams.data ?? []}
        pendingRetryCount={data.pendingRetries.length}
        search={filters.search}
        status={filters.status}
        visibility={filters.visibility}
        selectedCount={filters.selected.length}
        onSearchChange={filters.setSearch}
        onStatusChange={filters.setStatus}
        onVisibilityChange={filters.setVisibility}
        onClear={filters.clearFilters}
        onBulk={runBulk}
      />

      <ExamList
        exams={data.exams.data ?? []}
        filtered={data.filtered}
        selected={filters.selected}
        studentId={filters.students.studentId}
        loading={data.exams.isLoading}
        error={data.exams.isError}
        toggleBusyId={
          mutations.togglePublish.isPending
            ? mutations.togglePublish.variables?.id
            : undefined
        }
        onRetry={() => void data.exams.refetch()}
        onSelectAll={(checked) =>
          filters.setSelected(
            checked ? data.filtered.map((exam) => exam.id) : [],
          )
        }
        onCheck={checkExam}
        onEdit={openEditor}
        onDelete={confirmRemove}
        onToggle={handleToggle}
        onAddSyllabus={openSyllabus}
        onDeleteSyllabus={deleteSyllabus}
      />
    </div>
  );
}
