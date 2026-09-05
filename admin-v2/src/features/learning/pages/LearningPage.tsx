import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "../../../shared/ui/locale";
import { useModal } from "../../../shared/ui/modal";
import { Button, EmptyState } from "../../../shared/ui/ui";
import { LearningForm } from "../components/LearningForm";
import { LearningHeader } from "../components/LearningHeader";
import { LearningList } from "../components/LearningList";
import { LearningSidebar } from "../components/LearningSidebar";
import { LearningSummaryMetrics } from "../components/LearningSummaryMetrics";
import { ReviewHistory } from "../components/ReviewHistory";
import { useLearningData } from "../hooks/useLearningData";
import { useLearningMutations } from "../hooks/useLearningMutations";
import { useLearningPageState } from "../hooks/useLearningPageState";
import type { LearningItem } from "../model/learning-model";
import { notifications, notify } from "../../../shared/ui/notifications";

export function LearningPage() {
  const state = useLearningPageState();

  const modal = useModal();

  const queryClient = useQueryClient();

  const { formatDate, formatDateTime } = useLocale();

  const data = useLearningData({
    studentId: state.studentId,
    search: state.deferredSearch,
    filter: state.filter,
  });

  const mutations = useLearningMutations(state.studentId);

  function openEditor(item?: LearningItem) {
    modal.open({
      title: item ? "ویرایش مورد یادگیری" : "افزودن مرور جدید",

      description:
        "این مورد در چرخه مرور دانش‌آموز قرار می‌گیرد و تغییرات فوراً برای او همگام می‌شود.",

      size: "lg",

      content: (
        <LearningForm
          studentId={state.studentId}
          item={item}
          onSaved={() => {
            modal.close();

            void queryClient.invalidateQueries({
              queryKey: ["student-learning", state.studentId],
            });
          }}
        />
      ),
    });
  }

  function openHistory(item: LearningItem) {
    modal.open({
      title: `تاریخچه مرور: ${item.title}`,
      size: "md",
      content: (
        <ReviewHistory
          studentId={state.studentId}
          itemId={item.id}
          formatDateTime={formatDateTime}
        />
      ),
    });
  }

  function confirmDelete(item: LearningItem) {
    void modal
      .confirm({
        title: "حذف مورد یادگیری؟",

        description: `«${item.title}» بعد از پایان زمان بازگشت حذف خواهد شد.`,

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

        const undoSeconds = 10;

        notifications.undoCountdown(
          `مورد «${item.title}» آماده حذف است`,

          undoSeconds,

          () => {
            cancelled = true;

            notify("حذف مورد یادگیری لغو شد.", "info");
          },

          {
            description: "تا پایان شمارش معکوس می‌توانید عملیات را لغو کنید.",
          },
        );

        window.setTimeout(() => {
          if (cancelled) return;

          const loadingId = notifications.loading("در حال حذف مورد یادگیری...");

          mutations.remove.mutate(
            item.id,

            {
              onSuccess() {
                notifications.dismiss(loadingId);

                notifications.success("مورد یادگیری حذف شد.", {
                  description: `«${item.title}» با موفقیت حذف شد.`,
                });

                void queryClient.invalidateQueries({
                  queryKey: ["student-learning", state.studentId],
                });
              },

              onError(error) {
                notifications.dismiss(loadingId);

                notifications.error(
                  "حذف مورد یادگیری انجام نشد.",

                  {
                    description:
                      error instanceof Error
                        ? error.message
                        : "خطای ناشناخته رخ داد.",
                  },
                );
              },
            },
          );
        }, undoSeconds * 1000);
      });
  }

  return (
    <div className="grid gap-4">
      <LearningHeader
        students={state.students.students}
        studentId={state.studentId}
        onStudentChange={(id) => state.updateLocation(id)}
        onCreate={() => openEditor()}
      />

      {!state.studentId ? (
        <EmptyState title="ابتدا یک دانش‌آموز انتخاب کنید." />
      ) : data.learning.isError ? (
        <EmptyState
          title="دریافت سیستم یادگیری ناموفق بود."
          action={
            <Button variant="soft" onClick={() => void data.learning.refetch()}>
              تلاش دوباره
            </Button>
          }
        />
      ) : (
        <>
          <LearningSummaryMetrics summary={data.summary} />

          <section className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <LearningList
              loading={data.learning.isLoading}
              items={data.items}
              search={state.search}
              filter={state.filter}
              formatDate={formatDate}
              onSearchChange={state.changeSearch}
              onFilterChange={state.changeFilter}
              onEdit={openEditor}
              onHistory={openHistory}
              onDelete={confirmDelete}
            />

            <LearningSidebar summary={data.summary} />
          </section>
        </>
      )}
    </div>
  );
}
