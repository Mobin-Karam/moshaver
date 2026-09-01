import { Search } from "lucide-react";
import {
  Badge,
  Select,
} from "../../../shared/ui/ui";
import type { LearningFilter } from "../model/learning.types";

export function LearningFilters({
  search,
  filter,
  resultCount,
  onSearchChange,
  onFilterChange,
}: {
  search: string;
  filter: LearningFilter;
  resultCount: number;
  onSearchChange: (
    value: string,
  ) => void;
  onFilterChange: (
    value: LearningFilter,
  ) => void;
}) {
  return (
    <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
      <label className="flex h-10 items-center gap-2 rounded-md border bg-slate-50 px-3">
        <Search
          size={16}
          className="text-slate-400"
        />

        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          value={search}
          onChange={(event) =>
            onSearchChange(
              event.target.value,
            )
          }
          placeholder="جستجو در عنوان، درس، کتاب یا مبحث"
        />
      </label>

      <Select
        value={filter}
        onChange={(event) =>
          onFilterChange(
            event.target
              .value as LearningFilter,
          )
        }
      >
        <option value="all">
          همه موارد
        </option>

        <option value="due">
          سررسیدشده
        </option>

        <option value="pending">
          در انتظار
        </option>

        <option value="done">
          تکمیل‌شده
        </option>

        <option value="archived">
          بایگانی
        </option>
      </Select>

      <Badge
        tone={
          resultCount
            ? "blue"
            : "neutral"
        }
      >
        {resultCount.toLocaleString(
          "fa-IR",
        )}{" "}
        نتیجه
      </Badge>
    </div>
  );
}
