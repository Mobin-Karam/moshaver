import {
  Card,
  EmptyState,
} from "../../../shared/ui/ui";
import type { LearningItem } from "../model/learning-model";
import { LearningFilters } from "./LearningFilters";
import { LearningRow } from "./LearningRow";
import { LearningSkeleton } from "./LearningSkeleton";
import type { LearningFilter } from "../model/learning.types";

export function LearningList({
  loading,
  items,
  search,
  filter,
  formatDate,
  onSearchChange,
  onFilterChange,
  onEdit,
  onHistory,
  onDelete,
}: {
  loading: boolean;
  items: LearningItem[];
  search: string;
  filter: LearningFilter;
  formatDate: (
    value?: string | Date,
  ) => string;
  onSearchChange: (
    value: string,
  ) => void;
  onFilterChange: (
    value: LearningFilter,
  ) => void;
  onEdit: (
    item: LearningItem,
  ) => void;
  onHistory: (
    item: LearningItem,
  ) => void;
  onDelete: (
    item: LearningItem,
  ) => void;
}) {
  return (
    <Card className="min-w-0 p-3 sm:p-4">
      <LearningFilters
        search={search}
        filter={filter}
        resultCount={
          items.length
        }
        onSearchChange={
          onSearchChange
        }
        onFilterChange={
          onFilterChange
        }
      />

      {loading ? (
        <LearningSkeleton />
      ) : items.length ? (
        <div className="grid max-h-[calc(100dvh-22rem)] gap-2 overflow-y-auto pl-1">
          {items.map(
            (item) => (
              <LearningRow
                key={item.id}
                item={item}
                formatDate={
                  formatDate
                }
                onEdit={() =>
                  onEdit(item)
                }
                onHistory={() =>
                  onHistory(
                    item,
                  )
                }
                onDelete={() =>
                  onDelete(item)
                }
              />
            ),
          )}
        </div>
      ) : (
        <EmptyState title="موردی با این جستجو و فیلتر پیدا نشد." />
      )}
    </Card>
  );
}
