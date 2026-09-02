import {
  normalizePersianText,
  todayIso,
} from "../../../shared/lib/utils";
import {
  isLearningDue,
  type LearningItem,
} from "../model/learning-model";
import type { LearningFilter } from "../model/learning.types";

const validFilters: LearningFilter[] = [
  "all",
  "due",
  "pending",
  "done",
  "archived",
];

export function parseLearningFilter(
  value: string | null,
): LearningFilter {
  return value &&
    validFilters.includes(
      value as LearningFilter,
    )
    ? (value as LearningFilter)
    : "all";
}

export function filterLearningItems(
  items: LearningItem[],
  search: string,
  filter: LearningFilter,
) {
  const normalizedSearch =
    normalizePersianText(search);

  return items.filter((item) => {
    const text =
      normalizePersianText(
        [
          item.title,
          item.subject,
          item.book,
          item.chapter,
          item.lesson,
          item.topic,
          item.note,
        ].join(" "),
      );

    const matchesSearch =
      text.includes(
        normalizedSearch,
      );

    const matchesFilter =
      filter === "all" ||
      filter === "due"
        ? filter === "all" ||
          isLearningDue(
            item,
            todayIso(),
          )
        : item.status === filter;

    return (
      matchesSearch &&
      matchesFilter
    );
  });
}
