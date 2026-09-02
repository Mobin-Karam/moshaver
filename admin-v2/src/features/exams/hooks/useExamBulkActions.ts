import type { Exam } from "../../../shared/types/domain";
import { notify } from "../../../shared/ui/notifications";
import type { ReturnTypeOfUseModal } from "./useExamBulkActions.types";
import {
  deleteExam,
  setExamPublished,
} from "../api/exams.api";
import type { BulkExamAction } from "../model/exam.types";

export async function runExamBulkAction({
  action,
  selected,
  exams,
  modal,
  setSelected,
  refresh,
}: {
  action: BulkExamAction;
  selected: string[];
  exams: Exam[];
  modal: ReturnTypeOfUseModal;
  setSelected: (
    ids: string[],
  ) => void;
  refresh: () => void;
}) {
  const blocked =
    action === "publish"
      ? selected.filter(
          (id) =>
            !exams.find(
              (exam) =>
                exam.id === id,
            )?.delivery
              ?.questionCount,
        )
      : [];

  const ids =
    selected.filter(
      (id) =>
        !blocked.includes(id),
    );

  if (blocked.length) {
    notify(
      `${blocked.length} آزمون بدون سؤال منتشر نشد.`,
      "warning",
    );
  }

  if (!ids.length) {
    return;
  }

  const ok =
    await modal.confirm({
      title:
        action === "delete"
          ? `حذف ${ids.length} آزمون؟`
          : `تغییر وضعیت ${ids.length} آزمون؟`,
      tone:
        action === "delete"
          ? "danger"
          : "default",
      confirmLabel:
        action === "delete"
          ? "حذف همه"
          : "اعمال",
    });

  if (!ok) {
    return;
  }

  const results =
    await Promise.allSettled(
      ids.map((id) =>
        action === "delete"
          ? deleteExam(id)
          : setExamPublished(
              id,
              action === "publish",
            ),
      ),
    );

  const failed =
    ids.filter(
      (_, index) =>
        results[index]?.status ===
        "rejected",
    );

  setSelected(failed);

  failed.length
    ? notify(
        `${failed.length} عملیات ناموفق ماند؛ موارد مربوطه همچنان انتخاب هستند.`,
        "warning",
      )
    : notify(
        "عملیات گروهی انجام شد.",
      );

  refresh();
}
